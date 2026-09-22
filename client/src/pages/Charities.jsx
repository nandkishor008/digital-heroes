import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, shortDate } from '../lib/api';
import { charityPhoto, photo } from '../lib/images';
import { Empty, Loading, Photo, Reveal } from '../components/ui';

export default function Charities() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    const id = setTimeout(() => {
      const qs = new URLSearchParams({ search, category }).toString();
      api.get(`/charities?${qs}`).then(setData).catch((e) => setError(e.message));
    }, 220);
    return () => clearTimeout(id);
  }, [search, category]);

  const lead = photo('charityCommunity', 1800);
  const totalRaised = (data?.charities || []).reduce((s, c) => s + Number(c.raised), 0);

  return (
    <>
      {/* editorial opener, photograph doing the emotional work */}
      <section className="section-tight" style={{ paddingTop: 'clamp(2rem, 5vw, 4rem)' }}>
        <div className="shell-wide">
          <div className="split split-6-4" style={{ alignItems: 'end' }}>
            <div>
              <span className="meta">Charity directory</span>
              <h1 style={{ marginTop: '1.25rem', maxWidth: '13ch' }}>
                Pick who your <span className="serif-italic">round</span> is for.
              </h1>
              <p className="lede measure-wide" style={{ marginBottom: 0 }}>
                Each organisation here is reviewed before listing, publishes what it does with the
                money, and runs events members can turn up to.
              </p>
            </div>
            <div className="figures">
              <div>
                <div className="stat-value">{data ? data.charities.length : '—'}</div>
                <div className="stat-label">Listed causes</div>
              </div>
              <div>
                <div className="stat-value gold">{money(totalRaised)}</div>
                <div className="stat-label">Directed so far</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bleed" style={{ marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
        <Photo src={lead.src} alt={lead.alt} fallback="Community" ratio="cinema" priority />
      </section>

      <section style={{ paddingBottom: 'clamp(4rem, 9vw, 8rem)' }}>
        <div className="shell-wide">
          {/* filters sit on a rule, not in a grey box */}
          <div
            className="row-between"
            style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '1.25rem 0', marginBottom: 'clamp(2.5rem, 5vw, 4rem)', gap: '2rem' }}
          >
            <div style={{ flex: '1 1 260px', maxWidth: 380 }}>
              <label htmlFor="q">Search</label>
              <input
                id="q"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or cause"
                style={{ borderBottom: 0, padding: 0 }}
              />
            </div>

            <div className="row" style={{ gap: '0.5rem' }}>
              <button
                className={`btn btn-sm ${category === '' ? '' : 'btn-ghost'}`}
                onClick={() => setCategory('')}
              >
                All
              </button>
              {data?.categories?.map((c) => (
                <button
                  key={c}
                  className={`btn btn-sm ${category === c ? '' : 'btn-ghost'}`}
                  onClick={() => setCategory(category === c ? '' : c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <Empty
              title="The directory didn't load"
              action={<button className="btn" onClick={() => setSearch((s) => `${s}`)}>Try again</button>}
            >
              {error}
            </Empty>
          )}

          {!data && !error && <Loading rows={2} height={280} />}

          {data && data.charities.length === 0 && (
            <Empty
              title="Nothing matches that"
              action={
                <button className="btn btn-ghost" onClick={() => { setSearch(''); setCategory(''); }}>
                  Clear filters
                </button>
              }
            >
              Try a broader search, or drop the category.
            </Empty>
          )}

          <div className="charity-grid">
            {data?.charities?.map((c, i) => {
              const image = charityPhoto(c, 800);
              const nextEvent = Array.isArray(c.events) ? c.events[0] : null;
              return (
                <Reveal key={c.id} delay={String((i % 3) + 1)}>
                  <Link to={`/charities/${c.slug}`} className="charity-card">
                    <Photo src={image.src} alt={image.alt} fallback={c.name} zoom />
                    <div className="row-between" style={{ gap: '0.75rem' }}>
                      <span className="meta">{c.category}</span>
                      {c.featured && <span className="meta gold">Spotlight</span>}
                    </div>
                    <h3>{c.name}</h3>
                    <p>{c.tagline}</p>

                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--line-soft)', paddingTop: '0.85rem' }}>
                      <div className="row-between" style={{ gap: '0.75rem' }}>
                        <span className="num gold">{money(c.raised)}</span>
                        <span className="dim" style={{ fontSize: 'var(--t-micro)' }}>
                          {c.supporters} supporter{c.supporters === 1 ? '' : 's'}
                        </span>
                      </div>
                      {nextEvent && (
                        <p className="dim" style={{ fontSize: 'var(--t-micro)', marginTop: '0.5rem' }}>
                          {nextEvent.title} · {shortDate(nextEvent.date)}
                        </p>
                      )}
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
