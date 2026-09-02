# VAreateUserProfileInFirestore` force-downgrades ADMIN -> FARMER by design.
- Routing/guards: `src/App.tsx` (`DashboardRedirect`, `ProtectedRoute`).
- Design tokens: `tailwind.config.js` (`brand`, `mandi`, `navy`, `shadow-soft`), `src/index.css`.
- Shared UI: `src/compoc:\Users\DELLnents/common/*`, `src/components/layout/*`.
- Security rules: `firestore.rules`. Cloud Functions: `functions/src/*`.
YORA — Role-Oriented Dashboards, Login Portals & Farmer-Friendly UX
> Antigravity implementation brief. Paste this into Antigravity as the task prompt.
> Generated for the VAYORA repo (React 19 + Vite + TS + Tailwind 3 + Firebase).

You are working inside the existing VAYORA repository (React 19 + Vite + TypeScript +
Tailwind CSS 3, backed by Firebase Auth / Firestore / Storage / Cloud Functions).
This is a Smart India Hackathon 2026 agri-marketplace with five roles:
FARMER, FPO, BUYER, LOGISTICS, ADMIN.

## PRIME DIRECTIVE
Do NOT start editing yet. First read the codebase, then reply with a concise
IMPLEMENTATION PLAN (files you will add/change, per task) and WAIT for my explicit
"approved" before writing any code. After approval, implement task by task and pause
for review after each task.

## HARD CONSTRAINTS (do not break these)
- PRESERVE the existing visual identity. Reuse the current design tokens exactly:
  - Tailwind theme `brand` green scale (primary actions = `bg-brand-700 hover:bg-brand-800`,
    primary text accents = `text-brand-700`), `mandi` amber accents, `navy` darks, slate neutrals.
  - Card style: `bg-white rounded-3xl border border-slate-200 shadow-soft`; inner panels
    `rounded-2xl` / `rounded-xl`; font `Plus Jakarta Sans`; icons from `lucide-react`.
  - Reuse existing shared components: `components/common/{Button,Card,Badge,StatCard,Modal}`,
    `components/layout/{Header,Sidebar}`. Do NOT introduce a new UI library or CSS framework.
- Keep the existing routing model in `src/App.tsx` (role redirect via `DashboardRedirect`,
  `ProtectedRoute allowedRoles={...}`) and the `AuthContext` / `authService` phone-OTP flow intact.
- Keep role-based Firestore security semantics from `firestore.rules` (esp. ADMIN cannot be
  self-assigned by regular users). Any admin bootstrapping must be documented, not a client bypass.
- TypeScript must compile (`npm run build` = `tsc && vite build`) and `npm run lint` (oxlint) must pass.
- Do not commit secrets; keep using `import.meta.env.VITE_FIREBASE_*`.

## TASK 0 — Fix existing defects first (small, verify build after)
> NOTE: These three were already patched directly in the working tree. Verify they are present;
> if any are missing, apply them.
1. `src/pages/public/CompleteProfilePage.tsx`: `auth` is referenced (line ~69) but not imported.
   Add `import { auth } from '../../firebase/config';`.
2. `src/pages/farmer/FarmerDashboard.tsx`: offer card uses `off.offeredQuantity` which does not
   exist on the `Offer` type — use `off.quantity` (and `off.offeredPrice * off.quantity` for the total).
3. `src/pages/logistics/LogisticsDashboard.tsx`: `<QrCode>` is used but not imported from
   `lucide-react` — add `QrCode` to the import list.
Report any other type errors you find while doing this; fix only the clearly-broken ones.

## TASK 1 — Dedicated Login Portals for ADMIN and LOGISTICS (keep current UI/UX)
Goal: distinct, role-branded entry points, reusing the exact card/typography of the existing
`LoginPage.tsx` so they feel native to VAYORA.
- Add routes under the PublicLayout:
  - `/admin/login`  → `AdminLoginPage`
  - `/logistics/login` → `LogisticsLoginPage`
- Both reuse the phone-OTP flow (`useAuth().sendOtp/verifyOtp`) — do NOT invent a new auth mechanism.
  Differentiate ONLY by branding + copy + an accent:
  - Admin portal: purple accent (matches existing admin `purple-700` usage + `ShieldCheck` icon),
    heading "VAYORA Control Center — Administrator Sign-in", a subtle "Restricted access" note.
  - Logistics portal: amber accent (matches `amber-500` fleet styling + `Truck` icon),
    heading "VAYORA Fleet Portal — Logistics Partner Sign-in".
- After OTP verify, enforce the expected role: if the signed-in user's `role` doesn't match the
  portal (e.g. a FARMER lands on `/admin/login`), show the existing "Access Restricted" pattern
  (reuse the styling in `ProtectedRoute.tsx`) and route them to their own dashboard — never elevate roles client-side.
- Admin bootstrapping: since regular users cannot self-assign ADMIN (by design in `authService`
  and `firestore.rules`), provide a short `docs/ADMIN_SETUP.md` explaining how to promote a user to
  ADMIN in the Firestore console (set `users/{uid}.role = "ADMIN"`), plus optional custom-claim note.
  Do NOT weaken the security rules to allow self-elevation.
- Update the public `Header.tsx` "Sign In" area with a small, unobtrusive secondary link set
  ("Admin" / "Fleet Partner") OR keep them unlinked/deep-link only — recommend the least-cluttered option in your plan.

## TASK 2 — Orient each dashboard to its role (fix shared-nav leakage)
- `components/layout/Sidebar.tsx`: the section heading is hard-coded "Producer Navigation" for all
  roles. Make the heading role-aware: e.g. FARMER/FPO -> "Producer Navigation", BUYER -> "Buyer Tools",
  LOGISTICS -> "Fleet Operations", ADMIN -> "Administration". Keep the same visual style.
- Ensure each role's sidebar + header links only show destinations that role is authorized for
  (cross-check against `ProtectedRoute` allowedRoles in `App.tsx`). Keep existing green styling.

## TASK 3 — ADMIN dashboard polish (keep UI/UX, improve orientation)
Refine `src/pages/admin/AdminDashboard.tsx` WITHOUT changing its look-and-feel language:
- Keep the purple-accented governance theme, `StatCard` KPI grid, and table layout.
- Add clear section grouping and empty-states that read well when data is sparse.
- Surface the KYC/verification action (the app already has `setUserVerification`) as a visible
  "Pending Verification" queue card linking to `/admin/users`.
- (Flag, don't silently rewrite) The dashboard reads users from Firestore but orders/produce/
  deliveries from localStorage — note this inconsistency in your plan and propose whether to unify
  on Firestore now or later. Do not change data sources without my approval.

## TASK 4 — LOGISTICS dashboard polish (keep UI/UX, improve orientation)
Refine `src/pages/logistics/LogisticsDashboard.tsx`:
- Keep the amber fleet theme, the Leaflet `AgriMap`, KPI cards, and the state-machine action buttons.
- Improve the operational clarity: clearer current-mission focus, a compact status stepper for the
  delivery state machine (ASSIGNED -> PICKUP_PENDING -> PICKED_UP -> IN_TRANSIT -> ARRIVED -> DELIVERED),
  and prominent QR/OTP verification entry when status = ARRIVED.
- Ensure the "no active deliveries" empty state is friendly. Do not change the fallback-to-all-
  deliveries data behavior without flagging it.

## TASK 5 — Make the FARMER / FPO experience genuinely farmer-friendly (highest priority)
Audience: small-holder farmers, often low-literacy, low-bandwidth, mobile-first, non-English-first.
Keep the SAME green VAYORA design language, but optimize for accessibility and ease:
- Larger touch targets and larger base font on farmer screens (primary actions >= 48px tall);
  reduce dense `text-[10px]/[11px]` usage on farmer pages in favor of readable sizes.
- Plain-language, action-first labels and microcopy (e.g. "See today's best price", "Add my crop",
  "Money coming to me") alongside the existing terms; avoid jargon like "escrow", "GMV", "telemetry"
  on farmer-facing screens — pair any necessary term with a one-line plain explanation.
- Strong iconography + color cues so key actions are recognizable without reading.
- A simple, guided "List my harvest" entry on the dashboard (big primary CTA) that leads into the
  existing `ProduceListingWizard`; keep the wizard but ensure each step is one clear decision.
- Make the AI price advisory the hero of the farmer dashboard in simple terms: "Suggested price
  today", "Demand: High/Medium/Low" with a plain sentence, using existing `PriceRecommendationCard`
  / `DemandChart` data — no new backend.
- Add i18n scaffolding (English default) so labels can later be translated to Hindi/regional
  languages — use a lightweight approach (a strings map/context), do NOT add a heavy dependency
  unless you justify it in the plan. Wire at least the farmer dashboard + listing CTA through it.
- FPO view: keep the "collective" framing (aggregation, member produce, bulk) but apply the same
  readability improvements.
- Accessibility: ensure aria-labels on icon-only buttons, sufficient color contrast, keyboard focus.

## DELIVERABLES / ACCEPTANCE
- `npm run build` and `npm run lint` pass; app runs with `npm run dev`.
- No regression to existing buyer flow or to auth/routing.
- New pages/components match the existing design tokens (green brand, rounded-3xl, shadow-soft, Lucide).
- A short CHANGELOG in your final message listing every file added/changed and why.

## WORKFLOW REMINDER
Reply first with the PLAN (per-task file list + approach) and WAIT for "approved".
Then implement Task 0, pause; Task 1, pause; and so on. After each task, state what changed
and how you verified it (build/lint/manual). Ask before any change to Firestore rules, auth
semantics, or data-source architecture.

---

### Appendix — Codebase reference (for the agent)
- Roles: `FARMER | FPO | BUYER | LOGISTICS | ADMIN` (`src/types/index.ts`).
- Auth: phone-OTP only via `src/services/authService.ts` + `src/context/AuthContext.tsx`.
  `c