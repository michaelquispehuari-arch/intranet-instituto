import { env } from "@/lib/env";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.rol !== "ADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const response = await fetch(`${env.BACKEND_URL}/health/ready`, {
      cache: "no-store",
    });
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "No se pudo consultar /health/ready del backend" },
      { status: 503 },
    );
  }
}
