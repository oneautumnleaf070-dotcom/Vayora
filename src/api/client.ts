// Thin fetch + WebSocket client for the Node.js/Express backend, replacing
// the Firebase SDK as the app's data-access boundary. Every
// src/services/*.ts file now calls through here instead of talking to
// Firestore/localStorage directly — the functions those files export keep
// their exact names, signatures and return shapes, and still dispatch the
// same window custom events after a mutation, so no page/dashboard
// component needed to change.

const DEFAULT_API_BASE = 'http://localhost:5000/api';

export const API_BASE: string =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, '') || DEFAULT_API_BASE;

const TOKEN_KEY = 'vayora_token';
const USER_KEY = 'vayora_user';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore — private-browsing / storage-disabled contexts
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export function cacheUser(user: unknown): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function getCachedUser<T>(): T | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown, opts?: { auth?: boolean }): Promise<T> {
  const useAuth = opts?.auth !== false;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (useAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr: any) {
    throw new ApiError(
      `Could not reach the VAYORA server at ${API_BASE}. Is the backend running (docker compose up)?`,
      0
    );
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const api = {
  get: <T>(path: string, opts?: { auth?: boolean }) => request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) => request<T>('POST', path, body, opts),
  put: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) => request<T>('PUT', path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) => request<T>('PATCH', path, body, opts),
  del: <T>(path: string, opts?: { auth?: boolean }) => request<T>('DELETE', path, undefined, opts),
};

// ---------------------------------------------------------------------------
// Real-time layer: replaces Firestore's onSnapshot listeners. The server
// pushes bare event names (vayora_produce_updated, vayora_orders_updated,
// ...) — the exact same names every service file already dispatches as
// window CustomEvents after a local mutation — so re-dispatching them here
// means every existing `window.addEventListener('vayora_x_updated', ...)`
// in the dashboards keeps working unchanged, but now also fires for
// mutations made by *other* users (a logistics partner's status update
// appearing live on the buyer's screen), which the original localStorage
// event pattern could never do across tabs/devices.
// ---------------------------------------------------------------------------

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;

function wsUrl(token: string): string {
  const httpBase = API_BASE.replace(/\/api$/, '');
  const wsBase = httpBase.replace(/^http/, 'ws');
  return `${wsBase}/api/ws?token=${encodeURIComponent(token)}`;
}

export function connectRealtime(): void {
  const token = getToken();
  if (!token) return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  try {
    socket = new WebSocket(wsUrl(token));
  } catch {
    return;
  }

  socket.onopen = () => {
    reconnectAttempts = 0;
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg && typeof msg.type === 'string') {
        window.dispatchEvent(new Event(msg.type));
      }
    } catch {
      // ignore malformed frames
    }
  };

  socket.onclose = () => {
    socket = null;
    if (!getToken()) return; // logged out — don't reconnect
    const delay = Math.min(30000, 1000 * 2 ** reconnectAttempts);
    reconnectAttempts += 1;
    reconnectTimer = setTimeout(connectRealtime, delay);
  };

  socket.onerror = () => {
    socket?.close();
  };
}

export function disconnectRealtime(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
}
