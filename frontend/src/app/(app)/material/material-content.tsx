"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { MaterialItem } from "./types";

function formatBytes(value: string) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** i;
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[i]}`;
}

type MaterialContentProps = {
  materials: MaterialItem[];
  fetchError: boolean;
  query: string;
  cursoId: string;
  canUpload: boolean;
  canDelete: boolean;
  deleteMaterial: (formData: FormData) => void;
};

export function MaterialContent({
  materials,
  fetchError,
  query,
  cursoId,
  canUpload,
  canDelete,
  deleteMaterial,
}: MaterialContentProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="page-eyebrow">{t("material.eyebrow")}</span>
          <h1 className="page-title">{t("material.title")}</h1>
          <p className="page-subtitle">{t("material.subtitle")}</p>
        </div>
        {canUpload && (
          <Link href="/material/subir" className="btn btn-primary">
            {t("material.uploadButton")}
          </Link>
        )}
      </div>

      {/* Buscador */}
      <form method="get" style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          name="q"
          defaultValue={query}
          placeholder={t("material.searchPlaceholder")}
          style={{ flex: 1, border: "0.5px solid var(--borde)", borderRadius: 8, padding: "8px 12px", fontSize: 14 }}
        />
        <button type="submit" className="btn btn-secondary">{t("material.filterButton")}</button>
        {cursoId && <input name="cursoId" type="hidden" value={cursoId} />}
        {query && <Link href="/material" className="btn btn-secondary">{t("material.clearButton")}</Link>}
      </form>

      {fetchError && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <p className="empty-state-title">{t("material.fetchError.title")}</p>
            <p>{t("material.fetchError.description")}</p>
          </div>
        </div>
      )}

      {!fetchError && materials.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <p className="empty-state-title">{query ? t("material.empty.noResultsTitle") : t("material.empty.noMaterialTitle")}</p>
            <p>
              {query
                ? t("material.empty.noResultsDescription")
                : canUpload
                  ? t("material.empty.canUploadDescription")
                  : t("material.empty.noUploadDescription")}
            </p>
          </div>
        </div>
      )}

      {!fetchError && materials.length > 0 && (
        <div className="card-grid">
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
                  {m.descripcion ?? t("material.noDescription")}
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
                  {t("material.download")}
                </a>
                {canDelete && (
                  <form action={deleteMaterial} style={{ display: "contents" }}>
                    <input name="materialId" type="hidden" value={m.id} />
                    <button
                      type="submit"
                      className="btn btn-secondary"
                      style={{ fontSize: 13, color: "var(--desaprobado-texto)", borderColor: "var(--desaprobado-texto)" }}
                    >
                      {t("material.delete")}
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
