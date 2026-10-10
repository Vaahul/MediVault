import { Link } from 'react-router-dom'
import { Logo } from './Navbar.jsx'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Logo light />
          <p>Organized medical records, shared with your permission.</p>
        </div>

        <nav className="footer__cols" aria-label="Footer">
          <div>
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
          </div>
          <div>
            <h4>Who it&rsquo;s for</h4>
            <a href="#for-patients">Patients</a>
            <a href="#for-doctors">Doctors</a>
            <a href="#for-family">Family members</a>
          </div>
          <div>
            <h4>Account</h4>
            <Link to="/login">Log In</Link>
            <Link to="/signup">Get Started</Link>
          </div>
        </nav>
      </div>
      <div className="container footer__bottom">
        <p>&copy; {new Date().getFullYear()} MediVault. All sample patient data on this page is fictional.</p>
      </div>
    </footer>
  )
}
