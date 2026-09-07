/** Alter wird laufend aus dem Geburtsjahr berechnet, statt fest gespeichert (Punkt 13). */
export function getAgeFromBirthYear(birthYear: number | null | undefined): number | null {
  if (!birthYear) return null;
  return new Date().getFullYear() - birthYear;
}
