// Pone en mayuscula la primera letra de cada palabra (separada por espacios).
// Misma logica que `toTitleCase` en frontend/src/lib/csv.ts -- mantenerlas en
// sync si se cambia una.
export function toTitleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}
