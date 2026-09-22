import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, money } from '../lib/api';
import { useAuth } from '../lib/auth';
import { charityPhoto, photo } from '../lib/images';
import { Loading, Photo, useFeedback } from '../components/ui';

/**
 * Step one is the account and runs against a photograph.
 * Step two is the charity choice and takes the full width, because that is the
 * decision the product actually cares about.
 */
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const feedback = useFeedback();

  const [step, setStep] = useState(1);
  const [charities, setCharities] = useState(null);
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', charity_id: '', charity_percent: 10 });

  useEffect(() => {
    api.get('/charities').then((d) => setCharities(d.charities)).catch(() => setCharities([]));
    api.get('/subscriptions/plans').then((d) => setPlans(d.plans)).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const next = (e) => {
    e.preventDefault();
    feedback.clear();
    if (form.name.trim().length < 2) return feedback.error('Enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return feedback.error('Enter a valid email address.');
    if (form.password.length < 8) return feedback.error('Use a password of at least 8 characters.');
    return setStep(2);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.charity_id) return feedback.error('Choose the charity your contribution supports.');
    setBusy(true);
    try {
      await register({ ...form, charity_percent: Number(form.charity_percent) });
      navigate('/subscription?new=1', { replace: true });
    } catch (err) {
      feedback.error(err.message);
      setStep(1);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const monthly = plans.find((p) => p.id === 'monthly')?.price || 499;
  const share = Math.round((monthly * Number(form.charity_percent)) / 100);
  const side = photo('golfGroup', 1200);

  /* ------------------------------------------------------------- step 1 */
  if (step === 1) {
    return (
      <div className="auth">
        <div className="auth-media scrim">
          <img src={side.src} alt={side.alt} />
          <div className="auth-quote">
            <p className="serif" style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.25rem)', lineHeight: 1.2, maxWidth: '16ch', margin: 0 }}>
              Play with purpose.
            </p>
          </div>
        </div>

        <div className="auth-form">
          <div>
            <span className="meta">Step one of two</span>
            <h1 style={{ marginTop: '1rem', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>Create your account.</h1>
            <p className="dim" style={{ marginBottom: '2.5rem' }}>Two minutes, then you pick your cause.</p>

            <form onSubmit={next}>
              <div className="field">
                <label htmlFor="name">Full name</label>
                <input id="name" value={form.name} onChange={set('name')} autoComplete="name" required />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password" type="password" value={form.password} onChange={set('password')}
                  autoComplete="new-password" required minLength={8}
                />
                <p className="field-hint">At least 8 characters.</p>
              </div>

              {feedback.node && <div style={{ marginTop: '1.75rem' }}>{feedback.node}</div>}

              <button className="btn btn-block" style={{ marginTop: '2rem' }}>Continue</button>
            </form>

            <p className="dim" style={{ marginTop: '1.5rem', fontSize: 'var(--t-small)' }}>
              Already a member? <Link to="/login" className="link-action">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- step 2 */
  return (
    <section className="section">
      <div className="shell-wide">
        <div className="opener">
          <span className="meta">Step two of two</span>
          <h1 style={{ maxWidth: '14ch' }}>Choose who you play for.</h1>
          <p className="lede measure-wide">
            At least a tenth of every payment goes to this cause. You can change both whenever you like.
          </p>
        </div>

        <form onSubmit={submit}>
          {!charities && <Loading rows={2} height={240} />}

          <div className="charity-grid">
            {charities?.map((c) => {
              const selected = form.charity_id === c.id;
              const image = charityPhoto(c, 700);
              return (
                <button
                  type="button"
                  key={c.id}
                  className="charity-card"
                  onClick={() => setForm({ ...form, charity_id: c.id })}
                  aria-pressed={selected}
                  style={{
                    textAlign: 'left',
                    background: 'none',
                    border: 0,
                    padding: 0,
                    cursor: 'pointer',
                    opacity: form.charity_id && !selected ? 0.5 : 1,
                    transition: 'opacity .35s var(--ease)',
                  }}
                >
                  <Photo src={image.src} alt={image.alt} fallback={c.name} zoom />
                  <div className="row-between" style={{ gap: '0.75rem' }}>
                    <span className="meta">{c.category}</span>
                    {selected && <span className="meta gold">Selected</span>}
                  </div>
                  <h3>{c.name}</h3>
                  <p>{c.tagline}</p>
                </button>
              );
            })}
          </div>

          {/* the contribution dial, given real weight */}
          <div
            className="split split-6-4"
            style={{ marginTop: 'clamp(3rem, 6vw, 5rem)', borderTop: '1px solid var(--line)', paddingTop: '2.5rem', alignItems: 'center' }}
          >
            <div>
              <label htmlFor="pct">Your contribution</label>
              <input
                id="pct" type="range" min="10" max="100" step="5"
                value={form.charity_percent} onChange={set('charity_percent')}
              />
              <p className="dim" style={{ fontSize: 'var(--t-small)', margin: 0 }}>
                Around {money(share)} of a {money(monthly)} monthly fee.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="stat-value gold">{form.charity_percent}%</div>
              <div className="stat-label">of every payment</div>
            </div>
          </div>

          {feedback.node && <div style={{ marginTop: '2rem' }}>{feedback.node}</div>}

          <div className="row" style={{ marginTop: '2.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
