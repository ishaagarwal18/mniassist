import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AccountProjectDto, ProjectService } from '../../proxy/projects/project.service';
import { ArChip } from '../../ui';
import { environment } from '../../../environments/environment';
import { OUTCOME_TEXT, STAGE_TEXT, rolesText, rupeesShort } from './project.logic';

/** Customer 360's Projects tab: every project the account is a party to, with its role there. */
@Component({
  selector: 'ar-account-projects',
  imports: [RouterLink, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) {
      <p class="ap__muted">{{ error() }}</p>
    } @else {
      <table class="ap">
        <thead>
          <tr>
            <th scope="col">Project</th>
            <th scope="col">Role</th>
            <th scope="col">Stage</th>
            <th scope="col">End-user</th>
            <th scope="col" class="ap__num">Our scope</th>
          </tr>
        </thead>
        <tbody>
          @for (p of projects(); track p.id) {
            <tr>
              <td>
                <a [routerLink]="['/projects', p.id]" translate="no">{{ p.name }}</a>
                <div class="ap__muted" translate="no">{{ p.reference }}</div>
              </td>
              <td>
                @for (r of rolesText(p.roles); track r) {
                  <ar-chip tone="neutral">{{ r }}</ar-chip>
                }
              </td>
              <td>
                {{ STAGE_TEXT[p.stage] }}{{ p.outcome ? ' · ' + OUTCOME_TEXT[p.outcome] : '' }}
              </td>
              <td translate="no">{{ p.endUserName }}</td>
              <td class="ap__num">{{ rupees(p.ourScopeValueInPaise) }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="ap__muted">This account isn't on any project yet.</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styleUrl: './account-projects.scss',
})
export class ArAccountProjects implements OnInit {
  readonly accountId = input.required<string>();

  private readonly api = inject(ProjectService);
  protected readonly projects = signal<AccountProjectDto[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly STAGE_TEXT = STAGE_TEXT;
  protected readonly OUTCOME_TEXT = OUTCOME_TEXT;
  protected readonly rolesText = rolesText;
  protected readonly rupees = rupeesShort;

  async ngOnInit(): Promise<void> {
    if (environment.useMockData) return;
    try {
      this.projects.set(await firstValueFrom(this.api.getForAccount(this.accountId())));
    } catch {
      this.error.set('Projects could not be loaded (they may need the Projects permission).');
    }
  }
}
