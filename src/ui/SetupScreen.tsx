import { useMemo, useState } from "react";
import type { BrandTheme, Difficulty } from "../game/store";
import { APP_RELEASE_NAME, APP_VERSION } from "../version";
import { cn, money } from "./format";

export type SetupDraft = {
  founderName: string;
  bankName: string;
  bankLogo: string;
  background: string;
  brandTheme: BrandTheme;
  difficulty: Difficulty;
};

type BackgroundOption = {
  key: string;
  icon: string;
  title: string;
  summary: string;
  advantage: string;
  tradeoff: string;
};

type DifficultyOption = {
  key: Difficulty;
  title: string;
  cash: number;
  summary: string;
  pressure: string;
};

const backgrounds: BackgroundOption[] = [
  { key: "Operations", icon: "O", title: "Operations", summary: "A dependable opening team and stronger service delivery.", advantage: "+1 employee and higher satisfaction", tradeoff: "No reserve or acquisition bonus" },
  { key: "Finance", icon: "F", title: "Finance", summary: "Better controls, reserves and credit expertise from day one.", advantage: "+capital, compliance and credit skill", tradeoff: "Slower customer and brand start" },
  { key: "Sales", icon: "S", title: "Sales", summary: "A larger opening customer base and stronger local visibility.", advantage: "+customers, reputation and brand", tradeoff: "No additional operating protection" },
];

const difficulties: DifficultyOption[] = [
  { key: "relaxed", title: "Relaxed", cash: 10_000_000, summary: "More room to learn and recover.", pressure: "Largest cash buffer" },
  { key: "balanced", title: "Balanced", cash: 8_000_000, summary: "The intended management experience.", pressure: "Standard cash buffer" },
  { key: "hard", title: "Hard", cash: 6_500_000, summary: "Thin liquidity punishes rushed expansion.", pressure: "Smallest cash buffer" },
];

const brandNames: Record<BrandTheme, { title: string; description: string }> = {
  forest: { title: "Forest", description: "Established and trustworthy" },
  copper: { title: "Copper", description: "Commercial and ambitious" },
  gold: { title: "Gold", description: "Premium and institutional" },
};

function initials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "BE";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function SetupScreen({ onStart }: { onStart: (draft: SetupDraft) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [logoTouched, setLogoTouched] = useState(false);
  const [draft, setDraft] = useState<SetupDraft>({
    founderName: "",
    bankName: "Nordic Trust",
    bankLogo: "NT",
    background: "Operations",
    brandTheme: "forest",
    difficulty: "balanced",
  });

  const selectedBackground = backgrounds.find((item) => item.key === draft.background) ?? backgrounds[0];
  const selectedDifficulty = difficulties.find((item) => item.key === draft.difficulty) ?? difficulties[1];
  const founderDisplay = draft.founderName.trim() || "Your founder";
  const bankDisplay = draft.bankName.trim() || "Your bank";
  const logoDisplay = draft.bankLogo.trim().slice(0, 2).toUpperCase() || initials(bankDisplay);
  const launchSummary = useMemo(() => [
    { label: "Opening cash", value: money.format(selectedDifficulty.cash) },
    { label: "Founder edge", value: selectedBackground.title },
    { label: "First branch", value: "Harbour Quarter" },
  ], [selectedBackground.title, selectedDifficulty.cash]);

  const updateBankName = (bankName: string) => {
    setDraft((current) => ({ ...current, bankName, bankLogo: logoTouched ? current.bankLogo : initials(bankName) }));
  };

  const start = () => {
    const finalDraft = { ...draft, founderName: draft.founderName.trim(), bankName: draft.bankName.trim(), bankLogo: logoDisplay };
    localStorage.setItem("bank-empire-bank-mark", JSON.stringify({ bankName: finalDraft.bankName, mark: finalDraft.bankLogo }));
    onStart(finalDraft);
  };

  return <main className="setup-shell setup-v81" data-brand={draft.brandTheme}>
    <header className="setup-header-v81">
      <div className="setup-brand-v81"><span>BE</span><div><strong>BANK EMPIRE</strong><small>Build the institution, then let management run it</small></div></div>
      <div className="setup-progress-v81" aria-label={`Step ${step} of 2`}>
        <button className={step === 1 ? "active" : "complete"} onClick={() => setStep(1)}><span>1</span><div><strong>Founder</strong><small>Opening advantage</small></div></button>
        <i />
        <button className={step === 2 ? "active" : ""} disabled={!draft.founderName.trim()} onClick={() => setStep(2)}><span>2</span><div><strong>Bank</strong><small>Identity and difficulty</small></div></button>
      </div>
      <div className="setup-version-v81">v{APP_VERSION}<small>{APP_RELEASE_NAME}</small></div>
    </header>

    <section className="setup-frame-v81">
      <div className="setup-form-v81">
        {step === 1 ? <>
          <div className="setup-title-v81"><p className="eyebrow">STEP 1 OF 2 · FOUNDER</p><h1>Choose who builds the bank.</h1><p>The founder background changes your opening team and safety margin. It is a permanent campaign choice.</p></div>

          <label className="setup-input-v81"><span>Founder name</span><input autoFocus value={draft.founderName} onChange={(event) => setDraft({ ...draft, founderName: event.target.value })} placeholder="Enter your name" /></label>

          <div className="setup-section-v81"><div><strong>Professional background</strong><small>Choose one advantage and accept its trade-off.</small></div><span>ONE CHOICE</span></div>
          <div className="background-grid-v81">{backgrounds.map((option) => <button key={option.key} className={cn("background-card-v81", draft.background === option.key && "selected")} onClick={() => setDraft({ ...draft, background: option.key })}>
            <div className="background-head-v81"><span>{option.icon}</span><div><strong>{option.title}</strong><small>{option.summary}</small></div>{draft.background === option.key && <b>✓</b>}</div>
            <div className="choice-effect-v81 positive"><i>+</i><span>{option.advantage}</span></div>
            <div className="choice-effect-v81 tradeoff"><i>−</i><span>{option.tradeoff}</span></div>
          </button>)}</div>

          <div className="setup-action-v81"><div><small>SELECTED PROFILE</small><strong>{selectedBackground.title} founder</strong><span>{selectedBackground.advantage}</span></div><button className="primary" disabled={!draft.founderName.trim()} onClick={() => setStep(2)}>Continue to bank →</button></div>
        </> : <>
          <div className="setup-title-v81"><p className="eyebrow">STEP 2 OF 2 · BANK</p><h1>Name the institution.</h1><p>Set the identity and choose how forgiving the opening years should be.</p></div>

          <div className="identity-grid-v81"><label className="setup-input-v81"><span>Bank name</span><input value={draft.bankName} onChange={(event) => updateBankName(event.target.value)} placeholder="Bank name" /></label><label className="setup-input-v81 mark-input-v81"><span>Bank mark</span><input maxLength={2} value={draft.bankLogo} onChange={(event) => { setLogoTouched(true); setDraft({ ...draft, bankLogo: event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() }); }} placeholder="BE" /></label></div>

          <div className="setup-section-v81"><div><strong>Brand direction</strong><small>This controls the interface palette.</small></div></div>
          <div className="brand-grid-v81">{(["forest", "copper", "gold"] as BrandTheme[]).map((brand) => <button key={brand} className={cn("brand-card-v81", brand, draft.brandTheme === brand && "selected")} onClick={() => setDraft({ ...draft, brandTheme: brand })}><i /><div><strong>{brandNames[brand].title}</strong><small>{brandNames[brand].description}</small></div>{draft.brandTheme === brand && <b>✓</b>}</button>)}</div>

          <div className="setup-section-v81"><div><strong>Difficulty</strong><small>Changes the opening cash buffer, not the available systems.</small></div></div>
          <div className="difficulty-grid-v81">{difficulties.map((option) => <button key={option.key} className={cn("difficulty-card-v81", draft.difficulty === option.key && "selected")} onClick={() => setDraft({ ...draft, difficulty: option.key })}><div><strong>{option.title}</strong><b>{money.format(option.cash)}</b></div><p>{option.summary}</p><small>{option.pressure}</small></button>)}</div>

          <div className="setup-actions-v81"><button className="secondary" onClick={() => setStep(1)}>← Back</button><button className="primary" disabled={!draft.bankName.trim() || !logoDisplay} onClick={start}>Open your bank →</button></div>
        </>}
      </div>

      <aside className="setup-summary-v81">
        <div className="summary-status-v81"><span><i /> LIVE CAMPAIGN SUMMARY</span><small>Updates instantly</small></div>
        <div className="summary-bank-v81"><span>{logoDisplay}</span><div><small>FOUNDING APPLICATION</small><strong>{bankDisplay}</strong><p>{founderDisplay} · {selectedDifficulty.title} campaign</p></div></div>

        <div className="summary-stats-v81">{launchSummary.map((item) => <span key={item.label}><small>{item.label}</small><strong>{item.value}</strong></span>)}</div>

        <div className="summary-choice-v81"><small>YOUR OPENING EDGE</small><strong>{selectedBackground.title}</strong><p>{selectedBackground.advantage}.</p><span>{selectedBackground.tradeoff}.</span></div>

        <div className="summary-plan-v81"><small>FIRST 90 DAYS</small><ol><li><span>1</span><div><strong>Open the doors</strong><p>Review cash, products and the first branch.</p></div></li><li><span>2</span><div><strong>Build management</strong><p>Appoint executives and delegate routine work.</p></div></li><li><span>3</span><div><strong>Prepare expansion</strong><p>Reach a stable result before adding another branch.</p></div></li></ol></div>

        <div className="summary-note-v81"><strong>This is a management game.</strong><p>You set strategy and approve major decisions. Managers operate the bank.</p></div>
      </aside>
    </section>
  </main>;
}
