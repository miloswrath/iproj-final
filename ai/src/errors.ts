export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function badRequest(message: string): ApiError {
  return new ApiError(400, "invalid_request", message);
}

export function notFound(message: string): ApiError {
  return new ApiError(404, "conversation_not_found", message);
}

export function conflict(code: string, message: string): ApiError {
  return new ApiError(409, code, message);
}

export function unsupportedCharacter(name: string): ApiError {
  return new ApiError(422, "unsupported_character", `Unsupported character: ${name}`);
}

export function internalError(message: string): ApiError {
  return new ApiError(500, "internal_error", message);
}
