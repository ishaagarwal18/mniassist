import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { PermissionService } from '@abp/ng.core';

import { grantedPolicy } from '../../core/auth/permission';
import { CurrentUserService } from '../../core/services/current-user.service';
import { TeamService } from '../../proxy/identity/team.service';
import type { TeamDto } from '../../proxy/identity/models';
import { ArCard, ArChip } from '../../ui';

/** "Lead" when the signed-in person leads the team, else nothing. */
export function teamRole(team: TeamDto, myId: string | null | undefined): string | null {
  return myId && team.leadUserId === myId ? 'Lead' : null;
}

/**
 * The teams the signed-in person is in (GET team/mine): who leads each one, how many are in it,
 * and how many conversations are open. Hidden for people who cannot see teams.
 */
@Component({
  selector: 'ar-my-teams-card',
  imports: [ArCard, ArChip, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './my-teams-card.scss',
  template: `
    @if (canSee() && loaded()) {
      <ar-card heading="Your teams">
        @if (teams().length) {
          <ul class="mt">
            @for (t of teams(); track t.id) {
              <li class="mt__row">
                <span class="mt__what">
                  <strong translate="no">{{ t.name }}</strong>
                  <span class="mt__muted">
                    {{ t.members?.length ?? 0 }}
                    {{ (t.members?.length ?? 0) === 1 ? 'member' : 'members' }}
                    @if (t.leadUserName && !role(t)) {
                      · led by <span translate="no">{{ t.leadUserName }}</span>
                    }
                    · {{ t.openConversationCount ?? 0 }} open conversations
                  </span>
                </span>
                <span class="mt__tags">
                  @if (role(t); as r) {
                    <ar-chip tone="teal">{{ r }}</ar-chip>
                  }
                  @if (t.isActive === false) {
                    <ar-chip tone="neutral">Paused</ar-chip>
                  }
                </span>
              </li>
            }
          </ul>
        } @else {
          <p class="mt__muted">
            You are not in a team yet. Conversations routed to a team reach you once an admin adds
            you to one.
          </p>
        }
        @if (canManage()) {
          <a class="mt__link" routerLink="/settings/teams">Manage teams</a>
        }
      </ar-card>
    }
  `,
})
export class ArMyTeamsCard {
  private readonly permissions = inject(PermissionService);
  private readonly me = inject(CurrentUserService);
  private readonly api = inject(TeamService);

  protected readonly canSee = grantedPolicy('AutoReach.Teams', this.permissions);
  protected readonly canManage = grantedPolicy('AutoReach.Teams.Manage', this.permissions);

  private readonly resource = rxResource({
    params: () => (this.canSee() ? {} : undefined),
    stream: () =>
      this.api
        .getMine({ skipHandleError: true })
        .pipe(catchError(() => of({ items: null as TeamDto[] | null }))),
  });

  /** False while loading and when the API refused, so a failure shows nothing rather than "no teams". */
  protected readonly loaded = computed(() => !!this.resource.value()?.items);
  protected readonly teams = computed(() => this.resource.value()?.items ?? []);

  protected role(t: TeamDto): string | null {
    return teamRole(t, this.me.id());
  }
}
