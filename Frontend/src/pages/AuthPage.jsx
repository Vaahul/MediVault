import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/Navbar.jsx'
import { api } from '../api.js'
import { homeFor, useAuth } from '../auth.jsx'

const ROLES = {
  patient: {
    tab: 'Patient',
    title: 'Your records, in your hands',
    text: 'Keep every report and prescription organized, and decide who sees what.',
    points: [
      'Approve or reject doctor requests',
      'Share only the records you choose',
      'Connect family through mutual approval',
    ],
  },
  doctor: {
    tab: 'Doctor',
    title: 'Care that starts with consent',
    text: 'Request connections with patients and view the records they allow you to see.',
    points: [
      'Build a professional profile',
      'Request patient connections',
      'Access records after approval',
    ],
  },
}

const SPECIALIZATIONS = [
  'General Physician', 'Cardiologist', 'Dermatologist', 'Endocrinologist', 'Neurologist',
  'Orthopedist', 'Pediatrician', 'Psychiatrist', 'Pulmonologist', 'Other',
]

const F = {
  name: { name: 'name', label: 'Full name', type: 'text', autoComplete: 'name' },
  doctorName: { name: 'name', label: 'Full name', type: 'text', autoComplete: 'name', placeholder: 'Dr. First Last' },
  email: { name: 'email', label: 'Email address', type: 'email', autoComplete: 'email', placeholder: 'you@example.com' },
  dob: { name: 'dob', label: 'Date of birth', type: 'date', autoComplete: 'bday' },
  specialization: { name: 'specialization', label: 'Specialization', type: 'select', options: SPECIALIZATIONS },
  registration: { name: 'registration', label: 'Medical registration number', type: 'text', placeholder: 'As on your registration certificate' },
  workplace: { name: 'workplace', label: 'Hospital or clinic', type: 'text', autoComplete: 'organization' },
  password: { name: 'password', label: 'Password', type: 'password' },
  confirm: { name: 'confirm', label: 'Confirm password', type: 'password' },
}

const FIELDS = {
  login: {
    patient: [F.email, F.password],
    doctor: [F.email, F.password],
  },
  signup: {
    patient: [F.name, F.email, F.dob, F.password, F.confirm],
    doctor: [F.doctorName, F.email, F.specialization, F.registration, F.workplace, F.password, F.confirm],
  },
}

function validate(mode, values, fields, agreed) {
  const errors = {}
  fields.forEach((f) => {
    const v = (values[f.name] || '').trim()
    if (!v) errors[f.name] = `Enter ${f.label.toLowerCase()}.`
  })
  if (!errors.email && !/^\S+@\S+\.\S+$/.test(values.email)) errors.email = 'Enter a valid email address.'
  if (mode === 'signup') {
    if (!errors.password && values.password.length < 8) errors.password = 'Use at least 8 characters.'
    if (!errors.confirm && values.confirm !== values.password) errors.confirm = 'Passwords do not match.'
    if (!errors.dob && new Date(values.dob) > new Date()) errors.dob = 'Date of birth cannot be in the future.'
    if (!agreed) errors.agreed = 'Accept the terms to create your account.'
  }
  return errors
}

function Field({ field, value, error, onChange, mode }) {
  const [show, setShow] = useState(false)
  const id = `field-${field.name}`
  const isPassword = field.type === 'password'
  const autoComplete = isPassword ? (mode === 'login' ? 'current-password' : 'new-password') : field.autoComplete

  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{field.label}</label>
      <div className="field__control">
        {field.type === 'select' ? (
          <select id={id} name={field.name} value={value} onChange={onChange} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}>
            <option value="">Select specialization</option>
            {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            id={id}
            name={field.name}
            type={isPassword && show ? 'text' : field.type}
            value={value}
            onChange={onChange}
            placeholder={field.placeholder}
            autoComplete={autoComplete}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-err` : undefined}
          />
        )}
        {isPassword && (
          <button type="button" className="field__toggle" onClick={() => setShow(!show)} aria-pressed={show}>
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error && <p className="field__error" id={`${id}-err`}>{error}</p>}
    </div>
  )
}

function AuthForm({ mode, role }) {
  const fields = FIELDS[mode][role]
  const [values, setValues] = useState({})
  const [errors, setErrors] = useState({})
  const [agreed, setAgreed] = useState(false)
  const [remember, setRemember] = useState(false)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const { setUser } = useAuth()

  const onChange = (e) => {
    const { name, value } = e.target
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const found = validate(mode, values, fields, agreed)
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length > 0) return

    setBusy(true)
    try {
      const body = { ...values, role }
      const res = mode === 'login'
        ? await api.login({ email: values.email, password: values.password, role, remember })
        : await api.signup(body)
      setUser(res.user) // the route then redirects to the right home page
    } catch (err) {
      setFormError(err.message)
      setBusy(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      {fields.map((f) => (
        <Field key={f.name} field={f} mode={mode} value={values[f.name] || ''} error={errors[f.name]} onChange={onChange} />
      ))}

      {mode === 'login' ? (
        <div className="auth-form__row">
          <label className="check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>Keep me signed in</span>
          </label>
        </div>
      ) : (
        <div className={`field ${errors.agreed ? 'has-error' : ''}`}>
          <label className="check">
            <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setErrors((er) => ({ ...er, agreed: undefined })) }} />
            <span>I agree to the Terms and Privacy Policy.</span>
          </label>
          {errors.agreed && <p className="field__error">{errors.agreed}</p>}
        </div>
      )}

      {mode === 'signup' && role === 'doctor' && (
        <p className="note">Your registration details are reviewed before you can send patient connection requests.</p>
      )}

      {formError && <p className="field__error" role="alert">{formError}</p>}

      <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={busy}>
        {busy
          ? 'Please wait…'
          : mode === 'login' ? `Log in as ${ROLES[role].tab.toLowerCase()}` : `Create ${ROLES[role].tab.toLowerCase()} account`}
      </button>
    </form>
  )
}

export default function AuthPage({ mode }) {
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const role = params.get('role') === 'doctor' ? 'doctor' : 'patient'
  const info = ROLES[role]
  const isLogin = mode === 'login'

  const selectRole = (r) => setParams({ role: r }, { replace: true })
  const onTabKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      selectRole(role === 'patient' ? 'doctor' : 'patient')
      requestAnimationFrame(() => document.getElementById(`tab-${role === 'patient' ? 'doctor' : 'patient'}`)?.focus())
    }
  }

  const otherPath = isLogin ? '/signup' : '/login'

  // Already logged in: go straight to the right home page.
  if (user) return <Navigate to={homeFor(user)} replace />

  return (
    <div className="auth">
      <header className="auth__top">
        <div className="container auth__top-inner">
          <Logo />
          <Link to="/" className="link">Back to home</Link>
        </div>
      </header>

      <div className="container auth__layout">
        <aside className="auth__aside" aria-live="polite">
          <h2>{info.title}</h2>
          <p>{info.text}</p>
          <ul>
            {info.points.map((p) => (
              <li key={p}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="8" fill="#16A6A1" fillOpacity=".25" />
                  <path d="m4.8 8.2 2.1 2.1 4.3-4.6" stroke="#5FD8D3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {p}
              </li>
            ))}
          </ul>
        </aside>

        <main className="auth__card">
          <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
          <p className="auth__sub">{isLogin ? 'Log in to your MediVault account.' : 'Choose your role to get started.'}</p>

          <div className="tabs" role="tablist" aria-label="Account type" onKeyDown={onTabKey}>
            {Object.entries(ROLES).map(([key, r]) => (
              <button
                key={key}
                id={`tab-${key}`}
                role="tab"
                type="button"
                aria-selected={role === key}
                aria-controls="auth-panel"
                tabIndex={role === key ? 0 : -1}
                className={`tabs__tab ${role === key ? 'is-active' : ''}`}
                onClick={() => selectRole(key)}
              >
                For {key === 'patient' ? 'patients' : 'doctors'}
              </button>
            ))}
          </div>

          <div id="auth-panel" role="tabpanel" aria-labelledby={`tab-${role}`}>
            <AuthForm key={`${mode}-${role}`} mode={mode} role={role} />
          </div>

          <p className="auth__switch">
            {isLogin ? 'New to MediVault? ' : 'Already have an account? '}
            <Link to={`${otherPath}?role=${role}`} className="link">{isLogin ? 'Create an account' : 'Log in'}</Link>
          </p>
        </main>
      </div>
    </div>
  )
}
