import { useEffect, useState } from 'react';
import { api, money, monthLabel, shortDate } from '../../lib/api';
import { Ball, Empty, Loading, Pill, useFeedback } from '../../components/ui';

const thisPeriod = () => new Date().toISOString().slice(0, 7);

export default function AdminDraws() {
  const [draws, setDraws] = useState(null);
  const [settings, setSettings] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [period, setPeriod] = useState(thisPeriod());
  const [method, setMethod] = useState('random');
  const [preview, setPreview] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(null);
  const feedback = useFeedback();

  const load = () => {
    api.get('/admin/draws').then((d) => {
      setDraws(d.draws);
      setSettings(d.settings);
      setMethod(d.settings.draw_method || 'random');
    }).catch((e) => feedback.error(e.message));
    api.get('/admin/draws/eligibility').then(setEligibility).catch(() => {});
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const simulate = async () => {
    setBusy('simulate');
    feedback.clear();
    try {
      const res = await api.post('/admin/draws/simulate', { period, method });
      setPreview(res.preview);
      setDraft(res.draw);
      feedback.ok('Simulation ready. Review it, re-run it, or publish.');
      load();
    } catch (e) { feedback.error(e.message); } finally { setBusy(null); }
  };

  const publish = async (id) => {
    setBusy('publish');
    try {
      const res = await api.post(`/admin/draws/${id}/publish`);
      feedback.ok(`Published. ${res.winners.length} winner${res.winners.length === 1 ? '' : 's'} created and notified in their dashboard.`);
      setPreview(null);
      setDraft(null);
      load();
    } catch (e) { feedback.error(e.message); } finally { setBusy(null); }
  };

  const discard = async (id) => {
    try {
      await api.del(`/admin/draws/${id}`);
      setPreview(null);
      setDraft(null);
      feedback.ok('Draft discarded.');
      load();
    } catch (e) { feedback.error(e.message); }
  };

  const savePoolPercent = async (value) => {
    try {
      const res = await api.put('/admin/settings', { prize_pool_percent: Number(value) });
      setSettings(res.settings);
      feedback.ok(`Pool share set to ${value}% of subscription revenue.`);
      api.get('/admin/draws/eligibility').then(setEligibility);
    } catch (e) { feedback.error(e.message); }
  };

  const saveMethodDefault = async (value) => {
    try {
      const res = await api.put('/admin/settings', { draw_method: value });
      setSettings(res.settings);
      feedback.ok('Default draw method saved.');
    } catch (e) { feedback.error(e.message); }
  };

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <div>
        <h1 style={{ marginBottom: '.2rem' }}>Draw management</h1>
        <p className="dim">
          Simulate a month as many times as you like. Publishing freezes the numbers and creates the wins.
        </p>
      </div>

      {feedback.node}

      {/* ------------------------------------------------------- config */}
      <div className="card card-lg">
        <h3>Configuration</h3>
        <div className="field-row">
          <div>
            <label htmlFor="pool">Prize pool share of revenue</label>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input
                id="pool" type="number" min="1" max="90"
                value={settings?.prize_pool_percent ?? ''}
                onChange={(e) => setSettings({ ...settings, prize_pool_percent: e.target.value })}
              />
              <button className="btn btn-sm" onClick={() => savePoolPercent(settings.prize_pool_percent)}>
                Save
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="defmethod">Default draw method</label>
            <select
              id="defmethod" value={settings?.draw_method || 'random'}
              onChange={(e) => saveMethodDefault(e.target.value)}
            >
              <option value="random">Random — standard lottery</option>
              <option value="algorithmic">Algorithmic — weighted by score frequency</option>
            </select>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------- simulate */}
      <div className="card card-lg">
        <h3>Run a draw</h3>
        {eligibility && (
          <div className="grid grid-3" style={{ marginBottom: '1.2rem' }}>
            <div>
              <div className="dim" style={{ fontSize: '.8rem' }}>Eligible tickets</div>
              <strong>{eligibility.entries.length}</strong>
            </div>
            <div>
              <div className="dim" style={{ fontSize: '.8rem' }}>Pool from subscriptions</div>
              <strong>{money(eligibility.prizePool)}</strong>
            </div>
            <div>
              <div className="dim" style={{ fontSize: '.8rem' }}>Jackpot carried in</div>
              <strong className="clay">{money(eligibility.rolloverIn)}</strong>
            </div>
          </div>
        )}

        <div className="field-row">
          <div>
            <label htmlFor="period">Month</label>
            <input id="period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div>
            <label htmlFor="method">Method for this draw</label>
            <select id="method" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="random">Random</option>
              <option value="algorithmic">Algorithmic (weighted)</option>
            </select>
          </div>
        </div>
        <button className="btn" style={{ marginTop: '1rem' }} onClick={simulate} disabled={busy === 'simulate'}>
          {busy === 'simulate' ? 'Running…' : 'Run simulation'}
        </button>
      </div>

      {/* ------------------------------------------------------ preview */}
      {preview && draft && (
        <div className="card card-lg" style={{ borderColor: 'var(--clay)' }}>
          <div className="row-between">
            <h3 style={{ margin: 0 }}>Simulation · {monthLabel(draft.period)}</h3>
            <Pill tone="clay">Not published</Pill>
          </div>

          <div className="row" style={{ margin: '1.2rem 0' }}>
            {preview.winningNumbers.map((n) => <Ball key={n} n={n} variant="draw" />)}
          </div>

          <div className="grid grid-4">
            <div><div className="dim" style={{ fontSize: '.8rem' }}>Entries</div><strong>{preview.entrantCount}</strong></div>
            <div><div className="dim" style={{ fontSize: '.8rem' }}>Pool</div><strong>{money(preview.prizePool)}</strong></div>
            <div><div className="dim" style={{ fontSize: '.8rem' }}>Awarded</div><strong>{money(preview.totalAwarded)}</strong></div>
            <div><div className="dim" style={{ fontSize: '.8rem' }}>Rolls over</div><strong className="clay">{money(preview.rolloverOut)}</strong></div>
          </div>

          <div className="table-wrap" style={{ marginTop: '1.5rem' }}>
            <table>
              <thead>
                <tr><th>Tier</th><th className="num">Share</th><th className="num">Tier pool</th><th className="num">Winners</th><th className="num">Each</th></tr>
              </thead>
              <tbody>
                {[5, 4, 3].map((t) => (
                  <tr key={t}>
                    <td>{t}-number match</td>
                    <td className="num">{Math.round(preview.tiers[t].share * 100)}%</td>
                    <td className="num">{money(preview.tiers[t].pool)}</td>
                    <td className="num">{preview.tiers[t].winnerCount}</td>
                    <td className="num">{money(preview.tiers[t].perWinner)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.winners.length > 0 && (
            <div className="table-wrap" style={{ marginTop: '1rem' }}>
              <table>
                <thead><tr><th>Winner</th><th>Tier</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {preview.winners.map((w, i) => (
                    <tr key={i}>
                      <td>{w.name}<div className="dim" style={{ fontSize: '.82rem' }}>{w.email}</div></td>
                      <td>{w.tier}</td>
                      <td className="num">{money(w.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="row" style={{ marginTop: '1.5rem' }}>
            <button className="btn" onClick={() => publish(draft.id)} disabled={busy === 'publish'}>
              {busy === 'publish' ? 'Publishing…' : 'Publish these results'}
            </button>
            <button className="btn btn-ghost" onClick={simulate}>Re-run</button>
            <button className="btn btn-danger" onClick={() => discard(draft.id)}>Discard draft</button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- history */}
      <h3>All draws</h3>
      {!draws && <Loading rows={2} />}
      {draws?.length === 0 && <Empty title="No draws yet">Run your first simulation above.</Empty>}

      <div className="stack">
        {draws?.map((d) => (
          <div key={d.id} className="card row-between">
            <div>
              <strong>{monthLabel(d.period)}</strong>
              <div className="dim" style={{ fontSize: '.86rem' }}>
                {d.entrant_count} entries · {d.winner_count} winners ·{' '}
                {d.method === 'algorithmic' ? 'weighted' : 'random'} ·{' '}
                {d.published_at ? `published ${shortDate(d.published_at)}` : `draws ${shortDate(d.draw_date)}`}
              </div>
            </div>
            <div className="row" style={{ gap: '.4rem' }}>
              {d.winning_numbers.map((n, i) => <Ball key={i} n={n} small variant="draw" />)}
            </div>
            <div className="row">
              <div style={{ textAlign: 'right' }}>
                <div className="mono-num" style={{ fontWeight: 700 }}>{money(d.prize_pool)}</div>
                <Pill tone={d.status === 'published' ? 'mint' : 'clay'}>{d.status}</Pill>
              </div>
              {d.status === 'simulated' && (
                <button className="btn btn-sm" onClick={() => publish(d.id)} disabled={busy === 'publish'}>
                  Publish
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
