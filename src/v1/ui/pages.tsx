import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  BRANCH_MANDATE_DESCRIPTIONS,
  BRANCH_MANDATE_LABELS,
  CAMPAIGN_DESCRIPTIONS,
  CAMPAIGN_LABELS,
  COUNTRY_DEFINITIONS,
  COUNTRY_LABELS,
  EXECUTIVE_DEFINITIONS,
  EXPANSION_OPPORTUNITIES,
  LENDING_POLICY_DESCRIPTIONS,
  LENDING_POLICY_LABELS,
  PRODUCT_DEFINITIONS,
  ROLE_LABELS,
  STAFFING_POLICY_DESCRIPTIONS,
  STAFFING_POLICY_LABELS,
  STRATEGY_DESCRIPTIONS,
  STRATEGY_LABELS,
  TECHNOLOGY_DEFINITIONS,
} from '../game/config';
import {
  activateProduct,
  adjustBranchMarketing,
  adjustProductPricing,
  cancelCampaign,
  closeBranch,
  hireExecutive,
  launchCampaign,
  markInboxRead,
  openExpansionBranch,
  setBankLendingPolicy,
  setBankStrategy,
  setBranchMandate,
  setBranchStaffingPolicy,
  upgradeTechnology,
} from '../game/actions';
import type {
  BankStrategy,
  BranchMandate,
  CampaignKind,
  CampaignScope,
  CountryCode,
  GameState,
  LendingPolicy,
  ProductId,
  StaffingPolicy,
} from '../game/types';
import { Empty, Metric, Panel, Progress, countryName, decimal, latestReport, money, number } from './common';

export type V1Page = 'overview' | 'network' | 'world' | 'products' | 'marketing' | 'leadership' | 'technology' | 'finance' | 'inbox';
type SetGame = Dispatch<SetStateAction<GameState>>;

const totalOf = (game: GameState, field: 'customers' | 'deposits' | 'loanBook') =>
  game.branches.reduce((sum, branch) => sum + branch[field], 0);

export function OverviewPage({ game, setGame, navigate, openBranch }: { game: GameState; setGame: SetGame; navigate: (page: V1Page) => void; openBranch: (branchId: string) => void }) {
  const last = game.history.at(-1);
  const unread = game.inbox.filter((item) => !item.read).length;
  const attentionBranches = game.branches.filter((branch) => branch.loanQueue.length > 15 || branch.satisfaction < 60 || (latestReport(branch)?.profit ?? 0) < -250_000);
  const countries = new Set(game.branches.map((branch) => branch.country)).size;

  return (
    <section className="v1-page">
      <div className="v1-hero v1-command-hero">
        <div>
          <p className="eyebrow">Konsernsjefens utsikt</p>
          <h2>Bygg banken. Lederne driver hverdagen.</h2>
          <p>Du setter retning, kapital og rammer. Filialene behandler lån, følger opp kundene og ansetter lokalt uten at du må godkjenne småsakene.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => navigate('world')}>Finn neste marked</button>
            <button onClick={() => navigate('inbox')}>Åpne ledelsesrapportene {unread > 0 && `(${unread})`}</button>
          </div>
        </div>
        <div className={`v1-health-card ${last && last.profit < 0 ? 'warning' : ''}`}>
          <span>Bankens situasjon</span>
          <strong>{!last ? 'Klar for første måned' : last.profit >= 0 ? 'Kontrollert vekst' : 'Resultatet er under press'}</strong>
          <p>{attentionBranches.length === 0 ? 'Ingen filialer krever direkte oppmerksomhet.' : `${attentionBranches.length} filialer bør følges opp.`}</p>
        </div>
      </div>

      <div className="v1-metrics">
        <Metric label="Månedsresultat" value={last ? money(last.profit) : 'Ikke kjørt'} tone={last ? (last.profit >= 0 ? 'positive' : 'negative') : undefined} />
        <Metric label="Kunder" value={number(totalOf(game, 'customers'))} hint={`${game.branches.length} filialer`} />
        <Metric label="Land" value={countries} hint={`${game.countries.filter((country) => country.unlocked).length} markeder tilgjengelig`} />
        <Metric label="Omdømme" value={`${game.reputation}/100`} hint={`${game.campaigns.length} aktive kampanjer`} />
      </div>

      <Panel eyebrow="Konsernstrategi" title="Hva skal banken være kjent for?" aside="Lederne tilpasser den lokale driften">
        <div className="v1-choice-grid strategy-grid">
          {(Object.keys(STRATEGY_LABELS) as BankStrategy[]).map((strategy) => (
            <button key={strategy} className={game.strategy === strategy ? 'selected' : ''} onClick={() => setGame((current) => setBankStrategy(current, strategy))}>
              <strong>{STRATEGY_LABELS[strategy]}</strong>
              <span>{STRATEGY_DESCRIPTIONS[strategy]}</span>
            </button>
          ))}
        </div>
      </Panel>

      <div className="v1-two-column">
        <Panel eyebrow="Kredittretning" title="Hvor offensiv skal banken være?">
          <div className="v1-choice-list">
            {(Object.keys(LENDING_POLICY_LABELS) as LendingPolicy[]).map((policy) => (
              <button key={policy} className={game.lendingPolicy === policy ? 'selected' : ''} onClick={() => setGame((current) => setBankLendingPolicy(current, policy))}>
                <div><strong>{LENDING_POLICY_LABELS[policy]}</strong><span>{LENDING_POLICY_DESCRIPTIONS[policy]}</span></div>
                <b>{game.lendingPolicy === policy ? 'Aktiv' : 'Velg'}</b>
              </button>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Progresjon" title="Styrets viktigste mål">
          <div className="objective-list">
            {game.objectives.map((objective) => (
              <article key={objective.id} className={objective.completed ? 'completed' : ''}>
                <div><strong>{objective.title}</strong><span>{objective.description}</span></div>
                <Progress value={objective.progress} max={objective.target} />
                <small>{objective.completed ? 'Fullført' : `${number(objective.progress)} / ${number(objective.target)}`}</small>
              </article>
            ))}
          </div>
        </Panel>
      </div>

      <Panel eyebrow="Filialnettverket" title="Hva skjer ute i banken?" aside={<button className="text-button" onClick={() => navigate('network')}>Se alle filialer</button>}>
        <div className="v1-branch-list">
          {game.branches.slice(0, 6).map((branch) => {
            const report = latestReport(branch);
            const manager = branch.employees.find((employee) => employee.role === 'branch-manager');
            return (
              <button key={branch.id} onClick={() => openBranch(branch.id)}>
                <div><strong>{branch.name}</strong><span>{countryName(branch.country)} · {manager?.name ?? 'Mangler leder'} · {branch.employees.length} ansatte</span></div>
                <div><span>{branch.loanQueue.length} saker i kø · {branch.satisfaction}% tilfredshet</span><strong className={report && report.profit < 0 ? 'loss' : ''}>{report ? money(report.profit) : 'Ny filial'}</strong></div>
              </button>
            );
          })}
        </div>
      </Panel>
    </section>
  );
}

export function NetworkPage({ game, setGame, selectedBranchId, setSelectedBranchId }: { game: GameState; setGame: SetGame; selectedBranchId: string; setSelectedBranchId: (id: string) => void }) {
  const selectedBranch = game.branches.find((branch) => branch.id === selectedBranchId) ?? game.branches[0];
  if (!selectedBranch) return <section className="v1-page"><Empty title="Ingen filialer">Banken trenger minst én filial.</Empty></section>;
  const report = latestReport(selectedBranch);
  const manager = selectedBranch.employees.find((employee) => employee.role === 'branch-manager');

  return (
    <section className="v1-page">
      <div className="v1-branch-switcher">
        {game.branches.map((branch) => <button key={branch.id} className={branch.id === selectedBranch.id ? 'active' : ''} onClick={() => setSelectedBranchId(branch.id)}>{branch.name}<small>{COUNTRY_LABELS[branch.country]}</small></button>)}
      </div>

      <div className="v1-hero branch-hero">
        <div>
          <p className="eyebrow">{countryName(selectedBranch.country)} · {selectedBranch.city}</p>
          <h2>{selectedBranch.name}</h2>
          <p>{manager?.name ?? 'Ingen leder'} har ansvar for daglig drift, kundebehandling og lokale ansettelser innenfor fullmaktene du setter.</p>
        </div>
        <div className={`v1-health-card ${selectedBranch.satisfaction < 60 ? 'warning' : ''}`}>
          <span>Filialstatus</span>
          <strong>{selectedBranch.satisfaction >= 78 ? 'Kundene er fornøyde' : selectedBranch.satisfaction >= 60 ? 'Stabil drift' : 'Service under press'}</strong>
          <p>{selectedBranch.loanQueue.length} saker venter · omdømme {selectedBranch.reputation}/100</p>
        </div>
      </div>

      <div className="v1-metrics">
        <Metric label="Kunder" value={number(selectedBranch.customers)} />
        <Metric label="Utlån" value={money(selectedBranch.loanBook)} />
        <Metric label="Innskudd" value={money(selectedBranch.deposits)} />
        <Metric label="Siste resultat" value={report ? money(report.profit) : 'Ingen rapport'} tone={report ? (report.profit >= 0 ? 'positive' : 'negative') : undefined} />
      </div>

      <div className="v1-two-column">
        <Panel eyebrow="Filialmandat" title="Hva skal lederen prioritere?">
          <div className="v1-choice-list compact">
            {(Object.keys(BRANCH_MANDATE_LABELS) as BranchMandate[]).map((mandate) => (
              <button key={mandate} className={selectedBranch.mandate === mandate ? 'selected' : ''} onClick={() => setGame((current) => setBranchMandate(current, selectedBranch.id, mandate))}>
                <div><strong>{BRANCH_MANDATE_LABELS[mandate]}</strong><span>{BRANCH_MANDATE_DESCRIPTIONS[mandate]}</span></div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Bemanningsfullmakt" title="Hvor tidlig kan lederen bygge team?">
          <div className="v1-choice-list compact">
            {(Object.keys(STAFFING_POLICY_LABELS) as StaffingPolicy[]).map((policy) => (
              <button key={policy} className={selectedBranch.staffingPolicy === policy ? 'selected' : ''} onClick={() => setGame((current) => setBranchStaffingPolicy(current, selectedBranch.id, policy))}>
                <div><strong>{STAFFING_POLICY_LABELS[policy]}</strong><span>{STAFFING_POLICY_DESCRIPTIONS[policy]}</span></div>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <Panel eyebrow="Lokal markedsføring" title="Gi lederen en ramme, ikke hver enkelt annonse" aside={`${money(selectedBranch.localMarketingBudget)} per måned`}>
        <div className="budget-control">
          <button onClick={() => setGame((current) => adjustBranchMarketing(current, selectedBranch.id, -25_000))}>− 25 000</button>
          <div><strong>{money(selectedBranch.localMarketingBudget)}</strong><span>Filiallederen velger lokale tiltak innenfor rammen.</span></div>
          <button onClick={() => setGame((current) => adjustBranchMarketing(current, selectedBranch.id, 25_000))}>+ 25 000</button>
        </div>
      </Panel>

      <div className="v1-two-column wide-left">
        <Panel eyebrow="Menneskene" title="Teamet som driver filialen">
          <div className="v1-people">
            {selectedBranch.employees.map((employee) => (
              <article key={employee.id}>
                <div className="avatar">{employee.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
                <div><strong>{employee.name}</strong><span>{ROLE_LABELS[employee.role]} · {employee.tenureMonths} mnd.</span></div>
                <div><small>Kompetanse</small><strong>{employee.skill}</strong></div>
                <div><small>Trivsel</small><strong>{employee.morale}</strong></div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Siste måned" title="Filiallederens rapport">
          {report ? (
            <div className="v1-report-story">
              <p>Teamet mottok <strong>{report.applicationsReceived}</strong> lånesøknader, behandlet <strong>{report.applicationsProcessed}</strong> og godkjente <strong>{report.loansApproved}</strong>.</p>
              <p>Filialen fikk <strong>{report.newCustomers}</strong> nye kunder og leverte <strong>{money(report.profit)}</strong>.</p>
              <p>Ved månedsslutt ventet <strong>{report.queueEnd}</strong> saker, mens kundetilfredsheten var <strong>{report.satisfaction}%</strong>.</p>
              {report.managerActions.length > 0 && <div className="manager-actions"><span>Håndtert lokalt</span>{report.managerActions.map((action) => <p key={action}>{action}</p>)}</div>}
            </div>
          ) : <Empty title="Ingen rapport ennå">Spill én måned for å se hvordan teamet driver filialen.</Empty>}
        </Panel>
      </div>

      {game.branches.length > 1 && <Panel eyebrow="Porteføljevalg" title="Avvikle filial" className="danger-panel"><p>Avvikling er et styrevalg. Kundene og porteføljen overføres til resten av banken.</p><button className="danger" onClick={() => window.confirm(`Avvikle ${selectedBranch.name}?`) && setGame((current) => closeBranch(current, selectedBranch.id))}>Avvikle {selectedBranch.name}</button></Panel>}
    </section>
  );
}

export function WorldPage({ game, setGame, openBranch }: { game: GameState; setGame: SetGame; openBranch: (branchId: string) => void }) {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('NO');
  const countryState = game.countries.find((country) => country.code === selectedCountry);
  const definition = COUNTRY_DEFINITIONS.find((country) => country.code === selectedCountry);
  const opportunities = EXPANSION_OPPORTUNITIES.filter((item) => item.country === selectedCountry);
  const localCompetitors = game.competitors.filter((competitor) => competitor.country === selectedCountry);
  const firstEntry = !game.branches.some((branch) => branch.country === selectedCountry);

  return (
    <section className="v1-page">
      <div className="v1-hero">
        <div><p className="eyebrow">Internasjonal ekspansjon</p><h2>Fra lokalbank til globalt bankkonsern</h2><p>Hvert marked har egne kostnader, kunder og konkurrenter. Første filial i et nytt land inkluderer etablering, regulatorisk arbeid og lokal organisasjon.</p></div>
        <div className="v1-health-card"><span>Global tilstedeværelse</span><strong>{new Set(game.branches.map((branch) => branch.country)).size} land</strong><p>{game.branches.length} aktive filialer</p></div>
      </div>

      <div className="world-tabs">
        {COUNTRY_DEFINITIONS.map((country) => {
          const state = game.countries.find((item) => item.code === country.code);
          return <button key={country.code} className={selectedCountry === country.code ? 'active' : ''} onClick={() => setSelectedCountry(country.code)}><strong>{COUNTRY_LABELS[country.code]}</strong><span>{state?.entered ? 'Etablert' : state?.unlocked ? 'Tilgjengelig' : 'Låst'}</span></button>;
        })}
      </div>

      {definition && countryState && (
        <>
          <div className="v1-country-hero">
            <div><p className="eyebrow">{definition.currency} · regulatorisk nivå {Math.round(definition.regulation * 100)}</p><h2>{COUNTRY_LABELS[definition.code]}</h2><p>{definition.description}</p></div>
            <div className="country-stats"><span>Markedsetterspørsel <strong>{Math.round(definition.demand * 100)}</strong></span><span>Driftskostnad <strong>{Math.round(definition.operatingCost * 100)}</strong></span><span>Kjennskap <strong>{countryState.awareness}/100</strong></span><span>Myndighetsforhold <strong>{countryState.regulatoryStanding}/100</strong></span></div>
          </div>

          {!countryState.unlocked && <Panel eyebrow="Markedet er låst" title="Bygg en sterkere bank først"><div className="unlock-grid"><div><span>Krav til egenkapital</span><strong>{money(definition.requiredEquity)}</strong><Progress value={game.equity} max={definition.requiredEquity} /></div><div><span>Krav til omdømme</span><strong>{definition.requiredReputation}/100</strong><Progress value={game.reputation} max={definition.requiredReputation} /></div></div></Panel>}

          <Panel eyebrow="Etableringsmuligheter" title={`Byer i ${COUNTRY_LABELS[selectedCountry]}`} aside={firstEntry && countryState.unlocked ? `Landsetablering: ${money(definition.entryCost)}` : undefined}>
            <div className="opportunity-grid">
              {opportunities.map((opportunity) => {
                const existing = game.branches.find((branch) => branch.id === opportunity.branchId);
                const totalCost = opportunity.openingCost + (firstEntry ? definition.entryCost : 0);
                return (
                  <article key={opportunity.id} className={existing ? 'owned' : ''}>
                    <div><span>{opportunity.strength}</span><h3>{opportunity.name}</h3><p>{opportunity.description}</p></div>
                    <dl><div><dt>Åpningskostnad</dt><dd>{money(opportunity.openingCost)}</dd></div><div><dt>Startkunder</dt><dd>{number(opportunity.baseCustomers)}</dd></div><div><dt>Startutlån</dt><dd>{money(opportunity.baseLoanBook)}</dd></div></dl>
                    {existing ? <button onClick={() => openBranch(existing.id)}>Åpne filialen</button> : <button className="primary" disabled={!countryState.unlocked || game.cash < totalCost} onClick={() => setGame((current) => openExpansionBranch(current, opportunity.id))}>{!countryState.unlocked ? 'Markedet er låst' : game.cash < totalCost ? 'Ikke nok kapital' : `Etabler for ${money(totalCost)}`}</button>}
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel eyebrow="Konkurranse" title="Hvem møter oss i markedet?">
            {localCompetitors.length ? <div className="competitor-grid">{localCompetitors.map((competitor) => <article key={competitor.id}><strong>{competitor.name}</strong><span>Styrke {competitor.strength}/100</span><span>Aggressivitet {competitor.aggression}/100</span><span>Omdømme {competitor.reputation}/100</span></article>)}</div> : <Empty title="Ingen navngitt hovedkonkurrent">Lokale banker skaper fortsatt konkurranse i simuleringen.</Empty>}
          </Panel>
        </>
      )}
    </section>
  );
}

export function ProductsPage({ game, setGame }: { game: GameState; setGame: SetGame }) {
  return (
    <section className="v1-page">
      <div className="v1-hero"><div><p className="eyebrow">Produktportefølje</p><h2>Sett pris og retning. Produktteamene gjør resten.</h2><p>Produktene påvirker etterspørsel, margin, innskudd og hvilke kunder filialene kan betjene. Små prisendringer virker over tid.</p></div><div className="v1-health-card"><span>Aktive produkter</span><strong>{game.products.filter((item) => item.enabled).length} av {game.products.length}</strong><p>{number(game.products.reduce((sum, item) => sum + item.customers, 0))} produktforhold</p></div></div>
      <div className="product-grid">
        {PRODUCT_DEFINITIONS.map((definition) => {
          const item = game.products.find((product) => product.id === definition.id);
          if (!item) return null;
          const available = game.equity >= definition.unlockEquity;
          return (
            <article key={definition.id} className={`product-card ${item.enabled ? 'active' : 'locked'}`}>
              <header><div><span>{item.enabled ? 'Aktivt produkt' : available ? 'Klar for lansering' : 'Låst'}</span><h3>{definition.name}</h3></div><strong>{number(item.customers)} kunder</strong></header>
              <p>{definition.description}</p>
              {!item.enabled ? (
                <div className="product-lock"><span>Krever {money(definition.unlockEquity)} i egenkapital</span><Progress value={game.equity} max={Math.max(1, definition.unlockEquity)} /><button className="primary" disabled={!available} onClick={() => setGame((current) => activateProduct(current, definition.id))}>{available ? 'Lanser produktet' : 'Ikke tilgjengelig ennå'}</button></div>
              ) : (
                <div className="pricing-grid">
                  <div><span>Pris/rente</span><strong>{decimal(item.price)}{definition.id === 'cards' ? ' kr/mnd' : ' %'}</strong><div><button onClick={() => setGame((current) => adjustProductPricing(current, definition.id, 'price', definition.id === 'cards' ? -5 : -0.1))}>−</button><button onClick={() => setGame((current) => adjustProductPricing(current, definition.id, 'price', definition.id === 'cards' ? 5 : 0.1))}>+</button></div></div>
                  <div><span>Målmargin</span><strong>{decimal(item.targetMargin)} %</strong><div><button onClick={() => setGame((current) => adjustProductPricing(current, definition.id, 'targetMargin', -0.1))}>−</button><button onClick={() => setGame((current) => adjustProductPricing(current, definition.id, 'targetMargin', 0.1))}>+</button></div></div>
                  <div><span>Produktkvalitet</span><strong>{item.quality}/100</strong><Progress value={item.quality} max={100} /></div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function MarketingPage({ game, setGame }: { game: GameState; setGame: SetGame }) {
  const [kind, setKind] = useState<CampaignKind>('brand');
  const [scope, setScope] = useState<CampaignScope>('global');
  const [budget, setBudget] = useState(500_000);
  const [months, setMonths] = useState(3);
  const monthlySpend = game.campaigns.reduce((sum, campaign) => sum + campaign.monthlyBudget, 0);

  return (
    <section className="v1-page">
      <div className="v1-hero"><div><p className="eyebrow">Vekst og merkevare</p><h2>Markedsføring skaper muligheter. Filialene må klare å følge opp.</h2><p>Kampanjer øker henvendelser og kjennskap over flere måneder. For høy etterspørsel uten nok ansatte gir kø og svakere kundeopplevelse.</p></div><div className="v1-health-card"><span>Månedlig kampanjebruk</span><strong>{money(monthlySpend)}</strong><p>{game.campaigns.length} aktive kampanjer</p></div></div>

      <div className="v1-two-column wide-left">
        <Panel eyebrow="Ny kampanje" title="Gi markedsavdelingen et oppdrag">
          <div className="campaign-builder">
            <label><span>Formål</span><select value={kind} onChange={(event) => setKind(event.target.value as CampaignKind)}>{(Object.keys(CAMPAIGN_LABELS) as CampaignKind[]).map((item) => <option key={item} value={item}>{CAMPAIGN_LABELS[item]}</option>)}</select><small>{CAMPAIGN_DESCRIPTIONS[kind]}</small></label>
            <label><span>Marked</span><select value={scope} onChange={(event) => setScope(event.target.value as CampaignScope)}><option value="global">Globalt</option>{game.countries.filter((country) => country.entered).map((country) => <option key={country.code} value={country.code}>{COUNTRY_LABELS[country.code]}</option>)}</select></label>
            <label><span>Budsjett per måned</span><input type="range" min="100000" max="5000000" step="100000" value={budget} onChange={(event) => setBudget(Number(event.target.value))} /><strong>{money(budget)}</strong></label>
            <label><span>Varighet</span><input type="range" min="1" max="12" value={months} onChange={(event) => setMonths(Number(event.target.value))} /><strong>{months} måneder</strong></label>
            <button className="primary" onClick={() => setGame((current) => launchCampaign(current, kind, scope, budget, months))}>Start kampanjen</button>
          </div>
        </Panel>

        <Panel eyebrow="Aktive oppdrag" title="Kampanjene som går nå">
          {game.campaigns.length ? <div className="campaign-list">{game.campaigns.map((campaign) => <article key={campaign.id}><div><strong>{CAMPAIGN_LABELS[campaign.kind]}</strong><span>{campaign.scope === 'global' ? 'Globalt' : COUNTRY_LABELS[campaign.scope]} · {campaign.monthsRemaining} mnd. igjen</span></div><div><strong>{money(campaign.monthlyBudget)}/mnd</strong><button onClick={() => setGame((current) => cancelCampaign(current, campaign.id))}>Stopp</button></div></article>)}</div> : <Empty title="Ingen aktive kampanjer">Banken vokser nå bare gjennom omdømme og lokale budsjetter.</Empty>}
        </Panel>
      </div>
    </section>
  );
}

export function LeadershipPage({ game, setGame }: { game: GameState; setGame: SetGame }) {
  const monthlyCost = game.executives.filter((executive) => executive.hired).reduce((sum, executive) => sum + executive.monthlySalary, 0);
  return (
    <section className="v1-page">
      <div className="v1-hero"><div><p className="eyebrow">Konsernledelsen</p><h2>Ansett ledere som faktisk tar ansvar</h2><p>Direktørene forbedrer sine områder automatisk. Du bygger laget og setter retning; de håndterer den løpende fagdriften.</p></div><div className="v1-health-card"><span>Lederkostnad</span><strong>{money(monthlyCost)}/mnd</strong><p>{game.executives.filter((executive) => executive.hired).length} direktører i ledergruppen</p></div></div>
      <div className="executive-grid">
        {EXECUTIVE_DEFINITIONS.map((definition) => {
          const executive = game.executives.find((item) => item.role === definition.role);
          if (!executive) return null;
          return <article key={definition.role} className={executive.hired ? 'hired' : ''}><header><div className="avatar large">{definition.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><div><span>{definition.title}</span><h3>{definition.name}</h3></div></header><p>{definition.description}</p><div className="executive-stats"><span>Kompetanse <strong>{definition.skill}</strong></span><span>Lønn <strong>{money(definition.monthlySalary)}/mnd</strong></span></div>{executive.hired ? <div className="status-pill">I ledergruppen</div> : <button className="primary" disabled={game.cash < definition.signingCost} onClick={() => setGame((current) => hireExecutive(current, definition.role))}>Ansett · {money(definition.signingCost)}</button>}</article>;
        })}
      </div>
    </section>
  );
}

export function TechnologyPage({ game, setGame }: { game: GameState; setGame: SetGame }) {
  return (
    <section className="v1-page">
      <div className="v1-hero"><div><p className="eyebrow">Teknologi</p><h2>Bygg systemer som hjelper menneskene</h2><p>Teknologien skal gjøre filialene bedre, ikke erstatte hele spillet. Oppgraderinger gir kapasitet, lavere kostnader, bedre risiko og sterkere digitale tjenester.</p></div><div className="v1-health-card"><span>Teknologisk modenhet</span><strong>{game.technologies.reduce((sum, item) => sum + item.level, 0)} nivåer</strong><p>{money(game.technologies.reduce((sum, item) => sum + item.level * 22_000, 0))}/mnd i drift</p></div></div>
      <div className="technology-grid">
        {TECHNOLOGY_DEFINITIONS.map((definition) => {
          const technology = game.technologies.find((item) => item.id === definition.id);
          if (!technology) return null;
          const cost = Math.round(definition.baseCost * (1 + technology.level * 0.72));
          return <article key={definition.id}><header><div><span>Nivå {technology.level} av {technology.maxLevel}</span><h3>{definition.name}</h3></div><b>{technology.level >= technology.maxLevel ? 'Maks' : money(cost)}</b></header><p>{definition.description}</p><Progress value={technology.level} max={technology.maxLevel} /> <button className="primary" disabled={technology.level >= technology.maxLevel || game.cash < cost} onClick={() => setGame((current) => upgradeTechnology(current, definition.id))}>{technology.level >= technology.maxLevel ? 'Fullt utbygget' : `Oppgrader til nivå ${technology.level + 1}`}</button></article>;
        })}
      </div>
    </section>
  );
}

export function FinancePage({ game }: { game: GameState }) {
  const last = game.history.at(-1);
  const loanBook = totalOf(game, 'loanBook');
  const deposits = totalOf(game, 'deposits');
  const ratio = loanBook / Math.max(1, deposits);
  const capitalRatio = last?.capitalRatio ?? (game.equity / Math.max(1, loanBook)) * 100;
  return (
    <section className="v1-page">
      <div className="v1-hero"><div><p className="eyebrow">Finans og risiko</p><h2>Er banken trygg, lønnsom og klar for neste steg?</h2><p>Du får hovedbildet først. Filialenes detaljer og de avanserte beregningene ligger under, uten at alt roper samtidig.</p></div><div className={`v1-health-card ${capitalRatio < 8 ? 'warning' : ''}`}><span>Kapitalstatus</span><strong>{capitalRatio >= 12 ? 'Robust' : capitalRatio >= 8 ? 'Under kontroll' : 'Presset'}</strong><p>Kapitaldekning {decimal(capitalRatio)}%</p></div></div>
      <div className="v1-metrics">
        <Metric label="Kontanter" value={money(game.cash)} />
        <Metric label="Egenkapital" value={money(game.equity)} tone={game.equity > 0 ? 'positive' : 'negative'} />
        <Metric label="Utlån / innskudd" value={decimal(ratio)} hint={ratio > 1.45 ? 'Finansieringen er stram' : 'Balansert finansiering'} tone={ratio > 1.6 ? 'warning' : undefined} />
        <Metric label="Kapitaldekning" value={`${decimal(capitalRatio)}%`} tone={capitalRatio < 8 ? 'negative' : capitalRatio < 12 ? 'warning' : 'positive'} />
      </div>
      <div className="v1-two-column wide-left">
        <Panel eyebrow="Resultathistorikk" title="De siste månedene">
          {game.history.length ? <div className="history-table"><div className="table-head"><span>Måned</span><span>Inntekter</span><span>Kostnader</span><span>Resultat</span></div>{game.history.slice(-12).reverse().map((report) => <div key={report.monthKey}><strong>{report.monthKey}</strong><span>{money(report.revenue)}</span><span>{money(report.expenses)}</span><strong className={report.profit < 0 ? 'loss' : 'gain'}>{money(report.profit)}</strong></div>)}</div> : <Empty title="Ingen historikk ennå">Spill én måned for å opprette første konsernrapport.</Empty>}
        </Panel>
        <Panel eyebrow="Balanse" title="Størrelsen på banken"><div className="balance-list"><div><span>Samlet utlån</span><strong>{money(loanBook)}</strong></div><div><span>Samlede innskudd</span><strong>{money(deposits)}</strong></div><div><span>Kunder</span><strong>{number(totalOf(game, 'customers'))}</strong></div><div><span>Land</span><strong>{new Set(game.branches.map((branch) => branch.country)).size}</strong></div></div></Panel>
      </div>
    </section>
  );
}

export function InboxPage({ game, setGame }: { game: GameState; setGame: SetGame }) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');
  const items = useMemo(() => game.inbox.filter((item) => filter === 'all' || filter === 'unread' ? (filter === 'all' || !item.read) : item.kind === 'warning' || item.kind === 'decision'), [game.inbox, filter]);
  return (
    <section className="v1-page">
      <div className="v1-hero"><div><p className="eyebrow">CEO-innboks</p><h2>Rapporter og store hendelser, ikke vanlig saksbehandling</h2><p>Vanlige lån, lokale ansettelser og kundesaker blir håndtert av filialene. Her får du konsernrapporter, milepæler og reelle varsler.</p></div><div className="v1-health-card"><span>Ulest</span><strong>{game.inbox.filter((item) => !item.read).length}</strong><p>{game.inbox.filter((item) => item.kind === 'warning' && !item.read).length} varsler</p></div></div>
      <div className="filter-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Alle</button><button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>Uleste</button><button className={filter === 'important' ? 'active' : ''} onClick={() => setFilter('important')}>Viktige</button></div>
      <div className="v1-inbox-list">{items.length ? items.map((item) => <button key={item.id} className={`${item.kind} ${item.read ? 'read' : ''}`} onClick={() => setGame((current) => markInboxRead(current, item.id))}><span className="inbox-type">{item.kind === 'warning' ? 'Trenger oppmerksomhet' : item.kind === 'milestone' ? 'Milepæl' : item.kind === 'decision' ? 'Styresak' : 'Ledelsesrapport'}</span><strong>{item.title}</strong><p>{item.body}</p><small>{item.monthKey}</small></button>) : <Empty title="Ingen meldinger i denne visningen">Ledelsen sender rapport når noe nytt skjer.</Empty>}</div>
    </section>
  );
}
