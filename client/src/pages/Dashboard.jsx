import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, monthLabel, shortDate } from '../lib/api';
import { useAuth } from '../lib/auth';
import { charityPhoto } from '../lib/images';
import { Ball, Empty, Loading, Notice, Photo } from '../components/ui';

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

/**
 * A ledger, not a widget wall. One headline figure, a run of facts on rules,
 * and the card itself shown as numbers rather than a chart.
 */
export default function Dashboard() {
  const { user, subscription, charity } = useAuth();
  const [scores, setScores] = useState(null);
  const [draws, setDraws] = useState(null);
  const [winnings, setWinnings] = useState(null);

  useEffect(() => {
    api.get('/scores').then((d) => setScores(d.scores)).catch(() => setScores([]));
    api.get('/draws/me').then(setDraws).catch(() => setDraws(null));
    api.get('/winnings/me').then(setWinnings).catch(() => setWinnings(null));
  }, []);

  const needsProof = (winnings?.winnings || []).filter(
    (w) => w.verification_status === 'pending' || w.verification_status === 'rejected'
  );

  const contribution = subscription
    ? (Number(subscription.amount) * Number(user.charity_percent)) / 100
    : 0;

  return (
    <div>
      <header style={{ marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
        <p className="meta">{greet()}, {user.name.split(' ')[0]}</p>
        <h1 className="greeting" style={{ marginTop: '1rem' }}>
          Your game. <span className="serif-italic">Your impact.</span>
        </h1>
      </header>

      {!subscription && (
        <div style={{ marginBottom: '2.5rem' }}>
          <Notice kind="error">
            You have no active membership, so you are not in the next draw.{' '}
            <Link to="/subscription">Choose a plan</Link>
          </Notice>
        </div>
      )}

      {needsProof.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <Notice kind="ok">
            You have {needsProof.length} win awaiting proof.{' '}
            <Link to="/winnings">Upload your screenshot</Link>
          </Notice>
        </div>
      )}

      {/* the five facts, on rules */}
      <div className="figures" style={{ marginBottom: 'clamp(3rem, 6vw, 4.5rem)' }}>
        <div>
          <div className="stat-value">{subscription ? 'Active' : 'Inactive'}</div>
          <div className="stat-label">
            {subscription ? `${subscription.plan} · renews ${shortDate(subscription.current_period_end)}` : 'No plan'}
          </div>
        </div>
        <div>
          <div className="stat-value">{draws ? shortDate(draws.next.drawDate) : '—'}</div>
          <div className="stat-label">Next draw</div>
        </div>
        <div>
          <div className="stat-value gold">
            {draws ? money(draws.next.prizePool + draws.next.rolloverIn) : '—'}
          </div>
          <div className="stat-label">Current pool</div>
        </div>
        <div>
          <div className="stat-value">{scores?.length ? scores[0].score : '—'}</div>
          <div className="stat-label">Latest score</div>
        </div>
        <div>
          <div className="stat-value">{money(contribution)}</div>
          <div className="stat-label">Directed to charity</div>
        </div>
      </div>

      <div className="split split-6-4">
        <div>
          {/* the card */}
          <section style={{ marginBottom: 'clamp(3rem, 5vw, 4rem)' }}>
            <div className="opener row-between" style={{ alignItems: 'flex-end', marginBottom: '1.75rem' }}>
              <div>
                <span className="meta">Your card</span>
                <h2 style={{ fontSize: 'var(--t-h3)', margin: '0.75rem 0 0' }}>
                  {scores ? `${scores.length} of five held` : 'Loading'}
                </h2>
              </div>
              <Link className="link-action" to="/scores">Manage scores</Link>
            </div>

            {!scores && <Loading rows={1} height={90} />}

            {scores?.length === 0 && (
              <Empty
                title="Nothing posted yet"
                action={<Link className="btn" to="/scores">Post your first round</Link>}
              >
                Five scores make a full ticket for the next draw.
              </Empty>
            )}

            {scores?.length > 0 && (
              <>
                <div className="row" style={{ gap: '0.6rem', marginBottom: '1.75rem' }}>
                  {scores.map((s, i) => <Ball key={s.id} n={s.score} index={i} />)}
                  {Array.from({ length: 5 - scores.length }).map((_, i) => (
                    <span key={`e${i}`} className="ball dim" style={{ borderStyle: 'dashed' }}>–</span>
                  ))}
                </div>

                <dl className="ledger">
                  {scores.map((s) => (
                    <div className="ledger-row" key={s.id}>
                      <dt>{shortDate(s.played_on)}</dt>
                      <dd>{s.score} pts</dd>
                    </div>
                  ))}
                </dl>

                {scores.length < 5 && (
                  <p className="dim" style={{ fontSize: 'var(--t-small)', marginTop: '1rem' }}>
                    {5 - scores.length} more and you hold a full ticket.
                  </p>
                )}
              </>
            )}
          </section>

          {/* winnings */}
          <section>
            <div className="opener row-between" style={{ alignItems: 'flex-end', marginBottom: '1.75rem' }}>
              <div>
                <span className="meta">Winnings</span>
                <h2 style={{ fontSize: 'var(--t-h3)', margin: '0.75rem 0 0' }}>
                  {winnings ? money(winnings.totals.total) : '—'} won
                </h2>
              </div>
              <Link className="link-action" to="/winnings">All winnings</Link>
            </div>

            {!winnings && <Loading rows={1} height={70} />}

            {winnings?.winnings.length === 0 && (
              <Empty title="Nothing won yet">
                Three matching numbers is enough to take a share of the pool.
              </Empty>
            )}

            {winnings?.winnings.length > 0 && (
              <dl className="ledger">
                {winnings.winnings.slice(0, 4).map((w) => (
                  <div className="ledger-row" key={w.id}>
                    <dt>
                      {w.tier}-number match
                      <span className="table-sub">
                        {monthLabel(w.period)} ·{' '}
                        {w.payment_status === 'paid' ? 'paid' : w.verification_status}
                      </span>
                    </dt>
                    <dd className="gold">{money(w.amount)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </div>

        {/* charity rail, the only image on the page and the point of it */}
        <aside>
          <div className="opener" style={{ marginBottom: '1.5rem' }}>
            <span className="meta">Your cause</span>
          </div>

          {charity ? (
            <>
              <Photo {...charityPhoto(charity, 700)} fallback={charity.name} ratio="portrait" />
              <h3 style={{ marginTop: '1.25rem', marginBottom: '0.3rem' }}>{charity.name}</h3>
              <p className="dim" style={{ fontSize: 'var(--t-small)' }}>{charity.category}</p>

              <dl className="ledger" style={{ marginTop: '1.5rem' }}>
                <div className="ledger-row">
                  <dt>Your share</dt>
                  <dd>{user.charity_percent}%</dd>
                </div>
                <div className="ledger-row">
                  <dt>From this payment</dt>
                  <dd className="gold">{money(contribution)}</dd>
                </div>
                <div className="ledger-row">
                  <dt>Draws entered</dt>
                  <dd>{draws ? draws.drawsEntered : '—'}</dd>
                </div>
              </dl>

              <div className="row" style={{ marginTop: '1.5rem' }}>
                <Link className="btn btn-ghost btn-sm" to="/my-charity">Change cause</Link>
                <Link className="btn btn-ghost btn-sm" to="/my-draws">My draws</Link>
              </div>
            </>
          ) : (
            <Empty
              title="No cause selected"
              action={<Link className="btn" to="/my-charity">Choose a charity</Link>}
            >
              Pick one and your contribution starts flowing.
            </Empty>
          )}
        </aside>
      </div>
    </div>
  );
}
