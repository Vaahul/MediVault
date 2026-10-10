import { Link } from 'react-router-dom'

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M3 7.5 5.8 10 11 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function DashboardPreview() {
  return (
    <div className="preview" role="img" aria-label="Sample MediVault dashboard with fictional patient data">
      <div className="preview__bar">
        <span /><span /><span />
        <p>Records overview</p>
        <em className="pill pill--teal">Demo data</em>
      </div>

      <div className="preview__body">
        <div className="pcard pcard--profile">
          <div className="avatar avatar--lg">AR</div>
          <div className="pcard__meta">
            <h4>Aanya Rao</h4>
            <p>34 yrs · Blood group O+</p>
            <div className="tags">
              <span className="tag">Penicillin allergy</span>
              <span className="tag">Asthma</span>
            </div>
          </div>
          <span className="pill pill--green"><Check /> Verified</span>
        </div>

        <div className="preview__grid">
          <div className="pcard">
            <div className="pcard__head">
              <h5>Recent lab report</h5>
              <span className="pcard__date">12 Sep</span>
            </div>
            <p className="pcard__sub">Complete blood count</p>
            <ul className="bars">
              <li><span>Hemoglobin</span><div><i style={{ width: '78%' }} /></div><b>13.6</b></li>
              <li><span>WBC</span><div><i style={{ width: '56%' }} /></div><b>6.4</b></li>
              <li><span>Platelets</span><div><i style={{ width: '68%' }} /></div><b>248</b></li>
            </ul>
            <span className="pill pill--green">All in normal range</span>
          </div>

          <div className="pcard">
            <div className="pcard__head">
              <h5>Prescription</h5>
              <span className="pcard__date">Active</span>
            </div>
            <div className="rx">
              <div className="rx__icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-40 12 12)" stroke="currentColor" strokeWidth="1.8" /><path d="m9.5 9.5 5 5" stroke="currentColor" strokeWidth="1.8" /></svg>
              </div>
              <div>
                <strong>Montelukast 10 mg</strong>
                <p>Once daily, evening</p>
              </div>
            </div>
            <p className="pcard__sub">Prescribed by Dr. Mehta</p>
          </div>

          <div className="pcard pcard--appt">
            <div className="appt__date"><b>18</b><span>Oct</span></div>
            <div>
              <h5>Upcoming appointment</h5>
              <p className="pcard__sub">Follow-up · 10:30 AM</p>
            </div>
          </div>

          <div className="pcard">
            <h5>Connections</h5>
            <ul className="conns">
              <li>
                <span className="avatar avatar--navy">DM</span>
                <div><strong>Dr. Mehta</strong><p>Pulmonologist</p></div>
                <span className="dot dot--on" title="Approved" />
              </li>
              <li>
                <span className="avatar avatar--teal">VR</span>
                <div><strong>Vikram</strong><p>Family · Limited access</p></div>
                <span className="dot dot--on" title="Approved" />
              </li>
              <li>
                <span className="avatar avatar--sand">SK</span>
                <div><strong>Dr. Kapoor</strong><p>Request pending</p></div>
                <span className="dot dot--wait" title="Pending" />
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Hero() {
  return (
    <section className="hero" id="home">
      <div className="container hero__inner">
        <div className="hero__copy">
          <p className="eyebrow">YOUR HEALTH, ORGANIZED</p>
          <h1>Every Medical Record. One Connected Place.</h1>
          <p className="hero__lead">
            Bring your medical reports, prescriptions, and health history together. Share the right
            information with doctors and family, with your permission.
          </p>
          <div className="hero__cta">
            <Link to="/signup" className="btn btn--primary btn--lg">Get Started</Link>
            <a href="#features" className="btn btn--outline btn--lg">Explore Features</a>
          </div>
          <ul className="hero__trust">
            <li><Check /> You approve every connection</li>
            <li><Check /> You choose what is shared</li>
          </ul>
        </div>
        <div className="hero__visual">
          <DashboardPreview />
        </div>
      </div>
    </section>
  )
}
