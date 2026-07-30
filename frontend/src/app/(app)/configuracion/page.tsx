"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

type ServiceStatus = {
  status: "ok" | "missing" | "error";
  message?: string;
};

type ReadinessStatus = {
  status: "ready" | "degraded";
  services: Record<string, ServiceStatus>;
};

export default function ConfiguracionPage() {
  const { t } = useTranslation();
  const [enlaceZoom, setEnlaceZoom] = useState("");
  const [readiness, setReadiness] = useState<ReadinessStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
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
    setIsError(false);
    const res = await fetch("/api/backend/config/zoom", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enlaceZoom }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage(t("configuracion.zoomLink.saveSuccess"));
    } else {
      setIsError(true);
      setMessage(t("configuracion.zoomLink.saveError"));
    }
  }

  return (
    <div>
      <div className="page-header">
        <span className="page-eyebrow">{t("configuracion.eyebrow")}</span>
        <h1 className="page-title">{t("configuracion.title")}</h1>
        <p className="page-subtitle">{t("configuracion.subtitle")}</p>
      </div>

      <div className="card" style={{ maxWidth: 720, marginBottom: 16 }}>
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t("configuracion.servicesStatus.title")}</h2>
          <span className={`status-pill ${readiness?.status === "ready" ? "ok" : "warning"}`}>
            {readiness?.status === "ready" ? t("configuracion.servicesStatus.ready") : t("configuracion.servicesStatus.pending")}
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
              {t("configuracion.servicesStatus.unavailable")}
            </p>
          )}
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t("configuracion.zoomLink.title")}</h2>
        </div>
        <div className="card-body">
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--texto-secundario)" }}>
            {t("configuracion.zoomLink.description")}
          </p>
          {loading ? (
            <p style={{ color: "var(--texto-tenue)" }}>{t("configuracion.loading")}</p>
          ) : (
            <form onSubmit={handleSave} style={{ display: "grid", gap: 12 }}>
              <div className="field">
                <label htmlFor="zoom-url">{t("configuracion.zoomLink.urlLabel")}</label>
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
                  color: isError ? "var(--desaprobado-texto)" : "var(--aprobado-texto)",
                }}>
                  {message}
                </p>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t("configuracion.zoomLink.saving") : t("configuracion.zoomLink.saveButton")}
                </button>
                {enlaceZoom && (
                  <a href={enlaceZoom} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    {t("configuracion.zoomLink.testLink")}
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
