'use client';

import { getBrowserClient } from '@/lib/supabase/browser.js';

const MAX_BYTES = 500 * 1024;

// Resizes and converts a photo to WebP under 500 KB in the browser.
export async function toWebp(file, maxSide = 1600) {
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo file.');
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const q of [0.85, 0.75, 0.65, 0.55]) {
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', q));
      if (!blob || blob.type !== 'image/webp') throw new Error('This browser cannot make WebP photos. Please use Chrome, Edge or Firefox.');
      if (blob.size <= MAX_BYTES) return blob;
    }
    scale *= 0.75;
  }
  throw new Error('Could not make this photo small enough. Try a smaller photo.');
}

// Converts and uploads to the public "media" bucket; returns the public URL.
export async function uploadPhoto(file, folder) {
  const blob = await toWebp(file);
  const db = getBrowserClient();
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  const { error } = await db.storage.from('media').upload(path, blob, { contentType: 'image/webp', upsert: false });
  if (error) throw new Error('Upload failed: ' + error.message);
  return db.storage.from('media').getPublicUrl(path).data.publicUrl;
}
