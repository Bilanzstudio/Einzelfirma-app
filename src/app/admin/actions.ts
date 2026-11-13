"use server";
import { revalidatePath } from "next/cache";
import { nurSuperadmin } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type Ergebnis = { ok?: string; fehler?: string } | null;

export async function mandantAnlegen(_: Ergebnis, form: FormData): Promise<Ergebnis> {
  await nurSuperadmin();
  const supabase = await createClient();
  const get = (k: string) => (String(form.get(k) ?? "").trim() || null);

  const { data: mandant, error } = await supabase.from("mandanten").insert({
    firmenname: get("firmenname"),
    inhaber: get("inhaber"),
    adresse: get("adresse"),
    plz: get("plz"),
    ort: get("ort"),
    uid_nummer: get("uid_nummer"),
  }).select("id").single();
  if (error || !mandant) return { fehler: "Mandant konnte nicht angelegt werden: " + error?.message };

  const email = get("email");
  const passwort = get("passwort");
  if (email && passwort) {
    const r = await kundenLogin(mandant.id, email, passwort, get("inhaber"));
    if (r?.fehler) return r;
  }
  revalidatePath("/admin");
  return { ok: "Mandant angelegt." + (email ? ` Login für ${email} erstellt.` : "") };
}

export async function loginHinzufuegen(_: Ergebnis, form: FormData): Promise<Ergebnis> {
  await nurSuperadmin();
  const r = await kundenLogin(
    String(form.get("mandant_id")),
    String(form.get("email")).trim(),
    String(form.get("passwort")),
    String(form.get("name") ?? "") || null,
  );
  revalidatePath("/admin");
  return r ?? { ok: "Login erstellt." };
}

async function kundenLogin(mandantId: string, email: string, passwort: string, name: string | null): Promise<Ergebnis> {
  if (passwort.length < 10) return { fehler: "Das Passwort muss mindestens 10 Zeichen haben." };
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password: passwort, email_confirm: true });
  if (error || !data.user) return { fehler: "Login konnte nicht erstellt werden: " + error?.message };
  const { error: e2 } = await admin.from("profile").insert({ id: data.user.id, rolle: "kunde", mandant_id: mandantId, name });
  if (e2) return { fehler: "Profil konnte nicht erstellt werden: " + e2.message };
  return null;
}
