# Bilanzstudio Buchhaltung

Einfache, mandantenfähige Buchhaltung für Schweizer Einzelunternehmen mit Umsatz unter CHF 100'000
(Einnahmen-/Ausgabenrechnung nach Art. 957 Abs. 2 OR, ohne MWST).

## Funktionen
- Superadmin (Treuhänderin) sieht alle Mandanten, legt Mandanten und Kunden-Logins an
- Kunden erfassen Einnahmen und Ausgaben selbst, mit Beleg (Foto/PDF) und Privatanteil
- Superadmin prüft Buchungen; geprüfte Buchungen kann der Kunde nicht mehr ändern
- Jahresabschluss: Erfolgsrechnung nach Kategorien mit Position der Steuererklärung, Privatkonto, PDF-Druck, CSV-Export
- Abgeschlossene Jahre sind in der Datenbank gesperrt; Belege kann nur der Superadmin löschen

## Technik
Next.js 15 (App Router), Supabase (Postgres mit Row Level Security, Auth, Storage).

## Einrichtung
1. Supabase-Projekt anlegen (Region z.B. Zürich `eu-central-2` oder Frankfurt).
2. SQL aus `supabase/migrations/0001_init.sql` im SQL-Editor ausführen.
3. Superadmin anlegen: In Supabase unter Authentication einen Benutzer erstellen, dann im SQL-Editor
   `insert into profile (id, rolle, name) values ('<user-id>', 'superadmin', 'Maria');`
4. `.env.example` nach `.env.local` kopieren und Werte eintragen.
5. `npm install && npm run dev`, danach auf Vercel deployen (gleiche Umgebungsvariablen setzen).
