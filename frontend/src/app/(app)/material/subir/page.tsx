import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { backendGet } from "@/lib/backend";
import type { CourseOption } from "../types";
import { UploadForm } from "./upload-form";

type SubirMaterialPageProps = {
  searchParams?: Promise<{ cursoId?: string }>;
};

export default async function SubirMaterialPage({ searchParams }: SubirMaterialPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!["ADMIN", "PROFESOR"].includes(session.user.rol)) redirect("/material");
  const selectedCourseId = ((await searchParams)?.cursoId ?? "").trim();

  let courses: CourseOption[] = [];
  try {
    const data = await backendGet<{ courses: CourseOption[] }>("/api/courses", session);
    courses = data?.courses ?? [];
  } catch {
    // continúa con lista vacía; el form mostrará el estado
  }

  return (
    <div>
      <div className="page-header">
        <Link href="/material" style={{ fontSize: 13, color: "var(--texto-tenue)", display: "inline-block", marginBottom: 8 }}>
          ← Material
        </Link>
        <span className="page-eyebrow">Recursos</span>
        <h1 className="page-title">Subir material</h1>
        <p className="page-subtitle">PDF, videos, audios, documentos Office e imágenes</p>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-body">
          <UploadForm courses={courses} selectedCourseId={selectedCourseId} />
        </div>
      </div>
    </div>
  );
}
