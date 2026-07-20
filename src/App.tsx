import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  acquireCompetitor,
  advanceDay,
  applyForPromotion,
  createCampaign,
  hireEmployee,
  investInCompliance,
  launchProduct,
  openBranch,
  runMarketingCampaign,
  setRates,
  takeCourse,
  takeDividend,
} from './game/engine';
import { clearGame, loadGame, saveGame, type BrandTheme, type Difficulty, type GameState, type ProductKey } from './game/store';

const money = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'NOK',
  maximumFractionDigits: 0,
});
const compact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });

const pages = [
  ['overview', 'Overview', '◈'],
  ['career', 'Founder & Career', '♙'],
  ['banking', 'Products & Pricing', '▤'],
  ['customers', 'Customers', '◎'],
  ['operations', 'People & Branches', '⌂'],
  ['risk', 'Risk & Compliance', '◇'],
  ['holdings', 'Holdings', '◆'],
] as const;

type PageKey = (typeof pages)[number][0];

type SetupDraft = {
  founderName: string;
  bankName: string;
  background: string;
  brandTheme: BrandTheme;
  difficulty: Difficulty;
};

const careerTitles = ['Local Founder', 'Banking Executive', 'Regional Director', 'Group CEO', 'Industry Leader'];
const educationTitles = ['Self-taught', 'Banking Certificate', 'Finance Diploma', 'Executive Banking Programme', 'Advanced Leadership'];

function Metric({ label, value, change, tone = 'default' }: { label: string; value: string; change: string; tone?: 'default' | 'good' | 'warn' }) {
  return (
    <article className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className={`metric-change ${tone}`}>{change}</div>
    </article>
  );
}

function Progress({ value, warning = false }: { value: number; warning?: boolean }) {
  return (
    <div className="progress-track">
      <div className={warning ? 'progress-fill warning' : 'progress-fill'} style={{ width: `${Math.max(3, Math.min(100, value))}%` }} />
    </div>
  );
}

function SetupScreen({ onStart }: { onStart: (draft: SetupDraft) => void }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<SetupDraft>({
    founderName: '',
    bankName: 'Nordic Trust',
    background: 'Operations',
    brandTheme: 'forest',
    difficulty: 'balanced',
  });

  return (
    <main className="setup-shell" data-brand={draft.brandTheme}>
      <section className="setup-card">
        <div className="setup-brand"><span>BE</span> BANK EMPIRE</div>
        <div className="step-row"><span className={step >= 1 ? 'active' : ''}>1</span><i /><span className={step >= 2 ? 'active' : ''}>2</span></div>
        {step === 1 ? (
          <>
            <p className="eyebrow">CREATE YOUR FOUNDER</p>
            <h1>Build a career.<br />Then build an empire.</h1>
            <p className="setup-copy">Your background affects the way you grow the bank. You can improve skills and education throughout the campaign.</p>
            <label className="field-label">Founder name</label>
            <input value={draft.founderName} onChange={(e) => setDraft({ ...draft, founderName: e.target.value })} placeholder="Your name" />
            <label className="field-label">Professional background</label>
            <div className="choice-grid three">
              {['Operations', 'Finance', 'Sales'].map((background) => (
                <button key={background} className={draft.background === background ? 'choice selected' : 'choice'} onClick={() => setDraft({ ...draft, background })}>
                  <strong>{background}</strong>
                  <small>{background === 'Operations' ? 'Lower branch costs' : background === 'Finance' ? 'Stronger capital control' : 'Faster customer growth'}</small>
                </button>
              ))}
            </div>
            <button className="primary wide" disabled={!draft.founderName.trim()} onClick={() => setStep(2)}>Continue</button>
          </>
        ) : (
          <>
            <p className="eyebrow">CREATE YOUR BANK</p>
            <h1>Choose your identity.</h1>
            <p className="setup-copy">Start local, grow deposits, manage risk and become a national banking group.</p>
            <label className="field-label">Bank name</label>
            <input value={draft.bankName} onChange={(e) => setDraft({ ...draft, bankName: e.target.value })} />
            <label className="field-label">Brand</label>
            <div className="brand-options">
              {(['forest', 'copper', 'gold'] as BrandTheme[]).map((brand) => <button key={brand} aria-label={brand} className={draft.brandTheme === brand ? `brand-dot ${brand} selected` : `brand-dot ${brand}`} onClick={() => setDraft({ ...draft, brandTheme: brand })} />)}
            </div>
            <label className="field-label">Difficulty</label>
            <div className="choice-grid three compact-choices">
              {(['relaxed', 'balanced', 'hard'] as Difficulty[]).map((difficulty) => (
                <button key={difficulty} className={draft.difficulty === difficulty ? 'choice selected' : 'choice'} onClick={() => setDraft({ ...draft, difficulty })}>
                  <strong>{difficulty[0].toUpperCase() + difficulty.slice(1)}</strong>
                </button>
              ))}
            </div>
            <div className="setup-actions">
              <button className="secondary" onClick={() => setStep(1)}>Back</button>
              <button className="primary" disabled={!draft.bankName.trim()} onClick={() => onStart(draft)}>Start campaign</button>
            </div>
          </>
        )}
      </section>
      <aside className="setup-art">
        <div className="city-scene">
          <div className="sun" />
          <div className="building back"><i /><i /><i /></div>
          <div className="building main"><b>{draft.bankName.slice(0, 1) || 'B'}</b><i /><i /><i /><i /></div>
          <div className="tree one" /><div className="tree two" />
          <div className="street" />
        </div>
      </aside>
    </main>
  );
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => loadGame());
  const [page, setPage] = useState<PageKey>('overview');
  const [dark, setDark] = useState(() => localStorage.getItem('bank-empire-theme') === 'dark');

  useEffect(() => saveGame(game), [game]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('bank-empire-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const pageTitle = pages.find(([key]) => key === page)?.[1] ?? 'Overview';
  const totalAssets = game.cash + game.loans;
  const loanDepositRatio = game.loans / Math.max(1, game.deposits) * 100;
  const capacity = Math.round(game.employees * 72);
  const serviceLoad = game.customers / Math.max(1, capacity) * 100;
  const chartBars = useMemo(() => [42, 52, 48, 61, 58, 69, Math.max(30, Math.min(92, 55 + game.profit / 700))], [game.profit]);

  if (!game.setupComplete) {
    return <SetupScreen onStart={(draft) => setGame(createCampaign(draft))} />;
  }

  const action = (fn: (state: GameState) => GameState) => setGame((current) => fn(current));

  return (
    <div className="app" data-brand={game.brandTheme}>
      <aside className="sidebar">
        <div className="logo"><span>{game.bankName.slice(0, 1)}</span><div><strong>{game.bankName}</strong><small>Banking Group</small></div></div>
        <nav>
          <p>MANAGEMENT</p>
          {pages.map(([key, label, icon]) => (
            <button key={key} className={page === key ? 'nav-item active' : 'nav-item'} onClick={() => setPage(key)}><span>{icon}</span>{label}</button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="avatar">{game.founderName.slice(0, 1).toUpperCase()}</div>
          <div><strong>{game.founderName}</strong><small>{careerTitles[game.careerLevel]}</small></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <div><p className="eyebrow">YEAR {game.year} · DAY {game.day}</p><h1>{pageTitle}</h1></div>
          <div className="header-actions">
            <button className="icon-button" onClick={() => setDark((value) => !value)}>{dark ? '☀' : '◐'}</button>
            <div className="cash-pill"><small>LIQUID CASH</small><strong>{money.format(game.cash)}</strong></div>
            <button className="primary next-day" onClick={() => action(advanceDay)}>Next day <span>→</span></button>
          </div>
        </header>

        {page === 'overview' && (
          <>
            <section className="hero-dashboard">
              <div>
                <p className="eyebrow light">BANK VALUE</p>
                <h2>{money.format(totalAssets - game.deposits)}</h2>
                <p>Your local bank is growing. Keep liquidity healthy while expanding loans, products and branches.</p>
                <div className="hero-stats"><span><small>Market share</small><strong>{game.marketShare.toFixed(2)}%</strong></span><span><small>Share price</small><strong>{money.format(game.sharePrice)}</strong></span><span><small>Customers</small><strong>{compact.format(game.customers)}</strong></span></div>
              </div>
              <div className="mini-city">
                <div className="mini-building"><b>{game.bankName.slice(0, 1)}</b><i /><i /><i /></div>
                <div className="mini-tree left" /><div className="mini-tree right" />
                <div className="mini-road" />
              </div>
            </section>

            <section className="metrics-grid">
              <Metric label="Deposits" value={money.format(game.deposits)} change={`+${game.depositRate.toFixed(1)}% customer rate`} tone="good" />
              <Metric label="Loan portfolio" value={money.format(game.loans)} change={`${loanDepositRatio.toFixed(0)}% loan-to-deposit`} />
              <Metric label="Daily profit" value={money.format(game.profit)} change={`${money.format(game.revenue)} revenue`} tone={game.profit >= 0 ? 'good' : 'warn'} />
              <Metric label="Reputation" value={`${game.reputation.toFixed(0)}/100`} change={`${game.satisfaction.toFixed(0)} customer satisfaction`} tone="good" />
            </section>

            <section className="content-grid overview-grid">
              <article className="panel chart-panel">
                <div className="panel-heading"><div><p className="eyebrow">PERFORMANCE</p><h3>Operating result</h3></div><span className={game.profit >= 0 ? 'status good' : 'status warn'}>{game.profit >= 0 ? 'Profitable' : 'Under pressure'}</span></div>
                <div className="bar-chart">{chartBars.map((height, index) => <div key={index}><i style={{ height: `${height}%` }} /><small>D{Math.max(1, game.day - 6 + index)}</small></div>)}</div>
              </article>
              <article className="panel priorities">
                <div className="panel-heading"><div><p className="eyebrow">CEO PRIORITIES</p><h3>What needs attention</h3></div></div>
                <div className="priority-row"><span className="priority-icon">L</span><div><strong>Liquidity buffer</strong><small>{game.liquidityRatio.toFixed(1)}% available</small><Progress value={game.liquidityRatio * 1.7} warning={game.liquidityRatio < 18} /></div></div>
                <div className="priority-row"><span className="priority-icon">S</span><div><strong>Service capacity</strong><small>{game.customers} customers / {capacity} capacity</small><Progress value={serviceLoad} warning={serviceLoad > 95} /></div></div>
                <div className="priority-row"><span className="priority-icon">C</span><div><strong>Compliance readiness</strong><small>{game.compliance.toFixed(0)} of 100</small><Progress value={game.compliance} warning={game.compliance < 65} /></div></div>
              </article>
            </section>

            <section className="panel news-panel">
              <div className="panel-heading"><div><p className="eyebrow">GROUP NEWS</p><h3>Latest developments</h3></div></div>
              <div className="news-list">{game.events.slice(0, 4).map((item) => <div className="news-item" key={item.id}><span className={`news-dot ${item.tone}`} /><div><strong>{item.title}</strong><p>{item.body}</p></div><small>Day {item.day}</small></div>)}</div>
            </section>
          </>
        )}

        {page === 'career' && (
          <section className="content-grid two-column">
            <article className="panel profile-card">
              <div className="large-avatar">{game.founderName.slice(0, 1).toUpperCase()}</div>
              <p className="eyebrow">FOUNDER PROFILE</p><h2>{game.founderName}</h2><p>{careerTitles[game.careerLevel]} · {game.background} background</p>
              <div className="profile-stats"><span><small>Personal cash</small><strong>{money.format(game.personalCash)}</strong></span><span><small>Skill points</small><strong>{game.skillPoints}</strong></span></div>
              <button className="secondary wide" disabled={game.cash < 1_200_000} onClick={() => action(takeDividend)}>Take founder dividend · NOK 100k</button>
            </article>
            <article className="panel">
              <div className="panel-heading"><div><p className="eyebrow">CAREER & EDUCATION</p><h3>{educationTitles[Math.min(game.educationLevel, educationTitles.length - 1)]}</h3></div></div>
              <div className="career-step"><span>01</span><div><strong>Executive banking course</strong><p>Costs NOK 30,000 personally and grants two skill points.</p></div><button className="primary small" disabled={game.personalCash < 30_000} onClick={() => action(takeCourse)}>Enrol</button></div>
              <div className="career-step"><span>02</span><div><strong>Founder career milestone</strong><p>Spend two skill points to increase your status and personal earnings.</p></div><button className="primary small" disabled={game.skillPoints < 2 || game.careerLevel >= 4} onClick={() => action(applyForPromotion)}>Advance</button></div>
            </article>
          </section>
        )}

        {page === 'banking' && (
          <>
            <section className="content-grid two-column">
              <article className="panel rate-panel"><p className="eyebrow">DEPOSIT PRICING</p><h3>{game.depositRate.toFixed(2)}%</h3><input type="range" min="0.5" max="6" step="0.05" value={game.depositRate} onChange={(e) => action((state) => setRates(state, Number(e.target.value), state.loanRate))} /><div className="range-labels"><span>Cheap funding</span><span>Fast growth</span></div></article>
              <article className="panel rate-panel"><p className="eyebrow">LOAN PRICING</p><h3>{game.loanRate.toFixed(2)}%</h3><input type="range" min="2.5" max="14" step="0.05" value={game.loanRate} onChange={(e) => action((state) => setRates(state, state.depositRate, Number(e.target.value)))} /><div className="range-labels"><span>High demand</span><span>High margin</span></div></article>
            </section>
            <section className="product-grid">
              {([
                ['everyday', 'Everyday Account', 'Core current account and debit services.', 0],
                ['savings', 'High-Yield Savings', 'Grow deposits with a premium savings product.', 220_000],
                ['mortgage', 'Home Mortgage', 'Build a larger secured lending portfolio.', 650_000],
                ['sme', 'SME Banking', 'Serve local companies and increase fee income.', 900_000],
              ] as [ProductKey, string, string, number][]).map(([key, title, description, cost]) => {
                const active = game.products.includes(key);
                return <article className={active ? 'panel product-card active-product' : 'panel product-card'} key={key}><span className="product-icon">{title.slice(0, 1)}</span><h3>{title}</h3><p>{description}</p><button className={active ? 'secondary wide' : 'primary wide'} disabled={active || game.cash < cost} onClick={() => action((state) => launchProduct(state, key))}>{active ? 'Active' : `Launch · ${money.format(cost)}`}</button></article>;
              })}
            </section>
          </>
        )}

        {page === 'customers' && (
          <section className="content-grid two-column">
            <article className="panel"><div className="panel-heading"><div><p className="eyebrow">CUSTOMER BASE</p><h3>{game.customers.toLocaleString('en-GB')} active customers</h3></div></div>
              <div className="segment"><div><strong>Everyday banking</strong><small>{Math.round(game.customers * .57)} customers</small></div><Progress value={57} /></div>
              <div className="segment"><div><strong>Savers</strong><small>{Math.round(game.customers * .28)} customers</small></div><Progress value={28} /></div>
              <div className="segment"><div><strong>Borrowers & business</strong><small>{Math.round(game.customers * .15)} customers</small></div><Progress value={15} /></div>
            </article>
            <article className="panel campaign-card"><div className="campaign-graphic"><span>◎</span></div><p className="eyebrow">GROWTH CAMPAIGN</p><h2>Win the local market.</h2><p>Target households near your branches. Results depend on reputation and product range.</p><button className="primary" disabled={game.cash < 150_000} onClick={() => action(runMarketingCampaign)}>Launch campaign · NOK 150k</button></article>
          </section>
        )}

        {page === 'operations' && (
          <section className="content-grid operations-grid">
            <article className="panel branch-scene-card"><div className="branch-scene"><div className="mini-building large"><b>{game.bankName.slice(0, 1)}</b><i /><i /><i /><i /></div><div className="mini-tree left" /><div className="mini-tree right" /></div><div><p className="eyebrow">BRANCH NETWORK</p><h2>{game.branches} {game.branches === 1 ? 'branch' : 'branches'}</h2><p>Each branch adds customer capacity, staff and local reach.</p><button className="primary" disabled={game.cash < 2_200_000} onClick={() => action(openBranch)}>Open branch · NOK 2.2m</button></div></article>
            <article className="panel"><div className="panel-heading"><div><p className="eyebrow">PEOPLE</p><h3>{game.employees} employees</h3></div></div><div className="people-number">{Math.round(game.customers / game.employees)}<small>customers per employee</small></div><Progress value={serviceLoad} warning={serviceLoad > 95} /><p className="muted">Recommended service load: below 72 customers per employee.</p><button className="secondary wide" disabled={game.cash < 90_000} onClick={() => action(hireEmployee)}>Hire employee · NOK 90k</button></article>
          </section>
        )}

        {page === 'risk' && (
          <section className="risk-layout">
            <div className="risk-score-card"><p className="eyebrow light">GROUP RISK SCORE</p><strong>{game.riskScore.toFixed(0)}</strong><small>Lower is better</small><div className="risk-ring" style={{ '--score': `${game.riskScore * 3.6}deg` } as CSSProperties} /></div>
            <div className="risk-cards">
              <article className="panel"><div className="risk-heading"><span>Capital</span><strong>{game.capitalRatio.toFixed(1)}%</strong></div><Progress value={game.capitalRatio * 3.2} warning={game.capitalRatio < 11} /><small>Minimum internal target: 12.5%</small></article>
              <article className="panel"><div className="risk-heading"><span>Liquidity</span><strong>{game.liquidityRatio.toFixed(1)}%</strong></div><Progress value={game.liquidityRatio * 1.7} warning={game.liquidityRatio < 18} /><small>Liquidity available against deposits.</small></article>
              <article className="panel"><div className="risk-heading"><span>Compliance</span><strong>{game.compliance.toFixed(0)}/100</strong></div><Progress value={game.compliance} warning={game.compliance < 65} /><button className="secondary wide" disabled={game.cash < 300_000 || game.compliance >= 98} onClick={() => action(investInCompliance)}>Improve controls · NOK 300k</button></article>
            </div>
          </section>
        )}

        {page === 'holdings' && (
          <section className="content-grid two-column">
            <article className="panel acquisition-card"><p className="eyebrow">M&A OPPORTUNITY</p><h2>Fjord Community Bank</h2><div className="deal-stats"><span><small>Branches</small><strong>2</strong></span><span><small>Customers</small><strong>900</strong></span><span><small>Deposits</small><strong>NOK 13m</strong></span></div><p>Acquire a regional competitor and integrate its loan book, deposits, staff and branches.</p><button className="primary" disabled={game.cash < 8_000_000 || game.reputation < 68} onClick={() => action(acquireCompetitor)}>Acquire · NOK 8m</button>{game.reputation < 68 && <small className="lock-note">Requires 68 reputation.</small>}</article>
            <article className="panel holdings-list"><p className="eyebrow">GROUP STRUCTURE</p><h3>{game.bankName} Group</h3><div className="holding-row"><span className="holding-logo">B</span><div><strong>Retail Banking</strong><small>{game.customers} customers · {game.branches} branches</small></div><b>100%</b></div><div className="holding-row locked"><span className="holding-logo">+</span><div><strong>Future subsidiary</strong><small>Unlock through acquisitions</small></div><b>Locked</b></div></article>
          </section>
        )}

        <footer className="game-footer"><span>Autosaved locally</span><button onClick={() => { if (window.confirm('Start a new campaign? Your current save will be removed.')) { setGame(clearGame()); setPage('overview'); } }}>New campaign</button></footer>
      </main>
    </div>
  );
}
