import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, monthLabel, shortDate } from '../lib/api';
import { charityPhoto, photo } from '../lib/images';
import { Ball, CountUp, Figure, Loading, Photo, Reveal } from '../components/ui';

export default function Home() {
  const [next, setNext] = useState(null);
  const [featured, setFeatured] = useState(null);
  const [latest, setLatest] = useState(null);
  const [plans, setPlans] = useState([]);
  const [charities, setCharities] = useState([]);

  useEffect(() => {
    api.get('/draws/next').then(setNext).catch(() => {});
    api.get('/charities/featured').then((d) => setFeatured(d.charity)).catch(() => {});
    api.get('/draws').then((d) => setLatest(d.draws[0] || null)).catch(() => {});
    api.get('/subscriptions/plans').then((d) => setPlans(d.plans)).catch(() => {});
    api.get('/charities').then((d) => setCharities(d.charities.slice(0, 3))).catch(() => {});
  }, []);

  const totalRaised = charities.reduce((sum, c) => sum + Number(c.raised || 0), 0);

  return (
    <>
      <Hero next={next} />
      <Proposition next={next} />
      <CharityBand featured={featured} totalRaised={totalRaised} next={next} />
      <HowItWorks />
      <DrawSection next={next} latest={latest} />
      <CharityPreview charities={charities} />
      <Plans plans={plans} />
    </>
  );
}

/* ------------------------------------------------------------------ hero */

function Hero({ next }) {
  const mediaRef = useRef(null);
  const hero = photo('heroGolden', 2000);

  // Slow parallax drift on the hero photograph. Disabled for reduced motion.
  useEffect(() => {
    const el = mediaRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const offset = Math.min(window.scrollY, 900) * 0.22;
        el.style.transform = `translate3d(0, ${offset}px, 0)`;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const jackpot = next ? next.prizePool + next.rolloverIn : null;

  return (
    <section className="hero scrim-left scrim">
      <div className="hero-media" ref={mediaRef}>
        <img src={hero.src} alt={hero.alt} fetchpriority="high" />
      </div>

      <div className="hero-body on-photo">
        <div className="shell-wide">
          <Reveal>
            <span className="meta">Play · Give · Win</span>
            <h1 className="hero-title" style={{ marginTop: '1.5rem' }}>
              Your game can <span className="serif-italic">do more.</span>
            </h1>
          </Reveal>

          <div className="hero-foot">
            <Reveal delay="1">
              <p className="lede measure" style={{ margin: 0 }}>
                Post your Stableford scores. Those five numbers enter you into the monthly draw —
                and part of everything you pay goes to a cause you choose.
              </p>
              <div className="row" style={{ marginTop: '2rem' }}>
                <Link className="btn" to="/register">Join Digital Heroes</Link>
                <Link className="btn btn-ghost" to="/how-it-works">See how it works</Link>
              </div>
            </Reveal>

            <Reveal delay="2">
              <div className="hero-figures">
                <Figure
                  value={jackpot !== null ? <CountUp to={Math.round(jackpot)} format={money} /> : '—'}
                  label={next ? `${monthLabel(next.period)} pool` : 'This month'}
                />
                <Figure
                  value={next ? <CountUp to={next.subscribers} /> : '—'}
                  label="Playing this month"
                />
                <Figure value="10%" label="Minimum to charity" />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- proposition */

function Proposition({ next }) {
  return (
    <section className="section">
      <div className="shell-wide">
        <div className="split split-5-7">
          <Reveal>
            <span className="meta">The idea</span>
          </Reveal>
          <Reveal delay="1">
            <p className="serif" style={{ fontSize: 'clamp(1.75rem, 3.6vw, 3rem)', lineHeight: 1.2, letterSpacing: '-0.025em', maxWidth: '20ch' }}>
              Most golfers already keep a card. Most golfers already give to something.
              This puts the two in the same place.
            </p>
            <p className="lede" style={{ marginTop: '2rem', maxWidth: '48ch' }}>
              A subscription buys you into a monthly draw and funds a charity at the same time.
              The scores you were recording anyway become the numbers you play.
              {next ? ` Right now ${next.subscribers} people are holding a card.` : ''}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- charity band */

function CharityBand({ featured, totalRaised, next }) {
  const image = featured ? charityPhoto(featured, 1800) : photo('charityHands', 1800);

  return (
    <section className="band-photo scrim">
      <div className="band-photo-inner">
        <BandImage src={image.src} alt={image.alt} fallback={image.fallback} />

        <div className="on-photo band-photo-body">
          <div className="shell-wide">
            <Reveal>
              <span className="meta">Why it exists</span>
              <h2 className="serif" style={{ fontSize: 'clamp(2.25rem, 6vw, 4.5rem)', maxWidth: '15ch', marginTop: '1.5rem', color: 'var(--paper)' }}>
                Every round can create impact.
              </h2>
            </Reveal>

            <Reveal delay="1">
              <div className="figures" style={{ marginTop: 'clamp(2.5rem, 5vw, 4rem)', maxWidth: 820 }}>
                <div>
                  <div className="stat-value">10%</div>
                  <div className="stat-label">Minimum of every fee</div>
                </div>
                <div>
                  <div className="stat-value">
                    <CountUp to={Math.round(totalRaised)} format={money} />
                  </div>
                  <div className="stat-label">Directed to causes</div>
                </div>
                <div>
                  <div className="stat-value">{next ? next.subscribers : '—'}</div>
                  <div className="stat-label">Active supporters</div>
                </div>
              </div>

              <div style={{ marginTop: '2.5rem' }}>
                <Link className="btn" to="/charities">Explore charities</Link>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}


/** Full-bleed background photograph with a quiet fallback. */
function BandImage({ src, alt, fallback }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return <div className="band-photo-media band-photo-fallback">{fallback}</div>;
  }
  return (
    <div className="band-photo-media">
      <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}

/* ------------------------------------------------------------ how it works */

const STEPS = [
  {
    title: 'Subscribe',
    body: 'Monthly or yearly. The yearly plan costs less and enters every draw in between.',
    photo: 'golfWalking',
  },
  {
    title: 'Play',
    body: 'Post your latest Stableford scores. Five are kept; a sixth pushes the oldest off your card.',
    photo: 'golfCard',
  },
  {
    title: 'Give',
    body: 'Choose a cause and how much of your fee it takes. Ten percent is the floor, not the ceiling.',
    photo: 'charityVolunteers',
  },
  {
    title: 'Win',
    body: 'Match three, four or five of your numbers and take an equal share of that tier.',
    photo: 'impactCelebrate',
  },
];

function HowItWorks() {
  const [active, setActive] = useState(0);
  const current = photo(STEPS[active].photo, 1000);

  return (
    <section className="section">
      <div className="shell-wide">
        <div className="opener">
          <span className="meta">How it works</span>
          <h2 style={{ maxWidth: '14ch' }}>Four steps, once a month.</h2>
        </div>

        <div className="split split-6-4">
          <div className="steps">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="step"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                tabIndex={0}
                style={{ cursor: 'default', opacity: active === i ? 1 : 0.55, transition: 'opacity .4s var(--ease)' }}
              >
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ position: 'sticky', top: '120px' }} className="hide-mobile-photo">
            <Photo
              src={current.src}
              alt={current.alt}
              fallback={STEPS[active].title}
              ratio="portrait"
            />
            <p className="dim" style={{ fontSize: 'var(--t-micro)', marginTop: '0.75rem' }}>
              {STEPS[active].title} — step 0{active + 1}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ draw band */

function DrawSection({ next, latest }) {
  return (
    <section className="section band-forest">
      <div className="shell-wide">
        <div className="opener">
          <span className="meta">The draw</span>
        </div>

        <div className="split split-6-4" style={{ alignItems: 'end' }}>
          <Reveal>
            <p className="meta" style={{ marginBottom: '1rem' }}>
              {next ? `${monthLabel(next.period)} · five-number jackpot` : 'This month'}
            </p>
            <div className="jackpot">
              {next ? <CountUp to={Math.round(next.tiers[5])} format={money} /> : '—'}
            </div>
            <p className="dim" style={{ marginTop: '1.5rem', maxWidth: '40ch' }}>
              {next && next.rolloverIn > 0
                ? `Carrying ${money(next.rolloverIn)} forward from an unclaimed jackpot.`
                : 'Built from a fixed share of every active subscription.'}
            </p>
          </Reveal>

          <Reveal delay="1">
            <div className="figures">
              {[5, 4, 3].map((tier) => (
                <div key={tier}>
                  <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                    {next ? money(next.tiers[tier]) : '—'}
                  </div>
                  <div className="stat-label">{tier} match · {tier === 5 ? 40 : tier === 4 ? 35 : 25}%</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {latest && (
          <Reveal delay="2">
            <div style={{ marginTop: 'clamp(3rem, 6vw, 5rem)', borderTop: '1px solid var(--line-dark)', paddingTop: '2.5rem' }}>
              <div className="row-between">
                <div>
                  <span className="meta">Last drawn · {monthLabel(latest.period)}</span>
                  <div className="row" style={{ gap: '0.6rem', marginTop: '1.25rem' }}>
                    {latest.winning_numbers.map((n, i) => <Ball key={n} n={n} variant="draw" index={i} />)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="dim" style={{ margin: 0, fontSize: 'var(--t-small)' }}>
                    {latest.winner_count} winner{latest.winner_count === 1 ? '' : 's'} shared {money(latest.prize_pool)}
                  </p>
                  {next && (
                    <p className="dim" style={{ margin: '0.25rem 0 1rem', fontSize: 'var(--t-small)' }}>
                      Next draw {shortDate(next.drawDate)}
                    </p>
                  )}
                  <Link className="link-action" to="/draw">View the draw</Link>
                </div>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------- charity preview */

function CharityPreview({ charities }) {
  return (
    <section className="section">
      <div className="shell-wide">
        <div className="opener row-between" style={{ alignItems: 'flex-end' }}>
          <div>
            <span className="meta">Where the money goes</span>
            <h2 style={{ maxWidth: '16ch', marginBottom: 0 }}>Causes our members back.</h2>
          </div>
          <Link className="link-action" to="/charities">All charities</Link>
        </div>

        {charities.length === 0 ? (
          <Loading rows={1} height={320} />
        ) : (
          <div className="charity-grid">
            {charities.map((c, i) => {
              const image = charityPhoto(c, 900);
              return (
                <Reveal key={c.id} delay={i === 0 ? undefined : String(i)}>
                  <Link to={`/charities/${c.slug}`} className="charity-card">
                    <Photo src={image.src} alt={image.alt} fallback={c.name} zoom ratio="portrait" />
                    <span className="meta">{c.category}</span>
                    <h3>{c.name}</h3>
                    <p>{c.tagline}</p>
                    <p className="num" style={{ marginTop: '0.75rem', color: 'var(--gold)' }}>
                      {money(c.raised)} directed
                    </p>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- plans */

function Plans({ plans }) {
  return (
    <section className="section band-paper-2">
      <div className="shell-wide">
        <div className="opener">
          <span className="meta">Membership</span>
          <h2 style={{ maxWidth: '12ch' }}>Two ways in.</h2>
        </div>

        <div>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="row-between"
              style={{ borderTop: '1px solid var(--line)', padding: 'clamp(1.75rem, 4vw, 2.75rem) 0', gap: '2rem' }}
            >
              <div style={{ flex: '1 1 220px' }}>
                <h3 style={{ marginBottom: '0.35rem' }}>{plan.label}</h3>
                <p className="dim" style={{ margin: 0, fontSize: 'var(--t-small)' }}>
                  Billed {plan.billed}
                  {plan.savings > 0 ? ` · saves ${money(plan.savings)} a year` : ''}
                </p>
              </div>

              <div style={{ flex: '1 1 200px' }}>
                <p className="dim" style={{ margin: 0, fontSize: 'var(--t-small)', maxWidth: '30ch' }}>
                  Every monthly draw, a rolling five-score card, and at least a tenth to your cause.
                </p>
              </div>

              <div className="row" style={{ gap: '2rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div className="stat-value">{money(plan.price)}</div>
                  <div className="stat-label">{money(plan.perMonth)} a month</div>
                </div>
                <Link className="btn" to="/register">Choose {plan.label.toLowerCase()}</Link>
              </div>
            </div>
          ))}
          {plans.length === 0 && <Loading rows={2} height={110} />}
        </div>
      </div>
    </section>
  );
}
