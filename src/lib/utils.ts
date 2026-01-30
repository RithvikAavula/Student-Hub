import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from './supabase';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Build a stable avatar path under the user's folder in the avatars bucket
export function buildAvatarPath(userId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const timestamp = Date.now();
  return `${userId}/${timestamp}-${safeName}`;
}

// Upload an avatar to the avatars bucket and persist the path on the profile
export async function uploadAvatar(file: File, userId: string) {
  const path = buildAvatarPath(userId, file.name);
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type || 'application/octet-stream',
    });

  if (uploadError) {
    throw uploadError;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_path: path })
    .eq('id', userId);

  if (updateError) {
    throw updateError;
  }

  return path;
}

// Get a URL to display the avatar. Works for public buckets.
// If you change the bucket to private, switch to createSignedUrl.
export function getAvatarUrl(path: string) {
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

// For private buckets (optional):
export async function getSignedAvatarUrl(path: string, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

// Pre-process an avatar: center-crop to square and resize to target size (default 512px)
export async function processAvatarImage(
  file: File,
  targetSize = 512,
): Promise<{ blob: Blob; fileName: string; contentType: string }> {
  // Use jpg to keep size small and ensure broad compatibility
  const contentType = 'image/jpeg';
  const baseName = (file.name || 'avatar').replace(/\.[^.]+$/, '');
  const fileName = `${baseName}.jpg`;

  const imgUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = (e) => reject(e);
      i.src = imgUrl;
    });

    const side = Math.min(img.width, img.height);
    const sx = Math.max(0, Math.floor((img.width - side) / 2));
    const sy = Math.max(0, Math.floor((img.height - side) / 2));

    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, side, side, 0, 0, targetSize, targetSize);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), contentType, 0.9);
    });

    return { blob, fileName, contentType };
  } finally {
    URL.revokeObjectURL(imgUrl);
  }
}
