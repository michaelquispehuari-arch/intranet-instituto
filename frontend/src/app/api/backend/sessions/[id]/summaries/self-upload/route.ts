import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendPostForm } from "@/lib/backend";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.rol !== "ESTUDIANTE") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const formData = await request.formData();
    const data = await backendPostForm(`/api/sessions/${id}/summaries/self-upload`, session, formData);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    throw error;
  }
}
