import Link from "next/link";
import { notFound } from "next/navigation";
import { Kopf } from "@/components/Kopf";
import { zugriffMandant } from "@/lib/auth";
import { belegLinks, jahrAusParam, ladeMandantJahr } from "@/lib/daten";
import { formatCHF, formatDatum, geschaeftlich, istPrivat, ZAHLUNGSARTEN } from "@/lib/format";
import { BuchungFormular } from "./BuchungFormular";
import { alleGeprueft, buchungLoeschen, statusSetzen } from "./actions";

export default async function MandantSeite({ params, searchParams }: {
  params: Promise<{ mandantId: string }>;
  searchParams: Promise<{ jahr?: string }>;
}) {
  const { mandantId } = await params;
  const jahr = jahrAusParam((await searchParams).jahr);
  const profil = await zugriffMandant(mandantId);
  const admin = profil.rolle === "superadmin";
  const { mandant, buchungen, kategorien, abgeschlossen } = await ladeMandantJahr(mandantId, jahr);
  if (!mandant) notFound();
  const links = await belegLinks(buchungen);

  const betrieb = buchungen.filter((b) => !istPrivat(b));
  const ein = betrieb.filter((b) => b.typ === "einnahme").reduce((s, b) => s + geschaeftlich(b), 0);
  const aus = betrieb.filter((b) => b.typ === "ausgabe").reduce((s, b) => s + geschaeftlich(b), 0);
  const ohneBeleg = buchungen.filter((b) => !b.beleg_pfad).length;
  const offen = buchungen.filter((b) => b.status === "erfasst").length;
  const aktuell = new Date().getFullYear();
  const jahre = Array.from({ length: 5 }, (_, i) => aktuell - i);

  return (
    <>
      <Kopf titel={mandant.firmenname} zurueck={admin ? "/admin" : undefined} admin={admin} />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <div className="flex flex-wrap items-center gap-2">
          {jahre.map((j) => (
            <Link key={j} href={`?jahr=${j}`} className={`rounded-full px-3 py-1 text-sm ${j === jahr ? "bg-slate-900 text-white" : "bg-white border border-slate-200"}`}>{j}</Link>
          ))}
          <Link href={`/m/${mandantId}/jahr/${jahr}`} className="knopf-sekundaer ml-auto">Jahresabschluss {jahr}</Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="karte"><p className="text-xs text-slate-500">Einnahmen (geschäftlich)</p><p className="text-xl font-semibold text-emerald-700">{formatCHF(ein)}</p></div>
          <div className="karte"><p className="text-xs text-slate-500">Ausgaben (geschäftlich)</p><p className="text-xl font-semibold text-rose-700">{formatCHF(aus)}</p></div>
          <div className="karte"><p className="text-xs text-slate-500">Gewinn / Verlust</p><p className="text-xl font-semibold">{formatCHF(ein - aus)}</p></div>
        </div>
        {ein > 90000 && (
          <p className="karte border-amber-300 bg-amber-50 text-sm text-amber-900">
            Hinweis: Der Umsatz nähert sich CHF 100&apos;000. Ab diesem Betrag besteht MWST-Pflicht und eine doppelte Buchhaltung kann nötig werden.
          </p>
        )}

        {abgeschlossen
          ? <p className="karte text-sm text-slate-600">Das Geschäftsjahr {jahr} ist abgeschlossen. Buchungen können nicht mehr geändert werden.</p>
          : <BuchungFormular mandantId={mandantId} kategorien={kategorien} />}

        <section className="karte overflow-x-auto p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 text-sm">
            <span className="font-semibold">{buchungen.length} Buchungen</span>
            <span className="text-slate-500">{ohneBeleg} ohne Beleg · {offen} ungeprüft</span>
            {admin && offen > 0 && !abgeschlossen && (
              <form action={alleGeprueft} className="ml-auto">
                <input type="hidden" name="mandant_id" value={mandantId} /><input type="hidden" name="jahr" value={jahr} />
                <button className="knopf-sekundaer">Alle als geprüft markieren</button>
              </form>
            )}
          </div>
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr><th className="px-4 py-2">Datum</th><th>Beschreibung</th><th>Kategorie</th><th>Zahlung</th><th className="text-right">Betrag</th><th className="px-2">Beleg</th><th className="px-4 text-right">Status</th></tr>
            </thead>
            <tbody>
              {buchungen.map((b) => {
                const darfAendern = !abgeschlossen && (admin || b.status === "erfasst");
                return (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 whitespace-nowrap">{formatDatum(b.datum)}</td>
                    <td>{b.beschreibung}{Number(b.privatanteil_prozent) > 0 && <span className="ml-1 text-xs text-slate-500">({b.privatanteil_prozent}% privat)</span>}</td>
                    <td className="text-slate-600">{b.kategorien?.name ?? "–"}</td>
                    <td className="text-slate-600">{ZAHLUNGSARTEN[b.zahlungsart]}</td>
                    <td className={`text-right whitespace-nowrap font-medium ${b.typ === "einnahme" ? "text-emerald-700" : "text-rose-700"}`}>
                      {b.typ === "einnahme" ? "+" : "−"} {formatCHF(Number(b.betrag))}
                    </td>
                    <td className="px-2">
                      {b.beleg_pfad && links.get(b.beleg_pfad)
                        ? <a href={links.get(b.beleg_pfad)} target="_blank" rel="noreferrer" className="text-emerald-700 underline">Ansehen</a>
                        : <span className="text-amber-600">fehlt</span>}
                    </td>
                    <td className="px-4 text-right whitespace-nowrap">
                      {admin && !abgeschlossen ? (
                        <form action={statusSetzen} className="inline">
                          <input type="hidden" name="mandant_id" value={mandantId} /><input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="status" value={b.status === "erfasst" ? "geprueft" : "erfasst"} />
                          <button className={`rounded px-2 py-0.5 text-xs ${b.status === "geprueft" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100"}`}>
                            {b.status === "geprueft" ? "✓ geprüft" : "prüfen"}
                          </button>
                        </form>
                      ) : (
                        <span className={`text-xs ${b.status === "geprueft" ? "text-emerald-700" : "text-slate-500"}`}>{b.status === "geprueft" ? "✓ geprüft" : "erfasst"}</span>
                      )}
                      {darfAendern && (
                        <form action={buchungLoeschen} className="ml-2 inline">
                          <input type="hidden" name="mandant_id" value={mandantId} /><input type="hidden" name="id" value={b.id} />
                          <button className="text-xs text-slate-400 hover:text-red-600" title="Buchung löschen">✕</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {buchungen.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Noch keine Buchungen in {jahr}.</td></tr>}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
