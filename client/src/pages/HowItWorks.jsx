import { Link } from 'react-router-dom';
import { photo } from '../lib/images';
import { Ball, Photo, Reveal } from '../components/ui';

const EXAMPLE = { card: [34, 31, 36, 29, 33], drawn: [34, 12, 36, 29, 41] };

export default function HowItWorks() {
  const hits = EXAMPLE.card.filter((n) => EXAMPLE.drawn.includes(n));
  const lead = photo('golfSwing', 1800);
  const aside = photo('charityChildren', 900);

  return (
    <>
      <section className="section-tight" style={{ paddingTop: 'clamp(2rem, 5vw, 4rem)' }}>
        <div className="shell-wide">
          <span className="meta">How it works</span>
          <h1 style={{ marginTop: '1.25rem', maxWidth: '15ch' }}>
            Your scorecard <span className="serif-italic">is</span> your ticket.
          </h1>
          <p className="lede measure-wide">
            There are no numbers to pick. The five Stableford scores on your card are the five
            numbers you play with, which is exactly why keeping it current matters.
          </p>
        </div>
      </section>

      <section className="bleed">
        <Photo src={lead.src} alt={lead.alt} fallback="A player mid-swing" ratio="cinema" priority />
      </section>

      {/* the worked example, given the space to be understood */}
      <section className="section">
        <div className="shell-wide">
          <div className="opener">
            <span className="meta">A worked example</span>
          </div>

          <div className="split split-5-7">
            <div>
              <p className="dim" style={{ fontSize: 'var(--t-small)' }}>A player holds this card</p>
              <div className="row" style={{ gap: '0.6rem', marginBottom: '2.5rem' }}>
                {EXAMPLE.card.map((n, i) => (
                  <Ball key={n} n={n} index={i} variant={EXAMPLE.drawn.includes(n) ? 'hit' : undefined} />
                ))}
              </div>

              <p className="dim" style={{ fontSize: 'var(--t-small)' }}>The draw produces</p>
              <div className="row" style={{ gap: '0.6rem' }}>
                {EXAMPLE.drawn.map((n, i) => <Ball key={n} n={n} index={i} variant="draw" />)}
              </div>
            </div>

            <div>
              <p className="serif" style={{ fontSize: 'clamp(1.35rem, 2.4vw, 2rem)', lineHeight: 1.3 }}>
                Three numbers appear on both — {hits.join(', ')} — so this is a three-number match.
                That tier holds a quarter of the month's pool and is split equally between everyone
                who matched three.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* rules, as ruled columns rather than three boxes */}
      <section className="section band-paper-2">
        <div className="shell-wide">
          <div className="opener">
            <span className="meta">The rules, in full</span>
          </div>

          <div className="grid grid-3">
            <Reveal>
              <h3>Scoring</h3>
              <ul className="dim" style={{ paddingLeft: '1.1rem', lineHeight: 2, fontSize: 'var(--t-small)' }}>
                <li>Stableford points, 1 to 45</li>
                <li>One score per date</li>
                <li>Five retained at a time</li>
                <li>A sixth drops the oldest</li>
                <li>Edit or delete any date instead</li>
              </ul>
            </Reveal>

            <Reveal delay="1">
              <h3>Prize tiers</h3>
              <ul className="dim" style={{ paddingLeft: '1.1rem', lineHeight: 2, fontSize: 'var(--t-small)' }}>
                <li>Five numbers — 40% of the pool</li>
                <li>Four numbers — 35%</li>
                <li>Three numbers — 25%</li>
                <li>Ties split their tier equally</li>
                <li>An unclaimed jackpot rolls over</li>
              </ul>
            </Reveal>

            <Reveal delay="2">
              <h3>Claiming</h3>
              <ul className="dim" style={{ paddingLeft: '1.1rem', lineHeight: 2, fontSize: 'var(--t-small)' }}>
                <li>Upload a screenshot of your scores</li>
                <li>An administrator checks it</li>
                <li>Approved wins move to pending payment</li>
                <li>Then marked paid with a reference</li>
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* where the money goes */}
      <section className="section">
        <div className="shell-wide">
          <div className="split split-4-6">
            <Photo src={aside.src} alt={aside.alt} fallback="Charity work" ratio="portrait" />

            <div>
              <div className="opener">
                <span className="meta">Where the money goes</span>
                <h2 style={{ maxWidth: '14ch' }}>Three ways, every month.</h2>
              </div>

              <div className="steps">
                <div className="step">
                  <div>
                    <h3>To your cause</h3>
                    <p>At least 10% of your fee, and as much as you care to give.</p>
                  </div>
                </div>
                <div className="step">
                  <div>
                    <h3>To the pool</h3>
                    <p>A fixed share of the remainder, split 40 / 35 / 25 across the three tiers.</p>
                  </div>
                </div>
                <div className="step">
                  <div>
                    <h3>To running it</h3>
                    <p>What's left keeps the platform going. No advertising, no data selling.</p>
                  </div>
                </div>
              </div>

              <div className="row" style={{ marginTop: '2.5rem' }}>
                <Link className="btn" to="/register">Join and pick a cause</Link>
                <Link className="btn btn-ghost" to="/draw">See this month's pool</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
