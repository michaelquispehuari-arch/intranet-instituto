import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendGet } from "@/lib/backend";
import type { MaterialItem } from "@/app/(app)/material/types";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type DownloadResponse = {
  material: MaterialItem;
  url: string;
  expiresInSeconds: number;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { id } = await context.params;
  const forceDownload = new URL(request.url).searchParams.get("attachment") === "1";
  try {
    const qs = forceDownload ? "?attachment=1" : "";
    const data = await backendGet<DownloadResponse>(`/api/content/${id}/download${qs}`, session);

    return NextResponse.redirect(data.url);
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }

    throw error;
  }
}
