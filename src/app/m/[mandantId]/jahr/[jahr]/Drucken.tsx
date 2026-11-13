"use client";
export function Drucken() {
  return <button onClick={() => window.print()} className="knopf-sekundaer">Als PDF drucken</button>;
}
