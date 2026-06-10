import type { Session } from "next-auth";
import { env } from "./env";

type BackendRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
};

export class BackendRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

async function readBackendError(response: Response) {
  try {
    const data = (await response.json()) as { message?: unknown };

    if (typeof data.message === "string" && data.message.trim().length > 0) {
      return data.message;
    }
  } catch {
    // The backend may return an empty body for infrastructure errors.
  }

  return `Backend respondio ${response.status}`;
}

async function backendRequest<T>(
  path: string,
  session: Session,
  options: BackendRequestOptions = {},
): Promise<T> {
  const response = await fetch(`${env.BACKEND_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${session.backendToken}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.formData ?? (options.body ? JSON.stringify(options.body) : undefined),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new BackendRequestError(response.status, await readBackendError(response));
  }

  return response.json() as Promise<T>;
}

export async function backendGet<T>(path: string, session: Session): Promise<T> {
  return backendRequest<T>(path, session);
}

export async function backendPost<T>(path: string, session: Session, body: unknown): Promise<T> {
  return backendRequest<T>(path, session, { method: "POST", body });
}

export async function backendPostForm<T>(
  path: string,
  session: Session,
  formData: FormData,
): Promise<T> {
  return backendRequest<T>(path, session, { method: "POST", formData });
}

export async function backendPatch<T>(path: string, session: Session, body: unknown): Promise<T> {
  return backendRequest<T>(path, session, { method: "PATCH", body });
}

export async function backendDelete<T>(path: string, session: Session): Promise<T> {
  return backendRequest<T>(path, session, { method: "DELETE" });
}
