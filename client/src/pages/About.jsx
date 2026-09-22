import { Link } from 'react-router-dom';
import { photo } from '../lib/images';
import { Photo } from '../components/ui';

const FAQS = [
  ['Can I change my charity?', 'Any time, from your account. Past contributions stay with the charity that received them.'],
  ['What if I stop subscribing?', 'Your card and history stay. You simply stop entering draws once the paid period ends.'],
  ['Why do I have to upload proof to get paid?', 'Scores are self-reported. A screenshot from your golf platform is how a win gets verified before money moves.'],
  ['Is this gambling?', 'The draw is a member benefit funded by subscriptions, not a stake you place. You pay for membership; the draw comes with it.'],
];

export default function About() {
  const lead = photo('charityCommunity', 1800);
  const aside = photo('golfWalking', 900);

  return (
    <>
      <section className="section-tight" style={{ paddingTop: 'clamp(2rem, 5vw, 4rem)' }}>
        <div className="shell-wide">
          <span className="meta">About</span>
          <h1 style={{ marginTop: '1.25rem', maxWidth: '16ch' }}>
            Giving, with a round of <span className="serif-italic">golf</span> attached.
          </h1>
        </div>
      </section>

      <section className="bleed">
        <Photo src={lead.src} alt={lead.alt} fallback="Community" ratio="cinema" priority />
      </section>

      <section className="section">
        <div className="shell-wide split split-5-7">
          <span className="meta">The premise</span>
          <div>
            <p className="serif" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.4rem)', lineHeight: 1.25, letterSpacing: '-0.02em' }}>
              Golfers already record their scores every week. Most of them already give to something.
              Putting the two together turns a habit into a monthly contribution.
            </p>
            <p className="lede" style={{ marginTop: '2rem' }}>
              And it gives the contributor a reason to keep showing up — which, for a charity, is worth
              more than a one-off gift.
            </p>
          </div>
        </div>
      </section>

      <section className="section band-forest">
        <div className="shell-wide split split-6-4">
          <div>
            <div className="opener">
              <span className="meta">What we are not</span>
            </div>
            <p className="lede" style={{ maxWidth: '40ch' }}>
              Not a club. Not a handicap service. Not a betting platform. The draw exists to make
              giving feel alive; the charity is the point and the golf is the way in.
            </p>
          </div>
          <div>
            <div className="opener">
              <span className="meta">How charities are listed</span>
            </div>
            <p className="lede" style={{ maxWidth: '40ch' }}>
              Every organisation is reviewed before it goes live, publishes the work it does with the
              money, and hosts events members can attend — golf days included.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell-wide split split-4-6">
          <Photo src={aside.src} alt={aside.alt} fallback="A player walking" ratio="portrait" />

          <div>
            <div className="opener">
              <span className="meta">Questions we get asked</span>
            </div>

            {FAQS.map(([q, a]) => (
              <div key={q} style={{ borderBottom: '1px solid var(--line-soft)', padding: '1.5rem 0' }}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>{q}</h3>
                <p className="dim" style={{ margin: 0, fontSize: 'var(--t-small)' }}>{a}</p>
              </div>
            ))}

            <div className="row" style={{ marginTop: '2.5rem' }}>
              <Link className="btn" to="/charities">Browse the charities</Link>
              <Link className="btn btn-ghost" to="/register">Join</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
