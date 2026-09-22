import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="section">
      <div className="shell-wide">
        <span className="meta">404</span>
        <h1 style={{ marginTop: '1.25rem', maxWidth: '12ch' }}>That page isn't here.</h1>
        <p className="lede measure">
          The link may be old, or the address slightly off.
        </p>
        <div className="row" style={{ marginTop: '2rem' }}>
          <Link className="btn" to="/">Back to the homepage</Link>
          <Link className="btn btn-ghost" to="/charities">Browse charities</Link>
        </div>
      </div>
    </section>
  );
}
