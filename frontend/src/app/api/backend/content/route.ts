import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendGet, backendPostForm } from "@/lib/backend";
import type { MaterialItem } from "@/app/(app)/material/types";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const data = await backendGet<{ materials: MaterialItem[] }>(`/api/content${qs ? `?${qs}` : ""}`, session);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !["ADMIN", "PROFESOR"].includes(session.user.rol)) {
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
