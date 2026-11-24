// A single error type all adapters throw, so the UI and API routes can react
// to the *kind* of failure without caring which source it came from.

export type AdapterErrorCode =
  | "invalid_id" // the user typed something that isn't a valid ID
  | "invalid_file" // an uploaded file isn't in the format we expect
  | "unauthorized" // the user's login/token is missing, expired or rejected
  | "not_found" // the ID is valid but the source has no data for it
  | "upstream"; // the source's API is down, slow, or returned garbage

export class AdapterError extends Error {
  code: AdapterErrorCode;

  constructor(code: AdapterErrorCode, message: string) {
    super(message);
    this.name = "AdapterError";
    this.code = code;
  }
}

// Which HTTP status each kind of error should produce in an API route.
export function httpStatusFor(code: AdapterErrorCode): number {
  if (code === "invalid_id" || code === "invalid_file") return 400;
  if (code === "unauthorized") return 401;
  if (code === "not_found") return 404;
  return 502; // "bad gateway": the service we depend on failed
}
