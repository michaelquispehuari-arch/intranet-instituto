import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendGet, backendPost } from "@/lib/backend";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    const data = await backendGet(`/api/students${q ? `?q=${encodeURIComponent(q)}` : ""}`, session);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  try {
    const data = await backendPost("/api/students", session, body);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof BackendRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
