import { Component, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService } from '../../core/ui/toast.service';
import {
  ContactImportJobDto,
  ContactImportService,
  ContactImportStatus,
} from '../../proxy/contacts';
import { ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ArContactImport } from './contact-import-dialog';

// The dialog and select are replaced through TestBed below. Keep their third-party
// widgets out of Node, where Syncfusion's mixed CJS/ESM exports cannot be loaded.
vi.mock('@syncfusion/ej2-angular-popups', () => ({ DialogComponent: class {} }));
vi.mock('@syncfusion/ej2-angular-dropdowns', () => ({
  DropDownListModule: class {},
  DropDownListComponent: class {},
  ComboBoxModule: class {},
  MultiSelectModule: class {},
}));

@Component({
  selector: 'ar-dialog',
  template: '<ng-content /><ng-content select="[dialogActions]" />',
})
class TestDialog {
  readonly title = input<string>();
  readonly width = input<string>();
  readonly dismiss = output<void>();
}

@Component({ selector: 'ar-select', template: '' })
class TestSelect {}

const running = (processed: number): ContactImportJobDto => ({
  id: 'job-1',
  status: ContactImportStatus.Running,
  fileName: 'contacts.csv',
  totalRows: 20000,
  processedRows: processed,
});

describe('contact import — background job', () => {
  const api = {
    getImportJobs: vi.fn(),
    getImportJob: vi.fn(),
    startImport: vi.fn(),
    inspect: vi.fn(),
    dryRun: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    api.getImportJobs.mockReturnValue(of({ items: [] }));
    TestBed.configureTestingModule({
      imports: [ArContactImport],
      providers: [
        { provide: ContactImportService, useValue: api },
        { provide: ToastService, useValue: { warning: vi.fn(), error: vi.fn(), success: vi.fn() } },
      ],
    }).overrideComponent(ArContactImport, {
      remove: { imports: [ArDialog, ArSelect] },
      add: { imports: [TestDialog, TestSelect] },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  async function create() {
    const fixture = TestBed.createComponent(ArContactImport);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
    return { fixture, text };
  }

  it('resumes an import that is still running, shows progress, then the result', async () => {
    api.getImportJobs.mockReturnValue(of({ items: [running(4000)] }));
    api.getImportJob.mockReturnValueOnce(of(running(12000))).mockReturnValueOnce(
      of({
        ...running(20000),
        status: ContactImportStatus.Completed,
        created: 19990,
        updated: 0,
        skipped: 10,
      }),
    );

    const { fixture, text } = await create();
    expect(text()).toContain('4,000');
    expect(text()).toContain('You can close this window');

    await vi.advanceTimersByTimeAsync(1500);
    fixture.detectChanges();
    expect(text()).toContain('12,000');

    await vi.advanceTimersByTimeAsync(1500);
    fixture.detectChanges();
    expect(text()).toContain('19,990');
    expect(text()).toContain('created');
    expect(api.getImportJob).toHaveBeenCalledTimes(2);

    // Finished: no more polling.
    await vi.advanceTimersByTimeAsync(5000);
    expect(api.getImportJob).toHaveBeenCalledTimes(2);
  });

  it('starts the import in the background instead of waiting on it', async () => {
    api.startImport.mockReturnValue(of({ ...running(0), status: ContactImportStatus.Pending }));
    api.getImportJob.mockReturnValue(of(running(1000)));

    const { fixture, text } = await create();
    const dialog = fixture.componentInstance as unknown as {
      content: string;
      fileName: { set(v: string): void };
      run(): Promise<void>;
    };
    dialog.content = 'phone\n9198765 43210';
    dialog.fileName.set('contacts.csv');

    await dialog.run();
    fixture.detectChanges();

    expect(api.startImport).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'phone\n9198765 43210', fileName: 'contacts.csv' }),
    );
    expect(text()).toContain('Waiting to start');

    await vi.advanceTimersByTimeAsync(1500);
    fixture.detectChanges();
    expect(text()).toContain('1,000');
  });

  it('says plainly when the import failed and that nothing was imported', async () => {
    api.getImportJobs.mockReturnValue(of({ items: [running(500)] }));
    api.getImportJob.mockReturnValue(
      of({ ...running(500), status: ContactImportStatus.Failed, error: 'Plan limit reached.' }),
    );

    const { fixture, text } = await create();
    await vi.advanceTimersByTimeAsync(1500);
    fixture.detectChanges();

    expect(text()).toContain('nothing was imported');
    expect(text()).toContain('Plan limit reached.');
  });

  it('shows the file picker when no import is running', async () => {
    api.getImportJobs.mockReturnValue(
      of({ items: [{ ...running(20000), status: ContactImportStatus.Completed }] }),
    );
    const { text } = await create();
    expect(text()).toContain('Drop a file here');
  });
});
