import { PermissionService } from '@abp/ng.core';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { grantedPolicy } from '../../core/auth/permission';
import { SegmentStore } from '../../core/services/segment.store';
import {
  SavedSegment,
  SegmentClause,
  SegmentField,
  SegmentGroup,
  isGroup,
} from '../../core/models/segment.model';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArChip, ArDialog } from '../../ui';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ArContactImport } from './contact-import-dialog';
import { ArSelect } from '../../ui/select';

/**
 * The audience builder.
 *
 * Two ideas drive the layout. The first is that a segment is a question with three
 * different answers depending on what you intend to send — marketing reaches only
 * the opted-in, utility reaches nearly everyone — so the preview shows all three
 * counts and prices each against its own audience, rather than one headline number
 * that is wrong for two of the three cases.
 *
 * The second is that nesting has to be visible. An OR group buried inside an AND is
 * where segments go wrong silently, so groups are drawn as indented blocks with
 * their own connective word, and the word is a control rather than a label — you
 * change the logic by changing the sentence.
 */
@Component({
  selector: 'ar-segments',
  imports: [
    NgTemplateOutlet,
    ArTopbar,
    ArBanner,
    ArButton,
    ArChip,
    ArSelect,
    ArDialog,
    ArContactImport,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './segments.html',
  styleUrl: './segments.scss',
})
export class ArSegments {
  private readonly permissions = inject(PermissionService);
  private readonly store = inject(SegmentStore);
  private readonly dialogs = inject(ConfirmService);

  protected readonly canCreate = grantedPolicy('AutoReach.Segments.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.Segments.Update', this.permissions);
  protected readonly canDelete = grantedPolicy('AutoReach.Segments.Delete', this.permissions);
  protected readonly canImport = grantedPolicy('AutoReach.Contacts.Import', this.permissions);

  protected readonly rule = this.store.rule;
  protected readonly preview = this.store.preview;
  protected readonly saved = this.store.savedSegments;
  protected readonly fields = this.store.fields;
  protected readonly walletPaise = this.store.walletBalanceInPaise;

  protected readonly openSegmentId = signal<string | null>('s1');
  protected readonly editingSegmentId = signal<string | null>(null);

  /** Field options grouped for the picker's optgroups. */
  protected readonly fieldGroups = computed(() => {
    const groups = new Map<string, SegmentField[]>();
    for (const field of this.fields) {
      const bucket = groups.get(field.group) ?? [];
      bucket.push(field);
      groups.set(field.group, bucket);
    }
    return [...groups.entries()].map(([heading, items]) => ({ heading, items }));
  });

  protected readonly subtitle = computed(() => {
    const p = this.preview();
    if (p.matchesEveryone) return 'This rule matches your entire contact list';
    return `${p.totalMatching} matching · ${p.marketingEligible} can receive marketing`;
  });

  /**
   * The gap between who matches and who can be sent to. Called out on its own
   * because it is the number that surprises people at send time, and because a
   * tenant who does not see it here finds out when the campaign reaches a third of
   * the people they expected.
   */
  protected readonly consentGap = computed(() => {
    const p = this.preview();
    return p.totalMatching - p.marketingEligible;
  });

  // ---- Rule editing --------------------------------------------------------

  protected children(group: SegmentGroup): readonly (SegmentClause | SegmentGroup)[] {
    return group.children;
  }

  protected isGroupNode(node: SegmentClause | SegmentGroup): node is SegmentGroup {
    return isGroup(node);
  }

  protected asClause(node: SegmentClause | SegmentGroup): SegmentClause {
    return node as SegmentClause;
  }

  protected asGroup(node: SegmentClause | SegmentGroup): SegmentGroup {
    return node as SegmentGroup;
  }

  protected childPath(path: readonly number[], index: number): number[] {
    return [...path, index];
  }

  protected addClause(path: readonly number[]): void {
    this.store.addClause(path);
  }

  protected addGroup(path: readonly number[], mode: 'all' | 'any' | 'not'): void {
    this.store.addGroup(path, mode);
  }

  protected remove(path: readonly number[], index: number): void {
    this.store.removeAt(path, index);
  }

  protected setMode(path: readonly number[], value: string): void {
    this.store.setGroupMode(path, value as 'all' | 'any' | 'not');
  }

  protected setField(path: readonly number[], index: number, value: string): void {
    // Changing the field clears the value: an enum value left over from the previous
    // field is a condition that silently matches nobody.
    this.store.updateClause(path, index, { field: value, value: '' });
  }

  protected setOp(path: readonly number[], index: number, value: string): void {
    this.store.updateClause(path, index, { op: value as SegmentClause['op'] });
  }

  protected setValue(path: readonly number[], index: number, value: string): void {
    this.store.updateClause(path, index, { value });
  }

  protected loadSaved(id: string): void {
    const segment = this.saved().find((s) => s.id === id);
    if (segment) {
      this.store.setRule(segment.rule);
      this.openSegmentId.set(id);
    }
  }

  protected readonly importOpen = signal(false);
  protected readonly saveOpen = signal(false);
  protected readonly saveName = signal('');
  protected readonly saveDescription = signal('');
  protected readonly saving = signal(false);

  protected openSave(): void {
    this.editingSegmentId.set(null);
    this.saveName.set('');
    this.saveDescription.set('');
    this.saveOpen.set(true);
  }

  protected openEdit(s: SavedSegment, event?: Event): void {
    if (event) event.stopPropagation();
    this.editingSegmentId.set(s.id);
    this.saveName.set(s.name);
    this.saveDescription.set(s.description ?? '');
    this.saveOpen.set(true);
  }

  /** The dialog has checked the name before this runs. */
  protected async saveSegment(): Promise<void> {
    this.saving.set(true);
    try {
      const editId = this.editingSegmentId();
      if (editId) {
        await this.store.update(editId, this.saveName().trim(), this.saveDescription().trim() || undefined);
      } else {
        await this.store.save(this.saveName().trim(), this.saveDescription().trim() || undefined);
      }
      this.saveOpen.set(false);
    } catch {
      /* the server's reason is shown as a toast; the dialog stays open */
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteSaved(id: string, event: Event): Promise<void> {
    event.stopPropagation();
    const segment = this.saved().find((s) => s.id === id);
    if (
      segment &&
      (await this.dialogs.delete(
        'this segment',
        segment.name,
        'Campaigns already sent are not affected; scheduled ones that use it will need a new audience.',
      ))
    ) {
      await this.store.remove(id);
      if (this.openSegmentId() === id) this.openSegmentId.set(null);
    }
  }

  // ---- Field metadata ------------------------------------------------------

  protected fieldFor(name: string): SegmentField | undefined {
    return this.fields.find((f) => f.value === name);
  }

  protected optionsFor(name: string) {
    return this.fieldFor(name)?.options ?? [];
  }

  protected kindOf(name: string): SegmentField['kind'] {
    return this.fieldFor(name)?.kind ?? 'text';
  }

  protected hintFor(name: string): string | undefined {
    return this.fieldFor(name)?.hint;
  }

  /**
   * Operators offered per field kind. An ordered enum gets "at least" and "at most"
   * because its values have a rank; a free-text field does not, and offering the
   * comparison anyway would produce a condition that reads like it works.
   */
  protected operatorsFor(name: string): readonly { value: string; label: string }[] {
    switch (this.kindOf(name)) {
      case 'enum':
        return name === 'lifecycle' || name === 'campaignResponse'
          ? [
              { value: 'eq', label: 'is' },
              { value: 'ne', label: 'is not' },
              { value: 'gte', label: 'is at least' },
              { value: 'lte', label: 'is at most' },
            ]
          : [
              { value: 'eq', label: 'is' },
              { value: 'ne', label: 'is not' },
            ];
      case 'number':
        return [
          { value: 'gte', label: 'is at least' },
          { value: 'lte', label: 'is at most' },
          { value: 'eq', label: 'is exactly' },
        ];
      case 'days':
        return [
          { value: 'gte', label: 'is at least' },
          { value: 'lte', label: 'is within' },
        ];
      case 'flag':
        return [{ value: 'eq', label: 'is true' }];
      default:
        return [
          { value: 'eq', label: 'is' },
          { value: 'ne', label: 'is not' },
        ];
    }
  }

  protected connective(mode: 'all' | 'any' | 'not'): string {
    return mode === 'all' ? 'and' : mode === 'any' ? 'or' : 'and not';
  }

  // ---- Formatting ----------------------------------------------------------

  /** Paise to rupees. Sub-rupee rates keep four decimals — the rate is ₹0.8631. */
  protected rupees(paise: number, precise = false): string {
    const rupees = paise / 100;
    return rupees.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: precise ? 4 : 2,
      maximumFractionDigits: precise ? 4 : 2,
    });
  }

  protected count(n: number): string {
    return n.toLocaleString('en-IN');
  }

  protected staleness(iso?: string): string {
    if (!iso) return 'never evaluated';
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (days === 0) return 'counted today';
    return `counted ${days} day${days === 1 ? '' : 's'} ago`;
  }

  protected lifecycleTone(stage: string): 'neutral' | 'teal' | 'good' | 'warn' {
    if (stage === 'Customer') return 'good';
    if (stage === 'Quoted' || stage === 'Enquired') return 'teal';
    if (stage === 'Dormant' || stage === 'Lost') return 'warn';
    return 'neutral';
  }
}
