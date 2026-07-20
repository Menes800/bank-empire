import { useEffect, useMemo, useState } from 'react';
import {
  adjustBranchMarketing,
  advanceMonths,
  openExpansionBranch,
  setBankLendingPolicy,
  setBranchMandate,
  setBranchStaffingPolicy,
} from './game/actions';
import {
  BRANCH_MANDATE_DESCRIPTIONS,
  BRANCH_MANDATE_LABELS,
  EXPANSION_OPPORTUNITIES,
  LENDING_POLICY_DESCRIPTIONS,
  LENDING_POLICY_LABELS,
  ROLE_LABELS,
  STAFFING_POLICY_DESCRIPTIONS,
  STAFFING_POLICY_LABELS,
  STRATEGY_DESCRIPTIONS,
  STRATEGY_LABELS,
} from './game/config';
import { createNewGame } from './game/createGame';
import type {
  BankStrategy,
  Branch,
  BranchMandate,
  GameState,
  LendingPolicy,
  StaffingPolicy,
} from './game/types';
import { clearV1Save, loadV1Save, saveV1Game } from './platform/storage';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import './styles/controls.css';

type Page = 'bank' | 'branches' | 'expansion' | 'inbox';

const money = (value: number) =>
  new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
    notation: Math.abs(value) >= 10_000_000 ? 'compact' : 'standard',
  }).format(value);

const monthName = (year: number, month: number) =>
  new Intl.DateTimeFormat('nb-NO', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );

const getLatestReport = (branch: Branch) => branch.reports.at(-1);

const marketLabel = (market: Branch['market']) => {
  if (market === 'business') return 'Bedriftsmarked';
  if (market === 'mixed') return 'Blandet marked';
  return 'Boligmarked';
};

export default function AppV1() {
  const [game, setGame] = useState<GameState>(() => loadV1Save() ?? createNewGame());
  const [page, setPage] = useState<Page>('bank');
  const [selectedBranchId, setSelectedBranchId] = useState(game.branches[0]?.id ?? '');

  useEffect(() => saveV1Game(game), [game]);

  const totals = useMemo(() => {
    const latestProfit = game.branches.reduce(
      (sum, branch) => sum + (getLatestReport(branch)?.profit ?? 0),
      0,
    );
    return {
      customers: game.branches.reduce((sum, branch) => sum + branch.customers, 0),
      employees: game.branches.reduce((sum, branch) => sum + branch.employees.length, 0),
      queue: game.branches.reduce((sum, branch) => sum + branch.loanQueue.length, 0),
      latestProfit,
    };
  }, [game]);

  const selectedBranch =
    game.branches.find((branch) => branch.id === selectedBranchId) ?? game.branches[0];
  const selectedReport = selectedBranch ? getLatestReport(selectedBranch) : undefined;
  const unread = game.inbox.filter((item) => !item.read).length;

  const playMonths = (months: number) => setGame((current) => advanceMonths(current, months));
  const setStrategy = (strategy: BankStrategy) => setGame((current) => ({ ...current, strategy }));
  const setLendingPolicy = (policy: LendingPolicy) =>
    setGame((current) => setBankLendingPolicy(current, policy));

  const openBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    setPage('branches');
  };

  const handleOpenExpansion = (opportunityId: string, branchId: string) => {
    setGame((current) => openExpansionBranch(current, opportunityId));
    setSelectedBranchId(branchId);
    setPage('branches');
  };

  const resetGame = () => {
    if (!window.confirm('Starte v1-testspillet på nytt?')) return;
    clearV1Save();
    const next = createNewGame();
    setGame(next);
    setSelectedBranchId(next.branches[0]?.id ?? '');
    setPage('bank');
  };

  return (
    <div className="v1-shell">
      <aside className="v1-sidebar">
        <div className="v1-brand">
          <span>BE</span>
          <div>
            <strong>{game.bankName}</strong>
            <small>v1 clean alpha</small>
          </div>
        </div>

        <nav aria-label="Hovedmeny">
          <button className={page === 'bank' ? 'active' : ''} onClick={() => setPage('bank')}>
            <span>01</span> Banken
          </button>
          <button className={page === 'branches' ? 'active' : ''} onClick={() => setPage('branches')}>
            <span>02</span> Filialer
          </button>
          <button className={page === 'expansion' ? 'active' : ''} onClick={() => setPage('expansion')}>
            <span>03</span> Ekspansjon
          </button>
          <button className={page === 'inbox' ? 'active' : ''} onClick={() => setPage('inbox')}>
            <span>04</span> Innboks {unread > 0 && <b>{unread}</b>}
          </button>
        </nav>

        <div className="v1-sidebar-note">
          <strong>Du setter rammene</strong>
          <p>Filiallederne behandler lån, bemanner teamene og driver markedet innenfor mandatene dine.</p>
        </div>
      </aside>

      <main className="v1-main">
        <header className="v1-topbar">
          <div>
            <p className="eyebrow">{monthName(game.date.year, game.date.month)}</p>
            <h1>
              {page === 'bank'
                ? 'Banken'
                : page === 'branches'
                  ? 'Filialene'
                  : page === 'expansion'
                    ? 'Ekspansjon'
                    : 'CEO-innboks'}
            </h1>
          </div>
          <div className="v1-top-actions">
            <div className="v1-cash">
              <span>Tilgjengelig kapital</span>
              <strong>{money(game.cash)}</strong>
            </div>
            <div className="v1-time-controls" aria-label="Spill frem tid">
              <button className="secondary" onClick={() => playMonths(3)}>+3 mnd</button>
              <button className="secondary" onClick={() => playMonths(12)}>+12 mnd</button>
              <button className="primary" onClick={() => playMonths(1)}>Neste måned</button>
            </div>
          </div>
        </header>

        {page === 'bank' && (
          <section className="v1-page">
            <div className="v1-hero">
              <div>
                <p className="eyebrow">Din jobb akkurat nå</p>
                <h2>Bestem hvordan banken skal vokse.</h2>
                <p>
                  Du setter strategi, utlånsrammer og retning. De lokale lederne gjør jobben og
                  kommer tilbake med resultatene.
                </p>
              </div>
              <div className="v1-status-good">
                <span>Driftsstatus</span>
                <strong>{totals.queue > 18 ? 'Kapasiteten er presset' : 'Driften er under kontroll'}</strong>
                <small>{totals.queue} lånesaker venter i hele banken</small>
              </div>
            </div>

            <div className="v1-metrics">
              <article><span>Kunder</span><strong>{totals.customers.toLocaleString('nb-NO')}</strong></article>
              <article><span>Ansatte</span><strong>{totals.employees}</strong></article>
              <article><span>Filialer</span><strong>{game.branches.length}</strong></article>
              <article className={totals.latestProfit < 0 ? 'negative' : 'positive'}>
                <span>Siste månedsresultat</span>
                <strong>{game.branches.some((branch) => branch.reports.length) ? money(totals.latestProfit) : 'Ikke kjørt ennå'}</strong>
              </article>
            </div>

            <section className="v1-panel">
              <div className="v1-panel-heading">
                <div>
                  <p className="eyebrow">Overordnet strategi</p>
                  <h3>Hva skal banken være kjent for?</h3>
                </div>
                <span>Påvirker etterspørselen i alle filialer</span>
              </div>
              <div className="v1-strategy-grid">
                {(Object.keys(STRATEGY_LABELS) as BankStrategy[]).map((strategy) => (
                  <button
                    key={strategy}
                    className={game.strategy === strategy ? 'selected' : ''}
                    onClick={() => setStrategy(strategy)}
                  >
                    <strong>{STRATEGY_LABELS[strategy]}</strong>
                    <span>{STRATEGY_DESCRIPTIONS[strategy]}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="v1-panel">
              <div className="v1-panel-heading">
                <div>
                  <p className="eyebrow">Kredittfullmakt</p>
                  <h3>Hvor offensiv skal banken være med lån?</h3>
                </div>
                <span>De ansatte behandler sakene innenfor denne rammen</span>
              </div>
              <div className="v1-policy-grid">
                {(Object.keys(LENDING_POLICY_LABELS) as LendingPolicy[]).map((policy) => (
                  <button
                    key={policy}
                    className={game.lendingPolicy === policy ? 'selected' : ''}
                    onClick={() => setLendingPolicy(policy)}
                  >
                    <strong>{LENDING_POLICY_LABELS[policy]}</strong>
                    <span>{LENDING_POLICY_DESCRIPTIONS[policy]}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="v1-panel">
              <div className="v1-panel-heading">
                <div>
                  <p className="eyebrow">Lokale banker</p>
                  <h3>Slik går det ute i filialene</h3>
                </div>
                <button className="text-action" onClick={() => setPage('expansion')}>Se nye markeder</button>
              </div>
              <div className="v1-branch-list">
                {game.branches.map((branch) => {
                  const report = getLatestReport(branch);
                  const manager = branch.employees.find((employee) => employee.role === 'branch-manager');
                  return (
                    <button key={branch.id} onClick={() => openBranch(branch.id)}>
                      <div>
                        <strong>{branch.name}</strong>
                        <span>{manager?.name ?? 'Ingen filialleder'} · {branch.employees.length} ansatte · {BRANCH_MANDATE_LABELS[branch.mandate]}</span>
                      </div>
                      <div>
                        <span>{branch.loanQueue.length} saker i kø</span>
                        <strong className={report && report.profit < 0 ? 'loss' : ''}>
                          {report ? money(report.profit) : 'Klar for åpning'}
                        </strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </section>
        )}

        {page === 'branches' && selectedBranch && (
          <section className="v1-page">
            <div className="v1-branch-switcher">
              {game.branches.map((branch) => (
                <button
                  key={branch.id}
                  className={branch.id === selectedBranch.id ? 'active' : ''}
                  onClick={() => setSelectedBranchId(branch.id)}
                >
                  {branch.name}
                </button>
              ))}
            </div>

            <div className="v1-hero branch-hero">
              <div>
                <p className="eyebrow">{marketLabel(selectedBranch.market)}</p>
                <h2>{selectedBranch.name}</h2>
                <p>
                  Filialleder {selectedBranch.employees.find((employee) => employee.role === 'branch-manager')?.name}
                  {' '}driver banken innenfor mandatet og bemanningsrammen du setter.
                </p>
              </div>
              <div className="v1-status-good">
                <span>Lokalt omdømme</span>
                <strong>{selectedBranch.reputation}/100</strong>
                <small>{selectedBranch.loanQueue.length} lånesaker venter</small>
              </div>
            </div>

            <section className="v1-panel">
              <div className="v1-panel-heading">
                <div>
                  <p className="eyebrow">Dine styringsvalg</p>
                  <h3>Gi filiallederen tydelige rammer</h3>
                </div>
                <span>Du styrer retning — lederen tar de lokale valgene</span>
              </div>

              <div className="v1-control-stack">
                <div className="v1-control-group">
                  <div>
                    <strong>Filialmandat</strong>
                    <span>Hva skal lederen prioritere de neste månedene?</span>
                  </div>
                  <div className="v1-policy-grid compact">
                    {(Object.keys(BRANCH_MANDATE_LABELS) as BranchMandate[]).map((mandate) => (
                      <button
                        key={mandate}
                        className={selectedBranch.mandate === mandate ? 'selected' : ''}
                        onClick={() => setGame((current) => setBranchMandate(current, selectedBranch.id, mandate))}
                      >
                        <strong>{BRANCH_MANDATE_LABELS[mandate]}</strong>
                        <span>{BRANCH_MANDATE_DESCRIPTIONS[mandate]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="v1-control-group">
                  <div>
                    <strong>Bemanningsfullmakt</strong>
                    <span>Når kan filialleder ansette uten å spørre deg?</span>
                  </div>
                  <div className="v1-policy-grid compact three">
                    {(Object.keys(STAFFING_POLICY_LABELS) as StaffingPolicy[]).map((policy) => (
                      <button
                        key={policy}
                        className={selectedBranch.staffingPolicy === policy ? 'selected' : ''}
                        onClick={() => setGame((current) => setBranchStaffingPolicy(current, selectedBranch.id, policy))}
                      >
                        <strong>{STAFFING_POLICY_LABELS[policy]}</strong>
                        <span>{STAFFING_POLICY_DESCRIPTIONS[policy]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="v1-budget-control">
                  <div>
                    <strong>Lokalt markedsbudsjett</strong>
                    <span>Mer budsjett gir flere henvendelser, men kan overbelaste teamet.</span>
                  </div>
                  <div className="v1-budget-stepper">
                    <button
                      onClick={() => setGame((current) => adjustBranchMarketing(current, selectedBranch.id, -10_000))}
                      disabled={selectedBranch.localMarketingBudget === 0}
                    >
                      − 10k
                    </button>
                    <strong>{money(selectedBranch.localMarketingBudget)}<small>/mnd</small></strong>
                    <button
                      onClick={() => setGame((current) => adjustBranchMarketing(current, selectedBranch.id, 10_000))}
                      disabled={selectedBranch.localMarketingBudget >= 120_000}
                    >
                      + 10k
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="v1-two-column">
              <section className="v1-panel">
                <div className="v1-panel-heading"><div><p className="eyebrow">Teamet</p><h3>Menneskene som driver filialen</h3></div></div>
                <div className="v1-people">
                  {selectedBranch.employees.map((employee) => (
                    <article key={employee.id}>
                      <div className="avatar">{employee.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
                      <div><strong>{employee.name}</strong><span>{ROLE_LABELS[employee.role]}</span></div>
                      <div><small>Kompetanse / trivsel</small><strong>{employee.skill} / {employee.morale}</strong></div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="v1-panel">
                <div className="v1-panel-heading"><div><p className="eyebrow">Siste måned</p><h3>Hva skjedde?</h3></div></div>
                {selectedReport ? (
                  <div className="v1-report-story">
                    <p>
                      Filialen mottok <strong>{selectedReport.applicationsReceived}</strong> lånesøknader,
                      behandlet <strong>{selectedReport.applicationsProcessed}</strong> og godkjente{' '}
                      <strong>{selectedReport.loansApproved}</strong>.
                    </p>
                    <p>
                      Måneden endte med <strong>{money(selectedReport.profit)}</strong> og{' '}
                      <strong>{selectedReport.queueEnd}</strong> saker i kø.
                    </p>
                    {selectedReport.managerActions.length > 0 && (
                      <div className="manager-actions">
                        <span>Filiallederens handlinger</span>
                        {selectedReport.managerActions.map((action) => <p key={action}>{action}</p>)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="v1-empty"><strong>Ingen månedsrapport ennå</strong><p>Spill én måned for å se hvordan teamet driver filialen.</p></div>
                )}
              </section>
            </div>

            {selectedBranch.loanQueue.length > 0 && (
              <section className="v1-panel">
                <div className="v1-panel-heading">
                  <div><p className="eyebrow">Arbeid i filialen</p><h3>Lånekøen akkurat nå</h3></div>
                  <span>De ansatte behandler dette automatisk neste måned</span>
                </div>
                <div className="v1-queue-list">
                  {selectedBranch.loanQueue.slice(0, 6).map((application) => (
                    <div key={application.id}>
                      <span>{application.customerName}</span>
                      <strong>{money(application.amount)}</strong>
                      <small>Risiko {application.risk} · ventet {application.waitingMonths} mnd</small>
                    </div>
                  ))}
                  {selectedBranch.loanQueue.length > 6 && <p>+ {selectedBranch.loanQueue.length - 6} flere saker</p>}
                </div>
              </section>
            )}

            <section className="v1-panel">
              <div className="v1-panel-heading"><div><p className="eyebrow">Filialøkonomi</p><h3>Enkel først, detaljer når du trenger dem</h3></div></div>
              <div className="v1-metrics branch-metrics">
                <article><span>Kunder</span><strong>{selectedBranch.customers.toLocaleString('nb-NO')}</strong></article>
                <article><span>Innskudd</span><strong>{money(selectedBranch.deposits)}</strong></article>
                <article><span>Utlån</span><strong>{money(selectedBranch.loanBook)}</strong></article>
                <article className={selectedReport && selectedReport.profit < 0 ? 'negative' : 'positive'}>
                  <span>Månedsresultat</span><strong>{selectedReport ? money(selectedReport.profit) : 'Ikke kjørt'}</strong>
                </article>
              </div>
            </section>
          </section>
        )}

        {page === 'expansion' && (
          <section className="v1-page">
            <div className="v1-hero">
              <div>
                <p className="eyebrow">Bygg banknettverket</p>
                <h2>Velg neste lokale marked.</h2>
                <p>
                  En ny filial åpner med eget team og lokal leder. Den trenger tid til å bygge
                  omdømme og kan gå i minus de første månedene.
                </p>
              </div>
              <div className="v1-status-good">
                <span>Ekspansjonskapital</span>
                <strong>{money(game.cash)}</strong>
                <small>{EXPANSION_OPPORTUNITIES.filter((option) => !game.branches.some((branch) => branch.id === option.branchId)).length} markeder tilgjengelig</small>
              </div>
            </div>

            <div className="v1-expansion-grid">
              {EXPANSION_OPPORTUNITIES.map((opportunity) => {
                const owned = game.branches.some((branch) => branch.id === opportunity.branchId);
                const canAfford = game.cash >= opportunity.openingCost;
                return (
                  <article key={opportunity.id} className={`v1-expansion-card ${owned ? 'owned' : ''}`}>
                    <div className="v1-tag">{opportunity.strength}</div>
                    <h3>{opportunity.name}</h3>
                    <p>{opportunity.description}</p>
                    <div className="v1-expansion-facts">
                      <span>{marketLabel(opportunity.market)}</span>
                      <strong>{money(opportunity.openingCost)}</strong>
                    </div>
                    <button
                      className="primary"
                      disabled={owned || !canAfford}
                      onClick={() => handleOpenExpansion(opportunity.id, opportunity.branchId)}
                    >
                      {owned ? 'Allerede åpnet' : canAfford ? 'Åpne filial' : 'Ikke nok kapital'}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {page === 'inbox' && (
          <section className="v1-page inbox-page">
            <div className="v1-hero">
              <div>
                <p className="eyebrow">Bare det som betyr noe</p>
                <h2>Ledelsen oppsummerer. Du slipper småsakene.</h2>
                <p>Vanlige lån, lokale ansettelser og kampanjer håndteres ute i banken.</p>
              </div>
            </div>
            <div className="v1-inbox-list">
              {game.inbox.map((item) => (
                <button
                  key={item.id}
                  className={`${item.kind} ${item.read ? 'read' : ''}`}
                  onClick={() => {
                    setGame((current) => ({
                      ...current,
                      inbox: current.inbox.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry),
                    }));
                    if (item.branchId) openBranch(item.branchId);
                  }}
                >
                  <span className="inbox-type">{item.kind === 'warning' ? 'Trenger oppmerksomhet' : 'Ledelsesrapport'}</span>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        <footer className="v1-footer">
          <span>Bank Empire {game.gameVersion}</span>
          <button onClick={resetGame}>Nullstill testspill</button>
        </footer>
      </main>
    </div>
  );
}