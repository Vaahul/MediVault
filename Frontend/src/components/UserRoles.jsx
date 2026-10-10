const roles = [
  {
    id: 'for-patients',
    name: 'Patients',
    tagline: 'Your records, your decisions.',
    points: [
      'Keep a personal medical profile',
      'Organize every record in one place',
      'Approve or reject doctor requests',
      'Share selected records with doctors',
    ],
  },
  {
    id: 'for-doctors',
    name: 'Doctors',
    tagline: 'Access that starts with consent.',
    points: [
      'Maintain a professional profile',
      'Request connections with patients',
      'View records only after approval',
      'Keep connected patients organized',
    ],
  },
  {
    id: 'for-family',
    name: 'Family members',
    tagline: 'Support without overreach.',
    points: [
      'Send or receive family requests',
      'Link through mutual approval',
      'See only what is permitted',
      'Help manage a loved one\u2019s care',
    ],
  },
]

export default function UserRoles() {
  return (
    <section className="section roles">
      <div className="container">
        <div className="section__head section__head--center">
          <p className="eyebrow">BUILT FOR EVERYONE INVOLVED</p>
          <h2>One Platform, Three Roles</h2>
          <p className="section__lead">
            Each role sees what it needs and nothing more.
          </p>
        </div>

        <div className="role-grid">
          {roles.map((r) => (
            <article key={r.id} id={r.id} className="rcard">
              <h3>{r.name}</h3>
              <p className="rcard__tag">{r.tagline}</p>
              <ul>
                {r.points.map((p) => (
                  <li key={p}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <circle cx="8" cy="8" r="8" fill="currentColor" fillOpacity=".14" />
                      <path d="m4.8 8.2 2.1 2.1 4.3-4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
