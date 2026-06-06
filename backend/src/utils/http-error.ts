export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Credenciales incorrectas") {
    super(401, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "No tienes permiso para realizar esta accion") {
    super(403, message);
  }
}
