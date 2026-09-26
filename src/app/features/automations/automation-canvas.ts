import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import {
  CanvasNode,
  GRID,
  NODE_H,
  NODE_W,
  Port,
  connect,
  connectProblem,
  disconnect,
  hasInput,
  inputPoint,
  isFixed,
  linkOf,
  moveNode,
  portPoint,
  portsOf,
  removeNode,
  snap,
  wirePath,
} from '../../core/models/automation-canvas';
import { AutomationNodeKind } from '../../proxy/messaging';
import { ArIcon } from '../../ui';
import { IconName } from '../../ui/icon';

export interface CanvasCard {
  title: string;
  detail: string;
  icon: IconName;
}

export interface PaletteItem {
  kind: AutomationNodeKind;
  label: string;
  icon: IconName;
}

type Drag =
  | { type: 'pan'; startX: number; startY: number; panX: number; panY: number }
  | { type: 'node'; id: string; startX: number; startY: number; nodeX: number; nodeY: number; moved: boolean }
  | { type: 'wire'; from: string; port: Port }
  | { type: 'palette'; kind: AutomationNodeKind; startX: number; startY: number; moved: boolean };

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.6;

/**
 * The automation drawn as boxes and arrows you can rearrange: drag a step to move it, drag from one of its ways out to
 * another step to join them, drag a new step in from the palette. The canvas never owns the graph — every finished gesture
 * is handed up as a whole new node list through {@link edit}, so the page decides what is kept and what undo goes back to.
 * Only what is mid-gesture (a step being dragged, a wire being drawn, the view's pan and zoom) lives here.
 */
@Component({
  selector: 'ar-automation-canvas',
  imports: [ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './automation-canvas.html',
  styleUrl: './automation-canvas.scss',
})
export class ArAutomationCanvas {
  readonly nodes = input.required<CanvasNode[]>();
  readonly selected = input<string | null>(null);
  /** Steps with something to fix, outlined so they can be found. */
  readonly flagged = input<ReadonlySet<string>>(new Set());
  readonly describe = input.required<(n: CanvasNode) => CanvasCard>();
  readonly palette = input<PaletteItem[]>([]);
  readonly canUndo = input(false);

  /** A finished change: the whole node list as it now is. */
  readonly edit = output<CanvasNode[]>();
  readonly select = output<string | null>();
  /** A new step dropped or clicked in from the palette, at a place on the canvas. */
  readonly add = output<{ kind: AutomationNodeKind; x: number; y: number }>();
  /** Something the canvas would not do, worded for the person. */
  readonly refused = output<string>();
  readonly undo = output<void>();
  readonly tidy = output<void>();

  protected readonly NK = AutomationNodeKind;
  protected readonly W = NODE_W;
  protected readonly H = NODE_H;
  protected readonly GRID = GRID;

  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly zoom = signal(1);
  protected readonly pan = signal({ x: 24, y: 24 });
  private drag: Drag | null = null;

  /** Where a step being dragged is right now, before it is dropped. */
  private readonly dragging = signal<{ id: string; x: number; y: number } | null>(null);
  /** The loose end of a wire being drawn, in canvas coordinates, and the step under it. */
  protected readonly wire = signal<{ from: string; port: Port; x: number; y: number; over: string | null; ok: boolean } | null>(null);
  /** A palette item being dragged, in viewport coordinates. */
  protected readonly ghost = signal<{ label: string; icon: IconName; x: number; y: number } | null>(null);
  protected readonly selectedEdge = signal<string | null>(null);

  /** The nodes as drawn: the stored positions, except for a step being dragged. */
  protected readonly view = computed(() => {
    const d = this.dragging();
    return d ? this.nodes().map((n) => (n.id === d.id ? { ...n, x: d.x, y: d.y } : n)) : this.nodes();
  });

  protected readonly edges = computed(() => {
    const nodes = this.view();
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const out: { key: string; d: string; otherwise: boolean; mx: number; my: number }[] = [];
    for (const n of nodes) {
      for (const port of portsOf(n.kind)) {
        const target = byId.get(linkOf(n, port) ?? '');
        if (!target) continue;
        const a = portPoint(n, port);
        const b = inputPoint(target);
        out.push({
          key: `${n.id}:${port}`,
          d: wirePath(a, b),
          otherwise: port === 'no',
          mx: (a.x + b.x) / 2,
          my: (a.y + b.y) / 2,
        });
      }
    }
    return out;
  });

  protected readonly wirePathD = computed(() => {
    const w = this.wire();
    const from = w && this.view().find((n) => n.id === w.from);
    return w && from ? wirePath(portPoint(from, w.port), { x: w.x, y: w.y }) : null;
  });

  /** Big enough for every step with room to drop more below and to the right. */
  protected readonly worldSize = computed(() => {
    const nodes = this.view();
    return {
      w: Math.max(1200, ...nodes.map((n) => n.x + NODE_W + 600)),
      h: Math.max(900, ...nodes.map((n) => n.y + NODE_H + 600)),
    };
  });

  constructor() {
    afterNextRender(() => this.fit());
  }

  protected portLabel(kind: AutomationNodeKind, port: Port): string {
    const reply = kind === AutomationNodeKind.WaitForReply;
    if (port === 'yes') return reply ? 'replied' : 'yes';
    if (port === 'no') return reply ? 'no reply' : 'no';
    return 'next';
  }

  protected ports = portsOf;
  protected hasInput = hasInput;
  protected isFixed = isFixed;
  protected linkOf = linkOf;

  // ---- The view ------------------------------------------------------------------------------------------

  /** Zooms and pans so every step is in view. */
  fit(): void {
    const el = this.viewport().nativeElement;
    const nodes = this.nodes();
    if (!nodes.length || !el.clientWidth) return;
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_W));
    const maxY = Math.max(...nodes.map((n) => n.y + NODE_H));
    const pad = 40;
    const z = clamp(Math.min(el.clientWidth / (maxX - minX + pad * 2), el.clientHeight / (maxY - minY + pad * 2)), MIN_ZOOM, 1);
    this.zoom.set(z);
    this.pan.set({
      x: (el.clientWidth - (maxX - minX) * z) / 2 - minX * z,
      y: Math.max(pad * z, (el.clientHeight - (maxY - minY) * z) / 2) - minY * z,
    });
  }

  protected zoomBy(factor: number, aroundX?: number, aroundY?: number): void {
    const el = this.viewport().nativeElement;
    const cx = aroundX ?? el.clientWidth / 2;
    const cy = aroundY ?? el.clientHeight / 2;
    const z0 = this.zoom();
    const z1 = clamp(z0 * factor, MIN_ZOOM, MAX_ZOOM);
    const p = this.pan();
    // Keep the point under the cursor where it is.
    this.pan.set({ x: cx - ((cx - p.x) * z1) / z0, y: cy - ((cy - p.y) * z1) / z0 });
    this.zoom.set(z1);
  }

  protected onWheel(e: WheelEvent): void {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const rect = this.viewport().nativeElement.getBoundingClientRect();
      this.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - rect.left, e.clientY - rect.top);
    } else {
      this.pan.update((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }

  private toWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.viewport().nativeElement.getBoundingClientRect();
    const p = this.pan();
    const z = this.zoom();
    return { x: (clientX - rect.left - p.x) / z, y: (clientY - rect.top - p.y) / z };
  }

  private capture(e: PointerEvent): void {
    this.viewport().nativeElement.setPointerCapture?.(e.pointerId);
  }

  // ---- Gestures --------------------------------------------------------------------------------------------

  protected onBackgroundDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    this.selectedEdge.set(null);
    this.select.emit(null);
    const p = this.pan();
    this.drag = { type: 'pan', startX: e.clientX, startY: e.clientY, panX: p.x, panY: p.y };
    this.capture(e);
  }

  protected onNodeDown(e: PointerEvent, n: CanvasNode): void {
    if (e.button !== 0) return;
    e.stopPropagation();
    this.selectedEdge.set(null);
    this.select.emit(n.id);
    this.drag = { type: 'node', id: n.id, startX: e.clientX, startY: e.clientY, nodeX: n.x, nodeY: n.y, moved: false };
    this.capture(e);
  }

  protected onPortDown(e: PointerEvent, n: CanvasNode, port: Port): void {
    if (e.button !== 0) return;
    e.stopPropagation();
    this.select.emit(n.id);
    this.drag = { type: 'wire', from: n.id, port };
    const w = this.toWorld(e.clientX, e.clientY);
    this.wire.set({ from: n.id, port, x: w.x, y: w.y, over: null, ok: false });
    this.capture(e);
  }

  protected onPaletteDown(e: PointerEvent, item: PaletteItem): void {
    if (e.button !== 0) return;
    e.stopPropagation();
    this.drag = { type: 'palette', kind: item.kind, startX: e.clientX, startY: e.clientY, moved: false };
    this.capture(e);
  }

  protected onMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    switch (d.type) {
      case 'pan':
        this.pan.set({ x: d.panX + e.clientX - d.startX, y: d.panY + e.clientY - d.startY });
        break;
      case 'node': {
        const dx = (e.clientX - d.startX) / this.zoom();
        const dy = (e.clientY - d.startY) / this.zoom();
        if (!d.moved && Math.hypot(dx, dy) < 3) return;
        d.moved = true;
        this.dragging.set({ id: d.id, x: snap(d.nodeX + dx), y: snap(d.nodeY + dy) });
        break;
      }
      case 'wire': {
        const w = this.toWorld(e.clientX, e.clientY);
        const over = this.nodeAt(e.clientX, e.clientY);
        const ok = !!over && connectProblem(this.nodes(), d.from, d.port, over) === null;
        this.wire.set({ from: d.from, port: d.port, x: w.x, y: w.y, over, ok });
        break;
      }
      case 'palette': {
        if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 4) return;
        d.moved = true;
        const item = this.palette().find((p) => p.kind === d.kind)!;
        const rect = this.host.nativeElement.getBoundingClientRect();
        this.ghost.set({ label: item.label, icon: item.icon, x: e.clientX - rect.left, y: e.clientY - rect.top });
        break;
      }
    }
  }

  protected onUp(e: PointerEvent): void {
    const d = this.drag;
    this.drag = null;
    if (!d) return;

    switch (d.type) {
      case 'node': {
        const at = this.dragging();
        this.dragging.set(null);
        if (d.moved && at) this.edit.emit(moveNode(this.nodes(), d.id, at.x, at.y));
        break;
      }
      case 'wire': {
        this.wire.set(null);
        const over = this.nodeAt(e.clientX, e.clientY);
        if (!over) break; // let go on empty canvas: nothing changes
        const result = connect(this.nodes(), d.from, d.port, over);
        if ('error' in result) this.refused.emit(result.error);
        else this.edit.emit(result.nodes);
        break;
      }
      case 'palette': {
        this.ghost.set(null);
        // The pointer was captured by the viewport, so the browser never sends the chip its own click: a press without a
        // drag is handled here as one.
        if (!d.moved) {
          this.addAtCentre(d.kind);
          break;
        }
        const el = this.viewport().nativeElement;
        const rect = el.getBoundingClientRect();
        const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        // The pointer is captured, so the event's own target is always the viewport: ask what is under it instead.
        if (!inside || document.elementFromPoint(e.clientX, e.clientY)?.closest('.cv__palette, .cv__tools')) break;
        const w = this.toWorld(e.clientX, e.clientY);
        this.add.emit({ kind: d.kind, x: snap(w.x - NODE_W / 2), y: snap(w.y - NODE_H / 2) });
        break;
      }
    }
  }

  protected onCancel(): void {
    this.drag = null;
    this.dragging.set(null);
    this.wire.set(null);
    this.ghost.set(null);
  }

  /** Enter or Space on a chip. A click from a pointer (detail > 0) was already handled when the pointer was let go. */
  protected onPaletteClick(e: MouseEvent, item: PaletteItem): void {
    if (e.detail === 0) this.addAtCentre(item.kind);
  }

  private addAtCentre(kind: AutomationNodeKind): void {
    const el = this.viewport().nativeElement;
    const rect = el.getBoundingClientRect();
    const w = this.toWorld(rect.left + el.clientWidth / 2, rect.top + el.clientHeight / 2);
    // The middle of the view is often an existing step; move down until the new one sits clear of everything.
    const x = snap(w.x - NODE_W / 2);
    let y = snap(w.y - NODE_H / 2);
    const clash = (yy: number) => this.nodes().some((n) => Math.abs(n.x - x) < NODE_W + GRID && Math.abs(n.y - yy) < NODE_H + GRID);
    while (clash(y)) y += NODE_H + GRID * 2;
    this.add.emit({ kind, x, y });
  }

  private nodeAt(clientX: number, clientY: number): string | null {
    const hit = document.elementFromPoint(clientX, clientY)?.closest('[data-node-id]');
    return hit?.getAttribute('data-node-id') ?? null;
  }

  // ---- Edges and the keyboard ------------------------------------------------------------------------------

  protected selectEdge(e: PointerEvent, key: string): void {
    e.stopPropagation();
    this.select.emit(null);
    this.selectedEdge.set(key);
  }

  protected deleteEdge(key: string): void {
    const [from, port] = key.split(':') as [string, Port];
    this.selectedEdge.set(null);
    this.edit.emit(disconnect(this.nodes(), from, port));
  }

  protected onKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select')) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      this.undo.emit();
      return;
    }

    if (e.key === 'Escape') {
      this.onCancel();
      this.selectedEdge.set(null);
      this.select.emit(null);
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const edge = this.selectedEdge();
      if (edge) {
        e.preventDefault();
        this.deleteEdge(edge);
        return;
      }
      const id = this.selected();
      if (!id) return;
      e.preventDefault();
      const result = removeNode(this.nodes(), id);
      if ('error' in result) this.refused.emit(result.error);
      else {
        this.select.emit(null);
        this.edit.emit(result.nodes);
      }
      return;
    }

    // Arrow keys nudge the selected step one grid square, so it can be placed without a mouse.
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    const id = this.selected();
    if (step && id) {
      const n = this.nodes().find((x) => x.id === id);
      if (!n) return;
      e.preventDefault();
      this.edit.emit(moveNode(this.nodes(), id, n.x + step[0] * GRID, n.y + step[1] * GRID));
    }
  }

  protected cardOf(n: CanvasNode): CanvasCard {
    return this.describe()(n);
  }

  protected ariaFor(n: CanvasNode): string {
    const c = this.cardOf(n);
    return `${c.title}${c.detail ? ': ' + c.detail : ''}${this.flagged().has(n.id) ? ' (needs attention)' : ''}`;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
