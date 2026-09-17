import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendDelete } from "@/lib/backend";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string; studentId: string }> };

export async function DELETE(_: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  const { id, studentId } = await params;

  if (!session || session.user.rol !== "ADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const data = await backendDelete(`/api/courses/${id}/enrollments/${studentId}`, session);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    throw error;
  }
}
