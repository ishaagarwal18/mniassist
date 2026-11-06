import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ConfigStateService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import {
  AgencyClientSnapshotDto,
  AgencyLinkDto,
  AgencyLinkStatus,
  AgencyService,
} from '../../proxy/agencies';
import { AgencyActingStore } from '../../core/services/agency-acting.store';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip } from '../../ui';
import { ConfirmService } from '../../core/ui/confirm.service';
import { HostAccessConfiguration, isHostContext } from '../../core/auth/host-access';
import { readApiError } from '../../core/util/api-error';

/**
 * Agency mode (M01-8). A client issues an invite code and gives it to their agency;
 * the agency redeems it, gets a read-only consolidated view of each client, and can
 * open a read-only acting session to browse that client's own screens.
 */
@Component({
  selector: 'ar-agency',
  imports: [ArTopbar, ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agency.html',
  styleUrl: './agency.scss',
})
export class ArAgency {
  private readonly dialogs = inject(ConfirmService);
  private readonly api = inject(AgencyService);
  protected readonly acting = inject(AgencyActingStore);

  /**
   * Signed in to the platform (host) account rather than a workspace. Agency mode links two workspaces, so there is nothing to
   * invite from or to; the server refuses every action, and the page says why instead of offering them.
   */
  protected readonly isPlatform = isHostContext(
    inject(ConfigStateService).getAll() as HostAccessConfiguration,
  );

  private readonly tick = signal(0);
  protected readonly S = AgencyLinkStatus;

  private readonly linksResource = rxResource({
    params: () => (this.isPlatform ? undefined : { tick: this.tick() }),
    stream: () => this.api.getIssuedLinks(),
    defaultValue: { items: [] as AgencyLinkDto[] },
  });
  protected readonly links = computed(() => this.linksResource.value().items ?? []);

  private readonly clientsResource = rxResource({
    params: () => (this.isPlatform ? undefined : { tick: this.tick() }),
    stream: () => this.api.getClients(),
    defaultValue: { items: [] as AgencyClientSnapshotDto[] },
  });
  protected readonly clients = computed(() => this.clientsResource.value().items ?? []);

  protected readonly issuedCode = signal<string | null>(null);
  protected readonly redeemCode = signal('');
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected rupees(paise: number): string {
    return `₹${(paise / 100).toLocaleString('en-IN')}`;
  }
  protected statusLabel(s: AgencyLinkStatus): string {
    return s === AgencyLinkStatus.Active
      ? 'Active'
      : s === AgencyLinkStatus.Pending
        ? 'Awaiting redemption'
        : 'Revoked';
  }

  protected async issueInvite(): Promise<void> {
    this.busy.set('issue');
    this.error.set(null);
    try {
      const invite = await firstValueFrom(this.api.issueInvite());
      this.issuedCode.set(invite.code);
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'Could not create an invite.'));
    } finally {
      this.busy.set(null);
    }
  }

  protected async revoke(link: AgencyLinkDto): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Revoke ${link.agencyDisplayName ?? 'this agency'}'s access?`,
        message:
          'They can no longer view or act in your workspace. You can invite them again later.',
        confirmText: 'Revoke access',
        tone: 'danger',
      }))
    )
      return;
    this.busy.set(link.id);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.revokeLink(link.id));
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'Could not revoke the access.'));
    } finally {
      this.busy.set(null);
    }
  }

  protected async redeem(): Promise<void> {
    const code = this.redeemCode().trim();
    if (!code) return;
    this.busy.set('redeem');
    this.error.set(null);
    try {
      await firstValueFrom(this.api.redeemInvite(code));
      this.redeemCode.set('');
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'That code could not be redeemed.'));
    } finally {
      this.busy.set(null);
    }
  }

  protected async leave(client: AgencyClientSnapshotDto): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Stop managing ${client.clientDisplayName}?`,
        message: 'Your agency loses access to their workspace.',
        confirmText: 'Stop managing',
        tone: 'danger',
      }))
    )
      return;
    this.busy.set(client.linkId);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.leaveClient(client.linkId));
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'Could not stop managing this client.'));
    } finally {
      this.busy.set(null);
    }
  }

  protected async enter(client: AgencyClientSnapshotDto): Promise<void> {
    this.busy.set('enter-' + client.linkId);
    this.error.set(null);
    try {
      await this.acting.enter(client.linkId);
      window.location.assign('/home');
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not open a client session.');
    } finally {
      this.busy.set(null);
    }
  }

  protected async exitActing(): Promise<void> {
    await this.acting.leave();
    this.tick.update((n) => n + 1);
  }
}
