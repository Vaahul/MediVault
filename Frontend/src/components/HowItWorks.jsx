const steps = [
  {
    title: 'Build your health profile',
    text: 'Add your details, allergies, and medical history, then upload reports, prescriptions, and scans.',
  },
  {
    title: 'Connect with your doctors',
    text: 'Doctors send a connection request. You review it and approve or reject it.',
  },
  {
    title: 'Choose what to share',
    text: 'Pick the records each doctor can see. Nothing is visible until you allow it.',
  },
  {
    title: 'Bring your family in',
    text: 'Link with family through mutual approval and give each person only the access you decide.',
  },
]

export default function HowItWorks() {
  return (
    <section className="section how" id="how-it-works">
      <div className="container">
        <div className="section__head section__head--center">
          <p className="eyebrow">HOW IT WORKS</p>
          <h2>Four Steps, Always Under Your Control</h2>
          <p className="section__lead">
            Every connection needs approval, and every record is shared by choice.
          </p>
        </div>

        <ol className="steps">
          {steps.map((s, i) => (
            <li key={s.title} className="step">
              <span className="step__num">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
