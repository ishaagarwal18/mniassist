import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterRenderEffect,
  input,
  viewChild,
} from '@angular/core';
import { QRCodeGenerator } from '@syncfusion/ej2-barcode-generator';

import { registerSyncfusionLicense } from '../core/ui/syncfusion-license';

// Syncfusion checks the licence in each component's constructor, so the key has
// to be registered as soon as this file loads.
registerSyncfusionLicense();

let nextId = 0;

/**
 * A QR code, drawn by Syncfusion's public QR code generator as SVG. Black on white whatever the
 * theme, because a scanner reads contrast, not brand colour. (It used to drive the generator's
 * internal matrix class directly, which drew nothing.)
 */
@Component({
  selector: 'ar-qr-code',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ar-qr" [attr.aria-label]="label()" role="img">
      <div #host [id]="hostId" [style.width.px]="size()" [style.height.px]="size()"></div>
    </div>
  `,
  styles: `
    .ar-qr {
      padding: 8px;
      background: #ffffff;
      border-radius: 6px;
      box-sizing: content-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  `,
})
export class ArQrCode implements OnDestroy {
  readonly value = input.required<string>();
  readonly size = input(176);
  readonly label = input('QR code');

  // The generator finds its element again by id while drawing, so each instance needs its own.
  protected readonly hostId = `ar-qr-${++nextId}`;
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private qr?: QRCodeGenerator;
  /** What is drawn now, so a resize that changes nothing doesn't redraw. */
  private drawn = '';
  private observer?: ResizeObserver;

  constructor() {
    // Drawn after the element exists, and again whenever the text or size changes.
    afterRenderEffect(() => {
      this.value();
      this.size();
      const el = this.host().nativeElement;
      // Inside a dialog the element can still be detached, or have no layout yet, on the first
      // render; the generator measures it and looks it up by id, so it would draw nothing. The
      // observer draws it as soon as it is laid out.
      if (!this.observer && typeof ResizeObserver !== 'undefined') {
        this.observer = new ResizeObserver(() => this.draw());
        this.observer.observe(el);
      }
      this.draw();
    });
  }

  private draw(): void {
    const text = this.value();
    const size = this.size();
    const el = this.host().nativeElement;
    if (!el.isConnected || el.offsetWidth === 0) return;
    const key = `${size}|${text}`;
    if (key === this.drawn) return;

    this.qr?.destroy();
    this.qr = undefined;
    el.innerHTML = '';
    this.drawn = key;
    if (!text) return;
    this.qr = new QRCodeGenerator({
      value: text,
      mode: 'SVG',
      width: `${size}px`,
      height: `${size}px`,
      foreColor: '#000000',
      backgroundColor: '#ffffff',
      displayText: { visibility: false },
    });
    this.qr.appendTo(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.qr?.destroy();
  }
}
