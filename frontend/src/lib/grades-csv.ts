import { normalizeCsvHeader, parseCsv, readCsvFile } from "./csv";

export type ModoEstudio = "SINCRONICO" | "ASINCRONICO" | "MIXTO";

export type CamaraCeldas = Partial<Record<
  "d1c1" | "d1c2" | "d1c3" | "d2c1" | "d2c2" | "d2c3" | "d3c1" | "d3c2" | "d3c3",
  string
>>;

export type ParsedGradeRow = {
  codigo: string;
  nombre: string;
  modo?: ModoEstudio;
  celdasCamara: CamaraCeldas;
  notaExamenManual?: number;
  notaExamenRecupManual?: number;
};

const SIMBOLOS_VALIDOS = new Set(["", "F", "A", "M", "C", "T", "FJ", "AJ", "MJ", "CJ", "TJ"]);

function normalizarSimbolo(v: string): string {
  const s = v.trim().toUpperCase();
  return SIMBOLOS_VALIDOS.has(s) ? s : "";
}

// Notas fuera de 0-20 son datos corruptos de la hoja original (celdas corridas,
// formulas rotas, etc.) -- se ignoran en vez de tumbar la importacion completa
// (el backend rechaza el batch entero si una sola fila trae una nota invalida).
function parseNota(v: string): number | undefined {
  const t = v.trim().replace(",", ".");
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 20) return undefined;
  return n;
}

// Parsea el CSV de la grilla de notas (formato RTS: Código | Apellidos y Nombres |
// Modo de estudio | REGISTRO DE CAMARA (Día1..Día3, 1h/2h/3h/NT cada uno) | NOTA DE
// ASIST. | NOTA EXAMEN o NOTA FORUM (NORM./RECUP.) | NOTA FINAL). Las columnas se
// ubican por palabra clave en el encabezado, no por posición fija, para tolerar
// variaciones menores del export. NOTA DE ASIST. y NOTA FINAL nunca se importan:
// el backend las vuelve a calcular siempre con la fórmula oficial. Las celdas NT
// tampoco se importan: se traen solo de la transcripción revisada.
export async function parseGradesCsv(file: File): Promise<{ numDias: 1 | 2 | 3; rows: ParsedGradeRow[] } | { error: string }> {
  const text = await readCsvFile(file);
  const csvRows = parseCsv(text);

  const headerIdx = csvRows.findIndex((r) => {
    const norm = r.map(normalizeCsvHeader);
    return norm.some((c) => c.includes("codigo")) && norm.some((c) => c.includes("apellidos"));
  });
  if (headerIdx === -1) {
    return { error: "No se encontró la fila de encabezado (columnas 'Código' y 'Apellidos y Nombres')." };
  }

  const rawHeader = csvRows[headerIdx];
  const header = rawHeader.map(normalizeCsvHeader);
  const codigoCol = header.findIndex((h) => h.includes("codigo"));
  const nombreCol = header.findIndex((h) => h.includes("apellidos"));
  const modoCol = header.findIndex((h) => h.includes("modo"));
  const camaraCol = header.findIndex((h) => h.includes("camara"));
  const asistCol = header.findIndex((h) => h.includes("asist"));
  const examenCol = header.findIndex((h) => h.includes("examen") || h.includes("forum"));

  if (codigoCol === -1 || nombreCol === -1) {
    return { error: `No se reconocieron las columnas "Código" y/o "Apellidos y Nombres". Encabezados: ${rawHeader.join(" | ")}` };
  }

  let numDias: 1 | 2 | 3 = 3;
  if (camaraCol !== -1 && asistCol !== -1 && asistCol > camaraCol) {
    const ancho = asistCol - camaraCol;
    numDias = Math.max(1, Math.min(3, Math.round(ancho / 4))) as 1 | 2 | 3;
  }

  const rows: ParsedGradeRow[] = [];

  for (let i = headerIdx + 1; i < csvRows.length; i++) {
    const cols = csvRows[i];
    const nombre = (cols[nombreCol] ?? "").trim();
    if (!nombre) continue; // filas de sub-encabezado (DIA 1 / 1h,2h,3h,NT) u otras vacías

    const codigo = (cols[codigoCol] ?? "").trim();

    const modoNorm = normalizeCsvHeader(modoCol !== -1 ? (cols[modoCol] ?? "") : "");
    let modo: ModoEstudio | undefined;
    if (modoNorm.startsWith("sincron")) modo = "SINCRONICO";
    else if (modoNorm.startsWith("asincron")) modo = "ASINCRONICO";
    else if (modoNorm.startsWith("mixto")) modo = "MIXTO";

    const celdasCamara: CamaraCeldas = {};
    if (camaraCol !== -1) {
      for (let d = 0; d < numDias; d++) {
        const base = camaraCol + d * 4;
        celdasCamara[`d${d + 1}c1` as keyof CamaraCeldas] = normalizarSimbolo(cols[base] ?? "");
        celdasCamara[`d${d + 1}c2` as keyof CamaraCeldas] = normalizarSimbolo(cols[base + 1] ?? "");
        celdasCamara[`d${d + 1}c3` as keyof CamaraCeldas] = normalizarSimbolo(cols[base + 2] ?? "");
        // base + 3 = NT del día: no se importa, siempre viene de la transcripción revisada.
      }
    }

    rows.push({
      codigo,
      nombre,
      modo,
      celdasCamara,
      notaExamenManual: examenCol !== -1 ? parseNota(cols[examenCol] ?? "") : undefined,
      notaExamenRecupManual: examenCol !== -1 ? parseNota(cols[examenCol + 1] ?? "") : undefined,
    });
  }

  if (rows.length === 0) {
    return { error: "No se detectaron filas de alumnos en el CSV." };
  }

  return { numDias, rows };
}
