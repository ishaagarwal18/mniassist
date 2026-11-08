import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export enum ProjectStage {
  Identified = 0,
  Design = 1,
  Specified = 2,
  Tender = 3,
  Awarded = 4,
  Closed = 5,
}

export enum ProjectOutcome {
  None = 0,
  Won = 1,
  Lost = 2,
  Dropped = 3,
}

export enum ProjectSource {
  Manual = 0,
  TenderFeed = 1,
  Enquiry = 2,
}

/** Flags: an account can hold several roles on one project. */
export enum ProjectRole {
  None = 0,
  EndUser = 1,
  Consultant = 2,
  EpcContractor = 4,
  PanelBuilder = 8,
  SystemIntegrator = 16,
  Oem = 32,
  CompetitorDistributor = 64,
}

export enum PersonInfluence {
  DecisionMaker = 0,
  Influencer = 1,
  User = 2,
  Gatekeeper = 3,
}

export enum PersonAttitude {
  Unknown = 0,
  Supporter = 1,
  Neutral = 2,
  Blocker = 3,
}

export enum ProjectEventKind {
  Created = 0,
  StageChanged = 1,
  SpecChanged = 2,
  PartyAdded = 3,
  PartyRemoved = 4,
  EnquiryLinked = 5,
  Note = 6,
  Updated = 7,
  PersonChanged = 8,
}

export interface GetProjectsInput {
  filter?: string | null;
  stage?: ProjectStage | null;
  ownerUserId?: string | null;
  sector?: string | null;
  city?: string | null;
  accountId?: string | null;
  keyDateWithinDays?: number | null;
  openOnly?: boolean;
  skipCount?: number;
  maxResultCount?: number;
}

export interface SaveProjectInput {
  name: string;
  endUserAccountId: string;
  siteName?: string | null;
  siteCity?: string | null;
  siteState?: string | null;
  sector?: string | null;
  ourScopeValueInPaise?: number | null;
  identifiedOn?: string | null;
  specIssueOn?: string | null;
  tenderCloseOn?: string | null;
  awardExpectedOn?: string | null;
  commissioningOn?: string | null;
  nextStep?: string | null;
  nextStepDueOn?: string | null;
  statusNote?: string | null;
  ownerUserId?: string | null;
  teamUserIds: string[];
}

export interface MoveProjectStageInput {
  stage: ProjectStage;
  note?: string | null;
  awardedToAccountId?: string | null;
  outcome?: ProjectOutcome;
  lostToCompetitorBrandId?: string | null;
}

export interface ProjectPartyInput {
  accountId: string;
  roles: ProjectRole;
  note?: string | null;
}

export interface ProjectPersonInput {
  contactId: string;
  influence: PersonInfluence;
  attitude: PersonAttitude;
  note?: string | null;
}

export enum SpecStatus {
  Unknown = 0,
  Named = 1,
  NamedOrEquivalent = 2,
  CompetitorNamed = 3,
  Open = 4,
}

export interface BrandRefDto {
  id: string;
  name: string;
  makes: string[];
  notes?: string | null;
  isActive: boolean;
}

export interface SetProjectSpecItemInput {
  category: string;
  status: SpecStatus;
  ourMakes: string[];
  competitorBrandIds: string[];
  clauseText?: string | null;
  libraryDocumentId?: string | null;
  estimatedValueInPaise?: number | null;
}

export interface ProjectSpecItemDto {
  category: string;
  status: SpecStatus;
  isSpecifiedIn: boolean;
  ourMakes: string[];
  competitorBrands: BrandRefDto[];
  clauseText?: string | null;
  libraryDocumentId?: string | null;
  documentTitle?: string | null;
  estimatedValueInPaise?: number | null;
  confirmedByName?: string | null;
  confirmedAtUtc?: string | null;
}

export interface ProjectEnquiryDto {
  id: string;
  reference: string;
  title?: string | null;
  contactId: string;
  contactName?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  roles: ProjectRole;
  stage: number;
  estimatedValueInPaise?: number | null;
  ownerName?: string | null;
  quotations: number;
  isOpen: boolean;
}

export interface ProjectPickListsDto {
  categories: string[];
  ourBrands: string[];
  competitorBrands: BrandRefDto[];
}

export interface ProjectOptionDto {
  id: string;
  reference: string;
  name: string;
  stage: ProjectStage;
}

export interface ProjectListItemDto {
  id: string;
  reference: string;
  name: string;
  endUserAccountId: string;
  endUserName?: string | null;
  consultantName?: string | null;
  siteCity?: string | null;
  sector?: string | null;
  stage: ProjectStage;
  outcome: ProjectOutcome;
  ourScopeValueInPaise?: number | null;
  nextKeyDateWhat?: string | null;
  nextKeyDate?: string | null;
  ownerUserId: string;
  ownerName?: string | null;
  daysInStage: number;
  needsSpecWriter: boolean;
  hasBlocker: boolean;
  parties: number;
  /** "2 of 3 categories named". */
  specSummary?: string | null;
  /** 0 to 1. */
  specifiedInRate?: number | null;
  openEnquiries: number;
}

export interface ProjectBoardColumnDto {
  stage: ProjectStage;
  totalValueInPaise: number;
  items: ProjectListItemDto[];
}

export interface ProjectPersonDto {
  contactId: string;
  name: string;
  designation?: string | null;
  phone?: string | null;
  influence: PersonInfluence;
  attitude: PersonAttitude;
  note?: string | null;
  lastContactUtc?: string | null;
  isBlocker: boolean;
}

export interface ProjectPartyDto {
  accountId: string;
  accountName: string;
  city?: string | null;
  roles: ProjectRole;
  note?: string | null;
  people: ProjectPersonDto[];
}

export interface ProjectEventDto {
  atUtc: string;
  kind: ProjectEventKind;
  fromValue?: string | null;
  toValue?: string | null;
  note?: string | null;
  userName?: string | null;
  /** Set for an event of a linked enquiry, rolled up. */
  enquiryReference?: string | null;
}

export interface ProjectUserDto {
  userId: string;
  name: string;
}

export interface ProjectDetailDto extends ProjectListItemDto {
  siteName?: string | null;
  siteState?: string | null;
  identifiedOn?: string | null;
  specIssueOn?: string | null;
  tenderCloseOn?: string | null;
  awardExpectedOn?: string | null;
  commissioningOn?: string | null;
  nextStep?: string | null;
  nextStepDueOn?: string | null;
  statusNote?: string | null;
  outcomeNote?: string | null;
  awardedToAccountId?: string | null;
  awardedToName?: string | null;
  lostToCompetitorBrandId?: string | null;
  source: ProjectSource;
  team: ProjectUserDto[];
  partyList: ProjectPartyDto[];
  events: ProjectEventDto[];
  specItems: ProjectSpecItemDto[];
  enquiries: ProjectEnquiryDto[];
  blockers: string[];
  canEdit: boolean;
  creationTime: string;
}

export interface AccountProjectDto {
  id: string;
  reference: string;
  name: string;
  stage: ProjectStage;
  outcome: ProjectOutcome;
  roles: ProjectRole;
  ourScopeValueInPaise?: number | null;
  endUserName?: string | null;
}

export interface ProjectContactOptionDto {
  contactId: string;
  name: string;
  designation?: string | null;
  phone?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private restService = inject(RestService);
  apiName = 'AutoReach';
  private readonly base = '/api/auto-reach/project';

  private params(input: GetProjectsInput) {
    return {
      filter: input.filter ?? undefined,
      stage: input.stage ?? undefined,
      ownerUserId: input.ownerUserId ?? undefined,
      sector: input.sector ?? undefined,
      city: input.city ?? undefined,
      accountId: input.accountId ?? undefined,
      keyDateWithinDays: input.keyDateWithinDays ?? undefined,
      openOnly: input.openOnly ?? undefined,
      skipCount: input.skipCount,
      maxResultCount: input.maxResultCount,
    };
  }

  getList = (input: GetProjectsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ProjectListItemDto>>(
      { method: 'GET', url: this.base, params: this.params(input) },
      { apiName: this.apiName, ...config },
    );

  getBoard = (input: GetProjectsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectBoardColumnDto[]>(
      { method: 'GET', url: `${this.base}/board`, params: this.params(input) },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectDetailDto>(
      { method: 'GET', url: `${this.base}/${id}` },
      { apiName: this.apiName, ...config },
    );

  create = (input: SaveProjectInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SaveProjectInput, ProjectDetailDto>(
      { method: 'POST', url: this.base, body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: SaveProjectInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SaveProjectInput, ProjectDetailDto>(
      { method: 'PUT', url: `${this.base}/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: `${this.base}/${id}` },
      { apiName: this.apiName, ...config },
    );

  moveStage = (id: string, input: MoveProjectStageInput, config?: Partial<Rest.Config>) =>
    this.restService.request<MoveProjectStageInput, ProjectDetailDto>(
      { method: 'POST', url: `${this.base}/${id}/move-stage`, body: input },
      { apiName: this.apiName, ...config },
    );

  setParties = (id: string, parties: ProjectPartyInput[], config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectDetailDto>(
      { method: 'POST', url: `${this.base}/${id}/set-parties`, body: { parties } },
      { apiName: this.apiName, ...config },
    );

  setPeople = (
    id: string,
    accountId: string,
    people: ProjectPersonInput[],
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, ProjectDetailDto>(
      { method: 'POST', url: `${this.base}/${id}/set-people`, body: { accountId, people } },
      { apiName: this.apiName, ...config },
    );

  addNote = (id: string, text: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectDetailDto>(
      { method: 'POST', url: `${this.base}/${id}/note`, body: { text } },
      { apiName: this.apiName, ...config },
    );

  getForAccount = (accountId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, AccountProjectDto[]>(
      { method: 'GET', url: `${this.base}/for-account/${accountId}` },
      { apiName: this.apiName, ...config },
    );

  getAccountContacts = (accountId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectContactOptionDto[]>(
      { method: 'GET', url: `${this.base}/account-contacts/${accountId}` },
      { apiName: this.apiName, ...config },
    );

  getUsers = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectUserDto[]>(
      { method: 'GET', url: `${this.base}/users` },
      { apiName: this.apiName, ...config },
    );

  setSpecItem = (id: string, input: SetProjectSpecItemInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SetProjectSpecItemInput, ProjectDetailDto>(
      { method: 'POST', url: `${this.base}/${id}/set-spec-item`, body: input },
      { apiName: this.apiName, ...config },
    );

  removeSpecItem = (id: string, category: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectDetailDto>(
      { method: 'DELETE', url: `${this.base}/${id}/spec-item`, params: { category } },
      { apiName: this.apiName, ...config },
    );

  openEnquiry = (id: string, accountId: string, contactId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, { enquiryId: string; reference: string }>(
      { method: 'POST', url: `${this.base}/${id}/open-enquiry`, body: { accountId, contactId } },
      { apiName: this.apiName, ...config },
    );

  linkEnquiry = (id: string, enquiryId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectDetailDto>(
      { method: 'POST', url: `${this.base}/${id}/link-enquiry`, body: { enquiryId } },
      { apiName: this.apiName, ...config },
    );

  unlinkEnquiry = (id: string, enquiryId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectDetailDto>(
      { method: 'POST', url: `${this.base}/${id}/unlink-enquiry`, body: { enquiryId } },
      { apiName: this.apiName, ...config },
    );

  getPickLists = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectPickListsDto>(
      { method: 'GET', url: `${this.base}/pick-lists` },
      { apiName: this.apiName, ...config },
    );

  search = (filter: string | null, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectOptionDto[]>(
      { method: 'POST', url: `${this.base}/search`, params: { filter: filter ?? undefined } },
      { apiName: this.apiName, ...config },
    );
}
