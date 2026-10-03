import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';

import { PickerOption, PipelineStore } from '../../core/services/pipeline.service';

/**
 * A contact typeahead for the create dialogs: type a name, pick from the matches,
 * and the chosen contact's id is emitted. Kept deliberately small — the enquiry and
 * asset dialogs need to attach a contact and nothing more.
 */
@Component({
  selector: 'ar-contact-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (chosen(); as c) {
      <div class="cp__chosen">
        <span>{{ c.label }}</span>
        <button type="button" class="cp__clear" (click)="clear()">change</button>
      </div>
    } @else {
      <input
        class="ar-field__input"
        type="search"
        placeholder="Search contacts by name or company"
        [value]="term()"
        (input)="onType($any($event.target).value)"
      />
      @if (results().length) {
        <ul class="cp__list">
          @for (r of results(); track r.id) {
            <li>
              <button type="button" class="cp__row" (click)="choose(r)">{{ r.label }}</button>
            </li>
          }
        </ul>
      } @else if (term().trim().length > 1 && !searching()) {
        <p class="cp__none">No contact matches “{{ term() }}”.</p>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
    }
    .cp__chosen {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 11px;
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-control);
      font: 400 13px var(--ar-font-sans);
    }
    .cp__clear {
      background: none;
      border: 0;
      cursor: pointer;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-blue-600);
    }
    .cp__list {
      list-style: none;
      margin: 4px 0 0;
      padding: 4px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      max-height: 180px;
      overflow-y: auto;
      background: var(--ar-white);
    }
    .cp__row {
      display: block;
      width: 100%;
      text-align: left;
      padding: 7px 9px;
      border: 0;
      border-radius: 4px;
      background: none;
      cursor: pointer;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .cp__row:hover {
      background: var(--ar-bg-50);
    }
    .cp__none {
      margin: 6px 2px 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
  `,
})
export class ArContactPicker {
  private readonly store = inject(PipelineStore);

  readonly picked = output<PickerOption | null>();

  protected readonly term = signal('');
  protected readonly results = signal<PickerOption[]>([]);
  protected readonly chosen = signal<PickerOption | null>(null);
  protected readonly searching = signal(false);

  private timer: ReturnType<typeof setTimeout> | undefined;

  protected onType(value: string): void {
    this.term.set(value);
    clearTimeout(this.timer);
    if (value.trim().length < 2) {
      this.results.set([]);
      return;
    }
    this.searching.set(true);
    this.timer = setTimeout(async () => {
      try {
        this.results.set(await this.store.searchContacts(value));
      } finally {
        this.searching.set(false);
      }
    }, 250);
  }

  protected choose(option: PickerOption): void {
    this.chosen.set(option);
    this.results.set([]);
    this.term.set('');
    this.picked.emit(option);
  }

  protected clear(): void {
    this.chosen.set(null);
    this.picked.emit(null);
  }
}
