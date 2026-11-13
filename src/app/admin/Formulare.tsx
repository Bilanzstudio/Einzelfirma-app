"use client";
import { useActionState } from "react";
import { mandantAnlegen, loginHinzufuegen } from "./actions";

function Meldung({ s }: { s: { ok?: string; fehler?: string } | null }) {
  if (!s) return null;
  return <p className={`text-sm ${s.fehler ? "text-red-600" : "text-emerald-700"}`}>{s.fehler ?? s.ok}</p>;
}

function Feld({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="beschriftung" htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} required={required} className="eingabe" />
    </div>
  );
}

export function NeuerMandant() {
  const [s, action, pending] = useActionState(mandantAnlegen, null);
  return (
    <form action={action} className="karte space-y-3">
      <h2 className="font-semibold">Neuen Mandanten anlegen</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Feld name="firmenname" label="Firmenname" required />
        <Feld name="inhaber" label="Inhaber/in" required />
        <Feld name="adresse" label="Adresse" />
        <div className="grid grid-cols-3 gap-2">
          <Feld name="plz" label="PLZ" />
          <div className="col-span-2"><Feld name="ort" label="Ort" /></div>
        </div>
        <Feld name="uid_nummer" label="UID (optional)" />
      </div>
      <p className="pt-2 text-xs text-slate-500">Optional: Login für den Kunden gleich mit anlegen. Teile das Passwort dem Kunden sicher mit.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Feld name="email" label="E-Mail des Kunden" type="email" />
        <Feld name="passwort" label="Startpasswort (min. 10 Zeichen)" type="text" />
      </div>
      <Meldung s={s} />
      <button className="knopf" disabled={pending}>Anlegen</button>
    </form>
  );
}

export function NeuesLogin({ mandantId }: { mandantId: string }) {
  const [s, action, pending] = useActionState(loginHinzufuegen, null);
  return (
    <form action={action} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="mandant_id" value={mandantId} />
      <input name="email" type="email" placeholder="E-Mail" required className="eingabe max-w-56" />
      <input name="passwort" type="text" placeholder="Startpasswort" required className="eingabe max-w-44" />
      <button className="knopf-sekundaer" disabled={pending}>Login hinzufügen</button>
      <Meldung s={s} />
    </form>
  );
}
