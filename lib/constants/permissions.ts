/**
 * Zentrale Rechtematrix (docs/feature-konto-restructure-membership.md, Abschnitt 5).
 * Einzige Quelle der Wahrheit fuer "wer darf was" nach Nutzertyp — Paywall-/
 * Gate-Stellen sollen gegen diese Konstante pruefen statt einzeln `isPro`
 * abzufragen, damit die Matrix nicht an mehreren Stellen auseinanderlaufen kann.
 */
export type UserTier = 'guest' | 'free' | 'pro';

export type PermissionKey =
  | 'browseFeed'
  | 'viewPhotos'
  | 'viewLiveStatus'
  | 'saveFavourites'
  | 'completeProfile'
  | 'uploadListingPhotos'
  | 'manageAvailability'
  | 'sendFirstMessage'
  | 'respondToNewRequest'
  | 'continueUnlockedThread'
  | 'videoCall'
  | 'searchAlerts'
  | 'idCheck'
  | 'videoPitch'
  | 'vetHotline';

export const PERMISSIONS: Record<PermissionKey, Record<UserTier, boolean>> = {
  // Suchen & Stöbern
  browseFeed:              { guest: true,  free: true,  pro: true },
  viewPhotos:               { guest: true,  free: true,  pro: true },
  viewLiveStatus:           { guest: true,  free: true,  pro: true },
  // Binden & Erstellen
  saveFavourites:           { guest: false, free: true,  pro: true },
  completeProfile:          { guest: false, free: true,  pro: true },
  uploadListingPhotos:      { guest: false, free: true,  pro: true },
  manageAvailability:       { guest: false, free: true,  pro: true },
  // Kommunikation & Matching
  // "Erste Nachricht senden (Bewerbung)" deckt sowohl den Chat-Start als auch
  // eine Buchungsanfrage mit Datum ab — beides ist eine "Bewerbung".
  sendFirstMessage:         { guest: false, free: false, pro: true },
  respondToNewRequest:      { guest: false, free: false, pro: true },
  continueUnlockedThread:   { guest: false, free: true,  pro: true },
  videoCall:                { guest: false, free: false, pro: true },
  // Erweiterte Tools
  searchAlerts:             { guest: false, free: false, pro: true },
  idCheck:                  { guest: false, free: false, pro: true },
  videoPitch:               { guest: false, free: false, pro: true },
  vetHotline:               { guest: false, free: false, pro: true },
};

export function hasPermission(tier: UserTier, key: PermissionKey): boolean {
  return PERMISSIONS[key][tier];
}
