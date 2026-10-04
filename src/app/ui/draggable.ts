import { Directive, ElementRef, OnDestroy, afterNextRender, inject, input } from '@angular/core';

/**
 * Lets a hand-built panel (one that is not an `ar-dialog`, which moves on its
 * own) be dragged by its header: `<div class="dt" arDraggable=".dt__head">`.
 * It moves with the CSS `translate` property, so it adds to whatever centring
 * `transform` the panel already has, and it is kept inside the window.
 * Buttons and fields in the header still work as usual.
 */
@Directive({ selector: '[arDraggable]' })
export class ArDraggable implements OnDestroy {
  /** The handle, as a selector inside the panel. */
  readonly arDraggable = input('');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private dx = 0;
  private dy = 0;
  private start: { x: number; y: number; dx: number; dy: number; rect: DOMRect } | null = null;

  private readonly down = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const handle = this.arDraggable() ? this.host.querySelector(this.arDraggable()) : this.host;
    if (
      !handle?.contains(target) ||
      target.closest('button, a, input, select, textarea, [contenteditable]')
    ) {
      return;
    }
    e.preventDefault();
    this.start = {
      x: e.clientX,
      y: e.clientY,
      dx: this.dx,
      dy: this.dy,
      rect: this.host.getBoundingClientRect(),
    };
    window.addEventListener('pointermove', this.move);
    window.addEventListener('pointerup', this.up, { once: true });
  };

  private readonly move = (e: PointerEvent) => {
    const s = this.start;
    if (!s) return;
    // Keep at least 40px of the panel on screen in every direction.
    const keep = 40;
    const ox = Math.min(
      Math.max(e.clientX - s.x, keep - s.rect.right),
      window.innerWidth - keep - s.rect.left,
    );
    const oy = Math.min(
      Math.max(e.clientY - s.y, -s.rect.top),
      window.innerHeight - keep - s.rect.top,
    );
    this.dx = s.dx + ox;
    this.dy = s.dy + oy;
    this.host.style.translate = `${this.dx}px ${this.dy}px`;
  };

  private readonly up = () => {
    this.start = null;
    window.removeEventListener('pointermove', this.move);
  };

  constructor() {
    afterNextRender(() => {
      this.host.addEventListener('pointerdown', this.down);
      const handle = this.arDraggable()
        ? this.host.querySelector<HTMLElement>(this.arDraggable())
        : this.host;
      if (handle) handle.style.cursor = 'move';
    });
  }

  ngOnDestroy(): void {
    this.host.removeEventListener('pointerdown', this.down);
    window.removeEventListener('pointermove', this.move);
  }
}
