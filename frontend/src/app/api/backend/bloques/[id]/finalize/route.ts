import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendPost } from "@/lib/backend";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const data = await backendPost(`/api/bloques/${id}/finalize`, session, {});
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
