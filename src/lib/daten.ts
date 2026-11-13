import { createClient } from "./supabase/server";
import type { Buchung, Kategorie } from "./format";

export async function ladeMandantJahr(mandantId: string, jahr: number) {
  const supabase = await createClient();
  const [m, b, k, g] = await Promise.all([
    supabase.from("mandanten").select("*").eq("id", mandantId).single(),
    supabase.from("buchungen").select("*, kategorien(name, steuer_position)")
      .eq("mandant_id", mandantId).gte("datum", `${jahr}-01-01`).lte("datum", `${jahr}-12-31`)
      .order("datum", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("kategorien").select("id, typ, name, steuer_position, sortierung")
      .or(`mandant_id.is.null,mandant_id.eq.${mandantId}`).eq("aktiv", true).order("sortierung"),
    supabase.from("geschaeftsjahre").select("abgeschlossen, abgeschlossen_am").eq("mandant_id", mandantId).eq("jahr", jahr).maybeSingle(),
  ]);
  return {
    mandant: m.data,
    buchungen: (b.data ?? []) as Buchung[],
    kategorien: (k.data ?? []) as Kategorie[],
    abgeschlossen: Boolean(g.data?.abgeschlossen),
  };
}

export async function belegLinks(buchungen: Buchung[]) {
  const pfade = buchungen.map((b) => b.beleg_pfad).filter((p): p is string => Boolean(p));
  if (pfade.length === 0) return new Map<string, string>();
  const supabase = await createClient();
  const { data } = await supabase.storage.from("belege").createSignedUrls(pfade, 60 * 60);
  return new Map((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path!, d.signedUrl]));
}

export function jahrAusParam(p: string | string[] | undefined) {
  const j = Number(Array.isArray(p) ? p[0] : p);
  return Number.isInteger(j) && j > 2000 && j < 2100 ? j : new Date().getFullYear();
}
