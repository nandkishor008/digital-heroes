import { useState } from 'react';
import { api, shortDate } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useFeedback } from '../components/ui';

export default function Profile() {
  const { user, refresh, logout } = useAuth();
  const [details, setDetails] = useState({ name: user.name, phone: user.phone || '' });
  const [pw, setPw] = useState({ current_password: '', password: '' });
  const [busy, setBusy] = useState(null);
  const feedback = useFeedback();

  const saveDetails = async (e) => {
    e.preventDefault();
    setBusy('details');
    feedback.clear();
    try {
      await api.patch('/auth/me', details);
      await refresh();
      feedback.ok('Profile updated.');
    } catch (err) { feedback.error(err.message); } finally { setBusy(null); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setBusy('password');
    feedback.clear();
    try {
      await api.patch('/auth/me', pw);
      setPw({ current_password: '', password: '' });
      feedback.ok('Password changed.');
    } catch (err) { feedback.error(err.message); } finally { setBusy(null); }
  };

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <div>
        <h1 style={{ marginBottom: '.2rem' }}>Profile</h1>
        <p className="dim">Member since {shortDate(user.created_at)}.</p>
      </div>

      {feedback.node}

      <form className="card card-lg" onSubmit={saveDetails}>
        <h3>Your details</h3>
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone (optional)</label>
          <input id="phone" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" value={user.email} disabled />
          <div className="dim" style={{ fontSize: '.82rem', marginTop: '.35rem' }}>
            Contact support to change the email on your account.
          </div>
        </div>
        <button className="btn" style={{ marginTop: '1rem' }} disabled={busy === 'details'}>Save details</button>
      </form>

      <form className="card card-lg" onSubmit={savePassword}>
        <h3>Change password</h3>
        <div className="field">
          <label htmlFor="cur">Current password</label>
          <input
            id="cur" type="password" autoComplete="current-password" required
            value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="new">New password</label>
          <input
            id="new" type="password" autoComplete="new-password" required minLength={8}
            value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })}
          />
        </div>
        <button className="btn" style={{ marginTop: '1rem' }} disabled={busy === 'password'}>Change password</button>
      </form>

      <div className="card">
        <div className="row-between">
          <div>
            <strong>Sign out</strong>
            <div className="dim" style={{ fontSize: '.9rem' }}>Ends this session on this device.</div>
          </div>
          <button className="btn btn-ghost" onClick={logout}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
