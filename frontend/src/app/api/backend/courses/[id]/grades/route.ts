import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendGet } from "@/lib/backend";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || session.user.rol !== "PROFESOR") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const data = await backendGet(`/api/courses/${id}/grades`, session);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    throw error;
  }
}
