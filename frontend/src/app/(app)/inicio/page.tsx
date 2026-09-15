import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { backendGet } from "@/lib/backend";
import { InicioContent } from "./inicio-content";

type Curso = {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  activo: boolean;
  destacado: boolean;
  profesor: { nombre: string; apellido: string };
};
type ZoomConfig = { enlaceZoom?: string };
type CoursesResponse = { courses: Curso[] };

async function fetchSafe<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch { return null; }
}

export default async function InicioPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const rol = session.user.rol;

  const [cursos, zoom] = await Promise.all([
    fetchSafe(() => backendGet<CoursesResponse>("/api/courses", session)),
    fetchSafe(() => backendGet<ZoomConfig>("/api/config/zoom", session)),
  ]);

  const todosLosCursos = cursos?.courses ?? [];
  // Los cursos que el ADMIN marco "Destacar en Inicio" van primero (sort estable: si nadie
  // marco nada, se conserva el orden original anio desc / ciclo asc / nombre asc del backend).
  const cursosActivos  = todosLosCursos
    .filter((c) => c.activo)
    .sort((a, b) => Number(b.destacado) - Number(a.destacado));
  const enlaceZoom     = zoom?.enlaceZoom ?? null;

  return (
    <InicioContent
      rol={rol}
      nombre={session.user.nombre}
      cursosActivos={cursosActivos}
      totalCursos={todosLosCursos.length}
      enlaceZoom={enlaceZoom}
    />
  );
}
