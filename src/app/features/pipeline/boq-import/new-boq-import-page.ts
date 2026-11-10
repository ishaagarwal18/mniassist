import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PickerOption } from '../../../core/services/pipeline.service';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { ArTopbar } from '../../../layout/topbar';
import { BoqImportService } from '../../../proxy/pipeline/boq-import.service';
import { ArBanner, ArButton } from '../../../ui';
import { ArContactPicker } from '../contact-picker';
import { ACCEPT, MAX_FILES, isReadable, maxBytes, size } from './boq-import.logic';

/**
 * Quote from a file, step 1: who it is for and the customer's files. "Read files" creates the import, uploads the files one by one,
 * queues the reading and moves on to the review page, which shows the progress.
 */
@Component({
  selector: 'ar-new-boq-import-page',
  imports: [ArTopbar, ArButton, ArBanner, ArContactPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-boq-import-page.html',
  styleUrl: './new-boq-import-page.scss',
})
export class ArNewBoqImportPage {
  private readonly api = inject(BoqImportService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);

  protected readonly accept = ACCEPT;
  protected readonly maxFiles = MAX_FILES;
  protected readonly size = size;

  private readonly query = this.route.snapshot.queryParamMap;
  /** Opened from an enquiry: the quotation goes on it, for its customer. */
  protected readonly enquiryId = this.query.get('enquiryId');
  protected readonly initialContact: PickerOption | null = this.query.get('contactId')
    ? { id: this.query.get('contactId')!, label: this.query.get('contactName') ?? 'Customer' }
    : null;

  protected readonly contact = signal<PickerOption | null>(this.initialContact);
  protected readonly files = signal<File[]>([]);
  protected readonly dragging = signal(false);
  protected readonly busy = signal(false);
  protected readonly status = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly available = signal(true);

  protected readonly canRead = computed(
    () => !!this.contact() && this.files().length > 0 && !this.busy(),
  );

  constructor() {
    firstValueFrom(this.api.getAvailable())
      .then((ok) => this.available.set(ok))
      .catch(() => this.available.set(true));
  }

  protected onPicked(option: PickerOption | null): void {
    this.contact.set(option);
  }

  protected onChoose(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.add(Array.from(input.files ?? []));
    input.value = '';
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.add(Array.from(event.dataTransfer?.files ?? []));
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected remove(index: number): void {
    this.files.update((f) => f.filter((_, i) => i !== index));
  }

  private add(chosen: File[]): void {
    this.error.set(null);
    const refused: string[] = [];
    const ok = chosen.filter((f) => {
      const fits = isReadable(f.name) && f.size > 0 && f.size <= maxBytes(f.name);
      if (!fits) refused.push(f.name);
      return fits;
    });
    const room = MAX_FILES - this.files().length;
    if (ok.length > room) {
      this.error.set(
        `An import takes at most ${MAX_FILES} files. Start a second import for the rest.`,
      );
    }
    this.files.update((f) => [...f, ...ok.slice(0, Math.max(0, room))]);
    if (refused.length) {
      this.error.set(
        `${refused.join(', ')}: use a PDF, an Excel (.xlsx or .xls) or CSV sheet, or a photo (JPEG, PNG, WebP or GIF), up to 10 MB (5 MB for photos).`,
      );
    }
  }

  protected async read(): Promise<void> {
    const contact = this.contact();
    if (!contact || !this.canRead()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      this.status.set('Creating the import…');
      const created = await firstValueFrom(
        this.api.create({ contactId: contact.id, enquiryId: this.enquiryId }),
      );
      const files = this.files();
      for (let i = 0; i < files.length; i++) {
        this.status.set(`Uploading ${i + 1} of ${files.length}: ${files[i].name}`);
        const body = new FormData();
        body.append('file', files[i], files[i].name);
        await firstValueFrom(this.api.uploadFile(created.id, body));
      }
      this.status.set('Starting to read…');
      await firstValueFrom(this.api.start(created.id));
      await this.router.navigate(['/quotations/import', created.id]);
    } catch (e) {
      this.error.set(readApiError(e, 'The files could not be sent for reading.'));
      this.toasts.error(readApiError(e, 'The files could not be sent for reading.'));
    } finally {
      this.busy.set(false);
      this.status.set(null);
    }
  }

  protected cancel(): void {
    void this.router.navigate(['/quotations']);
  }
}
