import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendGet, backendPost } from "@/lib/backend";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await backendGet("/api/users", session);
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

  try {
    const body = await req.json();
    const data = await backendPost("/api/users", session, body);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof BackendRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
