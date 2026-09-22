import { useEffect, useState } from 'react';
import { api, money, shortDate } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Empty, Loading, Pill, useFeedback } from '../components/ui';

export default function MyCharity() {
  const { user, subscription, refresh } = useAuth();
  const [charities, setCharities] = useState(null);
  const [history, setHistory] = useState(null);
  const [selected, setSelected] = useState(user.charity_id || '');
  const [percent, setPercent] = useState(Number(user.charity_percent) || 10);
  const [busy, setBusy] = useState(false);
  const feedback = useFeedback();

  useEffect(() => {
    api.get('/charities').then((d) => setCharities(d.charities)).catch(() => setCharities([]));
    api.get('/charities/me/contributions').then(setHistory).catch(() => setHistory(null));
  }, []);

  const save = async () => {
    setBusy(true);
    feedback.clear();
    try {
      await api.put('/charities/selection', { charity_id: selected, charity_percent: Number(percent) });
      await refresh();
      feedback.ok('Saved. Your next payment uses this split.');
    } catch (err) {
      feedback.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fee = Number(subscription?.amount || 499);
  const share = Math.round((fee * percent) / 100);

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <div>
        <h1 style={{ marginBottom: '.2rem' }}>My charity</h1>
        <p className="dim">Choose the cause and how much of your fee it receives. The floor is 10%.</p>
      </div>

      {feedback.node}

      <div className="card card-lg">
        <div className="row-between">
          <label htmlFor="pct" style={{ margin: 0 }}>Contribution</label>
          <strong className="mint mono-num" style={{ fontSize: '1.4rem' }}>{percent}%</strong>
        </div>
        <input
          id="pct" type="range" min="10" max="100" step="5"
          value={percent} onChange={(e) => setPercent(Number(e.target.value))}
        />
        <div className="dim" style={{ fontSize: '.9rem' }}>
          {money(share)} of your {money(fee)} {subscription?.plan || 'monthly'} payment.
        </div>
      </div>

      <h3>Pick a cause</h3>
      {!charities && <Loading rows={2} />}
      <div className="grid grid-3">
        {charities?.map((c) => {
          const active = selected === c.id;
          return (
            <button
              key={c.id} type="button" className="card charity-card"
              onClick={() => setSelected(c.id)}
              style={{
                textAlign: 'left', cursor: 'pointer',
                borderColor: active ? 'var(--mint)' : undefined,
                boxShadow: active ? '0 0 0 1px var(--mint)' : undefined,
              }}
            >
              {c.image_url && <img src={c.image_url} alt="" loading="lazy" />}
              <div className="body">
                <div className="row-between">
                  <Pill>{c.category}</Pill>
                  {active && <Pill tone="mint">Selected</Pill>}
                </div>
                <strong>{c.name}</strong>
                <span className="dim" style={{ fontSize: '.88rem' }}>{c.tagline}</span>
              </div>
            </button>
          );
        })}
      </div>

      <button className="btn" onClick={save} disabled={busy || !selected}>
        {busy ? 'Saving…' : 'Save my choice'}
      </button>

      <h3 style={{ marginTop: '1rem' }}>What you've given</h3>
      {!history && <Loading rows={1} />}
      {history?.contributions.length === 0 && (
        <Empty title="Nothing recorded yet">
          Your first contribution is logged the moment a subscription payment goes through.
        </Empty>
      )}
      {history?.contributions.length > 0 && (
        <>
          <div className="card">
            <div className="stat-value mint">{money(history.total)}</div>
            <div className="stat-label">directed to charity through your account</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Charity</th><th>Type</th><th className="num">Amount</th></tr>
              </thead>
              <tbody>
                {history.contributions.map((c) => (
                  <tr key={c.id}>
                    <td>{shortDate(c.created_at)}</td>
                    <td>{c.charity_name || 'Retired listing'}</td>
                    <td className="dim">{c.source === 'donation' ? 'One-off donation' : `${c.percent}% of subscription`}</td>
                    <td className="num">{money(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
