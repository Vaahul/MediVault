import { useState } from 'react'
import { Link } from 'react-router-dom'

export function Logo({ light = false }) {
  return (
    <Link to="/" className={`logo ${light ? 'logo--light' : ''}`} aria-label="MediVault home">
      <svg className="logo__icon" width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
        <rect width="34" height="34" rx="9" fill={light ? '#16A6A1' : '#102A43'} />
        <path d="M11 9.5h8.2L24 14.3V24a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 10 24V11a1.5 1.5 0 0 1 1-1.5Z" fill="#fff" fillOpacity=".12" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M17 15v6M14 18h6" stroke={light ? '#fff' : '#16A6A1'} strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span>MediVault</span>
    </Link>
  )
}

const links = [
  { label: 'Home', href: '/#home' },
  { label: 'Features', href: '/#features' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'For Doctors', href: '/#for-doctors' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header className="nav">
      <div className="container nav__inner">
        <Logo />

        <nav className={`nav__links ${open ? 'is-open' : ''}`} aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} to={l.href} onClick={close}>{l.label}</Link>
          ))}
          <div className="nav__actions nav__actions--mobile">
            <Link to="/login" className="btn btn--ghost" onClick={close}>Log In</Link>
            <Link to="/signup" className="btn btn--primary" onClick={close}>Get Started</Link>
          </div>
        </nav>

        <div className="nav__actions nav__actions--desktop">
          <Link to="/login" className="btn btn--ghost">Log In</Link>
          <Link to="/signup" className="btn btn--primary">Get Started</Link>
        </div>

        <button
          className={`nav__toggle ${open ? 'is-open' : ''}`}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span /><span /><span />
        </button>
      </div>
    </header>
  )
}
