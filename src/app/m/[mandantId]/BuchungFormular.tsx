"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ZAHLUNGSARTEN, type Kategorie } from "@/lib/format";

export function BuchungFormular({ mandantId, kategorien }: { mandantId: string; kategorien: Kategorie[] }) {
  const router = useRouter();
  const [typ, setTyp] = useState<"einnahme" | "ausgabe">("ausgabe");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laden, setLaden] = useState(false);
  const heute = new Date().toISOString().slice(0, 10);

  async function speichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFehler(null);
    setLaden(true);
    const formEl = e.currentTarget;
    const f = new FormData(formEl);
    const supabase = createClient();
    try {
      let beleg_pfad: string | null = null;
      const datei = f.get("beleg") as File | null;
      if (datei && datei.size > 0) {
        if (datei.size > 10 * 1024 * 1024) throw new Error("Der Beleg ist grösser als 10 MB.");
        const sicher = datei.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        beleg_pfad = `${mandantId}/${String(f.get("datum")).slice(0, 4)}/${crypto.randomUUID()}-${sicher}`;
        const up = await supabase.storage.from("belege").upload(beleg_pfad, datei, { contentType: datei.type });
        if (up.error) throw new Error("Beleg-Upload fehlgeschlagen: " + up.error.message);
      }
      const betrag = Number(String(f.get("betrag")).replace(/'/g, "").replace(",", "."));
      if (!(betrag > 0)) throw new Error("Bitte einen gültigen Betrag eingeben.");
      const { error } = await supabase.from("buchungen").insert({
        mandant_id: mandantId,
        datum: f.get("datum"),
        typ,
        betrag,
        kategorie_id: f.get("kategorie_id") || null,
        zahlungsart: f.get("zahlungsart"),
        beschreibung: String(f.get("beschreibung")).trim(),
        privatanteil_prozent: Number(f.get("privatanteil_prozent") || 0),
        beleg_pfad,
      });
      if (error) throw new Error(error.message);
      formEl.reset();
      router.refresh();
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err));
    } finally {
      setLaden(false);
    }
  }

  const auswahl = kategorien.filter((k) => k.typ === typ);

  return (
    <form onSubmit={speichern} className="karte nicht-drucken space-y-3">
      <div className="flex gap-2">
        {(["einnahme", "ausgabe"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTyp(t)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${typ === t ? (t === "einnahme" ? "bg-emerald-700 text-white" : "bg-rose-700 text-white") : "bg-slate-100"}`}>
            {t === "einnahme" ? "Einnahme" : "Ausgabe"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="beschriftung">Datum</label><input name="datum" type="date" defaultValue={heute} required className="eingabe" /></div>
        <div><label className="beschriftung">Betrag CHF</label><input name="betrag" inputMode="decimal" placeholder="0.00" required className="eingabe" /></div>
        <div>
          <label className="beschriftung">Zahlungsart</label>
          <select name="zahlungsart" className="eingabe" defaultValue="bank">
            {Object.entries(ZAHLUNGSARTEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="beschriftung">Kategorie</label>
          <select name="kategorie_id" className="eingabe" required key={typ}>
            <option value="">Bitte wählen</option>
            {auswahl.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
        </div>
        <div><label className="beschriftung">Beschreibung</label><input name="beschreibung" required placeholder="z.B. Druckerpapier Migros" className="eingabe" /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="beschriftung">Beleg (Foto oder PDF)</label>
          <input name="beleg" type="file" accept="image/*,application/pdf" capture="environment" className="eingabe" />
        </div>
        {typ === "ausgabe" && (
          <div>
            <label className="beschriftung">Privatanteil in % (z.B. Auto, Handy)</label>
            <input name="privatanteil_prozent" type="number" min={0} max={100} step={1} defaultValue={0} className="eingabe" />
          </div>
        )}
      </div>
      {fehler && <p className="text-sm text-red-600">{fehler}</p>}
      <button className="knopf" disabled={laden}>{laden ? "Speichern…" : "Buchung speichern"}</button>
    </form>
  );
}
