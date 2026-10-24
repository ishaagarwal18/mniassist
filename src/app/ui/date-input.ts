import { afterEveryRender, Directive, ElementRef, inject, OnDestroy } from '@angular/core';
import { ChangedEventArgs, DatePicker, DateTimePicker } from '@syncfusion/ej2-calendars';

import { registerSyncfusionLicense } from '../core/ui/syncfusion-license';
import { ensureSyncfusionTheme } from '../core/ui/syncfusion-theme';
import {
  adoptNativeLook,
  commitNative,
  hideNative,
  keepBeside,
  nativeWidth,
} from './native-upgrade';

const pad = (n: number) => String(n).padStart(2, '0');

/** Native date strings ("2026-10-04", "2026-10-04T09:30") <-> local Dates. */
function parse(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h = '0', mi = '0'] = m;
  return new Date(+y, +mo - 1, +d, +h, +mi);
}

function format(date: Date | null | undefined, withTime: boolean): string {
  if (!date || isNaN(date.getTime())) return '';
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return withTime ? `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
}

const same = (a: Date | null | undefined, b: Date | null) =>
  (a?.getTime() ?? null) === (b?.getTime() ?? null);

/**
 * Turns `<input type="date">` and `<input type="datetime-local">` in the
 * importing component into a Syncfusion DatePicker / DateTimePicker, with no
 * template changes. `value`, `min`, `max` and `disabled` are read from the
 * native input after each render; a pick is written back in the native string
 * format with the native `input`/`change` events (see native-upgrade.ts).
 *
 * Opt out with `<input type="date" arNative>`.
 */
@Directive({
  selector: 'input[type=date]:not([arNative]), input[type=datetime-local]:not([arNative])',
})
export class ArDateInput implements OnDestroy {
  private readonly native = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private picker?: DatePicker;
  private wrapper?: HTMLElement;
  private withTime = false;
  private signature = '';

  constructor() {
    registerSyncfusionLicense();
    ensureSyncfusionTheme();
    afterEveryRender({ write: () => (this.picker ? this.sync() : this.create()) });
  }

  ngOnDestroy(): void {
    this.picker?.destroy();
    this.wrapper?.remove();
  }

  private bound(attr: 'min' | 'max'): Date | undefined {
    return parse(this.native.getAttribute(attr) ?? '') ?? undefined;
  }

  private create(): void {
    this.withTime = this.native.type === 'datetime-local';
    const input = document.createElement('input');
    this.native.after(input);
    const width = nativeWidth(this.native);
    hideNative(this.native);

    const options = {
      value: parse(this.native.value) as Date,
      min: this.bound('min'),
      max: this.bound('max'),
      // With a limit, a typed date outside it becomes the nearest allowed one instead of
      // staying on screen while the field quietly holds nothing.
      strictMode: !!(this.bound('min') || this.bound('max')),
      enabled: !this.native.disabled,
      placeholder: this.native.placeholder || undefined,
      width,
      cssClass: 'ar-sf-date',
      format: this.withTime ? 'dd MMM yyyy, HH:mm' : 'dd MMM yyyy',
      change: (e: ChangedEventArgs) => {
        if (e.isInteracted) commitNative(this.native, format(e.value, this.withTime));
      },
    };
    this.picker = this.withTime
      ? new DateTimePicker({ ...options, step: 15, timeFormat: 'HH:mm' }, input)
      : new DatePicker(options, input);
    this.wrapper = input.closest<HTMLElement>('.e-input-group') ?? input;
    adoptNativeLook(this.native, this.wrapper, input);
  }

  private sync(): void {
    const picker = this.picker!;
    if (this.wrapper) keepBeside(this.native, this.wrapper);
    const signature = [
      this.native.value,
      this.native.min,
      this.native.max,
      this.native.disabled,
      this.native.placeholder,
    ].join('|');
    if (signature === this.signature) return;
    this.signature = signature;

    let dirty = false;
    const value = parse(this.native.value);
    if (!same(picker.value, value)) {
      picker.value = value as Date;
      dirty = true;
    }
    for (const attr of ['min', 'max'] as const) {
      const bound = this.bound(attr);
      // Unset bounds read back as Syncfusion's defaults (1900 / 2099), never undefined.
      if (bound && !same(picker[attr], bound)) {
        picker[attr] = bound;
        picker.strictMode = true;
        dirty = true;
      }
    }
    if (picker.enabled === this.native.disabled) {
      picker.enabled = !this.native.disabled;
      dirty = true;
    }
    if (dirty) picker.dataBind();
  }
}
