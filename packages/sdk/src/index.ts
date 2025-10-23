import { createRequestClient } from "./request.js";
import { createResources } from "./resources.js";
export * from "./errors.js";
export * from "./types.js";
export { setBaseUrl } from "./request.js";

export function createDoguleSDK(config: Parameters<typeof createRequestClient>[0]) {
  const requestClient = createRequestClient(config);
  const resources = createResources(requestClient.request);

  return {
    ...resources,
    getCredentials: requestClient.getCredentials,
  };
}
