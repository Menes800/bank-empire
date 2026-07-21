import { useMemo, useState } from "react";
import { generateBankIdentity, hashSeed } from "../game/engine";
import type { BrandTheme, CurrencyCode, Difficulty, HomeMarket, NameStyle } from "../game/store";
import { APP_RELEASE_NAME, APP_VERSION } from "../version";
import { cn, formatMoney } from "./format";

export type SetupDraft = {
  founderName: string;
  bankName: string;
  bankLogo: string;
  background: string;
  brandTheme: BrandTheme;
  difficulty: Difficulty;
  currency: CurrencyCode;
  homeMarket: HomeMarket;
  locale: string;
  nameStyle: NameStyle;
  slogan: string;
  firstBranchName: string;
  founderStory: string;
  worldSeed: number;
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

const markets: { key: HomeMarket; name: string; currency: CurrencyCode; locale: string }[] = [
  { key: "NO", name: "Norway", currency: "NOK", locale: "nb-NO" },
  { key: "SE", name: "Sweden", currency: "SEK", locale: "sv-SE" },
  { key: "DK", name: "Denmark", currency: "DKK", locale: "da-DK" },
  { key: "FI", name: "Finland", currency: "EUR", locale: "fi-FI" },
  { key: "DE", name: "Germany", currency: "EUR", locale: "de-DE" },
  { key: "GB", name: "United Kingdom", currency: "GBP", locale: "en-GB" },
  { key: "US", name: "United States", currency: "USD", locale: "en-US" },
  { key: "CH", name: "Switzerland", currency: "CHF", locale: "de-CH" },
  { key: "JP", name: "Japan", currency: "JPY", locale: "ja-JP" },
];

const currencies: CurrencyCode[] = ["NOK", "SEK", "DKK", "EUR", "GBP", "USD", "CHF", "JPY"];

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
  const initialSeed = hashSeed(`${Date.now()}-bank-empire`);
  const [step, setStep] = useState<1 | 2>(1);
  const [logoTouched, setLogoTouched] = useState(false);
  const [identitySeed, setIdentitySeed] = useState(initialSeed);
  const initialIdentity = generateBankIdentity(initialSeed, "NO", "mixed");
  const [draft, setDraft] = useState<SetupDraft>({
    founderName: "",
    bankName: initialIdentity.bankName,
    bankLogo: initialIdentity.bankMark,
    background: "Operations",
    brandTheme: "forest",
    difficulty: "balanced",
    currency: "NOK",
    homeMarket: "NO",
    locale: "nb-NO",
    nameStyle: "mixed",
    slogan: initialIdentity.slogan,
    firstBranchName: initialIdentity.firstBranchName,
    founderStory: initialIdentity.founderStory,
    worldSeed: initialSeed,
  });

  const selectedBackground = backgrounds.find((item) => item.key === draft.background) ?? backgrounds[0];
  const selectedDifficulty = difficulties.find((item) => item.key === draft.difficulty) ?? difficulties[1];
  const founderDisplay = draft.founderName.trim() || "Your founder";
  const bankDisplay = draft.bankName.trim() || "Your bank";
  const logoDisplay = draft.bankLogo.trim().slice(0, 2).toUpperCase() || initials(bankDisplay);
  const launchSummary = useMemo(() => [
    { label: "Opening cash", value: formatMoney(selectedDifficulty.cash, draft.currency, draft.locale) },
    { label: "Founder edge", value: selectedBackground.title },
    { label: "First branch", value: draft.firstBranchName || "Central Branch" },
  ], [draft.currency, draft.firstBranchName, draft.locale, selectedBackground.title, selectedDifficulty.cash]);

  const updateBankName = (bankName: string) => {
    setDraft((current) => ({ ...current, bankName, bankLogo: logoTouched ? current.bankLogo : initials(bankName) }));
  };

  const updateMarket = (homeMarket: HomeMarket) => {
    const market = markets.find((item) => item.key === homeMarket) ?? markets[0];
    setLogoTouched(false);
    setDraft((current) => {
      const identity = generateBankIdentity(identitySeed, homeMarket, current.nameStyle);
      return { ...current, homeMarket, currency: market.currency, locale: market.locale, bankName: identity.bankName, bankLogo: identity.bankMark, slogan: identity.slogan, firstBranchName: identity.firstBranchName, founderStory: identity.founderStory };
    });
  };

  const generateIdentity = () => {
    const nextSeed = hashSeed(`${identitySeed}-${draft.founderName}-${draft.homeMarket}-${Date.now()}`);
    const identity = generateBankIdentity(nextSeed, draft.homeMarket, draft.nameStyle);
    setIdentitySeed(nextSeed);
    setLogoTouched(false);
    setDraft((current) => ({ ...current, ...identity, bankLogo: identity.bankMark, worldSeed: nextSeed }));
  };

  const start = () => {
    const finalDraft = { ...draft, founderName: draft.founderName.trim(), bankName: draft.bankName.trim(), bankLogo: logoDisplay, firstBranchName: draft.firstBranchName.trim(), slogan: draft.slogan.trim(), founderStory: draft.founderStory.trim() };
    localStorage.setItem("bank-empire-bank-mark", JSON.stringify({ bankName: finalDraft.bankName, mark: finalDraft.bankLogo }));
    onStart(finalDraft);
  };

  return <main className="setup-shell setup-v81 setup-v88" data-brand={draft.brandTheme}>
    <header className="setup-header-v81">
      <div className="setup-brand-v81"><span>BE</span><div><strong>BANK EMPIRE</strong><small>Build the institution, then let management run it</small></div></div>
      <div className="setup-progress-v81" aria-label={`Step ${step} of 2`}>
        <button className={step === 1 ? "active" : "complete"} onClick={() => setStep(1)}><span>1</span><div><strong>Founder</strong><small>Opening advantage</small></div></button>
        <i />
        <button className={step === 2 ? "active" : ""} disabled={!draft.founderName.trim()} onClick={() => setStep(2)}><span>2</span><div><strong>Bank</strong><small>Market, identity and difficulty</small></div></button>
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
          <div className="setup-title-v81"><p className="eyebrow">STEP 2 OF 2 · BANK IDENTITY</p><h1>Choose the market and build the institution.</h1><p>Currency and naming follow the home market. The generated identity is fully editable.</p></div>

          <div className="setup-market-grid-v88">
            <label className="setup-input-v81"><span>Home market</span><select value={draft.homeMarket} onChange={(event) => updateMarket(event.target.value as HomeMarket)}>{markets.map((market) => <option key={market.key} value={market.key}>{market.name}</option>)}</select></label>
            <label className="setup-input-v81"><span>Currency</span><select value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value as CurrencyCode })}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></label>
            <label className="setup-input-v81"><span>Name style</span><select value={draft.nameStyle} onChange={(event) => setDraft({ ...draft, nameStyle: event.target.value as NameStyle })}><option value="local">Local</option><option value="mixed">Mixed</option><option value="international">International</option></select></label>
          </div>

          <button className="identity-generator-v88" onClick={generateIdentity}><span>✦</span><div><strong>Generate bank identity</strong><small>Creates name, mark, slogan, first branch and founder story.</small></div></button>

          <div className="identity-grid-v81"><label className="setup-input-v81"><span>Bank name</span><input value={draft.bankName} onChange={(event) => updateBankName(event.target.value)} placeholder="Bank name" /></label><label className="setup-input-v81 mark-input-v81"><span>Bank mark</span><input maxLength={2} value={draft.bankLogo} onChange={(event) => { setLogoTouched(true); setDraft({ ...draft, bankLogo: event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() }); }} placeholder="BE" /></label></div>
          <div className="setup-identity-details-v88">
            <label className="setup-input-v81"><span>Slogan</span><input value={draft.slogan} onChange={(event) => setDraft({ ...draft, slogan: event.target.value })} /></label>
            <label className="setup-input-v81"><span>First branch name</span><input value={draft.firstBranchName} onChange={(event) => setDraft({ ...draft, firstBranchName: event.target.value })} /></label>
            <label className="setup-input-v81 full"><span>Founder story</span><textarea rows={3} value={draft.founderStory} onChange={(event) => setDraft({ ...draft, founderStory: event.target.value })} /></label>
          </div>

          <div className="setup-section-v81"><div><strong>Brand direction</strong><small>This controls the interface palette.</small></div></div>
          <div className="brand-grid-v81">{(["forest", "copper", "gold"] as BrandTheme[]).map((brand) => <button key={brand} className={cn("brand-card-v81", brand, draft.brandTheme === brand && "selected")} onClick={() => setDraft({ ...draft, brandTheme: brand })}><i /><div><strong>{brandNames[brand].title}</strong><small>{brandNames[brand].description}</small></div>{draft.brandTheme === brand && <b>✓</b>}</button>)}</div>

          <div className="setup-section-v81"><div><strong>Difficulty</strong><small>Changes the opening cash buffer, not the available systems.</small></div></div>
          <div className="difficulty-grid-v81">{difficulties.map((option) => <button key={option.key} className={cn("difficulty-card-v81", draft.difficulty === option.key && "selected")} onClick={() => setDraft({ ...draft, difficulty: option.key })}><div><strong>{option.title}</strong><b>{formatMoney(option.cash, draft.currency, draft.locale)}</b></div><p>{option.summary}</p><small>{option.pressure}</small></button>)}</div>

          <div className="setup-actions-v81"><button className="secondary" onClick={() => setStep(1)}>← Back</button><button className="primary" disabled={!draft.bankName.trim() || !logoDisplay || !draft.firstBranchName.trim()} onClick={start}>Open your bank →</button></div>
        </>}
      </div>

      <aside className="setup-summary-v81">
        <div className="summary-status-v81"><span><i /> LIVE CAMPAIGN SUMMARY</span><small>Seed {draft.worldSeed.toString(36).toUpperCase()}</small></div>
        <div className="summary-bank-v81"><span>{logoDisplay}</span><div><small>{draft.homeMarket} · {draft.currency}</small><strong>{bankDisplay}</strong><p>{draft.slogan}</p></div></div>
        <div className="summary-stats-v81">{launchSummary.map((item) => <span key={item.label}><small>{item.label}</small><strong>{item.value}</strong></span>)}</div>
        <div className="summary-choice-v81"><small>FOUNDER</small><strong>{founderDisplay}</strong><p>{draft.founderStory}</p><span>{selectedBackground.advantage}.</span></div>
        <div className="summary-plan-v81"><small>FIRST 90 DAYS</small><ol><li><span>1</span><div><strong>Open the doors</strong><p>Review cash, products and {draft.firstBranchName}.</p></div></li><li><span>2</span><div><strong>Build management</strong><p>Appoint executives and define their mandates.</p></div></li><li><span>3</span><div><strong>Prepare expansion</strong><p>The map will select the first genuinely available market.</p></div></li></ol></div>
        <div className="summary-note-v81"><strong>Generated, then editable.</strong><p>The same save seed keeps candidates, competitors and stories consistent.</p></div>
      </aside>
    </section>
  </main>;
}
