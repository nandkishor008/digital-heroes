import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, money, shortDate } from '../lib/api';
import { charityPhoto, photo } from '../lib/images';
import { useAuth } from '../lib/auth';
import { Empty, Loading, Modal, Photo, Reveal, useFeedback } from '../components/ui';

export default function CharityDetail() {
  const { slug } = useParams();
  const { user, refresh } = useAuth();
  const [charity, setCharity] = useState(null);
  const [error, setError] = useState(null);
  const [donating, setDonating] = useState(false);
  const feedback = useFeedback();

  useEffect(() => {
    setCharity(null);
    setError(null);
    api.get(`/charities/${slug}`).then((d) => setCharity(d.charity)).catch((e) => setError(e.message));
  }, [slug]);

  const choose = async () => {
    try {
      await api.put('/charities/selection', {
        charity_id: charity.id,
        charity_percent: user.charity_percent || 10,
      });
      await refresh();
      feedback.ok(`Your contribution now goes to ${charity.name}.`);
    } catch (e) {
      feedback.error(e.message);
    }
  };

  if (error) {
    return (
      <div className="shell section">
        <Empty
          title="That charity isn't listed"
          action={<Link className="btn" to="/charities">Back to the directory</Link>}
        >
          {error}
        </Empty>
      </div>
    );
  }

  if (!charity) {
    return <div className="shell section"><Loading rows={3} height={140} /></div>;
  }

  const events = Array.isArray(charity.events) ? charity.events : [];
  const hero = charityPhoto(charity, 1800);
  const secondary = photo('impactHelping', 900);

  return (
    <>
      {/* title over the photograph, the way a feature opens */}
      <section className="band-photo scrim">
        <div className="band-photo-inner" style={{ minHeight: 'min(72svh, 620px)' }}>
          <BandImage src={hero.src} alt={hero.alt} fallback={charity.name} />
          <div className="on-photo band-photo-body">
            <div className="shell-wide">
              <Link to="/charities" className="meta" style={{ display: 'inline-block', marginBottom: '1.5rem' }}>
                ← Charity directory
              </Link>
              <span className="meta" style={{ display: 'block' }}>{charity.category}</span>
              <h1 style={{ marginTop: '1rem', maxWidth: '16ch', color: 'var(--paper)' }}>{charity.name}</h1>
              <p className="lede measure-wide" style={{ marginBottom: 0 }}>{charity.tagline}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell-wide">
          <div className="split split-6-4">
            <div>
              <p className="serif" style={{ fontSize: 'clamp(1.35rem, 2.4vw, 1.9rem)', lineHeight: 1.35, marginBottom: '2rem' }}>
                {charity.description}
              </p>

              <Photo src={secondary.src} alt={secondary.alt} fallback={charity.name} ratio="landscape" />

              {events.length > 0 && (
                <Reveal>
                  <div className="opener" style={{ marginTop: 'clamp(3rem, 6vw, 5rem)' }}>
                    <span className="meta">Coming up</span>
                  </div>
                  {events.map((ev, i) => (
                    <div
                      key={i}
                      className="row-between"
                      style={{ borderBottom: '1px solid var(--line-soft)', padding: '1.25rem 0', gap: '1.5rem' }}
                    >
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{ev.title}</h3>
                        <p className="dim" style={{ margin: '0.2rem 0 0', fontSize: 'var(--t-small)' }}>{ev.venue}</p>
                      </div>
                      <span className="num">{shortDate(ev.date)}</span>
                    </div>
                  ))}
                </Reveal>
              )}
            </div>

            {/* sticky action rail */}
            <aside style={{ position: 'sticky', top: 'calc(76px + 2rem)' }}>
              <div className="figures" style={{ gridTemplateColumns: '1fr' }}>
                <div style={{ borderRight: 0 }}>
                  <div className="stat-value gold">{money(charity.raised)}</div>
                  <div className="stat-label">Directed by members</div>
                </div>
                <div style={{ borderRight: 0, borderTop: '1px solid var(--line)' }}>
                  <div className="stat-value">{charity.supporters}</div>
                  <div className="stat-label">Currently giving here</div>
                </div>
              </div>

              <div className="stack" style={{ marginTop: '2rem' }}>
                {feedback.node}
                {user ? (
                  <>
                    <button className="btn btn-block" onClick={choose}>Send my contribution here</button>
                    <button className="btn btn-ghost btn-block" onClick={() => setDonating(true)}>
                      Make a one-off donation
                    </button>
                  </>
                ) : (
                  <>
                    <Link className="btn btn-block" to="/register">Join and support them</Link>
                    <p className="dim" style={{ fontSize: 'var(--t-small)', margin: 0 }}>
                      Members direct at least 10% of every payment to the cause they pick.
                    </p>
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {donating && (
        <DonateModal
          charity={charity}
          onClose={() => setDonating(false)}
          onDone={(amount) => {
            setDonating(false);
            setCharity((c) => ({ ...c, raised: Number(c.raised) + amount }));
            feedback.ok(`Thank you — ${money(amount)} sent to ${charity.name}.`);
          }}
        />
      )}
    </>
  );
}

function BandImage({ src, alt, fallback }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) return <div className="band-photo-media band-photo-fallback">{fallback}</div>;
  return (
    <div className="band-photo-media">
      <img src={src} alt={alt} onError={() => setFailed(true)} />
    </div>
  );
}

function DonateModal({ charity, onClose, onDone }) {
  const [amount, setAmount] = useState(500);
  const [busy, setBusy] = useState(false);
  const feedback = useFeedback();

  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/charities/donate', { charity_id: charity.id, amount: Number(amount) });
      onDone(Number(amount));
    } catch (e) {
      feedback.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Donate to ${charity.name}`} onClose={onClose}>
      <p className="dim">
        A one-off gift. It isn't tied to the draw and doesn't change your subscription split.
      </p>

      <div className="row" style={{ marginBottom: '1.75rem', gap: '0.5rem' }}>
        {[250, 500, 1000, 2500].map((v) => (
          <button
            key={v}
            className={`btn btn-sm ${Number(amount) === v ? '' : 'btn-ghost'}`}
            onClick={() => setAmount(v)}
          >
            {money(v)}
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="amt">Or another amount</label>
        <input id="amt" type="number" min="50" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>

      {feedback.node}

      <button className="btn btn-block" style={{ marginTop: '1.75rem' }} onClick={submit} disabled={busy}>
        {busy ? 'Sending…' : `Donate ${money(amount)}`}
      </button>
    </Modal>
  );
}
