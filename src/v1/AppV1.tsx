import { useEffect, useMemo, useState } from 'react';
import { ROLE_LABELS, STRATEGY_DESCRIPTIONS, STRATEGY_LABELS } from './game/config';
import { createNewGame } from './game/createGame';
import { simulateNextMonth } from './game/simulateMonth';
import type { BankStrategy, Branch, GameState } from './game/types';
import { clearV1Save, loadV1Save, saveV1Game } from './platform/storage';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';

type Page = 'bank' | 'branches' | 'inbox';

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
  const unread = game.inbox.filter((item) => !item.read).length;

  const setStrategy = (strategy: BankStrategy) => setGame((current) => ({ ...current, strategy }));

  const openBranch = (branchId: string) => {
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
          <button className={page === 'inbox' ? 'active' : ''} onClick={() => setPage('inbox')}>
            <span>03</span> Innboks {unread > 0 && <b>{unread}</b>}
          </button>
        </nav>

        <div className="v1-sidebar-note">
          <strong>Lokal drift er delegert</strong>
          <p>Filiallederne behandler lån, bemanner teamet og løser vanlig drift.</p>
        </div>
      </aside>

      <main className="v1-main">
        <header className="v1-topbar">
          <div>
            <p className="eyebrow">{monthName(game.date.year, game.date.month)}</p>
            <h1>{page === 'bank' ? 'Banken' : page === 'branches' ? 'Filialene' : 'CEO-innboks'}</h1>
          </div>
          <div className="v1-top-actions">
            <div className="v1-cash">
              <span>Tilgjengelig kapital</span>
              <strong>{money(game.cash)}</strong>
            </div>
            <button className="primary" onClick={() => setGame(simulateNextMonth(game))}>
              Spill neste måned
            </button>
          </div>
        </header>

        {page === 'bank' && (
          <section className="v1-page">
            <div className="v1-hero">
              <div>
                <p className="eyebrow">Din jobb akkurat nå</p>
                <h2>Sett retning. La lederne drive banken.</h2>
                <p>
                  Du bestemmer bankens satsing. Ingrid og filialteamet håndterer kunder,
                  lånesøknader, bemanning og lokal markedsføring innenfor mandatet sitt.
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
                <span>Lederne tilpasser den lokale driften</span>
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
                  <p className="eyebrow">Lokale banker</p>
                  <h3>Slik går det ute i filialene</h3>
                </div>
              </div>
              <div className="v1-branch-list">
                {game.branches.map((branch) => {
                  const report = getLatestReport(branch);
                  const manager = branch.employees.find((employee) => employee.role === 'branch-manager');
                  return (
                    <button key={branch.id} onClick={() => openBranch(branch.id)}>
                      <div>
                        <strong>{branch.name}</strong>
                        <span>{manager?.name ?? 'Ingen filialleder'} · {branch.employees.length} ansatte</span>
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
                <p className="eyebrow">Lokal bank</p>
                <h2>{selectedBranch.name}</h2>
                <p>
                  Filialleder {selectedBranch.employees.find((employee) => employee.role === 'branch-manager')?.name}
                  {' '}har ansvar for daglig drift, lokale ansettelser og kundebehandling.
                </p>
              </div>
              <div className="v1-status-good">
                <span>Lokalt omdømme</span>
                <strong>{selectedBranch.reputation}/100</strong>
                <small>{selectedBranch.loanQueue.length} lånesaker venter</small>
              </div>
            </div>

            <div className="v1-two-column">
              <section className="v1-panel">
                <div className="v1-panel-heading"><div><p className="eyebrow">Teamet</p><h3>Menneskene som driver filialen</h3></div></div>
                <div className="v1-people">
                  {selectedBranch.employees.map((employee) => (
                    <article key={employee.id}>
                      <div className="avatar">{employee.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
                      <div><strong>{employee.name}</strong><span>{ROLE_LABELS[employee.role]}</span></div>
                      <div><small>Kompetanse</small><strong>{employee.skill}</strong></div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="v1-panel">
                <div className="v1-panel-heading"><div><p className="eyebrow">Siste måned</p><h3>Hva skjedde?</h3></div></div>
                {getLatestReport(selectedBranch) ? (
                  <div className="v1-report-story">
                    <p>
                      Filialen mottok <strong>{getLatestReport(selectedBranch)?.applicationsReceived}</strong> lånesøknader,
                      behandlet <strong>{getLatestReport(selectedBranch)?.applicationsProcessed}</strong> og godkjente{' '}
                      <strong>{getLatestReport(selectedBranch)?.loansApproved}</strong>.
                    </p>
                    <p>
                      Måneden endte med <strong>{money(getLatestReport(selectedBranch)?.profit ?? 0)}</strong> og{' '}
                      <strong>{getLatestReport(selectedBranch)?.queueEnd}</strong> saker i kø.
                    </p>
                    {(getLatestReport(selectedBranch)?.managerActions.length ?? 0) > 0 && (
                      <div className="manager-actions">
                        <span>Filiallederens handlinger</span>
                        {getLatestReport(selectedBranch)?.managerActions.map((action) => <p key={action}>{action}</p>)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="v1-empty"><strong>Ingen månedsrapport ennå</strong><p>Spill én måned for å se hvordan teamet driver filialen.</p></div>
                )}
              </section>
            </div>

            <section className="v1-panel">
              <div className="v1-panel-heading"><div><p className="eyebrow">Filialøkonomi</p><h3>Enkel først, detaljer når du trenger dem</h3></div></div>
              <div className="v1-metrics branch-metrics">
                <article><span>Kunder</span><strong>{selectedBranch.customers.toLocaleString('nb-NO')}</strong></article>
                <article><span>Innskudd</span><strong>{money(selectedBranch.deposits)}</strong></article>
                <article><span>Utlån</span><strong>{money(selectedBranch.loanBook)}</strong></article>
                <article><span>Lokal markedsføring</span><strong>{money(selectedBranch.localMarketingBudget)}/mnd</strong></article>
              </div>
            </section>
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
                  onClick={() => setGame((current) => ({
                    ...current,
                    inbox: current.inbox.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry),
                  }))}
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
