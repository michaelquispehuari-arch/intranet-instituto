import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendGet } from "@/lib/backend";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.rol !== "ESTUDIANTE") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const data = await backendGet(`/api/courses/${id}/summaries/mine`, session);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    throw error;
  }
}
