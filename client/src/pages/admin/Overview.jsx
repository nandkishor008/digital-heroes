import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, monthLabel } from '../../lib/api';
import { Loading, Notice, Pill } from '../../components/ui';

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/analytics').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <Notice kind="error">{error}</Notice>;
  if (!data) return <Loading rows={4} />;

  const latest = data.draws[0];

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <div>
        <h1 style={{ marginBottom: '.2rem' }}>Control room</h1>
        <p className="dim">Everything operational, in one place.</p>
      </div>

      {data.winnings.awaiting_review > 0 && (
        <Notice kind="ok">
          {data.winnings.awaiting_review} winner proof{data.winnings.awaiting_review === 1 ? '' : 's'} waiting on review.{' '}
          <Link to="/admin/winners" className="mint">Open the queue</Link>
        </Notice>
      )}

      <div className="grid grid-4">
        <div className="card">
          <div className="stat-value">{data.users.total}</div>
          <div className="stat-label">Registered users · {data.users.new_30d} in 30 days</div>
        </div>
        <div className="card">
          <div className="stat-value mint">{data.subscriptions.active}</div>
          <div className="stat-label">
            Active plans · {data.subscriptions.monthly} monthly, {data.subscriptions.yearly} yearly
          </div>
        </div>
        <div className="card">
          <div className="stat-value clay">{money(data.prizePool.currentMonth)}</div>
          <div className="stat-label">This month's pool at {data.prizePool.percent}% of revenue</div>
        </div>
        <div className="card">
          <div className="stat-value mint">{money(data.charity.total)}</div>
          <div className="stat-label">Directed to charity, all time</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-lg">
          <div className="row-between">
            <h3 style={{ margin: 0 }}>Latest draw</h3>
            <Link className="btn btn-ghost btn-sm" to="/admin/draws">Draw management</Link>
          </div>
          {latest ? (
            <div style={{ marginTop: '1rem' }}>
              <div className="row-between">
                <strong>{monthLabel(latest.period)}</strong>
                <Pill tone={latest.status === 'published' ? 'mint' : 'clay'}>{latest.status}</Pill>
              </div>
              <div className="grid grid-3" style={{ marginTop: '1rem' }}>
                <div><div className="dim" style={{ fontSize: '.8rem' }}>Pool</div><strong>{money(latest.prize_pool)}</strong></div>
                <div><div className="dim" style={{ fontSize: '.8rem' }}>Entries</div><strong>{latest.entrant_count}</strong></div>
                <div><div className="dim" style={{ fontSize: '.8rem' }}>Winners</div><strong>{latest.winner_count}</strong></div>
              </div>
            </div>
          ) : (
            <p className="dim" style={{ marginTop: '1rem' }}>No draw has been run yet.</p>
          )}
        </div>

        <div className="card card-lg">
          <div className="row-between">
            <h3 style={{ margin: 0 }}>Payouts</h3>
            <Link className="btn btn-ghost btn-sm" to="/admin/winners">Winners & payouts</Link>
          </div>
          <div className="grid grid-2" style={{ marginTop: '1rem' }}>
            <div>
              <div className="stat-value">{money(data.winnings.total)}</div>
              <div className="stat-label">Awarded across {data.winnings.wins} wins</div>
            </div>
            <div>
              <div className="stat-value mint">{money(data.winnings.paid)}</div>
              <div className="stat-label">Settled</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card card-lg">
        <div className="row-between">
          <h3 style={{ margin: 0 }}>Charity split</h3>
          <Link className="btn btn-ghost btn-sm" to="/admin/charities">Manage charities</Link>
        </div>
        <div className="stack" style={{ marginTop: '1rem' }}>
          {data.charity.byCharity.slice(0, 6).map((c) => {
            const pct = data.charity.total ? (Number(c.raised) / data.charity.total) * 100 : 0;
            return (
              <div key={c.id}>
                <div className="row-between" style={{ fontSize: '.92rem' }}>
                  <span>{c.name}</span>
                  <span className="mono-num dim">{money(c.raised)}</span>
                </div>
                <div className="meter" style={{ marginTop: '.35rem' }}><i style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
