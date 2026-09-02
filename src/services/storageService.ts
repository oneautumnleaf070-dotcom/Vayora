import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

// Curated high-res Indian agricultural commodity image presets for quick testing
export const CROP_IMAGE_PRESETS: Record<string, string[]> = {
  'tomatoes': [
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&auto=format&fit=crop&q=80',
  ],
  'tomato': [
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=800&auto=format&fit=crop&q=80',
  ],
  'onions': [
    'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508747703725-719777637510?w=800&auto=format&fit=crop&q=80',
  ],
  'onion': [
    'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&auto=format&fit=crop&q=80',
  ],
  'rice': [
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=800&auto=format&fit=crop&q=80',
  ],
  'potatoes': [
    'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508747703725-719777637510?w=800&auto=format&fit=crop&q=80',
  ],
  'potato': [
    'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&auto=format&fit=crop&q=80',
  ],
  'mango': [
    'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80',
  ],
  'wheat': [
    'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop&q=80',
  ],
  'chillies': [
    'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=800&auto=format&fit=crop&q=80',
  ],
  'default': [
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
  ],
};

export async function uploadProduceImage(
  file: File,
  farmerId: string,
  produceId: string
): Promise<string> {
  // If Firebase storage is available and connected
  if (storage && !import.meta.env.VITE_FIREBASE_API_KEY?.includes('Demo')) {
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageRef = ref(storage, `produce/${farmerId}/${produceId}/${Date.now()}_${sanitizedName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (e) {
      console.warn('Firebase Storage upload failed or unconfigured, falling back to local base64 preview.', e);
    }
  }

  // Fallback: Convert file to Base64 Data URL for instant offline capability
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
}

export function getPresetImageForCrop(cropName: string): string[] {
  const norm = cropName.toLowerCase();
  for (const [key, urls] of Object.entries(CROP_IMAGE_PRESETS)) {
    if (norm.includes(key)) {
      return urls;
    }
  }
  return CROP_IMAGE_PRESETS['default'];
}
