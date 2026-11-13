import { notFound } from "next/navigation";
import { Kopf } from "@/components/Kopf";
import { zugriffMandant } from "@/lib/auth";
import { erfolgsrechnung, type Zeile } from "@/lib/abschluss";
import { jahrAusParam, ladeMandantJahr } from "@/lib/daten";
import { formatCHF } from "@/lib/format";
import { jahrAbschliessen } from "../../actions";
import { Drucken } from "./Drucken";

function Tabelle({ titel, zeilen, total }: { titel: string; zeilen: Zeile[]; total: number }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-slate-300 text-left"><th className="py-2">{titel}</th><th className="text-xs font-normal text-slate-500">Position Steuererklärung</th><th className="text-right">CHF</th></tr></thead>
      <tbody>
        {zeilen.map((z) => (
          <tr key={z.kategorie} className="border-b border-slate-100">
            <td className="py-1.5">{z.kategorie}{z.privatanteil > 0 && <span className="ml-1 text-xs text-slate-500">(nach Abzug Privatanteil {formatCHF(z.privatanteil)})</span>}</td>
            <td className="text-xs text-slate-500">{z.position}</td>
            <td className="text-right tabular-nums">{formatCHF(z.betrag)}</td>
          </tr>
        ))}
        {zeilen.length === 0 && <tr><td colSpan={3} className="py-2 text-slate-500">Keine Buchungen</td></tr>}
        <tr className="font-semibold"><td className="py-2">Total {titel}</td><td /><td className="text-right tabular-nums">{formatCHF(total)}</td></tr>
      </tbody>
    </table>
  );
}

export default async function Jahresabschluss({ params }: { params: Promise<{ mandantId: string; jahr: string }> }) {
  const { mandantId, jahr: j } = await params;
  const jahr = jahrAusParam(j);
  const profil = await zugriffMandant(mandantId);
  const admin = profil.rolle === "superadmin";
  const { mandant, buchungen, abgeschlossen } = await ladeMandantJahr(mandantId, jahr);
  if (!mandant) notFound();
  const er = erfolgsrechnung(buchungen);

  return (
    <>
      <Kopf titel={`Jahresabschluss ${jahr}`} zurueck={`/m/${mandantId}?jahr=${jahr}`} admin={admin} />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <div className="nicht-drucken flex flex-wrap gap-2">
          <Drucken />
          <a href={`/m/${mandantId}/export?jahr=${jahr}`} className="knopf-sekundaer">Buchungen als CSV (Excel)</a>
          {admin && (
            <form action={jahrAbschliessen} className="ml-auto">
              <input type="hidden" name="mandant_id" value={mandantId} /><input type="hidden" name="jahr" value={jahr} />
              <input type="hidden" name="aktion" value={abgeschlossen ? "oeffnen" : "abschliessen"} />
              <button className={abgeschlossen ? "knopf-sekundaer" : "knopf"}>{abgeschlossen ? "Jahr wieder öffnen" : "Jahr abschliessen"}</button>
            </form>
          )}
        </div>

        {(er.ohneBeleg > 0 || er.ungeprueft > 0) && (
          <p className="nicht-drucken karte border-amber-300 bg-amber-50 text-sm text-amber-900">
            Vor dem Abschluss prüfen: {er.ohneBeleg} Buchungen ohne Beleg, {er.ungeprueft} noch nicht geprüft.
          </p>
        )}

        <article className="karte space-y-6">
          <header>
            <h2 className="text-lg font-semibold">Erfolgsrechnung {jahr}</h2>
            <p className="text-sm text-slate-600">{mandant.firmenname}, {mandant.inhaber}{mandant.ort ? `, ${mandant.plz ?? ""} ${mandant.ort}` : ""}</p>
            <p className="text-xs text-slate-500">Einnahmen-/Ausgabenrechnung nach Art. 957 Abs. 2 OR · Zeitraum 01.01.{jahr} bis 31.12.{jahr}{abgeschlossen ? " · abgeschlossen" : " · provisorisch"}</p>
          </header>
          <Tabelle titel="Ertrag" zeilen={er.ertrag} total={er.totalErtrag} />
          <Tabelle titel="Aufwand" zeilen={er.aufwand} total={er.totalAufwand} />
          <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-base font-semibold">
            <span>{er.gewinn >= 0 ? "Gewinn" : "Verlust"}</span><span className="tabular-nums">{formatCHF(er.gewinn)}</span>
          </div>
          <div className="text-sm">
            <h3 className="mb-1 font-semibold">Privatkonto (nicht erfolgswirksam)</h3>
            <div className="flex justify-between"><span>Privateinlagen</span><span className="tabular-nums">{formatCHF(er.privatEinlagen)}</span></div>
            <div className="flex justify-between"><span>Privatbezüge</span><span className="tabular-nums">{formatCHF(er.privatBezuege)}</span></div>
            <div className="flex justify-between"><span>Privatanteile an Geschäftsaufwand</span><span className="tabular-nums">{formatCHF(er.privatanteile)}</span></div>
          </div>
          <p className="text-xs text-slate-500">
            Anschaffungen sind hier als Aufwand im Jahr der Zahlung erfasst. Abschreibungen auf grösseren Anlagen, Debitoren und Kreditoren per 31.12. sowie Warenvorräte sind separat zu berücksichtigen.
          </p>
        </article>
      </main>
    </>
  );
}
