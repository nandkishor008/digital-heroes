import { useEffect, useState } from 'react';
import { api, money, shortDate, today } from '../../lib/api';
import { Ball, Empty, Loading, Modal, Pill, useFeedback } from '../../components/ui';

export default function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const feedback = useFeedback();

  const load = (q = search) =>
    api.get(`/admin/users?search=${encodeURIComponent(q)}`)
      .then((d) => setUsers(d.users))
      .catch((e) => feedback.error(e.message));

  useEffect(() => {
    const id = setTimeout(() => load(search), 220);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <div>
        <h1 style={{ marginBottom: '.2rem' }}>Users & scores</h1>
        <p className="dim">Open any account to correct a scorecard or change their charity split.</p>
      </div>

      {feedback.node}

      <div style={{ maxWidth: 360 }}>
        <label htmlFor="q">Search</label>
        <input id="q" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email" />
      </div>

      {!users && <Loading rows={3} />}
      {users?.length === 0 && <Empty title="No users match that search">Try a different name or email.</Empty>}

      {users?.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Plan</th><th>Charity</th>
                <th className="num">Scores</th><th className="num">Won</th><th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    {u.role === 'admin' && <> <Pill tone="clay">Admin</Pill></>}
                    <div className="dim" style={{ fontSize: '.84rem' }}>{u.email}</div>
                  </td>
                  <td>
                    {u.plan ? (
                      <>
                        <span style={{ textTransform: 'capitalize' }}>{u.plan}</span>
                        <div className="dim" style={{ fontSize: '.82rem' }}>
                          {u.subscription_status} · {shortDate(u.current_period_end)}
                        </div>
                      </>
                    ) : <span className="dim">None</span>}
                  </td>
                  <td>
                    {u.charity_name || <span className="dim">Not chosen</span>}
                    <div className="dim" style={{ fontSize: '.82rem' }}>{u.charity_percent}%</div>
                  </td>
                  <td className="num">{u.score_count}/5</td>
                  <td className="num">{money(u.total_won)}</td>
                  <td className="num">
                    <button className="btn btn-ghost btn-sm" onClick={() => setOpenId(u.id)}>Open</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openId && (
        <UserDrawer
          id={openId}
          onClose={() => { setOpenId(null); load(); }}
          onMessage={feedback.ok}
          onError={feedback.error}
        />
      )}
    </div>
  );
}

function UserDrawer({ id, onClose, onMessage, onError }) {
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = () => api.get(`/admin/users/${id}`).then((d) => {
    setData(d);
    setProfile({
      name: d.user.name, email: d.user.email, phone: d.user.phone || '',
      role: d.user.role, charity_percent: d.user.charity_percent,
    });
  }).catch((e) => onError(e.message));

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const saveProfile = async () => {
    try {
      await api.patch(`/admin/users/${id}`, profile);
      onMessage('User updated.');
      load();
    } catch (e) { onError(e.message); }
  };

  const saveScore = async () => {
    try {
      await api.put(`/admin/users/${id}/scores/${editing.id}`, {
        score: Number(editing.score), played_on: editing.played_on,
      });
      setEditing(null);
      onMessage('Score corrected.');
      load();
    } catch (e) { onError(e.message); }
  };

  const deleteScore = async (scoreId) => {
    try {
      await api.del(`/admin/users/${id}/scores/${scoreId}`);
      onMessage('Score deleted.');
      load();
    } catch (e) { onError(e.message); }
  };

  return (
    <Modal title={data?.user.name || 'Loading'} onClose={onClose} wide>
      {!data ? <Loading rows={2} /> : (
        <div className="stack" style={{ gap: '1.5rem' }}>
          <div>
            <h3>Profile</h3>
            <div className="field-row">
              <div>
                <label>Name</label>
                <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div>
                <label>Email</label>
                <input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>
            </div>
            <div className="field-row" style={{ marginTop: '1rem' }}>
              <div>
                <label>Phone</label>
                <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
              <div>
                <label>Role</label>
                <select value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })}>
                  <option value="user">Subscriber</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label>Charity %</label>
                <input
                  type="number" min="10" max="100" value={profile.charity_percent}
                  onChange={(e) => setProfile({ ...profile, charity_percent: Number(e.target.value) })}
                />
              </div>
            </div>
            <button className="btn btn-sm" style={{ marginTop: '1rem' }} onClick={saveProfile}>Save profile</button>
          </div>

          <div>
            <h3>Scorecard</h3>
            {data.scores.length === 0 && <p className="dim">No scores posted.</p>}
            <div className="stack" style={{ gap: '.5rem' }}>
              {data.scores.map((s) => (
                <div key={s.id} className="card">
                  {editing?.id === s.id ? (
                    <div className="field-row">
                      <div>
                        <label>Score</label>
                        <input
                          type="number" min="1" max="45" value={editing.score}
                          onChange={(e) => setEditing({ ...editing, score: e.target.value })}
                        />
                      </div>
                      <div>
                        <label>Date</label>
                        <input
                          type="date" max={today()} value={editing.played_on}
                          onChange={(e) => setEditing({ ...editing, played_on: e.target.value })}
                        />
                      </div>
                      <div style={{ alignSelf: 'end' }} className="row">
                        <button className="btn btn-sm" onClick={saveScore}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="row-between">
                      <div className="row">
                        <Ball n={s.score} small />
                        <span className="dim">{shortDate(s.played_on)}</span>
                      </div>
                      <div className="row">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setEditing({ id: s.id, score: s.score, played_on: s.played_on.slice(0, 10) })}
                        >
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteScore(s.id)}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3>Subscriptions</h3>
            {data.subscriptions.length === 0 ? <p className="dim">Never subscribed.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Plan</th><th>Status</th><th>Period end</th><th className="num">Amount</th></tr></thead>
                  <tbody>
                    {data.subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td style={{ textTransform: 'capitalize' }}>{s.plan}</td>
                        <td style={{ textTransform: 'capitalize' }}>{s.status}</td>
                        <td>{shortDate(s.current_period_end)}</td>
                        <td className="num">{money(s.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3>Wins</h3>
            {data.winnings.length === 0 ? <p className="dim">No wins recorded.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Draw</th><th>Tier</th><th>Verification</th><th>Payment</th><th className="num">Amount</th></tr></thead>
                  <tbody>
                    {data.winnings.map((w) => (
                      <tr key={w.id}>
                        <td>{w.period}</td>
                        <td>{w.tier}</td>
                        <td>{w.verification_status}</td>
                        <td>{w.payment_status}</td>
                        <td className="num">{money(w.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
