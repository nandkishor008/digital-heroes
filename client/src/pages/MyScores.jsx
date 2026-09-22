import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, shortDate, today } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Ball, Empty, Loading, Notice, Pill, useFeedback } from '../components/ui';

export default function MyScores() {
  const { subscription } = useAuth();
  const [scores, setScores] = useState(null);
  const [form, setForm] = useState({ score: '', played_on: today() });
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const feedback = useFeedback();

  const load = () => api.get('/scores').then((d) => setScores(d.scores)).catch(() => setScores([]));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    feedback.clear();
    setBusy(true);
    try {
      const res = await api.post('/scores', {
        score: Number(form.score),
        played_on: form.played_on,
      });
      setScores(res.scores);
      setForm({ score: '', played_on: today() });
      feedback.ok(
        res.dropped.length
          ? `Score saved. Your ${shortDate(res.dropped[0].played_on)} round dropped off the card.`
          : 'Score saved.'
      );
    } catch (err) {
      feedback.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.patch(`/scores/${editing.id}`, {
        score: Number(editing.score),
        played_on: editing.played_on,
      });
      setScores(res.scores);
      setEditing(null);
      feedback.ok('Score updated.');
    } catch (err) {
      feedback.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      const res = await api.del(`/scores/${id}`);
      setScores(res.scores);
      feedback.ok('Score removed.');
    } catch (err) {
      feedback.error(err.message);
    }
  };

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <div>
        <h1 style={{ marginBottom: '.2rem' }}>My scores</h1>
        <p className="dim">
          Five Stableford scores, one per date. Post a sixth and the oldest round comes off the card.
        </p>
      </div>

      {!subscription && (
        <Notice kind="error">
          Score entry needs an active subscription. <Link to="/subscription" className="mint">Choose a plan</Link>
        </Notice>
      )}

      {feedback.node}

      <div className="card card-lg">
        <div className="row-between">
          <h3 style={{ margin: 0 }}>Your ticket</h3>
          <Pill tone={scores?.length === 5 ? 'mint' : 'clay'}>
            {scores ? `${scores.length} of 5 held` : 'Loading'}
          </Pill>
        </div>
        <div className="row" style={{ marginTop: '1.2rem' }}>
          {(scores || []).map((s) => <Ball key={s.id} n={s.score} />)}
          {Array.from({ length: Math.max(0, 5 - (scores?.length || 0)) }).map((_, i) => (
            <span key={`e${i}`} className="ball dim" style={{ borderStyle: 'dashed' }}>–</span>
          ))}
        </div>
      </div>

      <form className="card card-lg" onSubmit={add}>
        <h3>Add a round</h3>
        <div className="field-row">
          <div>
            <label htmlFor="score">Stableford points (1–45)</label>
            <input
              id="score" type="number" min="1" max="45" required value={form.score}
              onChange={(e) => setForm({ ...form, score: e.target.value })}
              disabled={!subscription}
            />
          </div>
          <div>
            <label htmlFor="date">Date played</label>
            <input
              id="date" type="date" required max={today()} value={form.played_on}
              onChange={(e) => setForm({ ...form, played_on: e.target.value })}
              disabled={!subscription}
            />
          </div>
        </div>
        <button className="btn" style={{ marginTop: '1rem' }} disabled={busy || !subscription}>
          {busy ? 'Saving…' : 'Save score'}
        </button>
      </form>

      <div>
        <h3>Card history</h3>
        {!scores && <Loading rows={2} />}
        {scores?.length === 0 && (
          <Empty title="Nothing posted yet">
            Your first score starts the card. Five of them and you're in the next draw.
          </Empty>
        )}
        <div className="stack">
          {scores?.map((s) => (
            <div key={s.id} className="card">
              {editing?.id === s.id ? (
                <form onSubmit={saveEdit}>
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
                  </div>
                  <div className="row" style={{ marginTop: '1rem' }}>
                    <button className="btn btn-sm" disabled={busy}>Save changes</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="row-between">
                  <div className="row">
                    <Ball n={s.score} small />
                    <div>
                      <strong>{s.score} points</strong>
                      <div className="dim" style={{ fontSize: '.88rem' }}>{shortDate(s.played_on)}</div>
                    </div>
                  </div>
                  <div className="row">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditing({ id: s.id, score: s.score, played_on: s.played_on.slice(0, 10) })}
                      disabled={!subscription}
                    >
                      Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(s.id)} disabled={!subscription}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
