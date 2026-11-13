"use server";
import { revalidatePath } from "next/cache";
import { nurSuperadmin, zugriffMandant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function buchungLoeschen(form: FormData) {
  const mandantId = String(form.get("mandant_id"));
  await zugriffMandant(mandantId);
  const supabase = await createClient();
  const { error } = await supabase.from("buchungen").delete().eq("id", String(form.get("id"))).eq("mandant_id", mandantId);
  if (error) throw new Error(error.message);
  // Der Beleg bleibt im Archiv (Aufbewahrungspflicht).
  revalidatePath(`/m/${mandantId}`);
}

export async function statusSetzen(form: FormData) {
  await nurSuperadmin();
  const mandantId = String(form.get("mandant_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("buchungen")
    .update({ status: String(form.get("status")) })
    .eq("id", String(form.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath(`/m/${mandantId}`);
}

export async function alleGeprueft(form: FormData) {
  await nurSuperadmin();
  const mandantId = String(form.get("mandant_id"));
  const jahr = Number(form.get("jahr"));
  const supabase = await createClient();
  const { error } = await supabase.from("buchungen").update({ status: "geprueft" })
    .eq("mandant_id", mandantId).eq("status", "erfasst")
    .gte("datum", `${jahr}-01-01`).lte("datum", `${jahr}-12-31`);
  if (error) throw new Error(error.message);
  revalidatePath(`/m/${mandantId}`);
}

export async function jahrAbschliessen(form: FormData) {
  const p = await nurSuperadmin();
  const mandantId = String(form.get("mandant_id"));
  const jahr = Number(form.get("jahr"));
  const abschliessen = form.get("aktion") === "abschliessen";
  const supabase = await createClient();
  const { error } = await supabase.from("geschaeftsjahre").upsert({
    mandant_id: mandantId,
    jahr,
    abgeschlossen: abschliessen,
    abgeschlossen_am: abschliessen ? new Date().toISOString() : null,
    abgeschlossen_von: abschliessen ? p.id : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/m/${mandantId}`, "layout");
}
