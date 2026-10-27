import { LocalizationPipe } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ArButton } from '../../ui/button';
import { agentFileName, agentFileText, portableAgent, readAgentFile } from './voice-agent-files';
import {
  VoiceAgentDefinition,
  VoiceAgentService,
  VoiceAgentTemplateRecord,
  VoiceAgentType,
} from './voice-agent.service';

export interface VoiceAgentApply {
  agent: VoiceAgentDefinition;
  keepTools: boolean;
}

/**
 * Ways to get an agent's settings into the draft, and out again: drafted from a description by the workspace's analysis model, from
 * one of the workspace's own templates (kept in folders), or from an exported file. Every one of them only fills the draft; nothing
 * is saved or published until the person saves and publishes as usual.
 */
@Component({
  selector: 'ar-voice-agent-builder',
  imports: [FormsModule, LocalizationPipe, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="part" aria-labelledby="vab-ai">
      <h3 id="vab-ai">{{ 'AutoReach::VoiceAgent.Builder.ai' | abpLocalization }}</h3>
      <label class="ar-field"
        ><span>{{ 'AutoReach::VoiceAgent.Builder.describe' | abpLocalization }}</span>
        <textarea
          class="ar-field__input"
          rows="3"
          maxlength="2000"
          [ngModel]="description()"
          (ngModelChange)="description.set($event)"
          [disabled]="busy() || disabled()"
          [placeholder]="'AutoReach::VoiceAgent.Builder.example' | abpLocalization"
        ></textarea>
      </label>
      <div class="row">
        <label class="ar-field"
          ><span>{{ 'AutoReach::VoiceAgent.Type' | abpLocalization }}</span>
          <select
            class="ar-field__input"
            [ngModel]="draftType()"
            (ngModelChange)="draftType.set($event)"
            [disabled]="busy() || disabled()"
          >
            <option value="prompt">
              {{ 'AutoReach::VoiceAgent.Type.prompt' | abpLocalization }}
            </option>
            <option value="flow">{{ 'AutoReach::VoiceAgent.Type.flow' | abpLocalization }}</option>
          </select></label
        >
        <button
          ar-button
          type="button"
          data-novalidate
          [disabled]="busy() || disabled() || description().trim().length < 20"
          (click)="draft()"
        >
          {{
            (drafting()
              ? 'AutoReach::VoiceAgent.Builder.drafting'
              : 'AutoReach::VoiceAgent.Builder.draft'
            ) | abpLocalization
          }}
        </button>
      </div>
      <p>{{ 'AutoReach::VoiceAgent.Builder.aiNotice' | abpLocalization }}</p>
    </section>

    <section class="part" aria-labelledby="vab-templates">
      <h3 id="vab-templates">{{ 'AutoReach::VoiceAgent.Library' | abpLocalization }}</h3>
      @if (templates().length > 0) {
        <div class="row">
          <label class="ar-field"
            ><span>{{ 'AutoReach::VoiceAgent.Library.choose' | abpLocalization }}</span>
            <select
              class="ar-field__input"
              [ngModel]="templateId()"
              (ngModelChange)="templateId.set($event)"
              [disabled]="busy() || disabled()"
            >
              <option value="">
                {{ 'AutoReach::VoiceAgent.Template.choose' | abpLocalization }}
              </option>
              @for (group of folders(); track group.folder) {
                <optgroup
                  [label]="
                    group.folder || ('AutoReach::VoiceAgent.Library.noFolder' | abpLocalization)
                  "
                >
                  @for (template of group.templates; track template.id) {
                    <option [value]="template.id">{{ template.name }}</option>
                  }
                </optgroup>
              }
            </select></label
          >
          <button
            ar-button
            type="button"
            data-novalidate
            [disabled]="busy() || disabled() || !templateId()"
            (click)="useTemplate()"
          >
            {{ 'AutoReach::VoiceAgent.Template.apply' | abpLocalization }}
          </button>
          <button
            ar-button
            type="button"
            variant="ghost"
            data-novalidate
            [disabled]="busy() || disabled() || !templateId()"
            (click)="deleting.set(true)"
          >
            {{ 'AutoReach::VoiceAgent.Library.delete' | abpLocalization }}
          </button>
        </div>
        @if (deleting()) {
          <p role="alert">
            {{ 'AutoReach::VoiceAgent.Library.confirmDelete' | abpLocalization }}
            <button
              ar-button
              type="button"
              data-novalidate
              [disabled]="busy()"
              (click)="deleteTemplate()"
            >
              {{ 'AutoReach::VoiceAgent.Library.delete' | abpLocalization }}
            </button>
            <button
              ar-button
              type="button"
              variant="ghost"
              data-novalidate
              (click)="deleting.set(false)"
            >
              {{ 'AutoReach::VoiceAgent.History.cancel' | abpLocalization }}
            </button>
          </p>
        }
      } @else {
        <p>{{ 'AutoReach::VoiceAgent.Library.empty' | abpLocalization }}</p>
      }
      <div class="row">
        <label class="ar-field"
          ><span>{{ 'AutoReach::VoiceAgent.Library.name' | abpLocalization }}</span>
          <input
            class="ar-field__input"
            maxlength="100"
            [ngModel]="saveName()"
            (ngModelChange)="saveName.set($event)"
            [disabled]="busy() || disabled()"
        /></label>
        <label class="ar-field"
          ><span>{{ 'AutoReach::VoiceAgent.Library.folder' | abpLocalization }}</span>
          <input
            class="ar-field__input"
            maxlength="60"
            list="vab-folders"
            [ngModel]="saveFolder()"
            (ngModelChange)="saveFolder.set($event)"
            [disabled]="busy() || disabled()"
          />
          <datalist id="vab-folders">
            @for (group of folders(); track group.folder) {
              @if (group.folder) {
                <option [value]="group.folder"></option>
              }
            }
          </datalist>
        </label>
        <button
          ar-button
          type="button"
          data-novalidate
          [disabled]="busy() || disabled() || !saveName().trim()"
          (click)="saveTemplate()"
        >
          {{ 'AutoReach::VoiceAgent.Library.save' | abpLocalization }}
        </button>
      </div>
      <p>{{ 'AutoReach::VoiceAgent.Library.notice' | abpLocalization }}</p>
    </section>

    <section class="part" aria-labelledby="vab-file">
      <h3 id="vab-file">{{ 'AutoReach::VoiceAgent.File' | abpLocalization }}</h3>
      <div class="row">
        <button
          ar-button
          type="button"
          data-novalidate
          [disabled]="disabled()"
          (click)="exportFile()"
        >
          {{ 'AutoReach::VoiceAgent.File.export' | abpLocalization }}
        </button>
        <label class="ar-field"
          ><span>{{ 'AutoReach::VoiceAgent.File.import' | abpLocalization }}</span>
          <input
            class="ar-field__input"
            type="file"
            accept="application/json,.json"
            [disabled]="busy() || disabled()"
            (change)="importFile($event)"
        /></label>
      </div>
      <p>{{ 'AutoReach::VoiceAgent.File.notice' | abpLocalization }}</p>
    </section>

    @if (message(); as text) {
      <p [attr.role]="failed() ? 'alert' : 'status'">{{ text | abpLocalization }}</p>
    }
  `,
  styles: `
    .part {
      display: grid;
      gap: 6px;
      margin-bottom: 12px;
    }
    .part h3 {
      font-size: 1em;
      margin: 0;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: flex-end;
    }
    .row .ar-field {
      flex: 1 1 160px;
      min-width: 0;
    }
  `,
})
export class ArVoiceAgentBuilder implements OnInit {
  /** The draft as it stands, for saving as a template or exporting. */
  readonly current = input.required<VoiceAgentDefinition>();
  readonly disabled = input(false);
  /** Settings to put into the draft; keepTools: a model draft says nothing about actions, so the draft's own stay as they are. */
  readonly apply = output<VoiceAgentApply>();

  private readonly api = inject(VoiceAgentService);
  protected readonly description = signal('');
  protected readonly draftType = signal<VoiceAgentType>('prompt');
  protected readonly drafting = signal(false);
  protected readonly busy = signal(false);
  protected readonly templates = signal<VoiceAgentTemplateRecord[]>([]);
  protected readonly templateId = signal('');
  protected readonly deleting = signal(false);
  protected readonly saveName = signal('');
  protected readonly saveFolder = signal('');
  protected readonly message = signal('');
  protected readonly failed = signal(false);

  protected readonly folders = computed(() => {
    const groups = new Map<string, VoiceAgentTemplateRecord[]>();
    for (const t of this.templates()) groups.set(t.folder, [...(groups.get(t.folder) ?? []), t]);
    return [...groups.entries()].map(([folder, templates]) => ({ folder, templates }));
  });

  async ngOnInit(): Promise<void> {
    await this.loadTemplates();
  }

  private async loadTemplates(): Promise<void> {
    try {
      this.templates.set(await firstValueFrom(this.api.templates()));
    } catch {
      this.templates.set([]);
    }
  }

  private say(key: string, failed = false): void {
    this.message.set(key);
    this.failed.set(failed);
  }

  protected async draft(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.drafting.set(true);
    this.say('');
    try {
      const draft = await firstValueFrom(
        this.api.draft(
          this.description().trim(),
          this.draftType(),
          this.current().language || 'auto',
        ),
      );
      this.apply.emit({ agent: draft, keepTools: true });
      this.say('AutoReach::VoiceAgent.Builder.drafted');
    } catch (e: unknown) {
      const code = (e as { error?: { error?: { code?: string } } })?.error?.error?.code;
      this.say(
        code === 'AutoReach:VoiceAgentBuilderUnavailable'
          ? 'AutoReach::VoiceAgent.Builder.unavailable'
          : 'AutoReach::VoiceAgent.Builder.failed',
        true,
      );
    } finally {
      this.busy.set(false);
      this.drafting.set(false);
    }
  }

  protected useTemplate(): void {
    const template = this.templates().find((t) => t.id === this.templateId());
    if (!template) return;
    this.apply.emit({ agent: portableAgent(template.agent), keepTools: false });
    this.saveName.set(template.name);
    this.saveFolder.set(template.folder);
    this.say('AutoReach::VoiceAgent.Library.applied');
  }

  protected async saveTemplate(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.say('');
    try {
      const saved = await firstValueFrom(
        this.api.saveTemplate(
          this.saveName().trim(),
          this.saveFolder().trim(),
          portableAgent(this.current()),
        ),
      );
      await this.loadTemplates();
      this.templateId.set(saved.id);
      this.say('AutoReach::VoiceAgent.Library.saved');
    } catch {
      this.say('AutoReach::VoiceAgent.Library.saveFailed', true);
    } finally {
      this.busy.set(false);
    }
  }

  protected async deleteTemplate(): Promise<void> {
    const id = this.templateId();
    if (!id || this.busy()) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.deleteTemplate(id));
      this.templateId.set('');
      this.deleting.set(false);
      await this.loadTemplates();
      this.say('AutoReach::VoiceAgent.Library.deleted');
    } catch {
      this.say('AutoReach::VoiceAgent.Library.saveFailed', true);
    } finally {
      this.busy.set(false);
    }
  }

  protected exportFile(): void {
    const agent = this.current();
    const url = URL.createObjectURL(new Blob([agentFileText(agent)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = agentFileName(agent);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  protected async importFile(event: Event): Promise<void> {
    const field = event.target as HTMLInputElement;
    const file = field.files?.[0];
    field.value = '';
    if (!file) return;
    if (file.size > 64 * 1024) {
      this.say('AutoReach::VoiceAgent.File.tooBig', true);
      return;
    }
    try {
      this.apply.emit({ agent: readAgentFile(await file.text()), keepTools: false });
      this.say('AutoReach::VoiceAgent.File.imported');
    } catch (e: unknown) {
      this.say(e instanceof Error ? e.message : 'AutoReach::VoiceAgent.File.notAgent', true);
    }
  }
}
