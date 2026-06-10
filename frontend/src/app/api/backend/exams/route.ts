import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendPost } from "@/lib/backend";
import type { ExamListItem } from "@/app/exams/types";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.rol !== "PROFESOR") {
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
