export interface Credentials {
  accessToken: string;
  refreshToken: string;
}

export interface SDKConfig {
  baseUrl: string;
  credentials: Credentials;
  fetch?: typeof fetch;
  onCredentialsChange?: (credentials: Credentials) => void;
}

export type ResourceName =
  | "kunden"
  | "hunde"
  | "kurse"
  | "finanzen"
  | "kalender"
  | "kommunikation";

export interface Kunde {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export type KundeCreate = Omit<Kunde, "id">;
export type KundeUpdate = Partial<KundeCreate>;

export interface Hund {
  id: string;
  ownerId: string;
  name: string;
  breed?: string;
  birthDate?: string;
}

export type HundCreate = Omit<Hund, "id">;
export type HundUpdate = Partial<HundCreate>;

export interface Kurs {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
}

export type KursCreate = Omit<Kurs, "id">;
export type KursUpdate = Partial<KursCreate>;

export interface FinanzEintrag {
  id: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  description?: string;
  date: string;
}

export type FinanzEintragCreate = Omit<FinanzEintrag, "id">;
export type FinanzEintragUpdate = Partial<FinanzEintragCreate>;

export interface KalenderEreignis {
  id: string;
  title: string;
  start: string;
  end?: string;
  location?: string;
  description?: string;
}

export type KalenderEreignisCreate = Omit<KalenderEreignis, "id">;
export type KalenderEreignisUpdate = Partial<KalenderEreignisCreate>;

export interface KommunikationEintrag {
  id: string;
  channel: "email" | "sms" | "call" | "note";
  subject?: string;
  body?: string;
  date: string;
  relatedId?: string;
}

export type KommunikationEintragCreate = Omit<KommunikationEintrag, "id">;
export type KommunikationEintragUpdate = Partial<KommunikationEintragCreate>;

export interface BackendErrorPayload {
  code?: string;
  error?: string;
  message?: string;
  details?: unknown;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  resource: ResourceName;
  path: string;
  body?: unknown;
}
