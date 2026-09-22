import { useEffect, useState } from 'react';
import { api, money } from '../../lib/api';
import { Empty, Loading, Modal, Pill, useFeedback } from '../../components/ui';

const BLANK = {
  name: '', category: 'General', tagline: '', description: '',
  image_url: '', featured: false, active: true, events: [],
};

export default function AdminCharities() {
  const [charities, setCharities] = useState(null);
  const [editing, setEditing] = useState(null);
  const feedback = useFeedback();

  const load = () =>
    api.get('/admin/charities').then((d) => setCharities(d.charities)).catch((e) => feedback.error(e.message));

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const remove = async (c) => {
    try {
      const res = await api.del(`/admin/charities/${c.id}`);
      feedback.ok(res.retired
        ? `${c.name} has ${res.supporters} supporter(s), so it was retired rather than deleted.`
        : `${c.name} deleted.`);
      load();
    } catch (e) { feedback.error(e.message); }
  };

  const toggleFeatured = async (c) => {
    try {
      await api.patch(`/admin/charities/${c.id}`, { featured: !c.featured });
      load();
    } catch (e) { feedback.error(e.message); }
  };

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <div className="row-between">
        <div>
          <h1 style={{ marginBottom: '.2rem' }}>Charities</h1>
          <p className="dim">Listings, media and the homepage spotlight.</p>
        </div>
        <button className="btn" onClick={() => setEditing({ ...BLANK })}>Add a charity</button>
      </div>

      {feedback.node}

      {!charities && <Loading rows={3} />}
      {charities?.length === 0 && <Empty title="No charities listed">Add the first one to open signups.</Empty>}

      <div className="grid grid-3">
        {charities?.map((c) => (
          <div key={c.id} className="card charity-card">
            {c.image_url && <img src={c.image_url} alt="" loading="lazy" />}
            <div className="body">
              <div className="row-between">
                <Pill>{c.category}</Pill>
                {!c.active && <Pill tone="rose">Retired</Pill>}
                {c.featured && <Pill tone="clay">Spotlight</Pill>}
              </div>
              <strong>{c.name}</strong>
              <span className="dim" style={{ fontSize: '.88rem' }}>{c.tagline}</span>
              <div className="dim" style={{ fontSize: '.84rem' }}>
                {money(c.raised)} raised · {c.supporters} supporter{c.supporters === 1 ? '' : 's'}
              </div>
              <div className="row" style={{ marginTop: 'auto', paddingTop: '.8rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(normalise(c))}>Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleFeatured(c)}>
                  {c.featured ? 'Unfeature' : 'Feature'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <CharityForm
          value={editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); feedback.ok(msg); load(); }}
          onError={feedback.error}
        />
      )}
    </div>
  );
}

const normalise = (c) => ({
  ...c,
  tagline: c.tagline || '',
  description: c.description || '',
  image_url: c.image_url || '',
  events: Array.isArray(c.events) ? c.events : [],
});

function CharityForm({ value, onClose, onSaved, onError }) {
  const [form, setForm] = useState(value);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const setEvent = (i, key, v) => {
    const events = [...form.events];
    events[i] = { ...events[i], [key]: v };
    setForm({ ...form, events });
  };

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        name: form.name, category: form.category, tagline: form.tagline,
        description: form.description, image_url: form.image_url,
        featured: form.featured, active: form.active,
        events: form.events.filter((e) => e.title),
      };
      if (form.id) {
        await api.patch(`/admin/charities/${form.id}`, payload);
        onSaved(`${form.name} updated.`);
      } else {
        await api.post('/admin/charities', payload);
        onSaved(`${form.name} added to the directory.`);
      }
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal title={form.id ? `Edit ${value.name}` : 'Add a charity'} onClose={onClose} wide>
      <div className="field">
        <label>Name</label>
        <input value={form.name} onChange={set('name')} />
      </div>
      <div className="field-row" style={{ marginTop: '1rem' }}>
        <div>
          <label>Category</label>
          <input value={form.category} onChange={set('category')} />
        </div>
        <div>
          <label>Image URL</label>
          <input value={form.image_url} onChange={set('image_url')} placeholder="https://…" />
        </div>
      </div>
      <div className="field">
        <label>Tagline</label>
        <input value={form.tagline} onChange={set('tagline')} />
      </div>
      <div className="field">
        <label>Description</label>
        <textarea rows="4" value={form.description} onChange={set('description')} />
      </div>

      <div className="field">
        <label>Upcoming events</label>
        <div className="stack" style={{ gap: '.5rem' }}>
          {form.events.map((ev, i) => (
            <div key={i} className="field-row">
              <input placeholder="Title" value={ev.title || ''} onChange={(e) => setEvent(i, 'title', e.target.value)} />
              <input type="date" value={ev.date || ''} onChange={(e) => setEvent(i, 'date', e.target.value)} />
              <input placeholder="Venue" value={ev.venue || ''} onChange={(e) => setEvent(i, 'venue', e.target.value)} />
            </div>
          ))}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setForm({ ...form, events: [...form.events, { title: '', date: '', venue: '' }] })}
          >
            Add an event
          </button>
        </div>
      </div>

      <div className="row" style={{ marginTop: '1rem' }}>
        <label className="row" style={{ margin: 0, gap: '.5rem' }}>
          <input
            type="checkbox" style={{ width: 'auto' }} checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
          />
          Homepage spotlight
        </label>
        <label className="row" style={{ margin: 0, gap: '.5rem' }}>
          <input
            type="checkbox" style={{ width: 'auto' }} checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Listed publicly
        </label>
      </div>

      <button className="btn btn-block" style={{ marginTop: '1.5rem' }} onClick={save} disabled={busy}>
        {busy ? 'Saving…' : form.id ? 'Save changes' : 'Add charity'}
      </button>
    </Modal>
  );
}
