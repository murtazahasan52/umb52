const CHECKPOINTS = [
  ['Identify every family and assess its needs', 'A confidential household and livelihood survey: income sources, business, debts, housing, education, health, skills and existing support.', 'What share of the community has been assessed, and how many families have a support plan?'],
  ['Prepare an individual upliftment plan', 'A plan built on actual needs, not an automatic loan: expansion, employment, skills, education, counselling or mentoring, with an outcome for 6–12 months.', 'Does each family have a documented need, agreed intervention, named counsellor and review date?'],
  ['Match the person to the right scheme', 'Tijaarat Raabehah, Qardan Hasana, skill and employment support, or family welfare, with the terms and obligations explained.', 'Was the most suitable assistance chosen, and was the applicant informed?'],
  ['Verify feasibility before sanction', 'Purpose, demand, margins, cash flow, liabilities, repayment capacity and security. Working capital and fixed assets are separated, and reasons are recorded.', 'Is the support viable, affordable to repay and proportionate to need?'],
  ['Verify actual use of funds', 'Invoices, payment evidence and site visits confirm purchases. Diversion or delay is caught early.', 'How much of the disbursed amount was used as approved, and what asset or income resulted?'],
  ['Monitor business and family outcomes', 'Monthly sales, margin, profit, stock, receivables, repayments, jobs and household income against the baseline.', 'Is the family actually better off, not just running a larger business?'],
  ['Build capability and independence', 'Accounts, pricing, stock, GST and Udyam, digital payments and marketing, mentoring from experienced businesspeople.', 'Can the beneficiary manage finances and decide independently?'],
  ['Review impact and close gaps', 'Scale successful cases, correct underperforming ones with a recovery plan, and separate growth needs from recurring distress.', 'Has the support produced a measurable benefit, and what happens next?'],
];

const FREQUENCY = [
  ['Initial assessment', 'Household survey, needs and baseline', 'Local team'],
  ['Before sanction', 'Eligibility, feasibility and documents', 'Authorised review committee'],
  ['Within 30 days of disbursement', 'Receipt and initial use confirmed', 'Local counsellor'],
  ['Monthly', 'Business progress and repayment status', 'Beneficiary and counsellor'],
  ['Quarterly', 'Site visit, financial review, corrective action', 'Local committee / ZBC'],
  ['Half-yearly', 'Income, jobs, family outcomes, programme effectiveness', 'ZBC and scheme authority'],
  ['Annually', 'Consolidated impact, fund use, next-year plan', 'ZBC / HQ'],
];

const COMPARE = [
  ['Primary objective', 'Appropriate interest-free financial assistance', 'Business development and economic upliftment'],
  ['Before support', 'Eligibility, need, cash flow, repayment capacity, policy', 'Business diagnosis, skill gaps, growth opportunities'],
  ['During support', 'Approved use, documentation, repayment monitoring', 'Mentoring, training, formalization, market access'],
  ['Main result', 'Need met with sustainable repayment', 'Better practices, sales, margins, market access, jobs'],
  ['Warning signs', 'Diverted funds, repayment stress, repeated borrowing', 'Training without application, weak follow-up, no progress'],
];

export default function Framework() {
  return (
    <div className="pub-wrap page">
      <h1>How every case is reviewed</h1>
      <p className="lede">Eight checkpoints take a family from first survey to measured outcome. Each one ends with a question the committee must be able to answer.</p>

      <ol className="checkpoints">
        {CHECKPOINTS.map(([t, d, q]) => (
          <li key={t}>
            <h3>{t}</h3>
            <p>{d}</p>
            <p className="checkq">{q}</p>
          </li>
        ))}
      </ol>

      <h2>Review calendar</h2>
      <p className="section-lede">Education, medical and other time-sensitive welfare cases follow the nature of the need rather than the business cycle.</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>What is checked</th>
              <th>Who</th>
            </tr>
          </thead>
          <tbody>
            {FREQUENCY.map((r) => (
              <tr key={r[0]}>
                {r.map((c) => (
                  <td key={c}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Qardan Hasana and Tijaarat Raabehah are measured differently</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th />
              <th>Qardan Hasana</th>
              <th>Tijaarat Raabehah</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((r) => (
              <tr key={r[0]}>
                <th scope="row">{r[0]}</th>
                <td>{r[1]}</td>
                <td>{r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Early warnings</h2>
      <div className="warn-levels">
        <div className="wl wl-high">
          <h3>Immediate intervention</h3>
          <p>Funds used for an unapproved purpose, business closure, documentation irregularity, serious repayment distress or urgent family hardship.</p>
          <p className="wl-act">Verify facts, contact the family discreetly and refer to the authorised committee.</p>
        </div>
        <div className="wl wl-medium">
          <h3>Corrective action</h3>
          <p>Sales falling steadily, stock not moving, receivables rising, training not applied or repayments starting to slip.</p>
          <p className="wl-act">A written recovery plan with a responsible mentor and a review date.</p>
        </div>
        <div className="wl wl-on_track">
          <h3>On track</h3>
          <p>Funds used appropriately, records kept, repayments on schedule and outcomes improving.</p>
          <p className="wl-act">Routine monitoring, and further eligible support based on evidence.</p>
        </div>
      </div>
      <p className="note">Monitoring is supportive, respectful and confidential. Information is shared only with authorised members.</p>
    </div>
  );
}
