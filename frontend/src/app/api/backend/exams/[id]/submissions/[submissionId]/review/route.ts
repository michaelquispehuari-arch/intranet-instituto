import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendPatch } from "@/lib/backend";

type RouteContext = { params: Promise<{ id: string; submissionId: string }> };

export async function PATCH(_req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.rol !== "ADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { id, submissionId } = await context.params;
  try {
    const data = await backendPatch(
      `/api/exams/${id}/submissions/${submissionId}/review`,
      session,
      {},
    );
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    throw error;
  }
}
