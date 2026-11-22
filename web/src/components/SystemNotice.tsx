import type { ReactNode } from "react";

/**
 * Poruka sistema: prozor se otvara od tanke linije, pa ulazi tekst (animacija u styles.css, `.notice`;
 * vrednosti iz dizajn kanvasa, „7 · Animacije sistema”).
 * Nije modal i ne blokira klikove; čitači ekrana je čuju preko role="status".
 * Prikazuje se samo kad to kaže odgovor API-ja (npr. XpResult.questCompleted), nikad po pogađanju na klijentu.
 */
export function SystemNotice({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="notice" role="status">
      <span className="notice-title">{title}</span>
      {children && <span className="notice-text">{children}</span>}
    </section>
  );
}

/** Poruka za završen dnevni zadatak; ista na stranici poglavlja i testa. */
export function QuestCompletedNotice() {
  return (
    <SystemNotice title="[ ! ] DNEVNI ZADATAK ZAVRŠEN">
      Nagrada je osvojena: slobodan poen. Sutra stiže novi zadatak.
    </SystemNotice>
  );
}
