export class SDKError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "SDKError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class RefreshError extends SDKError {
  constructor(message: string, status: number, details?: unknown) {
    super("ERR_AUTH_REFRESH_FAILED", message, status, details);
    this.name = "RefreshError";
  }
}
