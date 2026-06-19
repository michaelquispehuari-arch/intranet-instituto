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
  const direct = value
    .replaceAll("Ã", "Á")
    .replaceAll("Ã‰", "É")
    .replaceAll("Ã", "Í")
    .replaceAll("Ã“", "Ó")
    .replaceAll("Ãš", "Ú")
    .replaceAll("Ã‘", "Ñ")
    .replaceAll("Ã¡", "á")
    .replaceAll("Ã©", "é")
    .replaceAll("Ã­", "í")
    .replaceAll("Ã³", "ó")
    .replaceAll("Ãº", "ú")
    .replaceAll("Ã±", "ñ")
    .replaceAll("Â°", "°")
    .replaceAll("Â·", "·")
    .replaceAll("Â", "");

  if (!/[ÃÂ]/.test(direct)) return direct;

  const bytes = new Uint8Array([...direct].map(toWindows1252Byte));
  const decoded = new TextDecoder("utf-8").decode(bytes);
  return mojibakeScore(decoded) < mojibakeScore(direct) ? decoded : direct;
}

function mojibakeScore(value: string) {
  return (value.match(/[ÃÂ�]/g) ?? []).length;
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

function guessDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}
