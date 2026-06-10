import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { SearchForm } from "@/components/search-form";
import { authOptions } from "@/lib/auth";
import { backendDelete, backendGet } from "@/lib/backend";
import type { MaterialItem } from "./types";

type ContentPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

function formatBytes(value: string) {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** unitIndex;

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

async function deleteMaterial(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || !["ADMIN", "PROFESOR"].includes(session.user.rol)) {
    redirect("/login");
  }

  const materialId = String(formData.get("materialId") ?? "");
  await backendDelete(`/api/content/${materialId}`, session);
  redirect("/content");
}

export default async function ContentPage({ searchParams }: ContentPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const data = await backendGet<{ materials: MaterialItem[] }>("/api/content", session);
  const query = ((await searchParams)?.q ?? "").trim().toLowerCase();
  const materials = query
    ? data.materials.filter((material) =>
        [
          material.nombre,
          material.descripcion ?? "",
          material.tipoArchivo,
          material.curso.nombre,
          material.profesor.nombre,
          material.profesor.apellido,
          material.profesor.email,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : data.materials;
  const canUpload = session.user.rol === "PROFESOR";
  const canDelete = session.user.rol === "ADMIN" || session.user.rol === "PROFESOR";

  return (
    <main className="page">
      <div className="shell dashboard">
        <header className="topbar">
          <div className="brand">
            <strong>Materiales</strong>
            <span className="muted">{session.user.email}</span>
          </div>
          <div className="toolbar">
            {canUpload ? (
              <Link className="button" href="/content/upload">
                Subir material
              </Link>
            ) : null}
            <LogoutButton />
          </div>
        </header>

        <section className="panel hero">
          <span className="badge">{session.user.rol}</span>
          <h1>Biblioteca de cursos</h1>
          <p className="muted">Archivos disponibles segun tus cursos y permisos.</p>
        </section>

        <SearchForm value={query} placeholder="Nombre, curso, profesor o tipo de archivo" />

        {materials.length === 0 ? (
          <section className="panel empty-state">
            <strong>No hay materiales disponibles.</strong>
            <p className="muted">Cuando un profesor suba archivos, apareceran aqui.</p>
          </section>
        ) : (
          <section className="grid" aria-label="Materiales disponibles">
            {materials.map((material) => (
              <article className="panel module-card" key={material.id}>
                <div>
                  <span className="badge">{material.tipoArchivo.toUpperCase()}</span>
                  <h2>{material.nombre}</h2>
                  <p>{material.descripcion ?? "Sin descripcion"}</p>
                  <dl className="meta-list">
                    <div>
                      <dt>Curso</dt>
                      <dd>{material.curso.nombre}</dd>
                    </div>
                    <div>
                      <dt>Tamano</dt>
                      <dd>{formatBytes(material.tamanoBytes)}</dd>
                    </div>
                    <div>
                      <dt>Profesor</dt>
                      <dd>
                        {material.profesor.nombre} {material.profesor.apellido}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="card-actions">
                  <a className="button secondary" href={`/api/backend/content/${material.id}/download`}>
                    Descargar
                  </a>
                  {canDelete ? (
                    <form action={deleteMaterial}>
                      <input name="materialId" type="hidden" value={material.id} />
                      <button className="button secondary danger-button" type="submit">
                        Eliminar
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
