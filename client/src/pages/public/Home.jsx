import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useLoad } from '../../ui';
import { num } from '../../lib';

const QUESTIONS = [
  'Who needs support?',
  'What kind of support will make a genuine difference?',
  'Was the support delivered and used properly?',
  'Is the family’s situation actually better?',
  'What is needed next to reach lasting self-reliance?',
];

const MEASURES = [
  { name: 'Sanctioned', text: 'What the review committee approved, and why.' },
  { name: 'Disbursed', text: 'What actually reached the family, tranche by tranche.' },
  { name: 'Properly used', text: 'What was verified against invoices, stock and site visits.' },
  { name: 'Outcome', text: 'Income, jobs and stability compared with the baseline.' },
];

const LEVELS = [
  { who: 'HQ / scheme authority', does: 'Policy, budgets, sanction guidelines and the consolidated impact review.' },
  { who: 'Zonal Business Council', does: 'Case scrutiny, sanction decisions, the mentoring network and quarterly performance review.' },
  { who: 'Mauze committee', does: 'Household survey, field verification, counselling and monthly follow-up.' },
  { who: 'The family', does: 'Agreed goals, proper use of funds, simple records and a monthly progress update from the app.' },
];

export default function Home() {
  const stats = useLoad(() => api('/public/stats'), []);
  const s = stats.data;
  return (
    <>
      <section className="hero">
        <div className="pub-wrap hero-grid">
          <div className="hero-copy">
            <h1>Every family, followed from first conversation to lasting change.</h1>
            <p className="lede">
              A shared register for Mauze committees in villages and small towns. It records each family’s needs, the support agreed, how funds were used, and whether life
              actually improved, so Tijaarat Raabehah and Qardan Hasana are measured by stable families, not by amounts distributed.
            </p>
            <div className="hero-actions">
              <Link className="btn lg" to="/request-support">
                Request support for your family
              </Link>
              <Link className="btn ghost lg" to="/framework">
                See how cases are reviewed
              </Link>
            </div>
            {s && (
              <dl className="hero-facts">
                <div>
                  <dt>Mauzes on the register</dt>
                  <dd>{num(s.mauzes)}</dd>
                </div>
                <div>
                  <dt>Households assessed</dt>
                  <dd>{num(s.households)}</dd>
                </div>
                <div>
                  <dt>Families with a plan</dt>
                  <dd>{num(s.cases)}</dd>
                </div>
              </dl>
            )}
          </div>
          <figure className="arch" aria-label="The five questions answered for every beneficiary">
            <figcaption>Asked of every case</figcaption>
            <ol>
              {QUESTIONS.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </figure>
        </div>
      </section>

      <section className="pub-section">
        <div className="pub-wrap">
          <h2>Four numbers that are never added together</h2>
          <p className="section-lede">Approving support, paying it, using it well and improving a family’s life are four different things. Each case keeps them apart.</p>
          <div className="ledger">
            {MEASURES.map((m, i) => (
              <div className="ledger-col" key={m.name}>
                <span className="ledger-step">{i + 1}</span>
                <h3>{m.name}</h3>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
          <p className="note">A family repaying on time whose income has not improved is not counted as a success. Its plan is revised instead.</p>
        </div>
      </section>

      <section className="pub-section alt">
        <div className="pub-wrap two-col">
          <div>
            <h2>Clear responsibility at every level</h2>
            <p className="section-lede">Every family has a named counsellor, and every case is reviewed independently at the next level. The register supports existing HQ controls; it does not bypass them.</p>
          </div>
          <ul className="levels">
            {LEVELS.map((l) => (
              <li key={l.who}>
                <strong>{l.who}</strong>
                <span>{l.does}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pub-section">
        <div className="pub-wrap two-col">
          <div>
            <h2>Built for small towns</h2>
            <p className="section-lede">
              Each Mauze chooses a few priority sectors from local demand and skills, rather than steering everyone into the same business.
            </p>
          </div>
          <ul className="plain-list">
            <li>Home and micro businesses: tailoring, food production, repairs and small trading</li>
            <li>Youth: digital skills, apprenticeships, job placement and first ventures</li>
            <li>Women entrepreneurs: home-based ventures, market access and suitable training</li>
            <li>Existing shops: accounts, stock control, GST and Udyam, digital payments</li>
            <li>Market links to nearby towns, larger businesses, exhibitions and online sales</li>
          </ul>
        </div>
      </section>

      <section className="pub-cta">
        <div className="pub-wrap cta-row">
          <div>
            <h2>Already receiving support?</h2>
            <p>Log in to the family app to see your plan, upcoming installments and trainings, and send your monthly update to your counsellor.</p>
          </div>
          <Link className="btn lg light" to="/login">
            Open the family app
          </Link>
        </div>
      </section>
    </>
  );
}
