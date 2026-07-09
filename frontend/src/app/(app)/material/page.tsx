import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { backendDelete, backendGet } from "@/lib/backend";
import type { MaterialItem } from "./types";

type MaterialPageProps = {
  searchParams?: Promise<{ q?: string; cursoId?: string }>;
};

function formatBytes(value: string) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** i;
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[i]}`;
}

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
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="page-eyebrow">Recursos</span>
          <h1 className="page-title">Biblioteca de material</h1>
          <p className="page-subtitle">Archivos disponibles según tus cursos y permisos</p>
        </div>
        {canUpload && (
          <Link href="/material/subir" className="btn btn-primary">
            + Subir material
          </Link>
        )}
      </div>

      {/* Buscador */}
      <form method="get" style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          name="q"
          defaultValue={query}
          placeholder="Buscar por nombre, curso, profesor o tipo…"
          style={{ flex: 1, border: "0.5px solid var(--borde)", borderRadius: 8, padding: "8px 12px", fontSize: 14 }}
        />
        <button type="submit" className="btn btn-secondary">Filtrar</button>
        {cursoId && <input name="cursoId" type="hidden" value={cursoId} />}
        {query && <Link href="/material" className="btn btn-secondary">Limpiar</Link>}
      </form>

      {fetchError && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <p className="empty-state-title">No se pudo cargar el material</p>
            <p>El servidor de recursos no está disponible en este momento. Intenta de nuevo más tarde.</p>
          </div>
        </div>
      )}

      {!fetchError && materials.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <p className="empty-state-title">{query ? "Sin resultados" : "Aún no hay material"}</p>
            <p>
              {query
                ? "No hay archivos que coincidan con esa búsqueda."
                : canUpload
                  ? "Sube el primer archivo con el botón de arriba."
                  : "Cuando un profesor suba archivos, aparecerán aquí."}
            </p>
          </div>
        </div>
      )}

      {!fetchError && materials.length > 0 && (
        <div className="stat-grid">
          {materials.map((m) => (
            <div key={m.id} className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ambar-accion)" }}>
                  {m.tipoArchivo.toUpperCase()}
                </span>
                <span style={{ fontSize: 12, color: "var(--texto-tenue)" }}>{formatBytes(m.tamanoBytes)}</span>
              </div>

              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600 }}>{m.nombre}</h2>
                <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--texto-secundario)" }}>
                  {m.descripcion ?? "Sin descripción"}
                </p>
                <div style={{ fontSize: 12, color: "var(--texto-tenue)" }}>
                  {m.curso.nombre}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                <a
                  href={`/api/backend/content/${m.id}/download?attachment=1`}
                  className="btn btn-secondary"
                  style={{ fontSize: 13 }}
                >
                  Descargar
                </a>
                {canDelete && (
                  <form action={deleteMaterial} style={{ display: "contents" }}>
                    <input name="materialId" type="hidden" value={m.id} />
                    <button
                      type="submit"
                      className="btn btn-secondary"
                      style={{ fontSize: 13, color: "var(--desaprobado-texto)", borderColor: "var(--desaprobado-texto)" }}
                    >
                      Eliminar
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
