import { geschaeftlich, istPrivat, type Buchung } from "./format";

export type Zeile = { kategorie: string; position: string; betrag: number; privatanteil: number; anzahl: number };

export function erfolgsrechnung(buchungen: Buchung[]) {
  const gruppe = (typ: Buchung["typ"]) => {
    const m = new Map<string, Zeile>();
    for (const b of buchungen.filter((x) => x.typ === typ && !istPrivat(x))) {
      const key = b.kategorien?.name ?? "Ohne Kategorie";
      const z = m.get(key) ?? { kategorie: key, position: b.kategorien?.steuer_position ?? "", betrag: 0, privatanteil: 0, anzahl: 0 };
      const g = geschaeftlich(b);
      z.betrag += g;
      z.privatanteil += Number(b.betrag) - g;
      z.anzahl++;
      m.set(key, z);
    }
    return [...m.values()].sort((a, b) => b.betrag - a.betrag);
  };
  const ertrag = gruppe("einnahme");
  const aufwand = gruppe("ausgabe");
  const summe = (z: Zeile[]) => z.reduce((s, x) => s + x.betrag, 0);
  const privat = buchungen.filter(istPrivat);
  const privatEinlagen = privat.filter((b) => b.typ === "einnahme").reduce((s, b) => s + Number(b.betrag), 0);
  const privatBezuege = privat.filter((b) => b.typ === "ausgabe").reduce((s, b) => s + Number(b.betrag), 0);
  const privatanteile = aufwand.reduce((s, z) => s + z.privatanteil, 0);
  return {
    ertrag, aufwand,
    totalErtrag: summe(ertrag),
    totalAufwand: summe(aufwand),
    gewinn: summe(ertrag) - summe(aufwand),
    privatEinlagen, privatBezuege, privatanteile,
    ohneBeleg: buchungen.filter((b) => !b.beleg_pfad).length,
    ungeprueft: buchungen.filter((b) => b.status === "erfasst").length,
  };
}
