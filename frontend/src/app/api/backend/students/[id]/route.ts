import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendDelete, backendPatch } from "@/lib/backend";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  try {
    const data = await backendPatch(`/api/students/${id}`, session, body);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const data = await backendDelete(`/api/students/${id}`, session);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
