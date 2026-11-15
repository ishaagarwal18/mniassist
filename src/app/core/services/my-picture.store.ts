import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ProfilePictureService } from '../../proxy/identity/profile-picture.service';

/** The API keeps pictures up to 256 KB; resizing to this square keeps any photo well under it. */
const SIDE = 256;

/** Shrinks a photo to a 256×256 centre-cropped JPEG so a phone camera picture fits the API's size limit. */
export async function squareJpeg(file: File, side = SIDE): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const crop = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(
    bitmap,
    (bitmap.width - crop) / 2,
    (bitmap.height - crop) / 2,
    crop,
    crop,
    0,
    0,
    side,
    side,
  );
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85),
  );
  return blob ? new File([blob], 'profile.jpg', { type: 'image/jpeg' }) : file;
}

/** The signed-in person's picture, shared by the sidebar and the profile page. Loaded once, on first use. */
@Injectable({ providedIn: 'root' })
export class MyPictureStore {
  private readonly api = inject(ProfilePictureService);
  private loaded = false;

  /** A data: URL, or null to show initials. */
  readonly dataUrl = signal<string | null>(null);

  ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    firstValueFrom(this.api.getMine({ skipHandleError: true })).then(
      (p) => this.dataUrl.set(p.hasPicture ? (p.dataUrl ?? null) : null),
      () => {
        this.loaded = false;
      },
    );
  }

  async upload(file: File): Promise<void> {
    const small = await squareJpeg(file);
    const p = await firstValueFrom(this.api.upload(small, { skipHandleError: true }));
    this.dataUrl.set(p.hasPicture ? (p.dataUrl ?? null) : null);
  }

  async remove(): Promise<void> {
    await firstValueFrom(this.api.delete({ skipHandleError: true }));
    this.dataUrl.set(null);
  }
}
