import { es } from "./es";
import { en } from "./en";
import { ko } from "./ko";
import type { Locale } from "../types";

export const dictionaries: Record<Locale, typeof es> = { es, en, ko };
export type { Dictionary } from "./es";
