const chf = new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF" });
export const formatCHF = (n: number) => chf.format(n);
export const formatDatum = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("de-CH");

export const ZAHLUNGSARTEN = { bank: "Bank", bar: "Bar", karte: "Karte", twint: "TWINT", andere: "Andere" } as const;

export type Buchung = {
  id: string;
  mandant_id: string;
  datum: string;
  typ: "einnahme" | "ausgabe";
  betrag: number;
  kategorie_id: string | null;
  zahlungsart: keyof typeof ZAHLUNGSARTEN;
  beschreibung: string;
  beleg_pfad: string | null;
  privatanteil_prozent: number;
  status: "erfasst" | "geprueft";
  kategorien?: { name: string; steuer_position: string | null } | null;
};

export type Kategorie = { id: string; typ: "einnahme" | "ausgabe"; name: string; steuer_position: string | null; sortierung: number };

/** Geschäftlicher Anteil eines Betrags (ohne Privatanteil). */
export const geschaeftlich = (b: Pick<Buchung, "betrag" | "privatanteil_prozent">) =>
  Math.round(Number(b.betrag) * (100 - Number(b.privatanteil_prozent))) / 100;

export const istPrivat = (b: Buchung) => b.kategorien?.steuer_position === "Privat";
