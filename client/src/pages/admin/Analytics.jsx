import { useEffect, useState } from 'react';
import { api, money, monthLabel } from '../../lib/api';
import { Empty, Loading, Pill, useFeedback } from '../../components/ui';

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const feedback = useFeedback();

  useEffect(() => {
    api.get('/admin/analytics').then(setData).catch((e) => feedback.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (feedback.node && !data) return feedback.node;
  if (!data) return <Loading rows={4} />;

  const maxPool = Math.max(1, ...data.draws.map((d) => Number(d.prize_pool)));

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <div>
        <h1 style={{ marginBottom: '.2rem' }}>Reports</h1>
        <p className="dim">Membership, money in, money out.</p>
      </div>

      <div className="grid grid-4">
        <div className="card">
          <div className="stat-value">{data.users.total}</div>
          <div className="stat-label">Total users</div>
        </div>
        <div className="card">
          <div className="stat-value clay">{money(data.subscriptions.mrr)}</div>
          <div className="stat-label">Monthly recurring revenue</div>
        </div>
        <div className="card">
          <div className="stat-value">{money(data.prizePool.lifetime)}</div>
          <div className="stat-label">Prize pool, all draws</div>
        </div>
        <div className="card">
          <div className="stat-value mint">{money(data.charity.total)}</div>
          <div className="stat-label">Charity contributions</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-lg">
          <h3>Subscription mix</h3>
          <div className="stack" style={{ marginTop: '1rem' }}>
            {[
              ['Monthly plans', data.subscriptions.monthly],
              ['Yearly plans', data.subscriptions.yearly],
              ['Cancelled', data.subscriptions.cancelled],
              ['Lapsed', data.subscriptions.expired],
            ].map(([label, count]) => {
              const total = Math.max(1, data.subscriptions.monthly + data.subscriptions.yearly
                + data.subscriptions.cancelled + data.subscriptions.expired);
              return (
                <div key={label}>
                  <div className="row-between" style={{ fontSize: '.92rem' }}>
                    <span>{label}</span><span className="mono-num dim">{count}</span>
                  </div>
                  <div className="meter" style={{ marginTop: '.3rem' }}>
                    <i style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card card-lg">
          <h3>Winnings</h3>
          <div className="grid grid-2" style={{ marginTop: '1rem' }}>
            <div>
              <div className="stat-value">{data.winnings.wins}</div>
              <div className="stat-label">Wins recorded</div>
            </div>
            <div>
              <div className="stat-value mint">{money(data.winnings.paid)}</div>
              <div className="stat-label">Paid out</div>
            </div>
          </div>
          <div style={{ marginTop: '1.2rem' }}>
            <Pill tone={data.winnings.awaiting_review > 0 ? 'clay' : 'mint'}>
              {data.winnings.awaiting_review} awaiting review
            </Pill>
          </div>
        </div>
      </div>

      <div className="card card-lg">
        <h3>Prize pool by month</h3>
        {data.draws.length === 0 ? (
          <Empty title="No draws yet">Run a draw to populate this report.</Empty>
        ) : (
          <div className="stack" style={{ marginTop: '1rem' }}>
            {data.draws.map((d) => (
              <div key={d.period}>
                <div className="row-between" style={{ fontSize: '.92rem' }}>
                  <span>{monthLabel(d.period)} <span className="dim">· {d.entrant_count} entries · {d.winner_count} winners</span></span>
                  <span className="mono-num dim">{money(d.prize_pool)}</span>
                </div>
                <div className="meter" style={{ marginTop: '.3rem' }}>
                  <i style={{ width: `${(Number(d.prize_pool) / maxPool) * 100}%`, background: 'var(--clay)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card card-lg">
        <h3>Charity contributions</h3>
        <div className="table-wrap" style={{ marginTop: '1rem' }}>
          <table>
            <thead><tr><th>Charity</th><th className="num">Gifts</th><th className="num">Raised</th><th className="num">Share</th></tr></thead>
            <tbody>
              {data.charity.byCharity.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="num">{c.gifts}</td>
                  <td className="num">{money(c.raised)}</td>
                  <td className="num">
                    {data.charity.total ? `${Math.round((Number(c.raised) / data.charity.total) * 100)}%` : '0%'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
