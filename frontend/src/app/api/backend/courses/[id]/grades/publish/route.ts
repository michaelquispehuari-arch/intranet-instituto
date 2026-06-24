import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendPost } from "@/lib/backend";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || session.user.rol !== "ADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const data = await backendPost(`/api/courses/${id}/grades/publish`, session, {});
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    throw error;
  }
}
