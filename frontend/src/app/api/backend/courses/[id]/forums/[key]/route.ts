import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendDelete, backendGet } from "@/lib/backend";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// El segmento [key] sirve dos propositos segun el metodo: GET lo trata como
// studentId (ADMIN revisando un alumno), DELETE lo trata como dia (ESTUDIANTE
// borrando su propia entrega) — ver forum.routes.ts en el backend.

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; key: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.rol !== "ADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const { id, key: studentId } = await params;
    const data = await backendGet(`/api/courses/${id}/forums/${studentId}`, session);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    throw error;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; key: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.rol !== "ESTUDIANTE") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const { id, key: dia } = await params;
    await backendDelete(`/api/courses/${id}/forums/${dia}`, session);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    throw error;
  }
}
