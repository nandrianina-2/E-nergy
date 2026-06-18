import fr from "./fr";
import mg from "./mg";

export const dictionaries = { fr, mg };
export type Locale = "fr" | "mg";
export type Dictionary = typeof fr;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] || dictionaries.fr;
}
