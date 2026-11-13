import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type Profil = { id: string; rolle: "superadmin" | "kunde"; mandant_id: string | null; name: string | null };

export async function aktuellesProfil(): Promise<Profil> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("profile").select("id, rolle, mandant_id, name").eq("id", user.id).single();
  if (!data) redirect("/login?fehler=profil");
  return data as Profil;
}

export async function nurSuperadmin() {
  const p = await aktuellesProfil();
  if (p.rolle !== "superadmin") redirect("/");
  return p;
}

/** Prüft, ob das Profil den Mandanten sehen darf (zusätzlich zu RLS). */
export async function zugriffMandant(mandantId: string) {
  const p = await aktuellesProfil();
  if (p.rolle !== "superadmin" && p.mandant_id !== mandantId) redirect("/");
  return p;
}
