import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { backendDelete, backendGet } from "@/lib/backend";
import type { MaterialItem } from "./types";
import { MaterialContent } from "./material-content";

type MaterialPageProps = {
  searchParams?: Promise<{ q?: string; cursoId?: string }>;
};

async function deleteMaterial(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "PROFESOR"].includes(session.user.rol)) redirect("/login");
  const materialId = String(formData.get("materialId") ?? "");
  await backendDelete(`/api/content/${materialId}`, session);
  redirect("/material");
}

export default async function MaterialPage({ searchParams }: MaterialPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const params = await searchParams;
  const query = (params?.q ?? "").trim().toLowerCase();
  const cursoId = (params?.cursoId ?? "").trim();
  const canUpload = session.user.rol === "PROFESOR" || session.user.rol === "ADMIN";
  const canDelete = session.user.rol === "ADMIN" || session.user.rol === "PROFESOR";

  let materials: MaterialItem[] = [];
  let fetchError = false;

  try {
    const data = await backendGet<{ materials: MaterialItem[] }>("/api/content", session);
    const all = data?.materials ?? [];
    materials = all.filter((m) => {
      const matchesCourse = cursoId ? m.curso.id === cursoId : true;
      const matchesQuery = query
        ? [m.nombre, m.descripcion ?? "", m.tipoArchivo, m.curso.nombre, m.profesor.nombre, m.profesor.apellido]
            .join(" ")
            .toLowerCase()
            .includes(query)
        : true;

      return matchesCourse && matchesQuery;
    });
  } catch {
    fetchError = true;
  }

  return (
    <MaterialContent
      materials={materials}
      fetchError={fetchError}
      query={query}
      cursoId={cursoId}
      canUpload={canUpload}
      canDelete={canDelete}
      deleteMaterial={deleteMaterial}
    />
  );
}
