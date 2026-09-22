import { useEffect, useState } from 'react';
import { api, money, monthLabel, shortDate } from '../../lib/api';
import { Ball, Empty, Loading, Modal, Pill, useFeedback } from '../../components/ui';

const FILTERS = [
  ['', 'All'],
  ['submitted', 'Awaiting review'],
  ['pending', 'No proof yet'],
  ['approved', 'Verified'],
  ['rejected', 'Rejected'],
];

export default function AdminWinners() {
  const [winners, setWinners] = useState(null);
  const [filter, setFilter] = useState('submitted');
  const [reviewing, setReviewing] = useState(null);
  const feedback = useFeedback();

  const load = (f = filter) =>
    api.get(`/admin/winners?status=${f}`).then((d) => setWinners(d.winners)).catch((e) => feedback.error(e.message));

  useEffect(() => { load(filter); /* eslint-disable-next-line */ }, [filter]);

  const pay = async (w) => {
    try {
      await api.post(`/admin/winners/${w.id}/pay`, {});
      feedback.ok(`${w.name}'s ${money(w.amount)} payout marked paid.`);
      load();
    } catch (e) { feedback.error(e.message); }
  };

  const totals = (winners || []).reduce((acc, w) => {
    acc.total += Number(w.amount);
    if (w.payment_status === 'paid') acc.paid += Number(w.amount);
    if (w.verification_status === 'approved' && w.payment_status !== 'paid') acc.due += Number(w.amount);
    return acc;
  }, { total: 0, paid: 0, due: 0 });

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <div>
        <h1 style={{ marginBottom: '.2rem' }}>Winners & payouts</h1>
        <p className="dim">Check the uploaded scorecard against the drawn numbers, then release payment.</p>
      </div>

      {feedback.node}

      <div className="grid grid-3">
        <div className="card">
          <div className="stat-value">{money(totals.total)}</div>
          <div className="stat-label">In this view</div>
        </div>
        <div className="card">
          <div className="stat-value clay">{money(totals.due)}</div>
          <div className="stat-label">Verified, awaiting payment</div>
        </div>
        <div className="card">
          <div className="stat-value mint">{money(totals.paid)}</div>
          <div className="stat-label">Already paid</div>
        </div>
      </div>

      <div className="row">
        {FILTERS.map(([value, label]) => (
          <button
            key={value} className={`btn btn-sm ${filter === value ? '' : 'btn-ghost'}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {!winners && <Loading rows={3} />}
      {winners?.length === 0 && (
        <Empty title="Queue is clear">Nothing is waiting in this state right now.</Empty>
      )}

      <div className="stack">
        {winners?.map((w) => (
          <div key={w.id} className="card">
            <div className="row-between">
              <div>
                <strong>{w.name}</strong>
                <div className="dim" style={{ fontSize: '.84rem' }}>{w.email}</div>
                <div className="dim" style={{ fontSize: '.84rem' }}>
                  {monthLabel(w.period)} · {w.tier}-number match
                </div>
              </div>

              <div className="row" style={{ gap: '.35rem' }}>
                {(w.player_numbers || []).map((n, i) => (
                  <Ball key={i} n={n} small variant={w.winning_numbers.includes(n) ? 'hit' : undefined} />
                ))}
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="mono-num" style={{ fontWeight: 700 }}>{money(w.amount)}</div>
                <div className="row" style={{ justifyContent: 'flex-end', marginTop: '.3rem' }}>
                  <Pill tone={
                    w.verification_status === 'approved' ? 'mint'
                      : w.verification_status === 'rejected' ? 'rose' : 'clay'
                  }>
                    {w.verification_status}
                  </Pill>
                  <Pill tone={w.payment_status === 'paid' ? 'mint' : undefined}>{w.payment_status}</Pill>
                </div>
              </div>

              <div className="row">
                <button
                  className="btn btn-ghost btn-sm" onClick={() => setReviewing(w)}
                  disabled={!w.proof_url}
                >
                  {w.proof_url ? 'Review proof' : 'No proof yet'}
                </button>
                <button
                  className="btn btn-sm" onClick={() => pay(w)}
                  disabled={w.verification_status !== 'approved' || w.payment_status === 'paid'}
                >
                  Mark paid
                </button>
              </div>
            </div>
            {w.paid_at && (
              <div className="dim" style={{ fontSize: '.82rem', marginTop: '.8rem' }}>
                Paid {shortDate(w.paid_at)} · reference {w.payout_ref}
              </div>
            )}
          </div>
        ))}
      </div>

      {reviewing && (
        <ReviewModal
          winning={reviewing}
          onClose={() => setReviewing(null)}
          onDone={(msg) => { setReviewing(null); feedback.ok(msg); load(); }}
          onError={feedback.error}
        />
      )}
    </div>
  );
}

function ReviewModal({ winning, onClose, onDone, onError }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async (decision) => {
    setBusy(true);
    try {
      await api.post(`/admin/winners/${winning.id}/review`, { decision, note });
      onDone(decision === 'approved'
        ? `Verified. ${winning.name}'s payout is ready to release.`
        : `Rejected. ${winning.name} can upload fresh proof.`);
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal title={`Proof from ${winning.name}`} onClose={onClose} wide>
      <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
        <div>
          <div className="dim" style={{ fontSize: '.82rem', marginBottom: '.4rem' }}>Their card</div>
          <div className="row" style={{ gap: '.35rem' }}>
            {(winning.player_numbers || []).map((n, i) => (
              <Ball key={i} n={n} small variant={winning.winning_numbers.includes(n) ? 'hit' : undefined} />
            ))}
          </div>
        </div>
        <div>
          <div className="dim" style={{ fontSize: '.82rem', marginBottom: '.4rem' }}>Drawn</div>
          <div className="row" style={{ gap: '.35rem' }}>
            {winning.winning_numbers.map((n, i) => <Ball key={i} n={n} small variant="draw" />)}
          </div>
        </div>
      </div>

      {winning.proof_note && <p className="dim">Player's note: {winning.proof_note}</p>}

      <img
        src={winning.proof_url} alt="Submitted proof"
        style={{ borderRadius: 'var(--radius-s)', width: '100%', maxHeight: 420, objectFit: 'contain', background: '#0E1220' }}
      />

      <div className="field" style={{ marginTop: '1rem' }}>
        <label>Note for the player (optional)</label>
        <textarea rows="3" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="row" style={{ marginTop: '1rem' }}>
        <button className="btn" onClick={() => decide('approved')} disabled={busy}>Approve</button>
        <button className="btn btn-danger" onClick={() => decide('rejected')} disabled={busy}>Reject</button>
      </div>
    </Modal>
  );
}
