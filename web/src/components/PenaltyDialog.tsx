import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type DailyQuestTaskView } from "../api";
import { ErrorBox } from "./common";
import { Window } from "./Window";

/**
 * Kazneni zadatak kao crveni prozor sistema (kanvas „13 · Kazneni zadatak”). Pravi <dialog> sa showModal():
 * pregledač sam drži fokus unutra, Esc zatvara, a ostatak stranice je nedostupan dok je otvoren.
 * Tri crvena bljeska su na ::backdrop (styles.css); uz smanjene pokrete ostaje samo fade.
 * „PRIHVATI” vodi na prvo ponavljanje; „PRESKOČI” zove API (niz se odmah prekida, druge kazne nema).
 */
export function PenaltyDialog({ tasks, onClose }: { tasks: DailyQuestTaskView[]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const skip = useMutation({ mutationFn: api.skipPenalty });

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);

  const minutes = tasks.reduce((sum, t) => sum + t.minutes, 0);
  const first = tasks[0];
  const accept = () => {
    onClose();
    if (first) navigate(first.step === "Test" ? `/chapters/${encodeURIComponent(first.chapterId)}/test` : `/chapters/${encodeURIComponent(first.chapterId)}`);
  };
  // Status se osvežava tek pri zatvaranju poruke: posle osvežavanja kazna više nije aktivna i prozor nestaje.
  const done = () => { onClose(); qc.invalidateQueries({ queryKey: ["status"] }); };

  return (
    <dialog ref={ref} className="penalty-dialog" aria-labelledby="pen-dialog-title"
      onCancel={(e) => { e.preventDefault(); if (skip.isSuccess) done(); else onClose(); }}>
      <Window title="Kazneni zadatak" className="win-red">
        {/* Naslov dijaloga za čitače ekrana (Window već ima h2; ovaj id imenuje <dialog>). */}
        <span id="pen-dialog-title" className="sr-only">Kazneni zadatak</span>
        {!skip.isSuccess && (
          <>
            <p className="penalty-lead">
              Jučerašnji dnevni zadatak nije završen.<br />Pre nove lekcije sistem traži ponavljanje slabih tačaka.
            </p>
            <ul className="penalty-tasks">
              {tasks.map((t) => (
                <li key={t.chapterId + t.step}>
                  <span style={{ flex: 1 }}>Ponovi test: {t.chapterTitle}</span>
                  <span className="penalty-prog">[0/1]</span>
                </li>
              ))}
            </ul>
            <div className="penalty-time">
              <span className="win-label">Vreme</span>
              <strong>~{minutes} min</strong>
            </div>
            {skip.isError && <ErrorBox error={skip.error} />}
            <div className="penalty-actions">
              <button type="button" className="btn primary" onClick={accept} autoFocus>Prihvati</button>
              <button type="button" className="btn" disabled={skip.isPending} onClick={() => skip.mutate()}>
                {skip.isPending ? "Sistem beleži…" : "Preskoči · niz se prekida"}
              </button>
            </div>
          </>
        )}
        {skip.isSuccess && (
          <div className="penalty-result" role="status">
            <strong>NIZ PREKINUT · {skip.data.streakBefore} → 0</strong>
            <span>Bez druge kazne. Nov niz kreće od prvog završenog koraka.</span>
            {skip.data.questCompleted && <span>Ostatak dnevnog zadatka je već urađen: zadatak je završen.</span>}
            <button type="button" className="btn primary" onClick={done} autoFocus>U redu</button>
          </div>
        )}
      </Window>
    </dialog>
  );
}
