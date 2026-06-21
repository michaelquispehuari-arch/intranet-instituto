"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

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
  notaAsistencia: number | null;
  notaExamenNorm: number | null;
  notaExamenRecup: number | null;
  notaFinal: number | null;
};

type SheetData = { numDias: 1 | 2 | 3; filas: Fila[] };

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

export default function NotasSheetPage() {
  const { id: cursoId } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const soloLectura = session?.user?.rol !== "ADMIN";
  const [data, setData] = useState<SheetData | null>(null);
  const [numDias, setNumDias] = useState<1 | 2 | 3>(3);
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  const [modos, setModos] = useState<Record<string, ModoEstudio>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/backend/courses/${cursoId}/grades-sheet`);
    if (r.ok) {
      const d: SheetData = await r.json();
      setData(d);
      setNumDias(d.numDias ?? 3);
      const initEdits: typeof edits = {};
      const initModos: typeof modos = {};
      d.filas.forEach((f) => {
        initEdits[f.estudianteId] = { ...f.celdasCamara };
        initModos[f.estudianteId] = f.modo;
      });
      setEdits(initEdits);
      setModos(initModos);
    }
    setLoading(false);
  }, [cursoId]);

  useEffect(() => { load(); }, [load]);

  async function saveRow(estudianteId: string) {
    setSaving((s) => ({ ...s, [estudianteId]: true }));
    await fetch(`/api/backend/courses/${cursoId}/grades-sheet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estudianteId,
        modo: modos[estudianteId] ?? "SINCRONICO",
        numDias,
        celdasCamara: edits[estudianteId] ?? {},
      }),
    });
    await load();
    setSaving((s) => ({ ...s, [estudianteId]: false }));
  }

  if (loading) return <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>;

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
        {!soloLectura && (
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
        )}
      </div>

      {/* Leyenda */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16, fontSize: 12, color: "var(--texto-secundario)" }}>
        {[["F", "Falta −6.67"], ["A", "Cámara apagada −5"], ["M", "Mal enfocada −4"], ["C/T", "Código/Tardanza −2"], ["J", "sufijo = Justificada"]].map(([s, d]) => (
          <span key={s}><strong>{s}</strong> {d}</span>
        ))}
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
              <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 600 }}>Exam.</th>
              <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 600 }}>Final</th>
              {!soloLectura && <th style={{ padding: "8px 6px", textAlign: "center" }}></th>}
            </tr>
          </thead>
          <tbody>
            {data.filas.map((fila) => {
              const ntVals = [fila.ntDia1, fila.ntDia2, fila.ntDia3];
              const notaFinal = fila.notaFinal;
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
                    {soloLectura ? (
                      <span style={{ fontSize: 11, color: "var(--texto-tenue)" }}>
                        {(modos[fila.estudianteId] ?? fila.modo).charAt(0)}
                      </span>
                    ) : (
                      <select
                        value={modos[fila.estudianteId] ?? fila.modo}
                        onChange={(e) => setModos((m) => ({ ...m, [fila.estudianteId]: e.target.value as ModoEstudio }))}
                        style={{ fontSize: 11, border: "0.5px solid var(--borde)", borderRadius: 4, padding: "2px 4px" }}
                      >
                        <option value="SINCRONICO">S</option>
                        <option value="ASINCRONICO">A</option>
                        <option value="MIXTO">M</option>
                      </select>
                    )}
                  </td>

                  {dias.map((diaKeys, di) => (
                    <>
                      {diaKeys.map((key) => (
                        <td key={key} style={{ padding: "2px 2px", textAlign: "center" }}>
                          {soloLectura ? (
                            <span style={{ fontSize: 12, color: "var(--texto-tenue)" }}>
                              {edits[fila.estudianteId]?.[key] || "✓"}
                            </span>
                          ) : (
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
                          )}
                        </td>
                      ))}
                      <td key={`nt${di}`} style={{ padding: "4px 6px", textAlign: "center", color: "var(--texto-tenue)", fontSize: 12 }}>
                        {ntVals[di] !== null ? ntVals[di] : "—"}
                      </td>
                    </>
                  ))}

                  <td style={{ padding: "4px 6px", textAlign: "center", fontWeight: 600 }}>
                    {fila.notaAsistencia?.toFixed(1) ?? "—"}
                  </td>
                  <td style={{ padding: "4px 6px", textAlign: "center" }}>
                    {(fila.notaExamenRecup ?? fila.notaExamenNorm)?.toFixed(1) ?? "—"}
                  </td>
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
                  {!soloLectura && (
                    <td style={{ padding: "4px 6px", textAlign: "center" }}>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 12, padding: "4px 10px" }}
                        onClick={() => saveRow(fila.estudianteId)}
                        disabled={saving[fila.estudianteId]}
                      >
                        {saving[fila.estudianteId] ? "…" : "Guardar"}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "var(--texto-tenue)" }}>
        NT = nota de transcripción (puesta por revisor) · Exam. = nota del examen del módulo · Final = ⌊(Asist + Exam) / 2⌋
      </div>
    </div>
  );
}
