import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, money, shortDate } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Loading, Notice, Pill, useFeedback } from '../components/ui';

export default function Subscription() {
  const { user, subscription, refresh } = useAuth();
  const [params, setParams] = useSearchParams();
  const [plans, setPlans] = useState(null);
  const [provider, setProvider] = useState('demo');
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(null);
  const feedback = useFeedback();

  useEffect(() => {
    api.get('/subscriptions/plans').then((d) => { setPlans(d.plans); setProvider(d.provider); }).catch(() => setPlans([]));
    api.get('/subscriptions/me').then((d) => setHistory(d.history)).catch(() => {});
  }, [subscription?.id]);

  // Returning from a Stripe Checkout session.
  useEffect(() => {
    const sessionId = params.get('session_id');
    if (!sessionId) return;
    api.post('/subscriptions/confirm', { session_id: sessionId })
      .then(async () => { await refresh(); feedback.ok('Payment received. Your plan is active.'); })
      .catch((err) => feedback.error(err.message))
      .finally(() => setParams({}, { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const subscribe = async (planId) => {
    setBusy(planId);
    feedback.clear();
    try {
      const res = await api.post('/subscriptions/checkout', {
        plan: planId,
        charity_id: user.charity_id,
        charity_percent: user.charity_percent,
      });
      if (res.checkoutUrl) { window.location.href = res.checkoutUrl; return; }
      await refresh();
      feedback.ok('You are subscribed. Post five scores and you are in the next draw.');
    } catch (err) {
      feedback.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    setBusy('cancel');
    try {
      await api.post('/subscriptions/cancel');
      await refresh();
      feedback.ok('Cancelled. You stay in the draw until the period ends.');
    } catch (err) { feedback.error(err.message); } finally { setBusy(null); }
  };

  const resume = async () => {
    setBusy('resume');
    try {
      await api.post('/subscriptions/resume');
      await refresh();
      feedback.ok('Renewal is back on.');
    } catch (err) { feedback.error(err.message); } finally { setBusy(null); }
  };

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <div>
        <h1 style={{ marginBottom: '.2rem' }}>Subscription</h1>
        <p className="dim">Your plan funds the prize pool and your chosen charity.</p>
      </div>

      {params.get('new') && !subscription && (
        <Notice kind="ok">Account created. Choose a plan to enter the next draw.</Notice>
      )}
      {params.get('cancelled') && <Notice kind="info">Checkout was cancelled. Nothing was charged.</Notice>}
      {feedback.node}

      {subscription ? (
        <div className="card card-lg">
          <div className="row-between">
            <div>
              <h3 style={{ margin: 0, textTransform: 'capitalize' }}>{subscription.plan} plan</h3>
              <div className="dim">
                {money(subscription.amount)} · started {shortDate(subscription.started_at)}
              </div>
            </div>
            <Pill tone={subscription.cancel_at_period_end ? 'clay' : 'mint'}>
              {subscription.cancel_at_period_end ? 'Ends at period close' : 'Active'}
            </Pill>
          </div>
          <div className="grid grid-3" style={{ marginTop: '1.5rem' }}>
            <div>
              <div className="dim" style={{ fontSize: '.82rem' }}>
                {subscription.cancel_at_period_end ? 'Access until' : 'Renews on'}
              </div>
              <strong>{shortDate(subscription.current_period_end)}</strong>
            </div>
            <div>
              <div className="dim" style={{ fontSize: '.82rem' }}>To your charity</div>
              <strong className="mint">
                {money((Number(subscription.amount) * Number(user.charity_percent)) / 100)}
              </strong>
            </div>
            <div>
              <div className="dim" style={{ fontSize: '.82rem' }}>Paid via</div>
              <strong style={{ textTransform: 'capitalize' }}>{subscription.provider}</strong>
            </div>
          </div>
          <div className="row" style={{ marginTop: '1.5rem' }}>
            {subscription.cancel_at_period_end ? (
              <button className="btn" onClick={resume} disabled={busy === 'resume'}>Resume renewal</button>
            ) : (
              <button className="btn btn-danger" onClick={cancel} disabled={busy === 'cancel'}>
                Cancel renewal
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {provider === 'demo' && (
            <Notice kind="info">
              This deployment runs a demo checkout: choosing a plan activates it immediately so the full
              flow can be tested. Add a Stripe secret key to switch to live payments.
            </Notice>
          )}
          {!plans && <Loading rows={2} />}
          <div className="grid grid-2">
            {plans?.map((plan) => (
              <div key={plan.id} className="card card-lg">
                <div className="row-between">
                  <h3 style={{ margin: 0 }}>{plan.label}</h3>
                  {plan.savings > 0 && <Pill tone="clay">Save {money(plan.savings)}</Pill>}
                </div>
                <div className="stat-value" style={{ marginTop: '1rem' }}>{money(plan.price)}</div>
                <div className="stat-label">{plan.billed} · {money(plan.perMonth)} a month</div>
                <ul className="dim" style={{ paddingLeft: '1.1rem', marginTop: '1.2rem', lineHeight: 1.9 }}>
                  <li>Entry to every monthly draw</li>
                  <li>{user.charity_percent}% to {' '}your chosen charity</li>
                  <li>Cancel any time, keep access to period end</li>
                </ul>
                <button
                  className="btn btn-block" style={{ marginTop: '1rem' }}
                  onClick={() => subscribe(plan.id)} disabled={busy === plan.id}
                >
                  {busy === plan.id ? 'Starting…' : `Subscribe ${plan.label.toLowerCase()}`}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {history.length > 0 && (
        <>
          <h3>Billing history</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Started</th><th>Plan</th><th>Status</th><th>Period end</th><th className="num">Amount</th></tr>
              </thead>
              <tbody>
                {history.map((s) => (
                  <tr key={s.id}>
                    <td>{shortDate(s.started_at)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.plan}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.status}</td>
                    <td>{shortDate(s.current_period_end)}</td>
                    <td className="num">{money(s.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
