import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendPost } from "@/lib/backend";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || session.user.rol !== "ADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();

  try {
    const data = await backendPost(`/api/courses/${id}/enrollments`, session, body);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    throw error;
  }
}
