import type { ReactNode } from "react";

/**
 * Poruka sistema: prozor se otvara od tanke linije, pa ulazi tekst (animacija u styles.css, `.notice`).
 * Nije modal i ne blokira klikove; čitači ekrana je čuju preko role="status".
 * Prikazuje se samo kad to kaže odgovor API-ja (npr. XpResult.questCompleted), nikad po pogađanju na klijentu.
 */
export function SystemNotice({ kicker = "[ ! ] sistem", title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <section className="sys notice" role="status">
      <div className="notice-body">
        <span className="kicker">{kicker}</span>
        <h2 className="notice-title">{title}</h2>
        {children}
      </div>
    </section>
  );
}

/** Poruka za završen dnevni zadatak; ista na stranici poglavlja i testa. */
export function QuestCompletedNotice() {
  return (
    <SystemNotice kicker="[ ! ] dnevni zadatak" title="ZADATAK ZAVRŠEN">
      <span>Nagrada je osvojena (slobodan poen, vidi Status). Vrati se sutra po novi zadatak.</span>
    </SystemNotice>
  );
}
