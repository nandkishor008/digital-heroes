import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, monthLabel, shortDate } from '../lib/api';
import { Ball, CountUp, Empty, Loading, Reveal } from '../components/ui';

export default function DrawPublic() {
  const [next, setNext] = useState(null);
  const [draws, setDraws] = useState(null);

  useEffect(() => {
    api.get('/draws/next').then(setNext).catch(() => {});
    api.get('/draws').then((d) => setDraws(d.draws)).catch(() => setDraws([]));
  }, []);

  return (
    <>
      {/* the jackpot is the whole first screen */}
      <section className="band-forest" style={{ paddingBlock: 'clamp(4rem, 9vw, 7rem)' }}>
        <div className="shell-wide">
          <span className="meta">
            {next ? `${monthLabel(next.period)} · five-number jackpot` : 'The monthly draw'}
          </span>

          <div className="jackpot" style={{ marginTop: '1.5rem' }}>
            {next ? <CountUp to={Math.round(next.tiers[5])} format={money} /> : '—'}
          </div>

          <div className="hero-foot" style={{ borderColor: 'var(--line-dark)' }}>
            <p className="lede measure" style={{ margin: 0 }}>
              One draw a month, three ways to win. The pool is built from a fixed share of every
              active membership, so it grows as the platform does.
            </p>

            <div className="hero-figures">
              <div>
                <div className="figure-value">{next ? shortDate(next.drawDate) : '—'}</div>
                <div className="figure-label">Next draw</div>
              </div>
              <div>
                <div className="figure-value">{next ? next.subscribers : '—'}</div>
                <div className="figure-label">Playing</div>
              </div>
              <div>
                <div className="figure-value">{next ? money(next.rolloverIn) : '—'}</div>
                <div className="figure-label">Carried in</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* tiers, as a ruled run */}
      <section className="section">
        <div className="shell-wide">
          <div className="opener">
            <span className="meta">How the pool divides</span>
          </div>

          {[
            { tier: 5, share: 40, note: 'Rolls over when nobody matches five, so it compounds.' },
            { tier: 4, share: 35, note: 'Paid out in full in any month it is matched.' },
            { tier: 3, share: 25, note: 'The tier most players reach.' },
          ].map((t) => (
            <div
              key={t.tier}
              className="row-between"
              style={{ borderBottom: '1px solid var(--line-soft)', padding: 'clamp(1.5rem, 3vw, 2.25rem) 0', gap: '2rem' }}
            >
              <h3 style={{ margin: 0, flex: '0 0 auto', minWidth: '9ch' }}>{t.tier} numbers</h3>
              <p className="dim" style={{ margin: 0, flex: '1 1 240px', fontSize: 'var(--t-small)' }}>{t.note}</p>
              <span className="meta">{t.share}% of pool</span>
              <div className="stat-value gold" style={{ minWidth: '5ch', textAlign: 'right' }}>
                {next ? money(next.tiers[t.tier]) : '—'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* results */}
      <section className="section band-paper-2">
        <div className="shell-wide">
          <div className="opener">
            <span className="meta">Past results</span>
            <h2 style={{ maxWidth: '14ch' }}>Every draw we've run.</h2>
          </div>

          {!draws && <Loading rows={3} height={90} />}

          {draws?.length === 0 && (
            <Empty
              title="No draws published yet"
              action={<Link className="btn" to="/register">Be in the first one</Link>}
            >
              The first result appears here as soon as an administrator publishes it.
            </Empty>
          )}

          {draws?.map((d, i) => (
            <Reveal key={d.id} delay={String((i % 3) + 1)}>
              <div
                className="row-between"
                style={{ borderBottom: '1px solid var(--line)', padding: 'clamp(1.5rem, 3vw, 2rem) 0', gap: '1.5rem' }}
              >
                <div style={{ flex: '0 0 auto', minWidth: '12ch' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{monthLabel(d.period)}</h3>
                  <p className="table-sub" style={{ margin: '0.25rem 0 0' }}>
                    {d.entrant_count} entries · {d.winner_count} winner{d.winner_count === 1 ? '' : 's'} ·{' '}
                    {d.method === 'algorithmic' ? 'weighted' : 'random'}
                  </p>
                </div>

                <div className="row" style={{ gap: '0.45rem' }}>
                  {d.winning_numbers.map((n, j) => <Ball key={j} n={n} small variant="draw" index={j} />)}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontSize: '1.15rem' }}>{money(d.prize_pool)}</div>
                  {Number(d.rollover_out) > 0 && (
                    <p className="table-sub" style={{ margin: '0.15rem 0 0' }}>
                      {money(d.rollover_out)} rolled over
                    </p>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="shell-wide split split-6-4" style={{ alignItems: 'end' }}>
          <h2 style={{ maxWidth: '16ch', marginBottom: 0 }}>
            Ready to hold a <span className="serif-italic">ticket?</span>
          </h2>
          <div className="row">
            <Link className="btn" to="/register">Create an account</Link>
            <Link className="btn btn-ghost" to="/how-it-works">How it works</Link>
          </div>
        </div>
      </section>
    </>
  );
}
