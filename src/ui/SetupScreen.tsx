import { useState } from "react";
import type { BrandTheme, Difficulty } from "../game/store";
import { cn } from "./format";

export type SetupDraft = {
  founderName: string;
  bankName: string;
  background: string;
  brandTheme: BrandTheme;
  difficulty: Difficulty;
};

export function SetupScreen({ onStart }: { onStart: (draft: SetupDraft) => void }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<SetupDraft>({
    founderName: "",
    bankName: "Nordic Trust",
    background: "Operations",
    brandTheme: "forest",
    difficulty: "balanced",
  });

  return (
    <main className="setup-shell" data-brand={draft.brandTheme}>
      <section className="setup-card">
        <div className="setup-brand"><span>BE</span> BANK EMPIRE</div>
        <div className="step-row">
          <span className={step >= 1 ? "active" : ""}>1</span><i />
          <span className={step >= 2 ? "active" : ""}>2</span>
        </div>
        {step === 1 ? (
          <>
            <p className="eyebrow">CREATE YOUR FOUNDER</p>
            <h1>Build a career.<br />Then build an empire.</h1>
            <p className="setup-copy">
              Your background changes your starting advantages. Education,
              reputation and your relationship with the board develop throughout
              the campaign.
            </p>
            <label className="field-label">Founder name</label>
            <input
              value={draft.founderName}
              onChange={(event: { target: { value: string } }) =>
                setDraft({ ...draft, founderName: event.target.value })
              }
              placeholder="Your name"
            />
            <label className="field-label">Professional background</label>
            <div className="choice-grid three">
              {[
                ["Operations", "More staff, lower operating costs"],
                ["Finance", "Stronger compliance and reserves"],
                ["Sales", "More customers and brand strength"],
              ].map(([background, detail]) => (
                <button
                  key={background}
                  className={cn("choice", draft.background === background && "selected")}
                  onClick={() => setDraft({ ...draft, background })}
                >
                  <strong>{background}</strong><small>{detail}</small>
                </button>
              ))}
            </div>
            <button
              className="primary wide setup-continue"
              disabled={!draft.founderName.trim()}
              onClick={() => setStep(2)}
            >Continue</button>
          </>
        ) : (
          <>
            <p className="eyebrow">CREATE YOUR BANK</p>
            <h1>Choose your identity.</h1>
            <p className="setup-copy">
              Start as a local bank. Survive rate cycles, regulators,
              competitors and board pressure on the way to becoming a national group.
            </p>
            <label className="field-label">Bank name</label>
            <input
              value={draft.bankName}
              onChange={(event: { target: { value: string } }) =>
                setDraft({ ...draft, bankName: event.target.value })
              }
            />
            <label className="field-label">Brand</label>
            <div className="brand-options">
              {(["forest", "copper", "gold"] as BrandTheme[]).map((brand) => (
                <button
                  key={brand}
                  aria-label={brand}
                  className={cn("brand-dot", brand, draft.brandTheme === brand && "selected")}
                  onClick={() => setDraft({ ...draft, brandTheme: brand })}
                />
              ))}
            </div>
            <label className="field-label">Difficulty</label>
            <div className="choice-grid three compact-choices">
              {(["relaxed", "balanced", "hard"] as Difficulty[]).map((difficulty) => (
                <button
                  key={difficulty}
                  className={cn("choice", draft.difficulty === difficulty && "selected")}
                  onClick={() => setDraft({ ...draft, difficulty })}
                >
                  <strong>{difficulty[0].toUpperCase() + difficulty.slice(1)}</strong>
                </button>
              ))}
            </div>
            <div className="setup-actions">
              <button className="secondary" onClick={() => setStep(1)}>Back</button>
              <button
                className="primary"
                disabled={!draft.bankName.trim()}
                onClick={() => onStart(draft)}
              >Start campaign</button>
            </div>
          </>
        )}
      </section>
      <aside className="setup-art">
        <div className="city-scene">
          <div className="sun" />
          <div className="building back"><i /><i /><i /></div>
          <div className="building main"><b>{draft.bankName.slice(0, 1) || "B"}</b><i /><i /><i /><i /></div>
          <div className="tree one" /><div className="tree two" /><div className="street" />
        </div>
      </aside>
    </main>
  );
}
