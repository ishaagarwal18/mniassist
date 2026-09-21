import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { padPoint } from './signing-logic';

const WIDTH = 600;
const HEIGHT = 200;

/**
 * A box to draw a signature in, with a mouse, a finger or a pen. Emits a small PNG (a data URL) when a stroke ends, and null
 * when cleared. Optional to the person signing: the typed name is the signature, this is an addition to it.
 */
@Component({
  selector: 'ar-signature-pad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pad" [class.pad--empty]="empty()">
      <canvas
        #canvas
        class="pad__canvas"
        [width]="width"
        [height]="height"
        role="img"
        aria-label="Signature drawing area"
        (pointerdown)="down($event)"
        (pointermove)="move($event)"
        (pointerup)="up($event)"
        (pointercancel)="up($event)"
        (pointerleave)="up($event)"
      ></canvas>
      @if (empty()) {
        <span class="pad__hint">Draw your signature here (optional)</span>
      }
    </div>
    <button type="button" class="pad__clear" [disabled]="empty()" (click)="clear()">Clear</button>
  `,
  styles: `
    :host { display: block; }
    .pad {
      position: relative; border: 1px dashed var(--sg-line, #b8c0cc); border-radius: 8px; background: #fff;
    }
    .pad__canvas { display: block; width: 100%; height: auto; aspect-ratio: 3 / 1; touch-action: none; cursor: crosshair; }
    .pad__hint {
      position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none;
      color: #8a94a3; font: 400 13px system-ui, sans-serif;
    }
    .pad__clear {
      margin-top: 6px; padding: 0; background: none; border: 0; cursor: pointer;
      font: 500 12px system-ui, sans-serif; color: var(--sg-accent, #0b6b63); text-decoration: underline;
    }
    .pad__clear:disabled { color: #a0a8b4; text-decoration: none; cursor: default; }
  `,
})
export class ArSignaturePad {
  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;

  /** The drawing as a PNG data URL after each stroke, or null once cleared. */
  readonly drawn = output<string | null>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  protected readonly empty = signal(true);
  private drawing = false;
  private last: { x: number; y: number } | null = null;

  constructor() {
    afterNextRender(() => {
      const ctx = this.canvas().nativeElement.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#111827';
      }
    });
  }

  private point(e: PointerEvent) {
    const el = this.canvas().nativeElement;
    return padPoint(e.clientX, e.clientY, el.getBoundingClientRect(), WIDTH, HEIGHT);
  }

  protected down(e: PointerEvent): void {
    e.preventDefault();
    this.canvas().nativeElement.setPointerCapture?.(e.pointerId);
    this.drawing = true;
    this.last = this.point(e);

    // A tap leaves a dot rather than nothing.
    const ctx = this.canvas().nativeElement.getContext('2d');
    if (ctx && this.last) {
      ctx.beginPath();
      ctx.moveTo(this.last.x, this.last.y);
      ctx.lineTo(this.last.x + 0.01, this.last.y + 0.01);
      ctx.stroke();
    }
    this.empty.set(false);
  }

  protected move(e: PointerEvent): void {
    if (!this.drawing || !this.last) return;
    e.preventDefault();
    const ctx = this.canvas().nativeElement.getContext('2d');
    const p = this.point(e);
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(this.last.x, this.last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    this.last = p;
  }

  protected up(e: PointerEvent): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.last = null;
    this.canvas().nativeElement.releasePointerCapture?.(e.pointerId);
    this.drawn.emit(this.canvas().nativeElement.toDataURL('image/png'));
  }

  clear(): void {
    const el = this.canvas().nativeElement;
    el.getContext('2d')?.clearRect(0, 0, WIDTH, HEIGHT);
    this.empty.set(true);
    this.drawn.emit(null);
  }
}
