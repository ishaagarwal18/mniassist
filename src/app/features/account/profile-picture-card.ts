import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';

import { MyPictureStore } from '../../core/services/my-picture.store';
import { readApiError } from '../../core/util/api-error';
import { ArAvatar, ArBanner, ArButton, ArCard } from '../../ui';

/** Upload, replace or remove the signed-in person's picture (shown in the sidebar and to teammates). */
@Component({
  selector: 'ar-profile-picture-card',
  imports: [ArAvatar, ArBanner, ArButton, ArCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './profile-picture-card.scss',
  template: `
    <ar-card heading="Profile picture">
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      <div class="pp">
        <ar-avatar [name]="name() || '?'" [src]="store.dataUrl()" [size]="72" tone="teal" />
        <div class="pp__actions">
          <input
            #file
            class="pp__file"
            type="file"
            accept="image/png,image/jpeg"
            (change)="pick($event)"
          />
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy()"
            (click)="file.click()"
          >
            {{ busy() ? 'Saving…' : store.dataUrl() ? 'Change picture' : 'Upload picture' }}
          </button>
          @if (store.dataUrl()) {
            <button ar-button type="button" variant="ghost" [disabled]="busy()" (click)="remove()">
              Remove
            </button>
          }
          <p class="pp__hint">A PNG or JPEG. It is cropped to a square.</p>
        </div>
      </div>
    </ar-card>
  `,
})
export class ArProfilePictureCard {
  protected readonly store = inject(MyPictureStore);
  readonly name = input('');

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.store.ensureLoaded();
  }

  protected async pick(event: Event): Promise<void> {
    const el = event.target as HTMLInputElement;
    const file = el.files?.[0];
    el.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      this.error.set('Choose a PNG or JPEG picture.');
      return;
    }
    await this.run(() => this.store.upload(file), 'The picture could not be saved.');
  }

  protected async remove(): Promise<void> {
    await this.run(() => this.store.remove(), 'The picture could not be removed.');
  }

  private async run(work: () => Promise<void>, fallback: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await work();
    } catch (e: unknown) {
      this.error.set(readApiError(e, fallback));
    } finally {
      this.busy.set(false);
    }
  }
}
