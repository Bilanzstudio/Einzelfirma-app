import { redirect } from "next/navigation";
import { aktuellesProfil } from "@/lib/auth";

export default async function Start() {
  const p = await aktuellesProfil();
  if (p.rolle === "superadmin") redirect("/admin");
  redirect(`/m/${p.mandant_id}`);
}
