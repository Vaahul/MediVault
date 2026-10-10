const features = [
  {
    key: 'organize',
    title: 'Everything in One Place',
    text: 'Organize prescriptions, test results, scans, and medical history in a structured collection.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M4 9a2 2 0 0 1 2-2h5l2.5 2.5H22a2 2 0 0 1 2 2V21a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M14 13v6M11 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    chips: ['Reports', 'Prescriptions', 'Scans', 'History'],
  },
  {
    key: 'share',
    title: 'Sharing on Your Terms',
    text: 'Establish approved doctor connections and choose which records to share.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M14 3.5 22.5 7v6.2c0 5-3.4 9-8.5 11.3C8.9 22.2 5.5 18.2 5.5 13.2V7L14 3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="m10.2 14 2.8 2.8 5-5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    chips: ['Approve requests', 'Pick records', 'Revoke anytime'],
  },
  {
    key: 'connect',
    title: 'Healthcare, Connected',
    text: 'Keep family members connected through mutually approved relationships and appropriate permissions.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="19.5" cy="11.5" r="2.8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 22c.5-3.8 3.1-6 6.5-6s6 2.2 6.5 6M17.5 16.5c3 0 5.7 1.5 6.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    chips: ['Mutual approval', 'Set permissions'],
  },
]

export default function Features() {
  return (
    <section className="section features" id="features">
      <div className="container">
        <div className="section__head">
          <p className="eyebrow">FEATURES</p>
          <h2>Your Health Records, Without the Clutter</h2>
          <p className="section__lead">
            Three simple ideas keep your medical life organized, private, and shared only with the people you trust.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((f) => (
            <article key={f.key} className={`fcard fcard--${f.key}`}>
              <div className="fcard__icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
              <ul className="fcard__chips">
                {f.chips.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
