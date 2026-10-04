/**
 * A photo ready to send to the API: scaled so its longest side is at most
 * `maxSide` pixels and re-encoded as JPEG. Phone photos of a visiting card are
 * 3–8 MB; this makes them a few hundred kB, well inside the 5 MB the vision
 * model takes, and faster to upload on site. Falls back to the original file
 * when the browser cannot decode it (HEIC on some desktops, say).
 */
export async function shrinkImage(
  file: File,
  maxSide = 1600,
  quality = 0.85,
): Promise<{ base64: string; mediaType: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return { base64: dataUrl.slice(dataUrl.indexOf(',') + 1), mediaType: 'image/jpeg' };
  } catch {
    return { base64: await toBase64(file), mediaType: file.type || 'image/jpeg' };
  }
}

export function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result);
      resolve(s.slice(s.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
