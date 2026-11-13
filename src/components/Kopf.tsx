import Link from "next/link";
import { abmelden } from "@/app/login/actions";

export function Kopf({ titel, zurueck, admin }: { titel: string; zurueck?: string; admin?: boolean }) {
  return (
    <header className="nicht-drucken border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        {zurueck && <Link href={zurueck} className="text-sm text-slate-500 hover:text-slate-900">← Zurück</Link>}
        <h1 className="flex-1 truncate text-lg font-semibold">{titel}</h1>
        {admin && <Link href="/admin" className="text-sm text-slate-600 hover:text-slate-900">Mandanten</Link>}
        <form action={abmelden}><button className="text-sm text-slate-600 hover:text-slate-900">Abmelden</button></form>
      </div>
    </header>
  );
}
