import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { photo } from '../lib/images';
import { useFeedback } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const feedback = useFeedback();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const side = photo('authSide', 1200);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    feedback.clear();
    try {
      const user = await login(form.email, form.password);
      navigate(location.state?.from || (user.role === 'admin' ? '/admin' : '/dashboard'), { replace: true });
    } catch (err) {
      feedback.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fill = (email, password) => setForm({ email, password });

  return (
    <div className="auth">
      <div className="auth-media scrim">
        <img src={side.src} alt={side.alt} />
        <div className="auth-quote">
          <p className="serif" style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.25rem)', lineHeight: 1.2, maxWidth: '16ch', margin: 0 }}>
            Your next round could change more than your score.
          </p>
        </div>
      </div>

      <div className="auth-form">
        <div>
          <span className="meta">Members</span>
          <h1 style={{ marginTop: '1rem', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>Welcome back.</h1>
          <p className="dim" style={{ marginBottom: '2.5rem' }}>
            Sign in to post scores and check the draw.
          </p>

          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email" type="email" autoComplete="email" required
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password" type="password" autoComplete="current-password" required
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {feedback.node && <div style={{ marginTop: '1.75rem' }}>{feedback.node}</div>}

            <button className="btn btn-block" style={{ marginTop: '2rem' }} disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="dim" style={{ marginTop: '1.5rem', fontSize: 'var(--t-small)' }}>
            New here? <Link to="/register" className="link-action">Create an account</Link>
          </p>

          <div style={{ marginTop: '3rem', borderTop: '1px solid var(--line)', paddingTop: '1.25rem' }}>
            <span className="meta">Test credentials</span>
            <div className="row" style={{ marginTop: '1rem', gap: '0.5rem' }}>
              <button
                type="button" className="btn btn-ghost btn-sm"
                onClick={() => fill('player@digitalheroes.test', 'Player@12345')}
              >
                Subscriber
              </button>
              <button
                type="button" className="btn btn-ghost btn-sm"
                onClick={() => fill('admin@digitalheroes.test', 'Admin@12345')}
              >
                Administrator
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
