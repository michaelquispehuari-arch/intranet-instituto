"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";

export default function ConfiguracionPage() {
  const [enlaceZoom, setEnlaceZoom] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/backend/config/zoom")
      .then((r) => r.json())
      .then((data) => {
        setEnlaceZoom(data?.enlaceZoom ?? "");
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/backend/config/zoom", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enlaceZoom }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Enlace guardado correctamente.");
    } else {
      setMessage("Error al guardar. Verifica el enlace.");
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <span className="page-eyebrow">Administración</span>
        <h1 className="page-title">Configuración</h1>
        <p className="page-subtitle">Ajustes globales del ciclo académico</p>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Enlace Zoom del ciclo</h2>
        </div>
        <div className="card-body">
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--texto-secundario)" }}>
            Este enlace es único para todo el ciclo. Todos los roles lo ven en la pantalla del curso.
          </p>
          {loading ? (
            <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>
          ) : (
            <form onSubmit={handleSave} style={{ display: "grid", gap: 12 }}>
              <div className="field">
                <label htmlFor="zoom-url">URL de la reunión Zoom</label>
                <input
                  id="zoom-url"
                  type="url"
                  value={enlaceZoom}
                  onChange={(e) => setEnlaceZoom(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  required
                />
              </div>
              {message && (
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: message.startsWith("Error") ? "var(--desaprobado-texto)" : "var(--aprobado-texto)",
                }}>
                  {message}
                </p>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Guardando…" : "Guardar enlace"}
                </button>
                {enlaceZoom && (
                  <a href={enlaceZoom} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    Probar enlace
                  </a>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
