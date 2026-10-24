import { afterEveryRender, Directive, ElementRef, inject, OnDestroy } from '@angular/core';
import { ChangeEventArgs, DropDownList } from '@syncfusion/ej2-dropdowns';

import { registerSyncfusionLicense } from '../core/ui/syncfusion-license';
import { ensureSyncfusionTheme } from '../core/ui/syncfusion-theme';
import {
  adoptNativeLook,
  commitNative,
  hideNative,
  keepBeside,
  nativeWidth,
} from './native-upgrade';

interface Item {
  value: string;
  text: string;
  disabled: boolean;
  group?: string;
}

/** DropDownList treats '' as "nothing selected", so empty-valued options get a stand-in. */
const EMPTY = '\u0000ar-empty';
const toList = (v: string) => (v === '' ? EMPTY : v);
const toNative = (v: unknown) => (v === EMPTY || v == null ? '' : String(v));

/** Lists longer than this get a filter box. */
const FILTER_FROM = 8;

/**
 * Turns every single-choice `<select>` in the importing component into a
 * Syncfusion DropDownList, with no template changes: options, the selected
 * value, `disabled` and `<optgroup>` headings are read from the native select
 * after each render, and a choice is written back to it with the native
 * `input`/`change` events (see native-upgrade.ts).
 *
 * Opt out with `<select arNative>`.
 */
@Directive({ selector: 'select:not([multiple]):not([arNative])' })
export class ArSelect implements OnDestroy {
  private readonly select = inject<ElementRef<HTMLSelectElement>>(ElementRef).nativeElement;
  private list?: DropDownList;
  private wrapper?: HTMLElement;
  private signature = '';
  private optionsDirty = true;
  private cachedItems: Item[] = [];
  private values = new Set<string>();
  private readonly observer = new MutationObserver(() => {
    this.optionsDirty = true;
    if (this.list) this.sync();
  });

  constructor() {
    registerSyncfusionLicense();
    ensureSyncfusionTheme();
    this.observer.observe(this.select, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
    afterEveryRender({ write: () => (this.list ? this.sync() : this.create()) });
  }

  ngOnDestroy(): void {
    this.observer.disconnect();
    this.list?.destroy();
    this.wrapper?.remove();
  }

  private items(): Item[] {
    if (!this.optionsDirty) return this.cachedItems;
    this.optionsDirty = false;
    this.cachedItems = Array.from(this.select.options)
      .filter((o) => !o.hidden)
      .map((o) => ({
        value: toList(o.value),
        text: o.text.trim() || o.label,
        disabled: o.disabled,
        group: o.parentElement instanceof HTMLOptGroupElement ? o.parentElement.label : undefined,
      }));
    this.values = new Set(this.cachedItems.map((item) => item.value));
    return this.cachedItems;
  }

  /** The list value for the native selection, or null when that option isn't listed. */
  private current(items: Item[]): string | null {
    const value = toList(this.select.value);
    return this.select.selectedIndex >= 0 && this.values.has(value) ? value : null;
  }

  /** A hidden selected option ("Choose…") acts as the placeholder. */
  private placeholder(): string {
    const chosen = this.select.selectedOptions[0];
    return chosen?.hidden ? chosen.text.trim() : '';
  }

  private create(): void {
    const input = document.createElement('input');
    this.select.after(input);
    const width = nativeWidth(this.select);
    hideNative(this.select);

    const items = this.items();
    this.signature = JSON.stringify(items);
    const grouped = items.some((i) => i.group);
    this.list = new DropDownList(
      {
        dataSource: items as unknown as { [key: string]: object }[],
        fields: {
          text: 'text',
          value: 'value',
          disabled: 'disabled',
          ...(grouped ? { groupBy: 'group' } : {}),
        },
        value: this.current(items),
        placeholder: this.placeholder(),
        enabled: !this.select.disabled,
        allowFiltering: items.length > FILTER_FROM,
        filterType: 'Contains',
        width,
        popupHeight: '300px',
        cssClass: 'ar-sf-select',
        change: (e: ChangeEventArgs) => {
          if (e.isInteracted) commitNative(this.select, toNative(e.value));
        },
      },
      input,
    );
    this.wrapper = input.closest<HTMLElement>('.e-ddl') ?? input;
    adoptNativeLook(this.select, this.wrapper, input);
  }

  private sync(): void {
    const list = this.list!;
    if (this.wrapper) keepBeside(this.select, this.wrapper);

    const changedOptions = this.optionsDirty;
    const items = this.items();
    const signature = changedOptions ? JSON.stringify(items) : this.signature;
    let dirty = false;
    if (signature !== this.signature) {
      this.signature = signature;
      list.dataSource = items as unknown as { [key: string]: object }[];
      list.allowFiltering = items.length > FILTER_FROM;
      dirty = true;
    }
    const value = this.current(items);
    if (list.value !== value) {
      list.value = value;
      dirty = true;
    }
    const placeholder = this.placeholder();
    if (list.placeholder !== placeholder) {
      list.placeholder = placeholder;
      dirty = true;
    }
    if (list.enabled === this.select.disabled) {
      list.enabled = !this.select.disabled;
      dirty = true;
    }
    if (dirty) list.dataBind();
  }
}
