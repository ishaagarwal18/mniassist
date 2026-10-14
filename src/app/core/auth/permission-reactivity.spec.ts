import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PermissionService } from '@abp/ng.core';
import { BehaviorSubject } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { ArHasPermissionDirective } from './permission';

@Component({
  imports: [ArHasPermissionDirective],
  template: `<button *arHasPermission="'AutoReach.Contacts.Update'">Edit contact</button>`,
})
class PermissionTestScreen {}

describe('permission-controlled actions', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('shows newly granted actions and removes revoked actions on an already open screen', async () => {
    const allowed = new BehaviorSubject(false);
    TestBed.configureTestingModule({
      imports: [PermissionTestScreen],
      providers: [
        {
          provide: PermissionService,
          useValue: {
            getGrantedPolicy: () => allowed.value,
            getGrantedPolicy$: () => allowed.asObservable(),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(PermissionTestScreen);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();

    allowed.next(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button')?.textContent).toContain('Edit contact');

    allowed.next(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
