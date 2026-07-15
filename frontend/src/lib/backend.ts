import type { Session } from "next-auth";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
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

// El JWT de NextAuth (cookie httpOnly) es la unica fuente del backendToken.
// No se lee de `session` porque `session` viaja al navegador via useSession().
async function getBackendToken(session: Session): Promise<string> {
  if (!session.user) {
    throw new BackendRequestError(401, "Sesion no valida");
  }

  const token = await getToken({
    req: { cookies: await cookies() } as unknown as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.backendToken) {
    throw new BackendRequestError(401, "Sesion no valida");
  }

  return token.backendToken;
}

async function backendRequest<T>(
  path: string,
  session: Session,
  options: BackendRequestOptions = {},
): Promise<T> {
  const backendToken = await getBackendToken(session);
  const response = await fetch(`${env.BACKEND_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${backendToken}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.formData ?? (options.body ? JSON.stringify(options.body) : undefined),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new BackendRequestError(response.status, await readBackendError(response));
  }

  if (response.status === 204) {
    return undefined as T;
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
