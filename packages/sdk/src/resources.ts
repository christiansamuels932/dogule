import { RequestClient } from "./request.js";
import {
  FinanzEintrag,
  FinanzEintragCreate,
  FinanzEintragUpdate,
  Hund,
  HundCreate,
  HundUpdate,
  KalenderEreignis,
  KalenderEreignisCreate,
  KalenderEreignisUpdate,
  KommunikationEintrag,
  KommunikationEintragCreate,
  KommunikationEintragUpdate,
  Kunde,
  KundeCreate,
  KundeUpdate,
  Kurs,
  KursCreate,
  KursUpdate,
  ResourceName,
} from "./types.js";

type RequestFunction = RequestClient["request"];

type ResourceFactory<TResource, TCreate, TUpdate> = {
  list: () => Promise<TResource[]>;
  get: (id: string) => Promise<TResource>;
  create: (payload: TCreate) => Promise<TResource>;
  update: (id: string, payload: TUpdate) => Promise<TResource>;
  remove: (id: string) => Promise<void>;
};

function createResourceClient<TResource, TCreate, TUpdate>(
  resource: ResourceName,
  request: RequestFunction,
): ResourceFactory<TResource, TCreate, TUpdate> {
  const basePath = `/${resource}`;

  return {
    list: () =>
      request<TResource[]>({ resource, path: basePath, method: "GET" }),
    get: (id: string) =>
      request<TResource>({ resource, path: `${basePath}/${id}`, method: "GET" }),
    create: (payload: TCreate) =>
      request<TResource>({
        resource,
        path: basePath,
        method: "POST",
        body: payload,
      }),
    update: (id: string, payload: TUpdate) =>
      request<TResource>({
        resource,
        path: `${basePath}/${id}`,
        method: "PUT",
        body: payload,
      }),
    remove: async (id: string) => {
      await request<void>({
        resource,
        path: `${basePath}/${id}`,
        method: "DELETE",
      });
    },
  };
}

export interface SDKResources {
  kunden: ResourceFactory<Kunde, KundeCreate, KundeUpdate>;
  hunde: ResourceFactory<Hund, HundCreate, HundUpdate>;
  kurse: ResourceFactory<Kurs, KursCreate, KursUpdate>;
  finanzen: ResourceFactory<
    FinanzEintrag,
    FinanzEintragCreate,
    FinanzEintragUpdate
  >;
  kalender: ResourceFactory<
    KalenderEreignis,
    KalenderEreignisCreate,
    KalenderEreignisUpdate
  >;
  kommunikation: ResourceFactory<
    KommunikationEintrag,
    KommunikationEintragCreate,
    KommunikationEintragUpdate
  >;
}

export function createResources(request: RequestFunction): SDKResources {
  return {
    kunden: createResourceClient("kunden", request),
    hunde: createResourceClient("hunde", request),
    kurse: createResourceClient("kurse", request),
    finanzen: createResourceClient("finanzen", request),
    kalender: createResourceClient("kalender", request),
    kommunikation: createResourceClient("kommunikation", request),
  };
}
