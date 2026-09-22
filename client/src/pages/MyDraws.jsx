import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, monthLabel, shortDate } from '../lib/api';
import { Ball, Empty, Loading, Pill } from '../components/ui';

export default function MyDraws() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/draws/me').then(setData).catch(() => setData(null)); }, []);

  if (!data) return <Loading rows={3} />;

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <div>
        <h1 style={{ marginBottom: '.2rem' }}>My draws</h1>
        <p className="dim">Every month your card is entered automatically while your plan is active.</p>
      </div>

      <div className="card card-lg">
        <div className="row-between">
          <div>
            <div className="dim" style={{ fontSize: '.85rem' }}>{monthLabel(data.next.period)} · next draw</div>
            <div className="stat-value clay">{money(data.next.prizePool + data.next.rolloverIn)}</div>
            <div className="stat-label">drawn {shortDate(data.next.drawDate)} · {data.next.subscribers} subscribers</div>
          </div>
          <div>
            <div className="dim" style={{ fontSize: '.85rem', marginBottom: '.5rem' }}>Numbers you're holding</div>
            <div className="row" style={{ gap: '.4rem' }}>
              {data.myNumbers.length
                ? data.myNumbers.map((n, i) => <Ball key={`${n}-${i}`} n={n} small />)
                : <span className="dim">No scores posted</span>}
            </div>
          </div>
        </div>
        <div style={{ marginTop: '1.2rem' }}>
          {data.eligible ? (
            <Pill tone="mint">Entered — nothing more to do</Pill>
          ) : (
            <div className="row">
              <Pill tone="rose">Not entered</Pill>
              <Link className="dim" to="/scores" style={{ fontSize: '.9rem' }}>
                You need an active plan and five scores
              </Link>
            </div>
          )}
        </div>
      </div>

      <h3>Past entries</h3>
      {data.entries.length === 0 && (
        <Empty title="No draws yet">
          Once a draw is published with your card in it, the result shows up here.
        </Empty>
      )}

      <div className="stack">
        {data.entries.map((e) => (
          <div key={e.id} className="card">
            <div className="row-between">
              <div>
                <strong>{monthLabel(e.period)}</strong>
                <div className="dim" style={{ fontSize: '.88rem' }}>
                  drawn {shortDate(e.draw_date)} · {e.method === 'algorithmic' ? 'weighted' : 'random'}
                </div>
              </div>
              {e.tier ? (
                <Pill tone={e.payment_status === 'paid' ? 'mint' : 'clay'}>
                  {e.tier}-number match · {money(e.amount)}
                </Pill>
              ) : (
                <Pill>{e.matched} match{e.matched === 1 ? '' : 'es'}</Pill>
              )}
            </div>

            <div className="grid grid-2" style={{ marginTop: '1.2rem' }}>
              <div>
                <div className="dim" style={{ fontSize: '.82rem', marginBottom: '.5rem' }}>Your numbers</div>
                <div className="row" style={{ gap: '.4rem' }}>
                  {e.numbers.map((n, i) => (
                    <Ball key={i} n={n} small variant={e.winning_numbers.includes(n) ? 'hit' : undefined} />
                  ))}
                </div>
              </div>
              <div>
                <div className="dim" style={{ fontSize: '.82rem', marginBottom: '.5rem' }}>Drawn</div>
                <div className="row" style={{ gap: '.4rem' }}>
                  {e.winning_numbers.map((n, i) => <Ball key={i} n={n} small variant="draw" />)}
                </div>
              </div>
            </div>

            {e.tier && e.verification_status !== 'approved' && (
              <p className="dim" style={{ marginTop: '1rem', marginBottom: 0, fontSize: '.9rem' }}>
                Verification {e.verification_status}.{' '}
                <Link to="/winnings" className="mint">Go to winnings</Link>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
