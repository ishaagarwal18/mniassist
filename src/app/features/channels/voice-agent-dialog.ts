import { LocalizationPipe } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ArButton } from '../../ui/button';
import { ArDialog } from '../../ui/dialog';
import { VoiceAgentService, VoiceAgentSettings, VoiceAgentVersion } from './voice-agent.service';
import { voiceAgentTemplates } from './voice-agent-templates';

@Component({
  selector: 'ar-voice-agent-dialog',
  imports: [FormsModule, LocalizationPipe, DatePipe, ArButton, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog cssClass="ar-dialog ar-voice-agent-dialog" [title]="'AutoReach::VoiceAgent.Title' | abpLocalization" width="min(680px, calc(100vw - 32px))" (dismiss)="dismiss()">
      @if (loading()) {
        <p role="status">{{ 'AutoReach::VoiceAgent.Loading' | abpLocalization }}</p>
      } @else if (settings(); as model) {
        <p class="notice">{{ (model.serverAllowed ? 'AutoReach::VoiceAgent.Allowed' : 'AutoReach::VoiceAgent.Disabled') | abpLocalization }}</p>
        <label class="ar-field"><span>{{ 'AutoReach::VoiceAgent.Template' | abpLocalization }}</span>
          <select class="ar-field__input" [ngModel]="templateId()" (ngModelChange)="templateId.set($event)" [disabled]="saving()">
            <option value="">{{ 'AutoReach::VoiceAgent.Template.choose' | abpLocalization }}</option>
            @for (template of templates; track template.id) { <option [value]="template.id">{{ ('AutoReach::VoiceAgent.Template.' + template.id) | abpLocalization }}</option> }
          </select></label>
        <p>{{ 'AutoReach::VoiceAgent.Template.notice' | abpLocalization }}</p>
        <button ar-button type="button" data-novalidate [disabled]="saving() || !templateId()" (click)="applyTemplate()">{{ 'AutoReach::VoiceAgent.Template.apply' | abpLocalization }}</button>
        <label class="ar-field"><span>{{ 'AutoReach::VoiceAgent.Name' | abpLocalization }}</span>
          <input class="ar-field__input" [(ngModel)]="model.name" (ngModelChange)="saved.set(false)" required maxlength="100" [disabled]="saving()" /></label>
        <label class="ar-field"><span>{{ 'AutoReach::VoiceAgent.Instructions' | abpLocalization }}</span>
          <textarea class="ar-field__input" [(ngModel)]="model.instructions" (ngModelChange)="saved.set(false)" required maxlength="12000" rows="6" [disabled]="saving()"></textarea></label>
        <label class="ar-field"><span>{{ 'AutoReach::VoiceAgent.Greeting' | abpLocalization }}</span>
          <textarea class="ar-field__input" [(ngModel)]="model.greeting" (ngModelChange)="saved.set(false)" required maxlength="1000" rows="3" [disabled]="saving()"></textarea></label>
        <div class="options">
          <label class="ar-field"><span>{{ 'AutoReach::VoiceAgent.Voice' | abpLocalization }}</span>
            <select class="ar-field__input" [(ngModel)]="model.voice" (ngModelChange)="saved.set(false)" [disabled]="saving()"><option value="marin">Marin</option><option value="cedar">Cedar</option></select></label>
          <label class="ar-field"><span>{{ 'AutoReach::VoiceAgent.Language' | abpLocalization }}</span>
            <select class="ar-field__input" [(ngModel)]="model.language" (ngModelChange)="saved.set(false)" [disabled]="saving()">
              @for (language of languages; track language) { <option [value]="language">{{ ('AutoReach::VoiceAgent.Language.' + language) | abpLocalization }}</option> }
            </select></label>
          <label class="ar-field"><span>{{ 'AutoReach::VoiceAgent.Duration' | abpLocalization }}</span>
            <input class="ar-field__input" type="number" [(ngModel)]="model.maxSeconds" (ngModelChange)="saved.set(false)" min="30" max="600" step="1" required [disabled]="saving()" /></label>
        </div>
        <p>{{ 'AutoReach::VoiceAgent.Scope' | abpLocalization }}</p>
        @if (saved()) { <p role="status">{{ 'AutoReach::VoiceAgent.Saved' | abpLocalization }}</p> }
        <details (toggle)="historyToggled($event)">
          <summary>{{ 'AutoReach::VoiceAgent.History' | abpLocalization }}</summary>
          <p>{{ 'AutoReach::VoiceAgent.History.notice' | abpLocalization }}</p>
          @if (historyLoading()) { <p role="status">{{ 'AutoReach::VoiceAgent.Loading' | abpLocalization }}</p> }
          @if (historyError()) {
            <p role="alert">{{ 'AutoReach::VoiceAgent.History.failed' | abpLocalization }}</p>
            <button ar-button type="button" data-novalidate [disabled]="historyLoading() || saving()" (click)="loadHistory()">{{ 'AutoReach::VoiceAgent.History.retry' | abpLocalization }}</button>
          }
          @if (versions(); as history) {
            @if (!history.length) { <p>{{ 'AutoReach::VoiceAgent.History.empty' | abpLocalization }}</p> }
            @for (version of history; track version.id) {
              <details class="version">
                <summary>{{ version.profile.name }} · {{ version.savedAtUtc ? (version.savedAtUtc | date:'medium') : ('AutoReach::VoiceAgent.History.legacy' | abpLocalization) }}</summary>
                <p class="snapshot">{{ version.profile.instructions }}</p>
                <p class="snapshot">{{ version.profile.greeting }}</p>
                <p>{{ version.profile.voice }} · {{ ('AutoReach::VoiceAgent.Language.' + version.profile.language) | abpLocalization }} · {{ version.profile.maxSeconds }}s</p>
                @if (version.restoredFrom) { <p>{{ 'AutoReach::VoiceAgent.History.restored' | abpLocalization }}</p> }
                <button ar-button type="button" data-novalidate [disabled]="saving()" (click)="restoreCandidate.set(version)">{{ 'AutoReach::VoiceAgent.History.restore' | abpLocalization }}</button>
              </details>
            }
          }
          @if (restoreCandidate(); as candidate) {
            <p>{{ 'AutoReach::VoiceAgent.History.confirm' | abpLocalization }} {{ candidate.profile.name }}</p>
            <button ar-button type="button" data-novalidate [disabled]="saving() || historyLoading()" (click)="restoreVersion()">{{ 'AutoReach::VoiceAgent.History.confirmButton' | abpLocalization }}</button>
            <button ar-button type="button" data-novalidate [disabled]="saving()" (click)="restoreCandidate.set(null)">{{ 'AutoReach::VoiceAgent.History.cancel' | abpLocalization }}</button>
          }
        </details>
      }
      @if (error()) { <p role="alert">{{ error() | abpLocalization }}</p> }
      <div dialogActions>
        <button ar-button type="button" variant="ghost" [disabled]="saving()" (click)="dismiss()">{{ 'AutoReach::VoiceAgent.Close' | abpLocalization }}</button>
        <button ar-button type="button" variant="primary" [disabled]="loading() || saving() || !settings()" (click)="save()">{{ (saving() ? 'AutoReach::VoiceAgent.Saving' : 'AutoReach::VoiceAgent.Save') | abpLocalization }}</button>
      </div>
    </ar-dialog>
  `,
  styles: `.options { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; } .notice { padding: 12px; border: 1px solid var(--ar-line, #dce1e8); border-radius: 8px; } textarea { resize: vertical; } [role=alert] { color: var(--ar-danger, #b42318); } .snapshot { white-space: pre-wrap; overflow-wrap: anywhere; } .version { margin: 12px 0; } summary { cursor: pointer; overflow-wrap: anywhere; }`,
})
export class ArVoiceAgentDialog implements OnInit {
  readonly channelId = input.required<string>();
  readonly close = output<void>();
  private readonly api = inject(VoiceAgentService);
  protected readonly settings = signal<VoiceAgentSettings | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal('');
  protected readonly languages = ['auto', 'en', 'hi', 'mr', 'gu'];
  protected readonly templates = voiceAgentTemplates;
  protected readonly templateId = signal('');
  protected readonly versions = signal<VoiceAgentVersion[] | null>(null);
  protected readonly historyLoading = signal(false);
  protected readonly historyError = signal(false);
  protected readonly restoreCandidate = signal<VoiceAgentVersion | null>(null);
  private historyOpen = false;

  protected historyToggled(event: Event): void {
    this.historyOpen = (event.target as HTMLDetailsElement).open;
    if (this.historyOpen && !this.versions() && !this.historyLoading() && !this.historyError()) void this.loadHistory();
  }

  protected async loadHistory(): Promise<void> {
    if (this.historyLoading() || this.saving()) return;
    this.historyLoading.set(true); this.historyError.set(false);
    try { this.versions.set(await firstValueFrom(this.api.versions(this.channelId()))); }
    catch { this.historyError.set(true); }
    finally { this.historyLoading.set(false); }
  }

  protected async restoreVersion(): Promise<void> {
    const model = this.settings(); const version = this.restoreCandidate();
    if (!model || !version || this.saving() || this.historyLoading()) return;
    this.saving.set(true); this.saved.set(false); this.error.set('');
    try {
      this.settings.set(await firstValueFrom(this.api.restore(this.channelId(), version.id, model.concurrencyStamp)));
      this.restoreCandidate.set(null); this.templateId.set(''); this.saved.set(true);
      this.versions.set(null);
    } catch { this.error.set('AutoReach::VoiceAgent.SaveFailed'); }
    finally { this.saving.set(false); }
    if (this.saved()) await this.loadHistory();
  }

  protected applyTemplate(): void {
    const model = this.settings();
    const template = this.templates.find(t => t.id === this.templateId());
    if (!model || !template || this.saving()) return;
    this.settings.set({ ...model, name: template.name, instructions: template.instructions, greeting: template.greeting });
    this.saved.set(false);
    this.error.set('');
  }

  async ngOnInit(): Promise<void> {
    try { this.settings.set(await firstValueFrom(this.api.get(this.channelId()))); }
    catch { this.error.set('AutoReach::VoiceAgent.LoadFailed'); }
    finally { this.loading.set(false); }
  }

  protected dismiss(): void { if (!this.saving()) this.close.emit(); }

  protected async save(): Promise<void> {
    const model = this.settings();
    if (!model || this.saving()) return;
    if (!model.name.trim() || !model.instructions.trim() || !model.greeting.trim()
      || !Number.isInteger(model.maxSeconds) || model.maxSeconds < 30 || model.maxSeconds > 600) {
      this.error.set('AutoReach::VoiceAgent.Invalid'); return;
    }
    this.saving.set(true); this.saved.set(false); this.error.set('');
    try {
      this.settings.set(await firstValueFrom(this.api.update(this.channelId(), model)));
      this.versions.set(null); this.restoreCandidate.set(null);
      this.saved.set(true);
    } catch { this.error.set('AutoReach::VoiceAgent.SaveFailed'); }
    finally { this.saving.set(false); }
    if (this.saved() && this.historyOpen) await this.loadHistory();
  }
}
