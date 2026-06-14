"use client";

import { useEffect, useState } from "react";

type ServiceStatus = {
  status: "ok" | "missing" | "error";
  message?: string;
};

type ReadinessStatus = {
  status: "ready" | "degraded";
  services: Record<string, ServiceStatus>;
};

export default function ConfiguracionPage() {
  const [enlaceZoom, setEnlaceZoom] = useState("");
  const [readiness, setReadiness] = useState<ReadinessStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/backend/config/zoom").then((r) => r.json()),
      fetch("/api/backend/health/ready").then((r) => r.json()),
    ])
      .then(([zoomData, readinessData]) => {
        setEnlaceZoom(zoomData?.enlaceZoom ?? "");
        setReadiness(readinessData?.services ? readinessData : null);
        setLoading(false);
      })
      .catch(() => {
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
    <div>
      <div className="page-header">
        <span className="page-eyebrow">Administración</span>
        <h1 className="page-title">Configuración</h1>
        <p className="page-subtitle">Ajustes globales del ciclo académico</p>
      </div>

      <div className="card" style={{ maxWidth: 720, marginBottom: 16 }}>
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Estado de servicios</h2>
          <span className={`status-pill ${readiness?.status === "ready" ? "ok" : "warning"}`}>
            {readiness?.status === "ready" ? "Listo" : "Pendiente"}
          </span>
        </div>
        <div className="card-body">
          {readiness ? (
            <dl className="service-list">
              {Object.entries(readiness.services).map(([name, service]) => (
                <div key={name}>
                  <dt>{name.toUpperCase()}</dt>
                  <dd>
                    <span className={`status-pill ${service.status}`}>{service.status}</span>
                    {service.message ? <small>{service.message}</small> : null}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p style={{ margin: 0, color: "var(--texto-tenue)" }}>
              No se pudo consultar el diagnóstico del backend.
            </p>
          )}
        </div>
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
    </div>
  );
}
