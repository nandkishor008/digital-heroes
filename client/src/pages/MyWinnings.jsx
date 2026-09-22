import { useEffect, useState } from 'react';
import { api, fileToDataUrl, money, monthLabel, shortDate } from '../lib/api';
import { Ball, Empty, Loading, Modal, Pill, useFeedback } from '../components/ui';

const STATUS_COPY = {
  pending: ['clay', 'Proof needed'],
  submitted: ['clay', 'With the reviewer'],
  approved: ['mint', 'Verified'],
  rejected: ['rose', 'Rejected — resubmit'],
};

export default function MyWinnings() {
  const [data, setData] = useState(null);
  const [uploading, setUploading] = useState(null);
  const feedback = useFeedback();

  const load = () => api.get('/winnings/me').then(setData).catch(() => setData(null));
  useEffect(() => { load(); }, []);

  if (!data) return <Loading rows={3} />;

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <div>
        <h1 style={{ marginBottom: '.2rem' }}>Winnings</h1>
        <p className="dim">
          A win is paid once an administrator has checked a screenshot of your scores from the golf platform.
        </p>
      </div>

      {feedback.node}

      <div className="grid grid-4">
        <div className="card">
          <div className="stat-value clay">{money(data.totals.total)}</div>
          <div className="stat-label">Total won</div>
        </div>
        <div className="card">
          <div className="stat-value mint">{money(data.totals.paid)}</div>
          <div className="stat-label">Paid</div>
        </div>
        <div className="card">
          <div className="stat-value">{money(data.totals.awaitingPayment)}</div>
          <div className="stat-label">Verified, payment pending</div>
        </div>
        <div className="card">
          <div className="stat-value">{money(data.totals.awaitingVerification)}</div>
          <div className="stat-label">Awaiting verification</div>
        </div>
      </div>

      {data.winnings.length === 0 && (
        <Empty title="No wins yet">
          Keep your card current — three matching numbers is enough to take a share of the pool.
        </Empty>
      )}

      <div className="stack">
        {data.winnings.map((w) => {
          const [tone, label] = STATUS_COPY[w.verification_status] || ['clay', w.verification_status];
          return (
            <div key={w.id} className="card card-lg">
              <div className="row-between">
                <div>
                  <h3 style={{ margin: 0 }}>{w.tier}-number match</h3>
                  <div className="dim" style={{ fontSize: '.9rem' }}>
                    {monthLabel(w.period)} · drawn {shortDate(w.draw_date)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="stat-value clay" style={{ fontSize: '1.9rem' }}>{money(w.amount)}</div>
                  <div className="row" style={{ justifyContent: 'flex-end', marginTop: '.4rem' }}>
                    <Pill tone={tone}>{label}</Pill>
                    <Pill tone={w.payment_status === 'paid' ? 'mint' : undefined}>
                      {w.payment_status === 'paid' ? `Paid ${shortDate(w.paid_at)}` : 'Payment pending'}
                    </Pill>
                  </div>
                </div>
              </div>

              <div className="row" style={{ gap: '.4rem', marginTop: '1.2rem' }}>
                {w.winning_numbers.map((n, i) => <Ball key={i} n={n} small variant="draw" />)}
              </div>

              {w.review_note && (
                <p className="dim" style={{ marginTop: '1rem', fontSize: '.9rem' }}>
                  Reviewer note: {w.review_note}
                </p>
              )}

              {w.verification_status !== 'approved' && (
                <button className="btn" style={{ marginTop: '1.2rem' }} onClick={() => setUploading(w)}>
                  {w.proof_url ? 'Replace proof' : 'Upload proof'}
                </button>
              )}
              {w.payout_ref && (
                <p className="dim" style={{ marginTop: '1rem', marginBottom: 0, fontSize: '.85rem' }}>
                  Payout reference {w.payout_ref}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {uploading && (
        <ProofModal
          winning={uploading}
          onClose={() => setUploading(null)}
          onDone={() => { setUploading(null); load(); feedback.ok('Proof submitted. An administrator will review it.'); }}
          onError={feedback.error}
        />
      )}
    </div>
  );
}

function ProofModal({ winning, onClose, onDone, onError }) {
  const [preview, setPreview] = useState(winning.proof_url || null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState(null);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setLocalError('Choose a PNG or JPG image.');
    if (file.size > 4 * 1024 * 1024) return setLocalError('That image is over 4 MB. Pick a smaller one.');
    setLocalError(null);
    setPreview(await fileToDataUrl(file));
  };

  const submit = async () => {
    if (!preview) return setLocalError('Attach a screenshot first.');
    setBusy(true);
    try {
      await api.post(`/winnings/${winning.id}/proof`, { proof_url: preview, note });
      onDone();
    } catch (err) {
      onError(err.message);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Verify your win" onClose={onClose}>
      <p className="dim">
        Upload a screenshot from your golf platform showing the five scores on your card. PNG or JPG, up to 4 MB.
      </p>
      <div className="field">
        <label htmlFor="proof">Screenshot</label>
        <input id="proof" type="file" accept="image/png,image/jpeg" onChange={pick} />
      </div>
      {preview && (
        <img
          src={preview} alt="Proof preview"
          style={{ marginTop: '1rem', borderRadius: 'var(--radius-s)', maxHeight: 240, objectFit: 'contain', width: '100%' }}
        />
      )}
      <div className="field">
        <label htmlFor="note">Anything the reviewer should know (optional)</label>
        <textarea id="note" rows="3" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {localError && <div className="notice notice-error">{localError}</div>}
      <button className="btn btn-block" style={{ marginTop: '1rem' }} onClick={submit} disabled={busy}>
        {busy ? 'Submitting…' : 'Submit for review'}
      </button>
    </Modal>
  );
}
