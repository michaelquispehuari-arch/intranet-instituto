import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendPost } from "@/lib/backend";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || session.user.rol !== "ESTUDIANTE") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const data = await backendPost(`/api/sessions/${id}/summaries/self-submit`, session, {});
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    throw error;
  }
}
