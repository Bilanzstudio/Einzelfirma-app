import { NextResponse, type NextRequest } from "next/server";
import { zugriffMandant } from "@/lib/auth";
import { jahrAusParam, ladeMandantJahr } from "@/lib/daten";
import { geschaeftlich, ZAHLUNGSARTEN } from "@/lib/format";

const zelle = (v: string | number) => {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ mandantId: string }> }) {
  const { mandantId } = await params;
  await zugriffMandant(mandantId);
  const jahr = jahrAusParam(req.nextUrl.searchParams.get("jahr") ?? undefined);
  const { mandant, buchungen } = await ladeMandantJahr(mandantId, jahr);
  if (!mandant) return new NextResponse("Nicht gefunden", { status: 404 });

  const kopf = ["Datum", "Typ", "Kategorie", "Position Steuererklärung", "Beschreibung", "Zahlungsart", "Betrag", "Privatanteil %", "Geschäftlich", "Beleg", "Status"];
  const zeilen = [...buchungen].reverse().map((b) => [
    b.datum, b.typ === "einnahme" ? "Einnahme" : "Ausgabe", b.kategorien?.name ?? "", b.kategorien?.steuer_position ?? "",
    b.beschreibung, ZAHLUNGSARTEN[b.zahlungsart], Number(b.betrag).toFixed(2), Number(b.privatanteil_prozent),
    geschaeftlich(b).toFixed(2), b.beleg_pfad ? "ja" : "nein", b.status === "geprueft" ? "geprüft" : "erfasst",
  ]);
  // Semikolon und BOM, damit Excel (de-CH) die Datei direkt korrekt öffnet.
  const csv = "﻿" + [kopf, ...zeilen].map((z) => z.map(zelle).join(";")).join("\r\n");
  const name = `${mandant.firmenname.replace(/[^a-zA-Z0-9]+/g, "_")}_${jahr}.csv`;
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
}
