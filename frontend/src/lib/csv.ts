export async function readCsvFile(file: File) {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);

  if (utf8.includes("\uFFFD")) {
    return new TextDecoder("windows-1252").decode(buffer);
  }

  return repairMojibake(utf8);
}

export function normalizeCsvHeader(value: string) {
  return repairMojibake(value)
    .replace(/^\uFEFF/, "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function parseCsv(text: string) {
  const delimiter = guessDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i++;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      row.push(repairMojibake(cell.trim()));
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(repairMojibake(cell.trim()));
      if (row.some((v) => v.length > 0)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(repairMojibake(cell.trim()));
  if (row.some((v) => v.length > 0)) rows.push(row);
  return rows;
}

function repairMojibake(value: string) {
  let current = value;

  for (let i = 0; i < 3; i++) {
    if (!/[\u00c3\u00c2]/.test(current)) break;

    const bytes = new Uint8Array([...current].map(toWindows1252Byte));
    const decoded = new TextDecoder("utf-8").decode(bytes);

    if (mojibakeScore(decoded) >= mojibakeScore(current)) break;
    current = decoded;
  }

  return current.replaceAll("\u00c2", "");
}

function mojibakeScore(value: string) {
  return (value.match(/[\u00c3\u00c2\ufffd]/g) ?? []).length;
}

function toWindows1252Byte(char: string) {
  const code = char.charCodeAt(0);
  const map: Record<number, number> = {
    0x2018: 0x91,
    0x2019: 0x92,
    0x201c: 0x93,
    0x201d: 0x94,
    0x2022: 0x95,
    0x2013: 0x96,
    0x2014: 0x97,
    0x02dc: 0x98,
    0x2122: 0x99,
  };
  return map[code] ?? (code <= 0xff ? code : 0x3f);
}

// Pone en mayuscula la primera letra de cada palabra (separada por espacios).
export function toTitleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// Busca, entre los encabezados normalizados de la fila, el primero que
// contenga alguna de las palabras clave (ej. "correo" matchea "Direccion de
// correo electronico"). Reemplaza la coincidencia exacta por texto: los
// formularios (Google Forms, Excel de otras areas) casi nunca usan el mismo
// nombre de columna que espera la app.
export function matchHeader(headers: string[], cols: string[], keywords: string[]) {
  for (let i = 0; i < headers.length; i++) {
    if (keywords.some((k) => headers[i].includes(k))) {
      const value = (cols[i] ?? "").trim();
      if (value) return value;
    }
  }
  return "";
}

const DIAL_CODES: Record<string, string> = {
  peru: "51",
  "estados unidos": "1",
  eeuu: "1",
  usa: "1",
  "puerto rico": "1",
  canada: "1",
  cuba: "53",
  panama: "507",
  chile: "56",
  "costa rica": "506",
  colombia: "57",
  ecuador: "593",
  bolivia: "591",
  venezuela: "58",
  mexico: "52",
  argentina: "54",
  brasil: "55",
  espana: "34",
  inglaterra: "44",
  "reino unido": "44",
  paraguay: "595",
  uruguay: "598",
  guatemala: "502",
  honduras: "504",
  "el salvador": "503",
  nicaragua: "505",
  "republica dominicana": "1",
};

function lookupDialCode(pais: string | undefined) {
  const norm = normalizeCsvHeader(pais ?? "");
  if (!norm) return undefined;
  const key = Object.keys(DIAL_CODES).find((k) => norm.includes(k));
  return key ? DIAL_CODES[key] : undefined;
}

// Antepone el codigo de pais al telefono si no lo tiene ya (ni como "+" ni
// como los digitos del codigo al inicio del numero).
export function applyPhonePrefix(telefono: string | undefined, pais: string | undefined) {
  const tel = (telefono ?? "").trim();
  if (!tel) return undefined;
  if (tel.startsWith("+")) return tel;

  const dial = lookupDialCode(pais);
  if (!dial) return tel;

  const digitsOnly = tel.replace(/\D/g, "");
  if (digitsOnly.startsWith(dial)) return `+${digitsOnly}`;
  return `+${dial} ${tel}`;
}

const MESES: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10",
  noviembre: "11", diciembre: "12",
};

// Acepta dd/mm/aaaa, dd-mm-aa, dd.mm.aaaa (con separadores repetidos o
// espacios sueltos, como se escriben a mano en formularios) y "dd de mes de
// aaaa". Si no reconoce el formato devuelve undefined en vez de una fecha
// invalida que rompa el guardado.
export function parseFlexibleDate(value: string | undefined) {
  if (!value) return undefined;
  const clean = value.trim().replace(/\.+$/, "");
  if (!clean) return undefined;

  const numeric = clean.match(/^(\d{1,2})[/\-.\s]+(\d{1,2})[/\-.\s]+(\d{2,4})$/);
  if (numeric) {
    const [, d, m, yRaw] = numeric;
    const year = yRaw.length === 2 ? (Number(yRaw) <= 30 ? `20${yRaw}` : `19${yRaw}`) : yRaw;
    const day = d.padStart(2, "0");
    const month = m.padStart(2, "0");
    if (Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= 31) {
      return `${year}-${month}-${day}`;
    }
    return undefined;
  }

  const worded = normalizeCsvHeader(clean).match(/^(\d{1,2}) de (\w+) de (\d{4})$/);
  if (worded) {
    const [, d, mesRaw, y] = worded;
    const month = MESES[mesRaw];
    if (month) return `${y}-${month}-${d.padStart(2, "0")}`;
  }

  return undefined;
}

function guessDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const tabs = (firstLine.match(/\t/g) ?? []).length;

  if (tabs > commas && tabs > semicolons) return "\t";
  return semicolons > commas ? ";" : ",";
}
