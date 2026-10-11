import { Link } from 'react-router-dom';

const AREAS = [
  {
    key: 'housing',
    title: 'Housing',
    text: 'A safe and dignified home: help with repairs, construction, purchase or a rent deposit when a family is in need.',
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M8 22 24 9l16 13" />
        <path d="M12 19v20h24V19" />
        <path d="M20 39V28h8v11" />
      </svg>
    ),
  },
  {
    key: 'education',
    title: 'Education',
    text: 'Keeping children and young people in school, college and skill courses, with support for fees and guidance.',
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M4 18 24 9l20 9-20 9z" />
        <path d="M12 22v9c0 3 5 6 12 6s12-3 12-6v-9" />
        <path d="M44 18v11" />
      </svg>
    ),
  },
  {
    key: 'business',
    title: 'Business',
    text: 'Growing a livelihood: counselling, mentoring and interest-free support to start, run or expand a business.',
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M6 18h36v22H6z" />
        <path d="M17 18v-5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5" />
        <path d="M6 27h36" />
        <path d="M22 27v4h4v-4" />
      </svg>
    ),
  },
];

const STEPS = [
  ['Reach out', 'Fill in the request form, or ask your Mauze committee to send you the family form on WhatsApp.'],
  ['Meet your counsellor', 'A committee member visits your home to understand your family’s situation and needs.'],
  ['Agree a plan', 'Together you decide the support that will make a real difference, with a clear goal.'],
  ['Walk together', 'Your counsellor stays in touch until your family is stable and self-reliant.'],
];

export default function Home() {
  return (
    <>
      <section className="hero2">
        <div className="pub-wrap hero2-grid">
          <div className="hero2-copy">
            <p className="hero2-ar" lang="ar" dir="rtl">
              رفع مستوى معيشة المؤمنين
            </p>
            <h1>Raising the standard of living of every Mumin family</h1>
            <p className="lede">
              The Upliftment Department works through your Mauze committee to help families with their home, their children’s education and their livelihood, with
              care, respect and confidentiality.
            </p>
            <div className="hero-actions">
              <Link className="btn lg" to="/request-support">
                Request support
              </Link>
              <a className="btn ghost lg" href="#steps">
                How it works
              </a>
            </div>
          </div>
          <div className="hero2-logo">
            <img src="/brand/logo-blue.png" alt="Upliftment Department logo" />
          </div>
        </div>
      </section>

      <section className="pub-section" id="areas">
        <div className="pub-wrap">
          <h2 className="center">What we help with</h2>
          <div className="areas">
            {AREAS.map((a) => (
              <article key={a.key} className={`area area-${a.key}`}>
                {a.icon}
                <h3>{a.title}</h3>
                <p>{a.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pub-section alt" id="steps">
        <div className="pub-wrap">
          <h2 className="center">How to get help</h2>
          <ol className="steps">
            {STEPS.map(([t, d]) => (
              <li key={t}>
                <h3>{t}</h3>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pub-section">
        <div className="pub-wrap promise">
          <img src="/brand/logo-red.png" alt="" aria-hidden="true" />
          <div>
            <h2>With dignity, in confidence</h2>
            <p className="section-lede">
              Whatever you share stays with the people helping your family. Support is given with izzat and kept private, as a brother helps a brother.
            </p>
            <Link className="btn" to="/request-support">
              Request support for your family
            </Link>
          </div>
        </div>
      </section>

      <section className="pub-cta">
        <div className="pub-wrap cta-row">
          <div>
            <h2>Already being helped?</h2>
            <p>Open the family app to see your plan, installments and trainings, and to send your monthly update to your counsellor.</p>
          </div>
          <Link className="btn lg light" to="/login">
            Open the family app
          </Link>
        </div>
      </section>
    </>
  );
}
