import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CurrentUserService } from '../core/services/current-user.service';
import { ScreenTipStore } from './screen-tip.store';
import { readTips, tipKey } from './screen-tip.logic';

describe('ScreenTipStore', () => {
  const userId = 'u-tips';
  let store: ScreenTipStore;

  beforeEach(() => {
    localStorage.removeItem(tipKey(userId));
    TestBed.configureTestingModule({
      providers: [{ provide: CurrentUserService, useValue: { id: signal(userId) } }],
    });
    store = TestBed.inject(ScreenTipStore);
    TestBed.tick();
  });

  afterEach(() => localStorage.removeItem(tipKey(userId)));

  it('turns tips off and remembers it for the person', () => {
    store.turnOff();
    expect(store.state().off).toBe(true);
    expect(readTips(userId).off).toBe(true);
  });

  it('turns tips back on and shows every screen again', () => {
    store.dismiss('screen-a');
    store.turnOff();
    store.turnOn();
    expect(store.state()).toEqual({ off: false, seen: [] });
    expect(readTips(userId)).toEqual({ off: false, seen: [] });
  });

  it('records a dismissed screen once', () => {
    store.dismiss('screen-a');
    store.dismiss('screen-a');
    expect(store.state().seen).toEqual(['screen-a']);
  });
});
