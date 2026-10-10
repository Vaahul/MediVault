import { Link } from 'react-router-dom'

export default function FinalCTA() {
  return (
    <section className="cta" id="get-started">
      <div className="container">
        <div className="cta__panel">
          <h2>Bring Your Health Records Together</h2>
          <p>
            Start with one organized profile. Connect doctors and family when you are ready, and stay in charge of every approval.
          </p>
          <div className="cta__actions">
            <Link to="/signup" className="btn btn--teal btn--lg">Get Started</Link>
            <a href="#features" className="btn btn--light btn--lg">Explore Features</a>
          </div>
        </div>
      </div>
    </section>
  )
}
