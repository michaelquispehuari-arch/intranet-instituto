import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendPostForm } from "@/lib/backend";
import type { MaterialItem } from "@/app/content/types";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.rol !== "PROFESOR") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const data = await backendPostForm<{ material: MaterialItem }>("/api/content", session, formData);

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }

    throw error;
  }
}
