import { useEffect, useState } from 'react';
import { advanceMonths, renameBank } from './game/actions';
import { createNewGame } from './game/createGame';
import type { GameState } from './game/types';
import { clearV1Save, loadV1Save, saveV1Game } from './platform/storage';
import { money, monthName } from './ui/common';
import {
  FinancePage,
  InboxPage,
  LeadershipPage,
  MarketingPage,
  NetworkPage,
  OverviewPage,
  ProductsPage,
  TechnologyPage,
  WorldPage,
  type V1Page,
} from './ui/pages';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';

const NAVIGATION: Array<{ id: V1Page; code: string; label: string }> = [
  { id: 'overview', code: '01', label: 'Banken' },
  { id: 'network', code: '02', label: 'Filialer' },
  { id: 'world', code: '03', label: 'Verden' },
  { id: 'products', code: '04', label: 'Produkter' },
  { id: 'marketing', code: '05', label: 'Markedsføring' },
  { id: 'leadership', code: '06', label: 'Ledelsen' },
  { id: 'technology', code: '07', label: 'Teknologi' },
  { id: 'finance', code: '08', label: 'Finans og risiko' },
  { id: 'inbox', code: '09', label: 'Innboks' },
];

const PAGE_TITLES: Record<V1Page, string> = {
  overview: 'Banken',
  network: 'Filialnettverket',
  world: 'Internasjonal ekspansjon',
  products: 'Produkter',
  marketing: 'Markedsføring',
  leadership: 'Konsernledelsen',
  technology: 'Teknologi',
  finance: 'Finans og risiko',
  inbox: 'CEO-innboks',
};

export default function AppV1() {
  const [game, setGame] = useState<GameState>(() => loadV1Save() ?? createNewGame());
  const [page, setPage] = useState<V1Page>('overview');
  const [selectedBranchId, setSelectedBranchId] = useState(game.branches[0]?.id ?? '');
  const [renameOpen, setRenameOpen] = useState(false);
  const [bankNameDraft, setBankNameDraft] = useState(game.bankName);

  useEffect(() => saveV1Game(game), [game]);
  useEffect(() => {
    if (!game.branches.some((branch) => branch.id === selectedBranchId)) {
      setSelectedBranchId(game.branches[0]?.id ?? '');
    }
  }, [game.branches, selectedBranchId]);

  const unread = game.inbox.filter((item) => !item.read).length;
  const playMonths = (months: number) => setGame((current) => advanceMonths(current, months));
  const openBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    setPage('network');
  };
  const resetGame = () => {
    if (!window.confirm('Starte hele v1-spillet på nytt? Dette sletter bare v1-lagringen.')) return;
    clearV1Save();
    const next = createNewGame();
    setGame(next);
    setSelectedBranchId(next.branches[0]?.id ?? '');
    setPage('overview');
  };
  const saveBankName = () => {
    setGame((current) => renameBank(current, bankNameDraft));
    setRenameOpen(false);
  };

  return (
    <div className="v1-shell" data-page={page}>
      <aside className="v1-sidebar">
        <button className="v1-brand" onClick={() => setRenameOpen(true)} title="Endre banknavn">
          <span>BE</span>
          <div><strong>{game.bankName}</strong><small>v1 international alpha</small></div>
        </button>

        <nav aria-label="Hovedmeny">
          {NAVIGATION.map((item) => (
            <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}>
              <span>{item.code}</span>
              <strong>{item.label}</strong>
              {item.id === 'inbox' && unread > 0 && <b>{unread}</b>}
            </button>
          ))}
        </nav>

        <div className="v1-sidebar-summary">
          <div><span>Filialer</span><strong>{game.branches.length}</strong></div>
          <div><span>Land</span><strong>{new Set(game.branches.map((branch) => branch.country)).size}</strong></div>
          <div><span>Omdømme</span><strong>{game.reputation}</strong></div>
        </div>

        <div className="v1-sidebar-note">
          <strong>Du leder banken</strong>
          <p>Lokale ledere behandler lån, følger opp kunder og ansetter innenfor rammene dine.</p>
        </div>
      </aside>

      <main className="v1-main">
        <header className="v1-topbar">
          <div>
            <p className="eyebrow">{monthName(game.date.year, game.date.month)}</p>
            <h1>{PAGE_TITLES[page]}</h1>
          </div>
          <div className="v1-top-actions">
            <div className="v1-cash"><span>Tilgjengelig kapital</span><strong>{money(game.cash)}</strong><small>Egenkapital {money(game.equity)}</small></div>
            <div className="v1-time-controls" aria-label="Spill frem tid">
              <button onClick={() => playMonths(3)}>+3 mnd</button>
              <button onClick={() => playMonths(12)}>+12 mnd</button>
              <button className="primary" onClick={() => playMonths(1)}>Neste måned</button>
            </div>
          </div>
        </header>

        {page === 'overview' && <OverviewPage game={game} setGame={setGame} navigate={setPage} openBranch={openBranch} />}
        {page === 'network' && <NetworkPage game={game} setGame={setGame} selectedBranchId={selectedBranchId} setSelectedBranchId={setSelectedBranchId} />}
        {page === 'world' && <WorldPage game={game} setGame={setGame} openBranch={openBranch} />}
        {page === 'products' && <ProductsPage game={game} setGame={setGame} />}
        {page === 'marketing' && <MarketingPage game={game} setGame={setGame} />}
        {page === 'leadership' && <LeadershipPage game={game} setGame={setGame} />}
        {page === 'technology' && <TechnologyPage game={game} setGame={setGame} />}
        {page === 'finance' && <FinancePage game={game} />}
        {page === 'inbox' && <InboxPage game={game} setGame={setGame} />}

        <footer className="v1-footer">
          <span>Bank Empire {game.gameVersion} · save v{game.saveVersion}</span>
          <button onClick={resetGame}>Nullstill v1-spillet</button>
        </footer>
      </main>

      {renameOpen && (
        <div className="v1-modal-backdrop" onMouseDown={() => setRenameOpen(false)}>
          <div className="v1-modal" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">Bankidentitet</p>
            <h2>Hva skal banken hete?</h2>
            <input autoFocus value={bankNameDraft} onChange={(event) => setBankNameDraft(event.target.value)} maxLength={36} />
            <div><button onClick={() => setRenameOpen(false)}>Avbryt</button><button className="primary" onClick={saveBankName}>Lagre banknavn</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
