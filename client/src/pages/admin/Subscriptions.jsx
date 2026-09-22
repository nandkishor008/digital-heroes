import { useEffect, useState } from 'react';
import { api, money, shortDate } from '../../lib/api';
import { Empty, Loading, Pill, useFeedback } from '../../components/ui';

export default function AdminSubscriptions() {
  const [subs, setSubs] = useState(null);
  const [filter, setFilter] = useState('all');
  const feedback = useFeedback();

  const load = () =>
    api.get('/admin/subscriptions').then((d) => setSubs(d.subscriptions)).catch((e) => feedback.error(e.message));

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const change = async (id, status) => {
    try {
      await api.patch(`/admin/subscriptions/${id}`, { status });
      feedback.ok('Subscription updated.');
      load();
    } catch (e) { feedback.error(e.message); }
  };

  const extend = async (sub, months) => {
    const end = new Date(sub.current_period_end);
    end.setMonth(end.getMonth() + months);
    try {
      await api.patch(`/admin/subscriptions/${sub.id}`, {
        current_period_end: end.toISOString(), status: 'active',
      });
      feedback.ok(`Extended by ${months} month${months === 1 ? '' : 's'}.`);
      load();
    } catch (e) { feedback.error(e.message); }
  };

  const rows = (subs || []).filter((s) => filter === 'all' || s.status === filter);
  const activeRevenue = (subs || [])
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + (s.plan === 'yearly' ? Number(s.amount) / 12 : Number(s.amount)), 0);

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <div>
        <h1 style={{ marginBottom: '.2rem' }}>Subscriptions</h1>
        <p className="dim">Lifecycle state for every plan ever started.</p>
      </div>

      {feedback.node}

      <div className="grid grid-3">
        <div className="card">
          <div className="stat-value">{subs ? subs.filter((s) => s.status === 'active').length : '—'}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="card">
          <div className="stat-value clay">{money(activeRevenue)}</div>
          <div className="stat-label">Monthly recurring revenue</div>
        </div>
        <div className="card">
          <div className="stat-value dim">{subs ? subs.filter((s) => s.status !== 'active').length : '—'}</div>
          <div className="stat-label">Cancelled or lapsed</div>
        </div>
      </div>

      <div className="row">
        {['all', 'active', 'cancelled', 'expired'].map((f) => (
          <button
            key={f} className={`btn btn-sm ${filter === f ? '' : 'btn-ghost'}`}
            onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}
          >
            {f}
          </button>
        ))}
      </div>

      {!subs && <Loading rows={3} />}
      {subs && rows.length === 0 && <Empty title="Nothing here">No subscriptions match that filter.</Empty>}

      {rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subscriber</th><th>Plan</th><th>Status</th><th>Period end</th>
                <th className="num">Amount</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    <div className="dim" style={{ fontSize: '.84rem' }}>{s.email}</div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{s.plan}</td>
                  <td>
                    <Pill tone={s.status === 'active' ? 'mint' : s.status === 'expired' ? 'rose' : undefined}>
                      {s.status}
                    </Pill>
                    {s.cancel_at_period_end && <div className="dim" style={{ fontSize: '.8rem' }}>ends at close</div>}
                  </td>
                  <td>{shortDate(s.current_period_end)}</td>
                  <td className="num">{money(s.amount)}</td>
                  <td className="num">
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => extend(s, 1)}>+1 month</button>
                      {s.status === 'active' ? (
                        <button className="btn btn-danger btn-sm" onClick={() => change(s.id, 'cancelled')}>
                          Cancel
                        </button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => change(s.id, 'active')}>
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
