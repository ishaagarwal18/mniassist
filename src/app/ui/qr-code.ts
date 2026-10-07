import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { QRCode } from '@syncfusion/ej2-barcode-generator';

import { registerSyncfusionLicense } from '../core/ui/syncfusion-license';

// Syncfusion checks the licence in each component's constructor, so the key has
// to be registered as soon as this file loads.
registerSyncfusionLicense();

/**
 * A QR code (computed via Syncfusion's QRCode matrix generator, rendered as SVG vector).
 * Black on white whatever the theme, because a scanner reads contrast, not brand colour.
 * Works reliably inside modals and dynamic containers without DOM bounding measurement flaws.
 */
@Component({
  selector: 'ar-qr-code',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="ar-qr"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [attr.aria-label]="label()"
      role="img"
    >
      @if (svgPath()) {
        <svg
          [attr.viewBox]="'0 0 ' + matrixSize() + ' ' + matrixSize()"
          [style.width.px]="size()"
          [style.height.px]="size()"
          shape-rendering="crispEdges"
        >
          <path [attr.d]="svgPath()" fill="#000000" />
        </svg>
      }
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
    .ar-qr svg {
      display: block;
    }
  `,
})
export class ArQrCode {
  readonly value = input.required<string>();
  readonly size = input(176);
  readonly label = input('QR code');

  protected readonly qrData = computed(() => {
    const text = this.value();
    if (!text) {
      return { path: '', size: 0 };
    }
    try {
      const qr: any = new QRCode();
      qr.text = text;
      qr.mErrorCorrectionLevel = 15; // ErrorCorrectionLevel.Medium
      qr.generateValues();
      const m = qr.mModuleValue as boolean[][];
      if (!m || !m.length) {
        return { path: '', size: 0 };
      }
      let path = '';
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m[r].length; c++) {
          if (m[r][c]) {
            path += `M${c},${r}h1v1h-1z`;
          }
        }
      }
      return { path, size: m.length };
    } catch {
      return { path: '', size: 0 };
    }
  });

  protected readonly svgPath = computed(() => this.qrData().path);
  protected readonly matrixSize = computed(() => this.qrData().size);
}
