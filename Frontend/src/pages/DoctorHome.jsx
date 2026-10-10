import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../components/Navbar.jsx'
import { Modal, PdfModal } from '../components/Modal.jsx'
import { api, formatDate, formatDateTime } from '../api.js'
import { useAuth } from '../auth.jsx'

const localNow = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)

const CSS = `
.dv { min-height: 100vh; background: var(--bg); }
.dv-top { position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,.92); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
.dv-top__in { display: flex; align-items: center; justify-content: space-between; gap: 16px; height: 72px; }
.dv-top__right { display: flex; align-items: center; gap: 12px; }
.dv-me { display: flex; align-items: center; gap: 10px; font-weight: 600; color: var(--navy); font-size: .92rem; }
.dv-avatar { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: var(--navy); color: #fff; font-size: .74rem; font-weight: 700; flex: none; }
.dv-main { padding-top: 40px; padding-bottom: 80px; }
.dv-hello h1 { font-size: clamp(1.7rem, 3vw, 2.3rem); letter-spacing: -.02em; color: var(--navy); font-weight: 800; line-height: 1.15; }
.dv-hello p { margin-top: 6px; color: var(--text-2); }
.dv-toast { margin-top: 14px; font-size: .88rem; color: var(--teal-dark); background: var(--teal-soft); padding: 10px 14px; border-radius: 10px; display: inline-block; }
.dv-toast--err { color: #B03030; background: #FBE9E9; }
.dv-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 32px 0; }
.dv-stat { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; box-shadow: var(--shadow-sm); }
.dv-stat b { display: block; font-size: 1.8rem; color: var(--navy); line-height: 1.1; font-weight: 800; }
.dv-stat span { font-size: .85rem; color: var(--text-2); }
.dv-grid { display: grid; grid-template-columns: 1.7fr 1fr; gap: 24px; align-items: start; }
.dv-col { display: grid; gap: 24px; min-width: 0; }
.dv-card { background: #fff; border: 1px solid var(--line); border-radius: 20px; padding: 24px; box-shadow: var(--shadow-sm); }
.dv-card h2 { font-size: 1.1rem; color: var(--navy); font-weight: 700; }
.dv-card__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.dv-search { width: 100%; max-width: 240px; padding: 9px 14px; font: inherit; font-size: .9rem; border: 1.5px solid #D2DCE6; border-radius: 999px; color: var(--text); }
.dv-search:focus, .dv-input:focus { outline: none; border-color: var(--teal); box-shadow: 0 0 0 4px rgba(22,166,161,.16); }
.dv-pt { display: flex; align-items: center; gap: 14px; text-align: left; padding: 12px; margin: 0 -12px; border: 0; background: transparent; border-radius: 14px; width: calc(100% + 24px); transition: background .2s; }
.dv-pt:hover { background: var(--bg); }
.dv-pt.is-on { background: var(--teal-soft); }
.dv-pt strong { display: block; color: var(--navy); font-size: .95rem; }
.dv-pt p { font-size: .8rem; color: var(--text-2); }
.dv-pt__grow { flex: 1; min-width: 0; }
.dv-count { font-size: .76rem; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: #E4F6EE; color: #127A50; white-space: nowrap; }
.dv-detail h3 { color: var(--navy); font-size: 1rem; }
.dv-detail > p { font-size: .84rem; color: var(--text-2); margin: 2px 0 14px; }
.dv-rec { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line); }
.dv-rec strong { display: block; color: var(--navy); font-size: .92rem; }
.dv-rec p { font-size: .78rem; color: var(--text-2); }
.dv-note { font-size: .84rem; color: var(--text-2); background: var(--teal-soft); padding: 10px 14px; border-radius: 10px; margin-top: 14px; }
.dv-form { display: flex; gap: 8px; flex-wrap: wrap; }
.dv-input { flex: 1 1 180px; padding: 11px 14px; font: inherit; font-size: .92rem; border: 1.5px solid #D2DCE6; border-radius: 12px; color: var(--text); }
.dv-help { font-size: .82rem; color: var(--text-2); margin-bottom: 12px; }
.dv-err { color: #C03030; font-size: .82rem; margin-top: 8px; }
.dv-sent { display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 10px 0; border-top: 1px solid var(--line); font-size: .9rem; color: var(--navy); }
.dv-sent:first-of-type { border-top: 0; }
.dv-wait { font-size: .76rem; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: #FFF4DC; color: #8A6212; white-space: nowrap; }
.dv-wait--no { background: #FBE9E9; color: #B03030; }
.dv-slot { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid var(--line); }
.dv-slot:first-of-type { border-top: 0; }
.dv-slot time { font-weight: 700; color: var(--teal-dark); font-size: .84rem; display: block; }
.dv-slot strong { display: block; color: var(--navy); font-size: .92rem; }
.dv-slot p { font-size: .8rem; color: var(--text-2); }
.dv-empty { color: var(--text-2); font-size: .9rem; padding: 6px 0; }
.dv-sm { padding: 6px 14px; font-size: .82rem; }
.dv-danger { color: #B03030; }
.dv-danger:hover { background: #FBE9E9; }
@media (max-width: 1040px) { .dv-grid { grid-template-columns: 1fr; } .dv-stats { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .dv-me span { display: none; } .dv-search { max-width: none; } }
`

function ScheduleModal({ patients, onClose, onDone }) {
  const [patientId, setPatientId] = useState(patients[0] ? String(patients[0].id) : '')
  const [when, setWhen] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!patientId) return setError('Choose a patient.')
    if (!when) return setError('Choose a date and time.')
    setBusy(true)
    try {
      await api.createAppointment({ patient_id: Number(patientId), starts_at: when, note })
      onDone('Appointment scheduled.')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (!patients.length) {
    return (
      <Modal title="Schedule appointment" onClose={onClose}>
        <p className="dv-empty">You can schedule appointments once a patient has approved your connection request.</p>
        <div className="mv-form__row"><button type="button" className="btn btn--primary" onClick={onClose}>Close</button></div>
      </Modal>
    )
  }

  return (
    <Modal title="Schedule appointment" onClose={onClose}>
      <form className="mv-form" onSubmit={submit} noValidate>
        <div>
          <label htmlFor="ap-pt">Patient</label>
          <select id="ap-pt" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div><label htmlFor="ap-when">Date and time</label><input id="ap-when" type="datetime-local" min={localNow()} value={when} onChange={(e) => setWhen(e.target.value)} /></div>
        <div><label htmlFor="ap-note">Note (optional)</label><input id="ap-note" type="text" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Follow-up" /></div>
        {error && <p className="mv-form__err" role="alert">{error}</p>}
        <div className="mv-form__row">
          <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Schedule'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function DoctorHome() {
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuth()
  const [patients, setPatients] = useState([])
  const [sent, setSent] = useState([])
  const [appts, setAppts] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [records, setRecords] = useState([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState({ text: '', error: false })

  const say = (text, error = false) => setToast({ text, error })
  const fail = useCallback((err) => {
    if (err.status === 401) setUser(null)
    else setToast({ text: err.message, error: true })
  }, [setUser])

  const load = useCallback(async () => {
    try {
      const [p, s, a] = await Promise.all([api.doctorPatients(), api.doctorRequests(), api.appointments()])
      setPatients(p.patients)
      setSent(s.requests)
      setAppts(a.appointments)
      setLoaded(true)
      setSelectedId((cur) => (p.patients.some((x) => x.id === cur) ? cur : p.patients[0]?.id ?? null))
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

  // Load the records the selected patient has shared with this doctor.
  useEffect(() => {
    if (selectedId == null) { setRecords([]); return undefined }
    let cancelled = false
    setRecordsLoading(true)
    api.patientRecords(selectedId)
      .then((d) => { if (!cancelled) setRecords(d.records) })
      .catch((err) => { if (!cancelled) fail(err) })
      .finally(() => { if (!cancelled) setRecordsLoading(false) })
    return () => { cancelled = true }
  }, [selectedId, patients, fail])

  const list = patients.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
  const selected = patients.find((p) => p.id === selectedId)
  const today = new Date().toLocaleDateString('sv-SE')
  const pending = sent.filter((s) => s.status === 'pending').length

  const sendRequest = async (e) => {
    e.preventDefault()
    const value = identifier.trim()
    if (!value) return setFormError("Enter the patient's email or MediVault ID.")
    setBusy(true)
    try {
      const res = await api.doctorRequest(value)
      setIdentifier('')
      setFormError('')
      say(`Request sent to ${res.name}.`)
      load()
    } catch (err) {
      if (err.status === 401) fail(err)
      else setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const cancelAppt = async (a) => {
    if (!window.confirm(`Cancel the appointment with ${a.with}?`)) return
    try {
      await api.deleteAppointment(a.id)
      say('Appointment cancelled.')
      load()
    } catch (err) { fail(err) }
  }

  const onLogout = async () => { await logout(); navigate('/') }
  const initials = (n) => n.replace(/^Dr\.?\s+/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="dv">
      <style>{CSS}</style>

      <header className="dv-top">
        <div className="container dv-top__in">
          <Logo />
          <div className="dv-top__right">
            <div className="dv-me"><span className="dv-avatar" aria-hidden="true">{initials(user.name)}</span><span>{user.name}</span></div>
            <button type="button" className="btn btn--outline" onClick={onLogout}>Log out</button>
          </div>
        </div>
      </header>

      <main className="container dv-main">
        <section className="dv-hello">
          <h1>Welcome, {user.name}</h1>
          <p>Your connected patients and the records they have allowed you to see.</p>
          {toast.text && <p className={`dv-toast ${toast.error ? 'dv-toast--err' : ''}`} role="status">{toast.text}</p>}
        </section>

        <section className="dv-stats" aria-label="Summary">
          <div className="dv-stat"><b>{patients.length}</b><span>Connected patients</span></div>
          <div className="dv-stat"><b>{pending}</b><span>Requests awaiting approval</span></div>
          <div className="dv-stat"><b>{patients.reduce((n, p) => n + p.shared_count, 0)}</b><span>Records shared with you</span></div>
          <div className="dv-stat"><b>{appts.filter((a) => a.starts_at.startsWith(today)).length}</b><span>Appointments today</span></div>
        </section>

        <div className="dv-grid">
          <div className="dv-col">
            <section className="dv-card" aria-labelledby="dv-patients">
              <div className="dv-card__head">
                <h2 id="dv-patients">My patients</h2>
                <input className="dv-search" type="search" placeholder="Search patients" aria-label="Search patients" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              {!loaded && <p className="dv-empty">Loading…</p>}
              {loaded && patients.length === 0 && <p className="dv-empty">No connected patients yet. Send a connection request using the form on the right.</p>}
              {loaded && patients.length > 0 && list.length === 0 && <p className="dv-empty">No connected patient matches that name.</p>}
              {list.map((p) => (
                <button key={p.id} type="button" className={`dv-pt ${selectedId === p.id ? 'is-on' : ''}`} aria-pressed={selectedId === p.id} onClick={() => setSelectedId(p.id)}>
                  <span className="dv-avatar" aria-hidden="true">{initials(p.name)}</span>
                  <span className="dv-pt__grow"><strong>{p.name}{p.age != null ? `, ${p.age}` : ''}</strong><p>{p.mv_id}</p></span>
                  <span className="dv-count">{p.shared_count} shared</span>
                </button>
              ))}
            </section>

            {selected && (
              <section className="dv-card dv-detail" aria-live="polite">
                <h3>{selected.name}&rsquo;s shared records</h3>
                <p>Only records the patient has chosen to share with you appear here.</p>
                {recordsLoading && <p className="dv-empty">Loading records…</p>}
                {!recordsLoading && records.length === 0 && <p className="dv-empty">This patient has not shared any records with you yet.</p>}
                {records.map((r) => (
                  <div key={r.id} className="dv-rec">
                    <div><strong>{r.title}</strong><p>{r.type} · {formatDate(r.date)}{r.provider ? ` · ${r.provider}` : ''}</p></div>
                    <button type="button" className="btn btn--primary dv-sm" onClick={() => setModal({ type: 'view', record: r })}>View</button>
                  </div>
                ))}
                <p className="dv-note">To see more records, ask the patient to share them with you.</p>
              </section>
            )}
          </div>

          <div className="dv-col">
            <section className="dv-card" aria-labelledby="dv-connect">
              <div className="dv-card__head"><h2 id="dv-connect">Connect with a patient</h2></div>
              <p className="dv-help">Send a request. You can see records only after the patient approves it and shares them.</p>
              <form className="dv-form" onSubmit={sendRequest} noValidate>
                <input className="dv-input" value={identifier} onChange={(e) => { setIdentifier(e.target.value); setFormError('') }} placeholder="Patient email or MediVault ID" aria-label="Patient email or MediVault ID" aria-invalid={!!formError} />
                <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
              </form>
              {formError && <p className="dv-err" role="alert">{formError}</p>}
              <div style={{ marginTop: 16 }}>
                {sent.map((s) => (
                  <div className="dv-sent" key={s.id}>
                    <span>{s.name}</span>
                    <span className={`dv-wait ${s.status === 'rejected' ? 'dv-wait--no' : ''}`}>{s.status === 'rejected' ? 'Declined' : 'Awaiting approval'}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="dv-card" aria-labelledby="dv-today">
              <div className="dv-card__head">
                <h2 id="dv-today">Upcoming appointments</h2>
                <button type="button" className="btn btn--outline dv-sm" onClick={() => setModal({ type: 'schedule' })}>Schedule</button>
              </div>
              {appts.length === 0 && <p className="dv-empty">No upcoming appointments.</p>}
              {appts.map((a) => (
                <div className="dv-slot" key={a.id}>
                  <div><time dateTime={a.starts_at}>{formatDateTime(a.starts_at)}</time><strong>{a.with}</strong>{a.note && <p>{a.note}</p>}</div>
                  <button type="button" className="btn btn--ghost dv-sm dv-danger" onClick={() => cancelAppt(a)}>Cancel</button>
                </div>
              ))}
            </section>
          </div>
        </div>
      </main>

      {modal?.type === 'view' && <PdfModal record={modal.record} onClose={() => setModal(null)} />}
      {modal?.type === 'schedule' && (
        <ScheduleModal patients={patients} onClose={() => setModal(null)} onDone={(m) => { setModal(null); say(m); load() }} />
      )}
    </div>
  )
}
