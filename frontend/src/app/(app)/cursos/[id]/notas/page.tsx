"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { notaAsistencia13 } from "@/lib/nota-asistencia";

type ModoEstudio = "SINCRONICO" | "ASINCRONICO" | "MIXTO";

type Fila = {
  estudianteId: string;
  codigo: string;
  nombre: string;
  apellido: string;
  modo: ModoEstudio;
  celdasCamara: Record<string, string>;
  ntDia1: number | null;
  ntDia2: number | null;
  ntDia3: number | null;
  forumEntregado: boolean;
  notaAsistencia: number | null;
  notaExamenNorm: number | null;
  notaExamenRecup: number | null;
  notaFinal: number | null;
};

type FilaPublicada = {
  estudianteId: string;
  codigo: string;
  nombre: string;
  apellido: string;
  notaFinalPublicada: number | null;
};

type SheetData = { numDias: 1 | 2 | 3; tipo?: string; filas: Fila[] };
type PublishedData = { publicadas: boolean; notasPublicadasEn: string | null; filas: FilaPublicada[] };

const SIMBOLOS = ["", "F", "A", "M", "C", "T", "FJ", "AJ", "MJ", "CJ", "TJ"];
const DIAS_KEYS = [
  ["d1c1", "d1c2", "d1c3"],
  ["d2c1", "d2c2", "d2c3"],
  ["d3c1", "d3c2", "d3c3"],
];

function chipClase(nota: number | null) {
  if (nota === null) return { color: "var(--texto-tenue)", bg: "#F6F7F5" };
  if (nota >= 11) return { color: "var(--aprobado-texto)", bg: "var(--aprobado-fondo)" };
  return { color: "var(--desaprobado-texto)", bg: "var(--desaprobado-fondo)" };
}

// Vista previa en vivo: misma fórmula que el backend (frontend/src/lib/nota-asistencia.ts),
// recalculada en cada cambio de celda para que Asist./Final se actualicen sin tener que guardar.
function calcularPreview(
  modo: ModoEstudio,
  celdas: Record<string, string>,
  numDias: 1 | 2 | 3,
  ntVals: (number | null)[],
  notaExamen: number,
): { notaAsistencia: number; notaFinal: number } {
  const row = [
    modo,
    celdas.d1c1 ?? "", celdas.d1c2 ?? "", celdas.d1c3 ?? "", ntVals[0] ?? "",
    celdas.d2c1 ?? "", celdas.d2c2 ?? "", celdas.d2c3 ?? "", ntVals[1] ?? "",
    celdas.d3c1 ?? "", celdas.d3c2 ?? "", celdas.d3c3 ?? "", ntVals[2] ?? "",
  ];
  const notaAsistencia = notaAsistencia13(row, numDias);
  const notaFinal = Math.floor((notaAsistencia + notaExamen) / 2);
  return { notaAsistencia, notaFinal };
}

export default function NotasSheetPage() {
  const { id: cursoId } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const rol = session?.user?.rol;

  // ADMIN state
  const [data, setData] = useState<SheetData | null>(null);
  const [numDias, setNumDias] = useState<1 | 2 | 3>(3);
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  const [modos, setModos] = useState<Record<string, ModoEstudio>>({});
  const [forumGradeEdits, setForumGradeEdits] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  // PROFESOR state
  const [pubData, setPubData] = useState<PublishedData | null>(null);

  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (rol === "ADMIN") {
      const r = await fetch(`/api/backend/courses/${cursoId}/grades-sheet`);
      if (r.ok) {
        const d: SheetData = await r.json();
        setData(d);
        setNumDias(d.numDias ?? 3);
        const initEdits: Record<string, Record<string, string>> = {};
        const initModos: Record<string, ModoEstudio> = {};
        const initForumGrades: Record<string, string> = {};
        d.filas.forEach((f) => {
          initEdits[f.estudianteId] = { ...f.celdasCamara };
          initModos[f.estudianteId] = f.modo;
          if (!f.forumEntregado) initForumGrades[f.estudianteId] = f.notaExamenNorm !== null ? String(f.notaExamenNorm) : "";
        });
        setEdits(initEdits);
        setModos(initModos);
        setForumGradeEdits(initForumGrades);
      }
    } else if (rol === "PROFESOR") {
      const r = await fetch(`/api/backend/courses/${cursoId}/grades`);
      if (r.ok) setPubData(await r.json());
    }
    setLoading(false);
  }, [cursoId, rol]);

  useEffect(() => { if (rol) load(); }, [load, rol]);

  // Guarda todas las filas de la grilla (una petición por alumno, en paralelo).
  // Ya no hay botón "Guardar" por fila: todo se guarda de una vez al mandar/publicar notas.
  async function saveAllRows(): Promise<boolean> {
    if (!data) return true;
    const resultados = await Promise.all(
      data.filas.map(async (fila) => {
        const incluirNotaForum = data.tipo === "DIPLOMADO" && !fila.forumEntregado;
        const raw = forumGradeEdits[fila.estudianteId];
        const r = await fetch(`/api/backend/courses/${cursoId}/grades-sheet`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estudianteId: fila.estudianteId,
            modo: modos[fila.estudianteId] ?? fila.modo,
            numDias,
            celdasCamara: edits[fila.estudianteId] ?? {},
            ...(incluirNotaForum ? { notaForumManual: raw !== undefined && raw !== "" ? Number(raw) : null } : {}),
          }),
        });
        return r.ok;
      })
    );
    return resultados.every(Boolean);
  }

  async function handlePublish() {
    setPublishing(true);
    const guardadoOk = await saveAllRows();
    if (!guardadoOk) {
      alert("Hubo un error guardando alguna fila. Revisa la grilla e intenta de nuevo.");
      await load();
      setPublishing(false);
      return;
    }
    const r = await fetch(`/api/backend/courses/${cursoId}/grades/publish`, { method: "POST" });
    if (r.ok) {
      const d = await r.json() as { notasPublicadasEn: string };
      setPublishedAt(d.notasPublicadasEn);
    }
    await load();
    setPublishing(false);
  }

  if (loading) return <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>;

  // ── PROFESOR view ─────────────────────────────────────────────────────────
  if (rol === "PROFESOR") {
    return (
      <div>
        <Link href={`/cursos/${cursoId}`} style={{ fontSize: 13, color: "var(--texto-tenue)", display: "inline-block", marginBottom: 12 }}>
          ← Volver al curso
        </Link>
        <div className="page-header">
          <span className="page-eyebrow">Notas del curso</span>
          <h1 className="page-title">Calificaciones publicadas</h1>
        </div>

        {!pubData || !pubData.publicadas ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <p className="empty-state-title">Notas aún no publicadas</p>
              <p>El administrador aún no ha publicado las notas de este curso.</p>
            </div>
          </div>
        ) : (
          <div className="card">
            {pubData.notasPublicadasEn && (
              <p style={{ fontSize: 12, color: "var(--texto-tenue)", margin: "0 0 12px" }}>
                Publicadas el {new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(pubData.notasPublicadasEn))}
              </p>
            )}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--verde-sidebar)", color: "#fff" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600 }}>Cód.</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600 }}>Apellidos y Nombres</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600 }}>Nota Final</th>
                  </tr>
                </thead>
                <tbody>
                  {pubData.filas.map((f) => {
                    const chip = chipClase(f.notaFinalPublicada);
                    return (
                      <tr key={f.estudianteId} style={{ borderBottom: "0.5px solid var(--borde)" }}>
                        <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{f.codigo || "—"}</td>
                        <td style={{ padding: "7px 10px", fontWeight: 500 }}>{f.apellido}, {f.nombre}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center" }}>
                          <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 6, fontWeight: 700, color: chip.color, background: chip.bg }}>
                            {f.notaFinalPublicada ?? "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── ADMIN view ────────────────────────────────────────────────────────────
  if (!data || data.filas.length === 0) {
    return (
      <div>
        <Link href={`/cursos/${cursoId}`} style={{ fontSize: 13, color: "var(--texto-tenue)", display: "inline-block", marginBottom: 12 }}>
          ← Volver al curso
        </Link>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <p className="empty-state-title">Sin alumnos inscritos</p>
            <p>Inscribe estudiantes al curso para ver la grilla de notas.</p>
          </div>
        </div>
      </div>
    );
  }

  const dias = DIAS_KEYS.slice(0, numDias);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link href={`/cursos/${cursoId}`} style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
          ← Volver al curso
        </Link>
      </div>

      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="page-eyebrow">Notas semanales</span>
          <h1 className="page-title">Grilla de calificaciones</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Días de clase:</label>
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                onClick={() => setNumDias(n)}
                className={`btn ${numDias === n ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "4px 12px", fontSize: 13 }}
              >
                {n}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <button
              className="btn btn-primary"
              style={{ fontSize: 13 }}
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? "Guardando y publicando…" : "Mandar notas"}
            </button>
            {publishedAt && (
              <span style={{ fontSize: 11, color: "var(--texto-tenue)" }}>
                Publicadas {new Intl.DateTimeFormat("es-PE", { timeStyle: "short", timeZone: "America/Lima" }).format(new Date(publishedAt))}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="card" style={{ marginBottom: 16, padding: "12px 16px", fontSize: 13 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: "3px 8px 3px 0", fontWeight: 700, whiteSpace: "nowrap" }}>F</td>
              <td style={{ padding: "3px 16px 3px 0" }}>Falta y/o ausencia resta 6.7</td>
              <td style={{ padding: "3px 8px 3px 0", fontWeight: 700, whiteSpace: "nowrap" }}>C</td>
              <td style={{ padding: "3px 16px 3px 0" }}>Código mal digitado -2 pts</td>
              <td rowSpan={3} style={{ padding: "3px 0 3px 16px", borderLeft: "0.5px solid var(--borde)", verticalAlign: "top", color: "var(--texto-secundario)" }}>
                <strong>Nota:</strong> Si hay una J delante, justificará realmente cuando tenga NT. La justificación es de forma proporcional a la NT.
              </td>
            </tr>
            <tr>
              <td style={{ padding: "3px 8px 3px 0", fontWeight: 700 }}>A</td>
              <td style={{ padding: "3px 16px 3px 0" }}>Cámara apagada -5 pts</td>
              <td style={{ padding: "3px 8px 3px 0", fontWeight: 700 }}>T</td>
              <td style={{ padding: "3px 16px 3px 0" }}>Tardanza -2 pts</td>
            </tr>
            <tr>
              <td style={{ padding: "3px 8px 3px 0", fontWeight: 700 }}>M</td>
              <td style={{ padding: "3px 16px 3px 0" }}>Cámara mal enfocada -4 pts</td>
              <td style={{ padding: "3px 8px 3px 0", fontWeight: 700 }}>NT</td>
              <td style={{ padding: "3px 16px 3px 0" }}>Nota de Transcripción (Max. 18)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
          <thead>
            <tr style={{ background: "var(--verde-sidebar)", color: "#fff" }}>
              <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>Cód.</th>
              <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>Apellidos y Nombres</th>
              <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 600 }}>Modo</th>
              {dias.map((_, di) => (
                <>
                  <th key={`d${di+1}h`} colSpan={3} style={{ padding: "6px 4px", textAlign: "center", fontWeight: 600, borderLeft: "1px solid rgba(255,255,255,0.2)" }}>
                    Día {di + 1}
                  </th>
                  <th key={`d${di+1}nt`} style={{ padding: "6px 4px", textAlign: "center", fontWeight: 400, fontSize: 11 }}>NT</th>
                </>
              ))}
              <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 600 }}>Asist.</th>
              {data.tipo === "DIPLOMADO" ? (
                <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 600, borderLeft: "1px solid rgba(255,255,255,0.2)", whiteSpace: "nowrap" }}>Nota de Forum</th>
              ) : (
                <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 600 }}>Exam.</th>
              )}
              <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 600 }}>Final</th>
            </tr>
          </thead>
          <tbody>
            {data.filas.map((fila) => {
              const ntVals = [fila.ntDia1, fila.ntDia2, fila.ntDia3];
              const modoActual = modos[fila.estudianteId] ?? fila.modo;
              const celdasActuales = edits[fila.estudianteId] ?? fila.celdasCamara;
              const forumRaw = forumGradeEdits[fila.estudianteId];
              const notaExamenEfectivo =
                data.tipo === "DIPLOMADO" && !fila.forumEntregado
                  ? (forumRaw !== undefined && forumRaw !== "" && !isNaN(Number(forumRaw)) ? Number(forumRaw) : 0)
                  : fila.notaExamenRecup ?? fila.notaExamenNorm ?? 0;
              const preview = calcularPreview(modoActual, celdasActuales, numDias, ntVals, notaExamenEfectivo);
              const notaFinal = preview.notaFinal;
              const chip = chipClase(notaFinal);

              return (
                <tr key={fila.estudianteId} style={{ borderBottom: "0.5px solid var(--borde)" }}>
                  <td style={{ padding: "6px 10px", color: "var(--texto-tenue)", whiteSpace: "nowrap" }}>
                    {fila.codigo || "—"}
                  </td>
                  <td style={{ padding: "6px 10px", fontWeight: 500, whiteSpace: "nowrap" }}>
                    {fila.apellido}, {fila.nombre}
                  </td>
                  <td style={{ padding: "4px 4px", textAlign: "center" }}>
                    <select
                      value={modos[fila.estudianteId] ?? fila.modo}
                      onChange={(e) => setModos((m) => ({ ...m, [fila.estudianteId]: e.target.value as ModoEstudio }))}
                      style={{ fontSize: 11, border: "0.5px solid var(--borde)", borderRadius: 4, padding: "2px 4px" }}
                    >
                      <option value="SINCRONICO">S</option>
                      <option value="ASINCRONICO">A</option>
                      <option value="MIXTO">M</option>
                    </select>
                  </td>

                  {dias.map((diaKeys, di) => (
                    <>
                      {diaKeys.map((key) => (
                        <td key={key} style={{ padding: "2px 2px", textAlign: "center" }}>
                          <select
                            value={edits[fila.estudianteId]?.[key] ?? ""}
                            onChange={(e) =>
                              setEdits((prev) => ({
                                ...prev,
                                [fila.estudianteId]: { ...prev[fila.estudianteId], [key]: e.target.value },
                              }))
                            }
                            style={{ fontSize: 12, border: "0.5px solid var(--borde)", borderRadius: 4, padding: "2px 4px", width: 48 }}
                          >
                            {SIMBOLOS.map((s) => <option key={s} value={s}>{s || "✓"}</option>)}
                          </select>
                        </td>
                      ))}
                      <td key={`nt${di}`} style={{ padding: "4px 6px", textAlign: "center", color: "var(--texto-tenue)", fontSize: 12 }}>
                        {data.tipo === "DIPLOMADO" ? "—" : (ntVals[di] !== null ? ntVals[di] : "—")}
                      </td>
                    </>
                  ))}

                  <td style={{ padding: "4px 6px", textAlign: "center", fontWeight: 600 }}>
                    {preview.notaAsistencia.toFixed(1)}
                  </td>
                  {data.tipo === "DIPLOMADO" ? (
                    <td style={{ padding: "4px 6px", textAlign: "center", fontWeight: 600 }}>
                      {fila.forumEntregado ? (
                        (fila.notaExamenRecup ?? fila.notaExamenNorm)?.toFixed(1) ?? "—"
                      ) : (
                        <input
                          type="number"
                          min={0}
                          max={20}
                          step={0.5}
                          placeholder="Sin forum"
                          value={forumGradeEdits[fila.estudianteId] ?? ""}
                          onChange={(e) => setForumGradeEdits((p) => ({ ...p, [fila.estudianteId]: e.target.value }))}
                          style={{ width: 64, textAlign: "center", border: "0.5px solid var(--borde)", borderRadius: 4, padding: "2px 4px", fontSize: 12 }}
                        />
                      )}
                    </td>
                  ) : (
                    <td style={{ padding: "4px 6px", textAlign: "center" }}>
                      {(fila.notaExamenRecup ?? fila.notaExamenNorm)?.toFixed(1) ?? "—"}
                    </td>
                  )}
                  <td style={{ padding: "4px 6px", textAlign: "center" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: 13,
                      color: chip.color,
                      background: chip.bg,
                    }}>
                      {notaFinal ?? "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "var(--texto-tenue)" }}>
        {data.tipo === "DIPLOMADO"
          ? "Nota de Forum = nota puesta al revisar el Forum de la semana en Corregir forums, reemplaza a la nota de examen (si el alumno ya subió su forum, solo se edita ahí). Si no subió nada, se puede poner la nota directo aquí · Final = ⌊(Asist + Nota de Forum) / 2⌋"
          : "NT = nota de transcripción (puesta por revisor) · Exam. = nota del examen del módulo · Final = ⌊(Asist + Exam) / 2⌋"}
        {" · "}Los cambios de la grilla se guardan recién al hacer clic en &quot;Mandar notas&quot; (ya no hay botón de guardar por fila).
      </div>
    </div>
  );
}
