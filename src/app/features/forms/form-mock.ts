import { Injectable, inject } from '@angular/core';
import type { PagedResultDto } from '@abp/ng.core';
import { Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateUpdateWebFormDto,
  WebFormDto,
  WebFormEmbedDto,
  WebFormFieldKind,
  WebFormFieldTarget,
  WebFormService,
  WebFormSubmissionDto,
} from '../../proxy/web-forms';
import { fieldsProblem } from './form-logic';

let counter = 0;

function refuse(message: string): Observable<never> {
  return throwError(() => ({ error: { error: { code: 'AutoReach:WebFormInvalid', message } } }));
}

/** Forms for sample-data mode, kept in memory for the life of the page. Nothing is captured: there is no public site to fill them in on. */
@Injectable({ providedIn: 'root' })
export class WebFormMockStore {
  readonly forms: WebFormDto[] = [];

  constructor() {
    this.forms.push(
      this.build('mock-1', {
        name: 'Website enquiry',
        title: 'Tell us what you need',
        consentText: 'I agree to be contacted about my enquiry.',
        createEnquiry: true,
        isActive: true,
        fields: [
          { key: 'name', label: 'Your name', kind: WebFormFieldKind.Text, required: true, options: [], target: WebFormFieldTarget.Name },
          { key: 'email', label: 'Email', kind: WebFormFieldKind.Email, required: true, options: [], target: WebFormFieldTarget.Email },
          { key: 'phone', label: 'Phone', kind: WebFormFieldKind.Phone, required: false, options: [], target: WebFormFieldTarget.Phone },
          { key: 'need', label: 'What do you need?', kind: WebFormFieldKind.LongText, required: true, options: [], target: WebFormFieldTarget.Requirement },
        ],
      }),
    );
    this.forms[0].viewCount = 412;
    this.forms[0].submissionCount = 37;
  }

  build(id: string, d: CreateUpdateWebFormDto): WebFormDto {
    const slug = `demo${(++counter).toString().padStart(6, 'x')}`.slice(0, 10);
    return {
      id,
      slug,
      viewCount: 0,
      submissionCount: 0,
      creationTime: new Date().toISOString(),
      publicUrl: `https://app.autoreach.in/f/h.${slug}`,
      ...d,
      submitLabel: d.submitLabel || 'Send',
      successMessage: d.successMessage || 'Thank you. We have your details and will be in touch shortly.',
    };
  }
}

export class MockWebFormApi {
  constructor(private readonly s: WebFormMockStore) {}

  getList = (): Observable<WebFormDto[]> => of(this.s.forms.map((f) => ({ ...f })));
  get = (id: string): Observable<WebFormDto> => of({ ...this.s.forms.find((f) => f.id === id)! });

  create = (input: CreateUpdateWebFormDto): Observable<WebFormDto> => {
    const problem = fieldsProblem(input.fields);
    if (problem) return refuse(problem);
    const form = this.s.build(`mock-${Date.now()}`, input);
    this.s.forms.unshift(form);
    return of({ ...form });
  };

  update = (id: string, input: CreateUpdateWebFormDto): Observable<WebFormDto> => {
    const problem = fieldsProblem(input.fields);
    if (problem) return refuse(problem);
    const i = this.s.forms.findIndex((f) => f.id === id);
    this.s.forms[i] = {
      ...this.s.forms[i],
      ...input,
      submitLabel: input.submitLabel || 'Send',
      successMessage: input.successMessage || this.s.forms[i].successMessage,
    };
    return of({ ...this.s.forms[i] });
  };

  delete = (id: string): Observable<void> => {
    const i = this.s.forms.findIndex((f) => f.id === id);
    if (i >= 0) this.s.forms.splice(i, 1);
    return of(undefined);
  };

  setActive = (id: string, active: boolean): Observable<WebFormDto> => {
    const f = this.s.forms.find((x) => x.id === id)!;
    f.isActive = active;
    return of({ ...f });
  };

  getEmbed = (id: string): Observable<WebFormEmbedDto> => {
    const f = this.s.forms.find((x) => x.id === id)!;
    return of({ publicUrl: f.publicUrl, iframeHtml: `<iframe src="${f.publicUrl}?embed=1" title="${f.title}" style="width:100%;min-height:640px;border:0"></iframe>` });
  };

  getSubmissions = (): Observable<PagedResultDto<WebFormSubmissionDto>> => of({ items: [], totalCount: 0 });
}

export type WebFormApi = Pick<WebFormService, keyof MockWebFormApi & keyof WebFormService>;

/** Where forms come from: the server, or memory on sample data. */
@Injectable({ providedIn: 'root' })
export class WebFormGateway {
  readonly api: WebFormApi = environment.useMockData ? (new MockWebFormApi(inject(WebFormMockStore)) as unknown as WebFormApi) : inject(WebFormService);
}
