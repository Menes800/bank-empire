import type { GameState } from "../../game/store";

const glossary = [
  ["Liquidity", "Cash available compared with customer deposits. Low liquidity makes the bank vulnerable to withdrawals."],
  ["Capital ratio", "The bank's loss-absorbing equity compared with risk-weighted loans. Higher is safer."],
  ["NPL ratio", "The share of loans that are not performing normally. Higher values usually mean future credit losses."],
  ["Compliance", "How prepared the bank is for regulation, customer checks and supervisory reviews."],
  ["Deposit rate", "The interest customers receive. A higher rate attracts deposits but increases your funding cost."],
  ["Loan rate", "The interest borrowers pay. A higher rate improves margin but reduces demand and can increase risk."],
  ["Board confidence", "A weighted measure of support from the board. Weak support can restrict strategic freedom."],
  ["Market share", "Your active customers as a share of the wider simulated banking market."],
];

export function HelpDrawer({ open, game, onClose }: { open: boolean; game: GameState; onClose: () => void }) {
  if (!open) return null;
  const priorities = [
    game.liquidityRatio < 20 ? "Protect liquidity before approving more large loans." : "Liquidity is currently comfortable.",
    game.capitalRatio < 12.5 ? "Capital is below the internal target. Slow lending or raise capital." : "Capital remains above the internal target.",
    game.satisfaction < 65 ? "Customer experience is weakening. Check staffing, digital service and branch capacity." : "Customer satisfaction is supporting retention.",
  ];

  return <div className="help-backdrop" onMouseDown={onClose}>
    <aside className="help-drawer" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="eyebrow">BANK EMPIRE GUIDE</p><h2>What actually changes what?</h2></div><button onClick={onClose}>×</button></header>
      <section className="help-section"><h3>Your current situation</h3><div className="current-guidance">{priorities.map((item) => <p key={item}>{item}</p>)}</div></section>
      <section className="help-section"><h3>Core decision loop</h3><div className="decision-loop"><span><b>1</b><strong>Set strategy</strong><small>Rates, risk appetite and priorities</small></span><i>→</i><span><b>2</b><strong>Build capacity</strong><small>People, branches and technology</small></span><i>→</i><span><b>3</b><strong>Advance time</strong><small>Customers, revenue and risk develop</small></span><i>→</i><span><b>4</b><strong>Read reports</strong><small>Adjust based on results</small></span></div></section>
      <section className="help-section"><h3>Routine cost vs. strategic decision</h3><div className="help-comparison"><div><strong>Automatic background costs</strong><p>Salaries, rent, normal IT operations, funding interest and ordinary compliance work run automatically. Review them in the monthly report.</p></div><div><strong>Decisions that stop time</strong><p>Only major strategic issues, severe risks or leadership choices should interrupt you. Normal operations do not require repeated approval.</p></div></div></section>
      <section className="help-section"><h3>Banking glossary</h3><div className="glossary-list">{glossary.map(([term, explanation]) => <details key={term}><summary>{term}<span>+</span></summary><p>{explanation}</p></details>)}</div></section>
    </aside>
  </div>;
}
