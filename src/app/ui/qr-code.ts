import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { QRCodeGeneratorModule } from '@syncfusion/ej2-angular-barcode-generator';

import { registerSyncfusionLicense } from '../core/ui/syncfusion-license';

// Syncfusion checks the licence in each component's constructor, so the key has
// to be registered as soon as this file loads.
registerSyncfusionLicense();

/**
 * A QR code (Syncfusion's generator, drawn as SVG). Black on white whatever the
 * theme, because a scanner reads contrast, not brand colour.
 */
@Component({
  selector: 'ar-qr-code',
  imports: [QRCodeGeneratorModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ar-qr" [style.width.px]="size()" [style.height.px]="size()">
      <ejs-qrcodegenerator
        [value]="value()"
        [width]="size() + 'px'"
        [height]="size() + 'px'"
        mode="SVG"
        errorCorrectionLevel="Medium"
        foreColor="#000000"
        backgroundColor="#ffffff"
        [displayText]="{ visibility: false }"
        [attr.aria-label]="label()"
        role="img"
      />
    </div>
  `,
  styles: `
    .ar-qr {
      padding: 8px;
      background: #ffffff;
      border-radius: 6px;
      box-sizing: content-box;
    }
  `,
})
export class ArQrCode {
  readonly value = input.required<string>();
  readonly size = input(176);
  readonly label = input('QR code');
}
