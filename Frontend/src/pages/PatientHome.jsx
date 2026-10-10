import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../components/Navbar.jsx'
import { Modal, PdfModal } from '../components/Modal.jsx'
import { api, formatDate } from '../api.js'
import { useAuth } from '../auth.jsx'

const FILTERS = ['All', 'Report', 'Prescription', 'Scan']
const todayStr = () => new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD in local time

const CSS = `
.pv { min-height: 100vh; background: var(--bg); }
.pv-top { position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,.92); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
.pv-top__in { display: flex; align-items: center; justify-content: space-between; gap: 16px; height: 72px; }
.pv-top__right { display: flex; align-items: center; gap: 12px; }
.pv-me { display: flex; align-items: center; gap: 10px; font-weight: 600; color: var(--navy); font-size: .92rem; }
.pv-avatar { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--teal), #0F7F86); color: #fff; font-size: .78rem; font-weight: 700; flex: none; }
.pv-main { padding-top: 40px; padding-bottom: 80px; }
.pv-hello h1 { font-size: clamp(1.7rem, 3vw, 2.3rem); letter-spacing: -.02em; color: var(--navy); font-weight: 800; line-height: 1.15; }
.pv-hello p { margin-top: 6px; color: var(--text-2); }
.pv-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
.pv-toast { margin-top: 14px; font-size: .88rem; color: var(--teal-dark); background: var(--teal-soft); padding: 10px 14px; border-radius: 10px; display: inline-block; }
.pv-toast--err { color: #B03030; background: #FBE9E9; }
.pv-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 32px 0; }
.pv-stat { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; box-shadow: var(--shadow-sm); }
.pv-stat b { display: block; font-size: 1.8rem; color: var(--navy); line-height: 1.1; font-weight: 800; }
.pv-stat span { font-size: .85rem; color: var(--text-2); }
.pv-grid { display: grid; grid-template-columns: 1.7fr 1fr; gap: 24px; align-items: start; }
.pv-col { display: grid; gap: 24px; min-width: 0; }
.pv-card { background: #fff; border: 1px solid var(--line); border-radius: 20px; padding: 24px; box-shadow: var(--shadow-sm); }
.pv-card h2 { font-size: 1.1rem; color: var(--navy); font-weight: 700; }
.pv-card__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.pv-empty { color: var(--text-2); font-size: .92rem; padding: 6px 0; }
.pv-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.pv-chip { border: 1px solid var(--line); background: var(--bg); color: var(--text-2); padding: 5px 12px; border-radius: 999px; font-size: .8rem; font-weight: 600; }
.pv-chip:hover { border-color: var(--teal); color: var(--teal-dark); }
.pv-chip.is-on { background: var(--navy); border-color: var(--navy); color: #fff; }
.pv-rec { display: grid; grid-template-columns: 44px 1fr auto; align-items: center; gap: 14px; padding: 14px 0; border-top: 1px solid var(--line); }
.pv-rec:first-of-type { border-top: 0; }
.pv-rec__icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; font-size: .68rem; font-weight: 800; }
.pv-rec__icon--Report { background: var(--teal-soft); color: var(--teal-dark); }
.pv-rec__icon--Prescription { background: #E8EEF9; color: #3B5BA9; }
.pv-rec__icon--Scan { background: #FFF4DC; color: #8A6212; }
.pv-rec strong { display: block; color: var(--navy); font-size: .96rem; overflow-wrap: anywhere; }
.pv-rec p { font-size: .8rem; color: var(--text-2); }
.pv-rec__btns { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.pv-share { display: inline-block; margin-top: 6px; font-size: .74rem; font-weight: 600; padding: 3px 10px; border-radius: 999px; }
.pv-share--on { background: #E4F6EE; color: #127A50; }
.pv-share--off { background: #EDF2F7; color: var(--text-2); }
.pv-btn-sm { padding: 6px 14px; font-size: .82rem; }
.pv-btn-danger { color: #B03030; }
.pv-btn-danger:hover { background: #FBE9E9; }
.pv-req { padding: 14px 0; border-top: 1px solid var(--line); }
.pv-req:first-of-type { border-top: 0; padding-top: 0; }
.pv-req strong { color: var(--navy); font-size: .95rem; }
.pv-req p { font-size: .82rem; color: var(--text-2); }
.pv-req__btns { display: flex; gap: 8px; margin-top: 10px; }
.pv-appt { background: var(--navy); border-color: var(--navy); }
.pv-appt h2 { color: #fff; }
.pv-appt p { color: #AFC3D6; font-size: .86rem; }
.pv-appt__row { display: flex; gap: 16px; align-items: center; padding: 6px 0; }
.pv-appt__row + .pv-appt__row { border-top: 1px solid rgba(255,255,255,.12); margin-top: 10px; padding-top: 16px; }
.pv-date { display: grid; place-items: center; width: 52px; height: 58px; border-radius: 14px; background: rgba(255,255,255,.1); color: #fff; line-height: 1.1; flex: none; }
.pv-date b { font-size: 1.4rem; } .pv-date span { font-size: .72rem; color: #AFC3D6; }
.pv-med { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--line); font-size: .9rem; }
.pv-med:first-of-type { border-top: 0; }
.pv-med strong { color: var(--navy); display: block; } .pv-med span { color: var(--text-2); font-size: .8rem; }
.pv-conn { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--line); }
.pv-conn:first-of-type { border-top: 0; }
.pv-conn strong { display: block; font-size: .92rem; color: var(--navy); }
.pv-conn p { font-size: .78rem; color: var(--text-2); }
.pv-avatar--navy { background: var(--navy); } .pv-avatar--teal { background: var(--teal); }
.pv-conn__grow { flex: 1; min-width: 0; }
.pv-manage li { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid var(--line); font-size: .92rem; color: var(--navy); }
.pv-manage li:first-child { border-top: 0; }
@media (max-width: 1040px) { .pv-grid { grid-template-columns: 1fr; } .pv-stats { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) {
  .pv-me span { display: none; }
  .pv-rec { grid-template-columns: 44px 1fr; }
  .pv-rec__btns { grid-column: 1 / -1; justify-content: flex-start; }
  .pv-actions .btn { flex: 1 1 100%; }
}
`

/* ------------------------------------------------------------ modals */
function UploadModal({ onClose, onDone }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('Report')
  const [date, setDate] = useState(todayStr())
  const [provider, setProvider] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const pick = (e) => {
    const f = e.target.files[0] || null
    setFile(f)
    if (f && !title) setTitle(f.name.replace(/\.pdf$/i, ''))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!file) return setError('Choose a PDF file to upload.')
    if (file.size > 10 * 1024 * 1024) return setError('That file is larger than 10 MB.')
    if (!title.trim()) return setError('Enter a title for this record.')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', title.trim())
    fd.append('type', type)
    fd.append('date', date)
    fd.append('provider', provider.trim())
    setBusy(true)
    try {
      await api.uploadRecord(fd)
      onDone('Record uploaded.')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal title="Upload a record" onClose={onClose}>
      <form className="mv-form" onSubmit={submit} noValidate>
        <div><label htmlFor="up-file">PDF file</label><input id="up-file" type="file" accept="application/pdf,.pdf" onChange={pick} /></div>
        <div><label htmlFor="up-title">Title</label><input id="up-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Complete blood count" /></div>
        <div>
          <label htmlFor="up-type">Type</label>
          <select id="up-type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="Report">Lab or medical report</option>
            <option value="Prescription">Prescription</option>
            <option value="Scan">Scan</option>
          </select>
        </div>
        <div><label htmlFor="up-date">Date of record</label><input id="up-date" type="date" max={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label htmlFor="up-prov">Doctor or lab (optional)</label><input id="up-prov" type="text" value={provider} onChange={(e) => setProvider(e.target.value)} /></div>
        {error && <p className="mv-form__err" role="alert">{error}</p>}
        <div className="mv-form__row">
          <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
        </div>
      </form>
    </Modal>
  )
}

function ShareModal({ records, targets, preselect, onClose, onDone }) {
  const [target, setTarget] = useState(targets[0] ? String(targets[0].user_id) : '')
  const [picked, setPicked] = useState(new Set(preselect))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const already = new Set(targets.find((t) => String(t.user_id) === target)?.shared_record_ids || [])

  const toggle = (id) => setPicked((s) => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const submit = async (e) => {
    e.preventDefault()
    if (!picked.size) return setError('Choose at least one record.')
    setBusy(true)
    try {
      await api.share(Number(target), [...picked])
      onDone(`Shared ${picked.size} record${picked.size > 1 ? 's' : ''}.`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (!targets.length) {
    return (
      <Modal title="Share records" onClose={onClose}>
        <p className="pv-empty">You can share records with doctors and family members once they are connected. Approve a request or add a family member first.</p>
        <div className="mv-form__row"><button type="button" className="btn btn--primary" onClick={onClose}>Close</button></div>
      </Modal>
    )
  }

  return (
    <Modal title="Share records" onClose={onClose}>
      <form className="mv-form" onSubmit={submit}>
        <div>
          <label htmlFor="sh-to">Share with</label>
          <select id="sh-to" value={target} onChange={(e) => setTarget(e.target.value)}>
            {targets.map((t) => <option key={t.user_id} value={t.user_id}>{t.name} ({t.kind})</option>)}
          </select>
        </div>
        <div>
          <label id="sh-recs">Records</label>
          <div className="mv-checks" role="group" aria-labelledby="sh-recs">
            {records.map((r) => (
              <label key={r.id}>
                <input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} />
                <span>{r.title}<small>{r.type} · {formatDate(r.date)}{already.has(r.id) ? ' · already shared' : ''}</small></span>
              </label>
            ))}
          </div>
        </div>
        {error && <p className="mv-form__err" role="alert">{error}</p>}
        <div className="mv-form__row">
          <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Sharing…' : 'Share'}</button>
        </div>
      </form>
    </Modal>
  )
}

function FamilyModal({ onClose, onDone }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return setError('Enter their email address.')
    setBusy(true)
    try {
      const res = await api.familyRequest(email.trim())
      onDone(`Request sent to ${res.name}. They need to approve it.`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal title="Add a family member" onClose={onClose}>
      <form className="mv-form" onSubmit={submit} noValidate>
        <p className="pv-empty">They need a MediVault patient account. You can share records only after they approve.</p>
        <div><label htmlFor="fam-email">Their email address</label><input id="fam-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} placeholder="name@example.com" /></div>
        {error && <p className="mv-form__err" role="alert">{error}</p>}
        <div className="mv-form__row">
          <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
        </div>
      </form>
    </Modal>
  )
}

function ManageModal({ person, records, onClose, onChange, onDisconnected, onError }) {
  const shared = records.filter((r) => person.shared_record_ids.includes(r.id))

  const revoke = async (id) => {
    try {
      await api.revoke(person.user_id, [id])
      onChange()
    } catch (err) {
      onError(err.message)
    }
  }

  const disconnect = async () => {
    if (!window.confirm(`Disconnect from ${person.name}? They will lose access to everything you shared.`)) return
    try {
      await (person.kind === 'Doctor' ? api.disconnectDoctor(person.link_id) : api.disconnectFamily(person.link_id))
      onDisconnected(`Disconnected from ${person.name}.`)
    } catch (err) {
      onError(err.message)
    }
  }

  return (
    <Modal title={`Access for ${person.name}`} onClose={onClose}>
      {shared.length === 0 ? (
        <p className="pv-empty">You have not shared any records with {person.name}.</p>
      ) : (
        <ul className="pv-manage">
          {shared.map((r) => (
            <li key={r.id}>
              <span>{r.title}</span>
              <button type="button" className="btn btn--ghost pv-btn-sm pv-btn-danger" onClick={() => revoke(r.id)}>Stop sharing</button>
            </li>
          ))}
        </ul>
      )}
      <div className="mv-form__row" style={{ marginTop: 20 }}>
        <button type="button" className="btn btn--outline pv-btn-danger" onClick={disconnect}>Disconnect</button>
        <button type="button" className="btn btn--primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  )
}

/* -------------------------------------------------------------- page */
export default function PatientHome() {
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuth()
  const [records, setRecords] = useState([])
  const [people, setPeople] = useState({ doctors: [], family: [] })
  const [requests, setRequests] = useState([])
  const [appts, setAppts] = useState([])
  const [fromFamily, setFromFamily] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState('All')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState({ text: '', error: false })

  const say = (text, error = false) => setToast({ text, error })
  const fail = useCallback((err) => {
    if (err.status === 401) setUser(null) // session expired: the route guard redirects to login
    else setToast({ text: err.message, error: true })
  }, [setUser])

  const load = useCallback(async () => {
    try {
      const [r, p, q, a, s] = await Promise.all([
        api.records(), api.people(), api.requests(), api.appointments(), api.sharedWithMe(),
      ])
      setRecords(r.records)
      setPeople(p)
      setRequests(q.requests)
      setAppts(a.appointments)
      setFromFamily(s.records)
      setLoaded(true)
    } catch (err) {
      fail(err)
    }
  }, [fail])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!toast.text) return undefined
    const t = setTimeout(() => setToast({ text: '', error: false }), 6000)
    return () => clearTimeout(t)
  }, [toast])

  const targets = [
    ...people.doctors.map((p) => ({ ...p, kind: 'Doctor' })),
    ...people.family.map((p) => ({ ...p, kind: 'Family' })),
  ]
  const visible = records.filter((r) => filter === 'All' || r.type === filter)
  const prescriptions = records.filter((r) => r.type === 'Prescription').slice(0, 3)
  const managed = modal?.type === 'manage' ? targets.find((t) => t.user_id === modal.userId) : null

  const done = (message) => { setModal(null); say(message); load() }

  const decide = async (req, decision) => {
    try {
      await api.decide(req.kind, req.id, decision)
      say(decision === 'approved' ? `Approved ${req.name}.` : `Rejected ${req.name}.`)
      load()
    } catch (err) { fail(err) }
  }

  const remove = async (rec) => {
    if (!window.confirm(`Delete "${rec.title}"? This removes the file for everyone you shared it with.`)) return
    try {
      await api.deleteRecord(rec.id)
      say('Record deleted.')
      load()
    } catch (err) { fail(err) }
  }

  const openShare = (preselect = []) => {
    if (!records.length) return say('Upload a record first, then you can share it.', true)
    setModal({ type: 'share', preselect })
  }

  const onLogout = async () => { await logout(); navigate('/') }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const [next, ...later] = appts

  return (
    <div className="pv">
      <style>{CSS}</style>

      <header className="pv-top">
        <div className="container pv-top__in">
          <Logo />
          <div className="pv-top__right">
            <div className="pv-me"><span className="pv-avatar" aria-hidden="true">{initials}</span><span>{user.name}</span></div>
            <button type="button" className="btn btn--outline" onClick={onLogout}>Log out</button>
          </div>
        </div>
      </header>

      <main className="container pv-main">
        <section className="pv-hello">
          <h1>{greeting}, {user.name.split(' ')[0]}</h1>
          <p>Here is your health information and who can see it. Your MediVault ID is <strong>{user.mv_id}</strong>.</p>
          <div className="pv-actions">
            <button type="button" className="btn btn--primary" onClick={() => setModal({ type: 'upload' })}>Upload record</button>
            <button type="button" className="btn btn--outline" onClick={() => openShare()}>Share records</button>
            <button type="button" className="btn btn--outline" onClick={() => setModal({ type: 'family' })}>Add family member</button>
          </div>
          {toast.text && <p className={`pv-toast ${toast.error ? 'pv-toast--err' : ''}`} role="status">{toast.text}</p>}
        </section>

        <section className="pv-stats" aria-label="Summary">
          <div className="pv-stat"><b>{records.length}</b><span>Records stored</span></div>
          <div className="pv-stat"><b>{people.doctors.length}</b><span>Doctors connected</span></div>
          <div className="pv-stat"><b>{requests.length}</b><span>Requests waiting</span></div>
          <div className="pv-stat"><b>{people.family.length}</b><span>Family members linked</span></div>
        </section>

        <div className="pv-grid">
          <div className="pv-col">
            <section className="pv-card" aria-labelledby="pv-records">
              <div className="pv-card__head">
                <h2 id="pv-records">My records</h2>
                <div className="pv-chips" role="group" aria-label="Filter records">
                  {FILTERS.map((f) => (
                    <button key={f} type="button" className={`pv-chip ${filter === f ? 'is-on' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                      {f === 'All' ? 'All' : `${f}s`}
                    </button>
                  ))}
                </div>
              </div>
              {!loaded && <p className="pv-empty">Loading your records…</p>}
              {loaded && visible.length === 0 && (
                <p className="pv-empty">{records.length ? 'No records of this type.' : 'No records yet. Upload your first PDF to get started.'}</p>
              )}
              {visible.map((r) => (
                <div className="pv-rec" key={r.id}>
                  <div className={`pv-rec__icon pv-rec__icon--${r.type}`} aria-hidden="true">{r.type.slice(0, 3).toUpperCase()}</div>
                  <div>
                    <strong>{r.title}</strong>
                    <p>{formatDate(r.date)}{r.provider ? ` · ${r.provider}` : ''}</p>
                    <span className={`pv-share ${r.shared_with.length ? 'pv-share--on' : 'pv-share--off'}`}>
                      {r.shared_with.length ? `Shared with ${r.shared_with.map((s) => s.name).join(', ')}` : 'Private'}
                    </span>
                  </div>
                  <div className="pv-rec__btns">
                    <button type="button" className="btn btn--primary pv-btn-sm" onClick={() => setModal({ type: 'view', record: r })}>View</button>
                    <button type="button" className="btn btn--outline pv-btn-sm" onClick={() => openShare([r.id])}>Share</button>
                    <button type="button" className="btn btn--ghost pv-btn-sm pv-btn-danger" onClick={() => remove(r)}>Delete</button>
                  </div>
                </div>
              ))}
            </section>

            <section className="pv-card" aria-labelledby="pv-conns">
              <div className="pv-card__head"><h2 id="pv-conns">Who can access my records</h2></div>
              {targets.length === 0 && <p className="pv-empty">No one is connected yet. Doctors can send you requests, and you can add family members.</p>}
              {targets.map((c) => (
                <div className="pv-conn" key={`${c.kind}-${c.user_id}`}>
                  <span className={`pv-avatar pv-avatar--${c.kind === 'Doctor' ? 'navy' : 'teal'}`} aria-hidden="true">
                    {c.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                  <div className="pv-conn__grow">
                    <strong>{c.name}</strong>
                    <p>{c.detail} · {c.shared_record_ids.length} record{c.shared_record_ids.length === 1 ? '' : 's'} shared</p>
                  </div>
                  <button type="button" className="btn btn--outline pv-btn-sm" onClick={() => setModal({ type: 'manage', userId: c.user_id })}>Manage</button>
                </div>
              ))}
            </section>

            {fromFamily.length > 0 && (
              <section className="pv-card" aria-labelledby="pv-fam">
                <div className="pv-card__head"><h2 id="pv-fam">Shared with me by family</h2></div>
                {fromFamily.map((r) => (
                  <div className="pv-med" key={r.id}>
                    <div><strong>{r.title}</strong><span>{r.owner_name} · {formatDate(r.date)}</span></div>
                    <button type="button" className="btn btn--primary pv-btn-sm" onClick={() => setModal({ type: 'view', record: r })}>View</button>
                  </div>
                ))}
              </section>
            )}
          </div>

          <div className="pv-col">
            <section className="pv-card" aria-labelledby="pv-reqs">
              <div className="pv-card__head"><h2 id="pv-reqs">Requests</h2></div>
              {requests.length === 0 && <p className="pv-empty">No requests waiting for you.</p>}
              {requests.map((r) => (
                <div className="pv-req" key={`${r.kind}-${r.id}`}>
                  <strong>{r.name}</strong>
                  <p>{r.kind === 'doctor' ? 'Doctor' : 'Family'} · {r.detail}</p>
                  <div className="pv-req__btns">
                    <button type="button" className="btn btn--primary pv-btn-sm" onClick={() => decide(r, 'approved')}>Approve</button>
                    <button type="button" className="btn btn--outline pv-btn-sm" onClick={() => decide(r, 'rejected')}>Reject</button>
                  </div>
                </div>
              ))}
            </section>

            <section className="pv-card pv-appt" aria-labelledby="pv-appt">
              <div className="pv-card__head"><h2 id="pv-appt">Upcoming appointments</h2></div>
              {!next && <p>No appointments scheduled. Your doctor will add them here.</p>}
              {[next, ...later.slice(0, 2)].filter(Boolean).map((a) => {
                const d = new Date(a.starts_at)
                return (
                  <div className="pv-appt__row" key={a.id}>
                    <div className="pv-date"><b>{d.getDate()}</b><span>{d.toLocaleString('en-GB', { month: 'short' })}</span></div>
                    <div>
                      <strong style={{ color: '#fff' }}>{a.with}</strong>
                      <p>{d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}{a.note ? ` · ${a.note}` : ''}</p>
                    </div>
                  </div>
                )
              })}
            </section>

            <section className="pv-card" aria-labelledby="pv-meds">
              <div className="pv-card__head"><h2 id="pv-meds">Latest prescriptions</h2></div>
              {prescriptions.length === 0 && <p className="pv-empty">Prescriptions you upload will appear here.</p>}
              {prescriptions.map((r) => (
                <div className="pv-med" key={r.id}>
                  <div><strong>{r.title}</strong><span>{formatDate(r.date)}{r.provider ? ` · ${r.provider}` : ''}</span></div>
                  <button type="button" className="btn btn--outline pv-btn-sm" onClick={() => setModal({ type: 'view', record: r })}>View</button>
                </div>
              ))}
            </section>
          </div>
        </div>
      </main>

      {modal?.type === 'view' && <PdfModal record={modal.record} onClose={() => setModal(null)} />}
      {modal?.type === 'upload' && <UploadModal onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === 'family' && <FamilyModal onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === 'share' && <ShareModal records={records} targets={targets} preselect={modal.preselect} onClose={() => setModal(null)} onDone={done} />}
      {managed && (
        <ManageModal
          person={managed}
          records={records}
          onClose={() => setModal(null)}
          onChange={load}
          onDisconnected={done}
          onError={(m) => say(m, true)}
        />
      )}
    </div>
  )
}
