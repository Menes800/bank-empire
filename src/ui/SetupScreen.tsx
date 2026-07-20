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
  {
    key: "Operations",
    icon: "O",
    title: "Operations",
    summary: "Build a dependable bank with stronger service delivery.",
    advantage: "+1 employee · higher starting satisfaction",
    tradeoff: "No extra reserves or customer-growth bonus",
  },
  {
    key: "Finance",
    icon: "F",
    title: "Finance",
    summary: "Begin with stronger controls, reserves and credit expertise.",
    advantage: "+compliance · +capital · stronger credit analyst",
    tradeoff: "Slower customer and brand start",
  },
  {
    key: "Sales",
    icon: "S",
    title: "Sales",
    summary: "Open with more customers and a more visible local brand.",
    advantage: "+50 customers · +reputation · +brand strength",
    tradeoff: "No additional operating or reserve protection",
  },
];

const difficulties: DifficultyOption[] = [
  { key: "relaxed", title: "Relaxed", cash: 10_000_000, summary: "More room to learn and recover from early mistakes.", pressure: "Largest opening cash buffer" },
  { key: "balanced", title: "Balanced", cash: 8_000_000, summary: "The intended management and risk experience.", pressure: "Standard opening cash buffer" },
  { key: "hard", title: "Hard", cash: 6_500_000, summary: "Thin liquidity leaves less room for rushed expansion.", pressure: "Smallest opening cash buffer" },
];

const brandNames: Record<BrandTheme, { title: string; description: string }> = {
  forest: { title: "Forest", description: "Established, trustworthy and local" },
  copper: { title: "Copper", description: "Bold, commercial and ambitious" },
  gold: { title: "Gold", description: "Premium, selective and institutional" },
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
    { label: "First market", value: "Harbour Quarter" },
  ], [selectedBackground.title, selectedDifficulty.cash]);

  const updateBankName = (bankName: string) => {
    setDraft((current) => ({ ...current, bankName, bankLogo: logoTouched ? current.bankLogo : initials(bankName) }));
  };

  const start = () => {
    const finalDraft = { ...draft, founderName: draft.founderName.trim(), bankName: draft.bankName.trim(), bankLogo: logoDisplay };
    localStorage.setItem("bank-empire-bank-mark", JSON.stringify({ bankName: finalDraft.bankName, mark: finalDraft.bankLogo }));
    onStart(finalDraft);
  };

  return (
    <main className="setup-shell setup-v62" data-brand={draft.brandTheme} data-step={step}>
      <section className="setup-workspace">
        <div className="setup-topbar">
          <div className="setup-brand"><span>BE</span><div><strong>BANK EMPIRE</strong><small>Build the institution from the ground up</small></div></div>
          <div className="setup-progress" aria-label={`Step ${step} of 2`}>
            <button className={step >= 1 ? "active" : ""} onClick={() => setStep(1)}><span>1</span><div><strong>Founder</strong><small>Create your edge</small></div></button>
            <i />
            <button className={step >= 2 ? "active" : ""} disabled={!draft.founderName.trim()} onClick={() => setStep(2)}><span>2</span><div><strong>Bank</strong><small>Design the identity</small></div></button>
          </div>
        </div>

        <div className="setup-content-v62">
          {step === 1 ? <>
            <div className="setup-heading-v62">
              <p className="eyebrow">01 / 02 · CREATE YOUR FOUNDER</p>
              <h1>Who will build<br />the bank?</h1>
              <p>Your founder is not just a name. The professional background changes the opening team, customer position and the safety margin you begin with.</p>
            </div>

            <label className="setup-field-v62">
              <span>Founder name</span>
              <input autoFocus value={draft.founderName} onChange={(event) => setDraft({ ...draft, founderName: event.target.value })} placeholder="Enter your name" />
            </label>

            <div className="setup-section-label"><div><strong>Professional background</strong><small>Choose one permanent opening advantage and accept its trade-off.</small></div><span>1 choice</span></div>
            <div className="background-choice-grid">
              {backgrounds.map((option) => <button key={option.key} className={cn("background-choice", draft.background === option.key && "selected")} onClick={() => setDraft({ ...draft, background: option.key })}>
                <div className="background-choice-head"><span>{option.icon}</span><div><strong>{option.title}</strong><small>{option.summary}</small></div>{draft.background === option.key && <b>✓</b>}</div>
                <div className="background-effect positive"><i>+</i><span>{option.advantage}</span></div>
                <div className="background-effect tradeoff"><i>−</i><span>{option.tradeoff}</span></div>
              </button>)}
            </div>

            <div className="setup-next-card"><div><small>YOUR OPENING PROFILE</small><strong>{selectedBackground.title} founder</strong><p>{selectedBackground.advantage}. This will be applied when the licence is issued.</p></div><button className="primary" disabled={!draft.founderName.trim()} onClick={() => setStep(2)}>Design your bank →</button></div>
          </> : <>
            <div className="setup-heading-v62 compact-heading">
              <p className="eyebrow">02 / 02 · CREATE YOUR BANK</p>
              <h1>Give the bank<br />an identity.</h1>
              <p>Name the institution, create the bank mark and choose how forgiving the opening years should be.</p>
            </div>

            <div className="bank-identity-grid">
              <label className="setup-field-v62"><span>Bank name</span><input value={draft.bankName} onChange={(event) => updateBankName(event.target.value)} placeholder="Bank name" /></label>
              <label className="setup-field-v62 logo-field"><span>Bank mark</span><input maxLength={2} value={draft.bankLogo} onChange={(event) => { setLogoTouched(true); setDraft({ ...draft, bankLogo: event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() }); }} placeholder="BE" /></label>
            </div>

            <div className="setup-section-label"><div><strong>Brand direction</strong><small>The palette changes the bank, interface and live preview.</small></div><span>Live</span></div>
            <div className="brand-choice-grid">
              {(["forest", "copper", "gold"] as BrandTheme[]).map((brand) => <button key={brand} className={cn("brand-choice-v62", brand, draft.brandTheme === brand && "selected")} onClick={() => setDraft({ ...draft, brandTheme: brand })}><i /><div><strong>{brandNames[brand].title}</strong><small>{brandNames[brand].description}</small></div>{draft.brandTheme === brand && <b>✓</b>}</button>)}
            </div>

            <div className="setup-section-label difficulty-label"><div><strong>Difficulty</strong><small>Difficulty currently changes the opening cash buffer. All management systems remain active.</small></div></div>
            <div className="difficulty-choice-grid">
              {difficulties.map((option) => <button key={option.key} className={cn("difficulty-choice", draft.difficulty === option.key && "selected")} onClick={() => setDraft({ ...draft, difficulty: option.key })}>
                <div><strong>{option.title}</strong><b>{money.format(option.cash)}</b></div><p>{option.summary}</p><small>{option.pressure}</small>
              </button>)}
            </div>

            <div className="opening-summary-card">
              <div><small>READY TO OPEN</small><strong>{bankDisplay}</strong><p>{founderDisplay} will open a {draft.difficulty} local bank with an {selectedBackground.title.toLowerCase()} background.</p></div>
              <div className="opening-summary-stats">{launchSummary.map((item) => <span key={item.label}><small>{item.label}</small><strong>{item.value}</strong></span>)}</div>
            </div>

            <div className="setup-actions-v62"><button className="secondary" onClick={() => setStep(1)}>← Back to founder</button><button className="primary open-bank-button" disabled={!draft.bankName.trim() || !logoDisplay} onClick={start}>Open your bank →</button></div>
          </>}
        </div>
        <div className="setup-version-v7">Bank Empire v{APP_VERSION} · {APP_RELEASE_NAME}</div>
      </section>

      <aside className="setup-live-preview">
        <div className="preview-noise" />
        <div className="preview-topline"><span><i /> LIVE BANK PREVIEW</span><small>v{APP_VERSION} · Changes update instantly</small></div>

        <div className="preview-bank-identity">
          <span className="preview-bank-logo">{logoDisplay}</span>
          <div><small>FOUNDING APPLICATION</small><strong>{bankDisplay}</strong><p>{selectedBackground.title} founder · {selectedDifficulty.title} campaign</p></div>
        </div>

        <div className="preview-city-v62">
          <div className="preview-sky-glow" />
          <div className="preview-road main-road" /><div className="preview-road cross-road" />
          <div className="preview-district district-one"><span>HARBOUR</span></div><div className="preview-district district-two"><span>GARDEN</span></div><div className="preview-district district-three"><span>CENTRAL</span></div>
          <div className="preview-building rival-building"><i /><i /><i /><small>RIVAL</small></div>
          <div className="preview-building branch-building"><b>{logoDisplay}</b><i /><i /><i /><i /><strong>{bankDisplay}</strong></div>
          <div className="preview-building office-building"><i /><i /><i /><i /><i /><i /></div>
          <div className="preview-tree tree-a" /><div className="preview-tree tree-b" /><div className="preview-tree tree-c" />
          <div className="preview-customer customer-a" /><div className="preview-customer customer-b" /><div className="preview-customer customer-c" />
          <div className="preview-map-pin"><span>1</span><small>FIRST BRANCH</small></div>
        </div>

        <div className="preview-floating-card founder-card"><small>FOUNDER</small><strong>{founderDisplay}</strong><span>{selectedBackground.title} advantage active</span></div>
        <div className="preview-floating-card capital-card"><small>OPENING CASH</small><strong>{money.format(selectedDifficulty.cash)}</strong><span>{selectedDifficulty.pressure}</span></div>

        <div className="preview-storyline">
          <small>YOUR BANKING STORY</small>
          <div><span className="complete">1</span><strong>Create founder</strong><i /></div>
          <div><span className={step === 2 ? "complete" : "current"}>2</span><strong>Design bank</strong><i /></div>
          <div><span>3</span><strong>Choose strategy</strong><i /></div>
          <div><span>4</span><strong>Open doors</strong></div>
        </div>
        <div className="preview-chapter"><small>CHAPTER ONE</small><strong>The licence arrives.</strong><p>Start with one branch, a small leadership team and a local market full of customers and rivals.</p></div>
      </aside>
    </main>
  );
}
