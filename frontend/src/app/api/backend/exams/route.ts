import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendGet, backendPost } from "@/lib/backend";
import type { ExamListItem } from "@/app/(app)/exams/types";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const cursoId = searchParams.get("cursoId");
    const path = cursoId ? `/api/exams?cursoId=${cursoId}` : "/api/exams";
    const data = await backendGet<{ exams: ExamListItem[] }>(path, session);
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
    const body = await request.json();
    const data = await backendPost<{ exam: ExamListItem }>("/api/exams", session, body);

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }

    throw error;
  }
}
