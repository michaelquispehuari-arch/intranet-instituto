type Celda = string | number | null | undefined;

export function notaAsistencia13(row: Celda[], numDias: 1 | 2 | 3): number {
  const tipoClase = normalizar(String(row[0] ?? ""));
  const valores = new Array(9).fill(0);
  const countF = [0, 0, 0];

  for (let j = 1; j <= 9; j++) {
    const simboloOriginal = obtenerSimbolo(row, j);
    const t = obtenerTranscripcion(row, j, simboloOriginal);
    const simbolo = t.simbolo;
    valores[j - 1] = calcularValor(simbolo, t.valor, tipoClase, row, j);

    if (tipoClase === "MIXTO") {
      const dia = Math.ceil(j / 3);
      if (normalizar(simbolo) === "F") countF[dia - 1]++;
      if (countF[dia - 1] === 3) {
        const nt = dia === 1 ? row[4] : dia === 2 ? row[8] : row[12];
        const val = esNumeroValido(nt) ? (Number(nt) - 20) / 3 : -6.67;
        const start = (dia - 1) * 3;
        for (let k = start; k < start + 3; k++) valores[k] = val;
      }
    }
  }

  const total = valores.reduce((a, c) => a + c, 0);
  let nota = 20 + total / numDias;
  nota = Math.max(0, Math.min(20, nota));
  return Math.round(nota * 10) / 10;
}

function obtenerSimbolo(row: Celda[], j: number): string {
  const idx = j <= 3 ? j : j <= 6 ? j + 1 : j + 2;
  return limpiar(row[idx]);
}

function obtenerTranscripcion(row: Celda[], j: number, simbolo: string) {
  let s = limpiar(simbolo);
  if (!s || !s.toUpperCase().endsWith("J")) return { simbolo: s, valor: 0 };
  s = s.slice(0, -1);
  const idx = j <= 3 ? 4 : j <= 6 ? 8 : 12;
  return { simbolo: s, valor: esNumeroValido(row[idx]) ? Number(row[idx]) : 0 };
}

function calcularValor(simbolo: string, transcripcion: number, tipoClase: string, row: Celda[], j: number): number {
  if (tipoClase === "ASINCRONICO") {
    const idx = j <= 3 ? 4 : j <= 6 ? 8 : 12;
    const v = esNumeroValido(row[idx]) ? Number(row[idx]) : 0;
    return (v - 20) / 3;
  }
  const s = normalizar(simbolo);
  let valor = 0;
  switch (s) {
    case "F": valor = -6.67; break;
    case "A": valor = -5; break;
    case "M": valor = -4; break;
    case "C":
    case "T": valor = -2; break;
    default: valor = 0;
  }
  if (transcripcion > 0 && transcripcion <= 20) {
    valor = valor * (20 - transcripcion) / 20;
  }
  return valor;
}

function esNumeroValido(v: Celda): boolean {
  return v !== "" && v !== null && v !== undefined && !isNaN(Number(v));
}
function limpiar(v: Celda): string {
  return v === null || v === undefined ? "" : String(v).trim();
}
function normalizar(v: Celda): string {
  return limpiar(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}
