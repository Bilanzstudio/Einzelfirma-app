import Link from "next/link";
import { Kopf } from "@/components/Kopf";
import { nurSuperadmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCHF } from "@/lib/format";
import { NeuerMandant, NeuesLogin } from "./Formulare";

export default async function Admin() {
  await nurSuperadmin();
  const supabase = await createClient();
  const jahr = new Date().getFullYear();
  const [{ data: mandanten }, { data: buchungen }, { data: logins }] = await Promise.all([
    supabase.from("mandanten").select("*").order("firmenname"),
    supabase.from("buchungen").select("mandant_id, typ, betrag, status").gte("datum", `${jahr}-01-01`).lte("datum", `${jahr}-12-31`),
    supabase.from("profile").select("mandant_id, name").eq("rolle", "kunde"),
  ]);

  const stats = new Map<string, { ein: number; aus: number; offen: number }>();
  for (const b of buchungen ?? []) {
    const s = stats.get(b.mandant_id) ?? { ein: 0, aus: 0, offen: 0 };
    if (b.typ === "einnahme") s.ein += Number(b.betrag); else s.aus += Number(b.betrag);
    if (b.status === "erfasst") s.offen++;
    stats.set(b.mandant_id, s);
  }

  return (
    <>
      <Kopf titel="Mandanten" />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="space-y-3">
          <p className="text-sm text-slate-500">Übersicht {jahr} (Bruttobeträge inkl. Privatbuchungen)</p>
          {(mandanten ?? []).length === 0 && <p className="karte text-sm text-slate-500">Noch keine Mandanten erfasst.</p>}
          {(mandanten ?? []).map((m) => {
            const s = stats.get(m.id) ?? { ein: 0, aus: 0, offen: 0 };
            const anzLogins = (logins ?? []).filter((l) => l.mandant_id === m.id).length;
            return (
              <div key={m.id} className="karte">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <Link href={`/m/${m.id}`} className="text-base font-semibold text-emerald-800 hover:underline">{m.firmenname}</Link>
                  <span className="text-sm text-slate-500">{m.inhaber}{m.ort ? `, ${m.ort}` : ""}</span>
                  <span className="ml-auto text-sm">Einnahmen {formatCHF(s.ein)} · Ausgaben {formatCHF(s.aus)}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>{s.offen} ungeprüfte Buchungen</span>
                  <span>{anzLogins} Kunden-Login{anzLogins === 1 ? "" : "s"}</span>
                </div>
                <NeuesLogin mandantId={m.id} />
              </div>
            );
          })}
        </section>
        <NeuerMandant />
      </main>
    </>
  );
}
