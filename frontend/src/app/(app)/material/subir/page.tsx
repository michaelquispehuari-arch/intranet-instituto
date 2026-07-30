import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { backendGet } from "@/lib/backend";
import type { CourseOption } from "../types";
import { SubirContent } from "./subir-content";

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

  return <SubirContent courses={courses} selectedCourseId={selectedCourseId} />;
}
