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
  name: string;
  breed: string;
  ownerId: string;
  dateOfBirth?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DogCreateInput {
  name: string;
  breed: string;
  ownerId: string;
  dateOfBirth?: string;
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

export interface FinancialRecord {
  id: string;
  customerId: string;
  amount: number;
  currency: string;
  type: 'invoice' | 'payment';
  issuedAt: string;
  dueAt?: string;
  settledAt?: string;
}

export interface FinancialRecordCreateInput {
  customerId: string;
  amount: number;
  currency: string;
  type: 'invoice' | 'payment';
  issuedAt: string;
  dueAt?: string;
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

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  sentAt: string;
  readAt?: string;
}

export interface MessageCreateInput {
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
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
  kalenderCount: number;
  kommunikationCount: number;
}
