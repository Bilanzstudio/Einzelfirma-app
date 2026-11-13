"use client";
import { useActionState } from "react";
import { anmelden } from "./actions";

export default function Login() {
  const [state, action, pending] = useActionState(anmelden, null);
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form action={action} className="karte w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Bilanzstudio</h1>
          <p className="text-sm text-slate-500">Buchhaltung für Einzelunternehmen</p>
        </div>
        <div>
          <label className="beschriftung" htmlFor="email">E-Mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="eingabe" />
        </div>
        <div>
          <label className="beschriftung" htmlFor="passwort">Passwort</label>
          <input id="passwort" name="passwort" type="password" required autoComplete="current-password" className="eingabe" />
        </div>
        {state?.fehler && <p className="text-sm text-red-600">{state.fehler}</p>}
        <button className="knopf w-full" disabled={pending}>{pending ? "Anmelden…" : "Anmelden"}</button>
      </form>
    </main>
  );
}
