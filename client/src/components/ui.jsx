import { useEffect, useRef, useState } from 'react';

/* ----------------------------------------------------------------- photo */

/**
 * The only way an image enters the interface.
 * Fades in when decoded, and if the source fails it shows a labelled forest
 * block rather than a broken icon or a collapsed box.
 */
export function Photo({ src, alt, fallback, ratio = 'landscape', zoom = false, className = '', priority = false, position }) {
  const [state, setState] = useState(src ? 'loading' : 'error');

  return (
    <div className={`photo ratio-${ratio}${zoom ? ' photo-zoom' : ''}${className ? ` ${className}` : ''}`}>
      {src && state !== 'error' && (
        <img
          src={src}
          alt={alt || ''}
          data-loading={state === 'loading'}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          style={position ? { objectPosition: position } : undefined}
          onLoad={() => setState('ready')}
          onError={() => setState('error')}
        />
      )}
      {state === 'error' && <span className="photo-fallback">{fallback || alt || 'Image unavailable'}</span>}
    </div>
  );
}

/* ---------------------------------------------------------------- motion */

/**
 * Reveals an element once, when it first enters the viewport.
 * Honours prefers-reduced-motion by revealing immediately.
 */
export function useReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('in');
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in');
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/** Wrapper that reveals its contents on scroll. */
export function Reveal({ children, delay, className = '', ...rest }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal${delay ? ` reveal-${delay}` : ''}${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </div>
  );
}

/** Counts up to a value once it is on screen. */
export function CountUp({ to, format = (n) => n, duration = 1100 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const target = Number(to) || 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return undefined;
    }

    let frame;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        setValue(Math.round(target * (1 - (1 - p) ** 3)));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.4 });

    observer.observe(el);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [target, duration]);

  return <span ref={ref}>{format(value)}</span>;
}

/* ------------------------------------------------------------ primitives */

export const Figure = ({ value, label }) => (
  <div>
    <div className="figure-value">{value}</div>
    <div className="figure-label">{label}</div>
  </div>
);

export const Stat = ({ value, label, tone }) => (
  <div>
    <div className="stat-value" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

export const Pill = ({ children, tone }) => (
  <span className={`pill${tone ? ` pill-${tone}` : ''}`}>{children}</span>
);

export const Ball = ({ n, variant, small, index = 0 }) => (
  <span
    className={`ball${small ? ' ball-sm' : ''}${variant ? ` ball-${variant}` : ''}`}
    style={{ animationDelay: `${index * 80}ms` }}
  >
    {n}
  </span>
);

export const Opener = ({ label, children }) => (
  <div className="opener">
    <span className="meta">{label}</span>
    {children}
  </div>
);

export const PageHead = ({ title, children }) => (
  <header className="page-head">
    <h1>{title}</h1>
    {children && <p>{children}</p>}
  </header>
);

export const Notice = ({ kind = 'info', children }) =>
  children ? <div className={`notice notice-${kind}`}>{children}</div> : null;

/** Empty states name the next action rather than apologising. */
export const Empty = ({ title, children, action }) => (
  <div className="empty">
    <h3>{title}</h3>
    {children && <p>{children}</p>}
    {action}
  </div>
);

/** Skeletons mirror the shape of what is loading. */
export const Loading = ({ rows = 3, height = 72 }) => (
  <div className="stack" aria-busy="true" aria-live="polite">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="skeleton" style={{ height, opacity: 1 - i * 0.16 }} />
    ))}
  </div>
);

/* --------------------------------------------------------------- modal */

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={wide ? { width: 'min(900px, 100%)' } : undefined}>
        <div className="row-between" style={{ marginBottom: '1.75rem' }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- feedback */

export function useFeedback() {
  const [feedback, setFeedback] = useState(null);

  const show = (kind, message) => {
    setFeedback({ kind, message });
    if (kind === 'ok') setTimeout(() => setFeedback(null), 4500);
  };

  return {
    node: feedback ? <Notice kind={feedback.kind}>{feedback.message}</Notice> : null,
    ok: (m) => show('ok', m),
    error: (m) => show('error', m),
    clear: () => setFeedback(null),
  };
}
