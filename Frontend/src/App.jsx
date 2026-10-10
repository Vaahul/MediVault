import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Landingpage from './pages/Landingpage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import PatientHome from './pages/PatientHome.jsx'
import DoctorHome from './pages/DoctorHome.jsx'
import { RequireRole } from './auth.jsx'

// Scrolls to #section links (e.g. "/#features") and resets scroll on page changes.
function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView()
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<Landingpage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/patient" element={<RequireRole role="patient"><PatientHome /></RequireRole>} />
        <Route path="/doctor" element={<RequireRole role="doctor"><DoctorHome /></RequireRole>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
