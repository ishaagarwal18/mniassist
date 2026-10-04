import { Injectable, signal } from '@angular/core';

export type ConfirmTone = 'danger' | 'primary';

export interface ConfirmOptions {
  title: string;
  /** The question in a sentence or two: what will happen. */
  message?: string;
  /** Short facts worth a second look before agreeing, shown as a list. */
  details?: string[];
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
}

export interface PromptField {
  key: string;
  label: string;
  value?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  multiline?: boolean;
  type?: 'text' | 'email' | 'number' | 'url' | 'tel' | 'date';
  /** A choice instead of free text. */
  options?: readonly { value: string; label: string }[];
  maxLength?: number;
  min?: number;
  max?: number;
}

export interface PromptOptions {
  title: string;
  message?: string;
  fields: PromptField[];
  confirmText?: string;
  cancelText?: string;
}

/** What the host is showing; resolve() settles the caller's promise. */
export type DialogRequest =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | {
      kind: 'prompt';
      options: PromptOptions;
      resolve: (values: Record<string, string> | null) => void;
    };

/**
 * The app's confirmation and question dialogs, in place of the browser's
 * confirm()/prompt(): styled like every other dialog, movable, keyboard
 * friendly, with validated fields. Shown by the confirm host in the app shell
 * (layout/confirm-host.ts). Pages outside the shell (public pages) have no host,
 * so there the browser's own dialogs stand in.
 *
 *   if (!(await this.confirm.delete('this segment', segment.name))) return;
 *   const v = await this.confirm.prompt({ title: 'Rename', fields: [{ key: 'name', label: 'Name', required: true }] });
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<DialogRequest | null>(null);
  /** Set by the host while it is on the page. */
  hostAttached = false;

  confirm(options: ConfirmOptions | string): Promise<boolean> {
    const o: ConfirmOptions = typeof options === 'string' ? { title: options } : options;
    if (!this.hostAttached) {
      return Promise.resolve(window.confirm([o.title, o.message].filter(Boolean).join('\n\n')));
    }
    return new Promise((resolve) => {
      this.settlePrevious();
      this.current.set({
        kind: 'confirm',
        options: o,
        resolve: (ok) => {
          this.current.set(null);
          resolve(ok);
        },
      });
    });
  }

  /** "Delete <what>?" with the name in the message and a red button. */
  delete(what: string, name?: string | null, consequence?: string): Promise<boolean> {
    const label = name ? `“${name}”` : what;
    return this.confirm({
      title: `Delete ${what}?`,
      message: `${label.charAt(0).toUpperCase() + label.slice(1)} will be deleted. ${
        consequence ?? 'This cannot be undone.'
      }`,
      confirmText: 'Delete',
      tone: 'danger',
    });
  }

  prompt(options: PromptOptions): Promise<Record<string, string> | null> {
    if (!this.hostAttached) {
      const values: Record<string, string> = {};
      for (const f of options.fields) {
        const v = window.prompt(f.label, f.value ?? '');
        if (v === null) return Promise.resolve(null);
        values[f.key] = v;
      }
      return Promise.resolve(values);
    }
    return new Promise((resolve) => {
      this.settlePrevious();
      this.current.set({
        kind: 'prompt',
        options,
        resolve: (values) => {
          this.current.set(null);
          resolve(values);
        },
      });
    });
  }

  /** One text answer, or null when cancelled. */
  async ask(
    title: string,
    field: Omit<PromptField, 'key'>,
    message?: string,
  ): Promise<string | null> {
    const v = await this.prompt({ title, message, fields: [{ ...field, key: 'value' }] });
    return v ? v['value'] : null;
  }

  /** A second request replaces the first, which counts as cancelled. */
  private settlePrevious(): void {
    const prev = this.current();
    if (!prev) return;
    if (prev.kind === 'confirm') prev.resolve(false);
    else prev.resolve(null);
  }
}
