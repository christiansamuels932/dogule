export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerCreateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface Dog {
  id: string;
  kundeId: string;
  name: string;
  geburtsdatum?: string;
  rasse?: string;
  notizen?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DogCreateInput {
  kundeId: string;
  name: string;
  geburtsdatum?: string;
  rasse?: string;
  notizen?: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  scheduleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseCreateInput {
  title: string;
  description?: string;
  scheduleId?: string;
}

export type FinanzTyp = 'einnahme' | 'ausgabe';

export interface Finanz {
  id: string;
  createdAt: string;
  updatedAt: string;
  datum: string;
  typ: FinanzTyp;
  betragCents: number;
  kategorie?: string;
  beschreibung?: string;
  referenz?: string;
}

export interface FinanzCreateInput {
  datum: string;
  typ: FinanzTyp;
  betragCents: number;
  kategorie?: string;
  beschreibung?: string;
  referenz?: string;
}

export type FinanzUpdateInput = Partial<FinanzCreateInput>;

export interface FinanzListFilters {
  from?: string;
  to?: string;
  typ?: FinanzTyp;
  limit?: number;
  offset?: number;
}

export interface FinanzListResult {
  data: Finanz[];
  total: number;
  limit: number;
  offset: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  relatedCourseId?: string;
  relatedDogId?: string;
}

export interface CalendarEventCreateInput {
  title: string;
  description?: string;
  start: string;
  end: string;
  relatedCourseId?: string;
  relatedDogId?: string;
}

export type KommunikationRichtung = 'eingehend' | 'ausgehend';

export interface Kommunikation {
  id: string;
  kanal: string;
  richtung: KommunikationRichtung;
  betreff: string;
  inhalt: string;
  kundeId?: string;
  hundId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KommunikationCreateInput {
  kanal: string;
  richtung: KommunikationRichtung;
  betreff: string;
  inhalt: string;
  kundeId?: string;
  hundId?: string;
}

export type KommunikationUpdateInput = Partial<KommunikationCreateInput>;

export interface KommunikationListFilters {
  limit?: number;
  offset?: number;
  kundeId?: string;
  hundId?: string;
  kanal?: string;
  from?: string;
  to?: string;
}

export interface KommunikationListResult {
  data: Kommunikation[];
  total: number;
  limit: number;
  offset: number;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardSummary {
  kundenCount: number;
  hundeCount: number;
  kurseCount: number;
  finanzenCount: number;
  finanzenEinnahmen: number;
  finanzenAusgaben: number;
  kalenderCount: number;
  kommunikationCount: number;
}

export { ErrorCode, LogCode } from './error-codes';
