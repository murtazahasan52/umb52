import { useParams } from 'react-router-dom';
import { api } from '../../api';
import { useLoad, Loading, ErrorBox } from '../../ui';
import { inr, date, num, CASE_TYPES, SCHEMES, CATEGORIES, MPI_DIMENSIONS, MPI_INDICATORS, UMOOR, HOUSING_PURPOSE, EDU_LEVEL, BUSINESS_PURPOSE, STAGES, FINAL } from '../../lib';
import { DOC_CATEGORIES } from '../../components/Documents';
import { checklistStatus } from './CaseMpi';

const dimLabel = (v) => (v === 'deprived' ? 'Deprived' : v === 'not_deprived' ? 'Not Deprived' : '');
const total = (b) => ['own', 'other', 'qardanHasana', 'enayat'].reduce((s, k) => s + (Number(b[k]) || 0), 0);

// Printable Upliftment Case Profile, laid out like the department's Word case file
export default function CasePrint() {
  const { id } = useParams();
  const d = useLoad(() => api(`/cases/${id}`), [id]);
  if (d.loading) return <Loading />;
  if (d.error) return <ErrorBox error={d.error} />;
  const c = d.data;
  const h = c.household || {};
  const m = c.mpi || {};
  const check = checklistStatus(c);
  const ind = Object.fromEntries((m.indicators || []).map((i) => [i.key, i]));
  const budget = UMOOR.map((u) => (m.budget || []).find((b) => b.umoor === u) || { umoor: u });
  const g = budget.reduce((a, b) => ({ own: a.own + (Number(b.own) || 0), other: a.other + (Number(b.other) || 0), qh: a.qh + (Number(b.qardanHasana) || 0), en: a.en + (Number(b.enayat) || 0) }), { own: 0, other: 0, qh: 0, en: 0 });
  const groups = [...new Set(MPI_INDICATORS.map((i) => i.group))];

  return (
    <div className="print-doc">
      <div className="print-tools no-print">
        <button className="btn" onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <button className="btn ghost" onClick={() => window.close()}>
          Close
        </button>
      </div>

      {/* Cover */}
      <section className="pp cover">
        <PrintHead />
        <h1 className="pp-title">Upliftment Case Profile</h1>
        <p className="pp-sub">
          {CASE_TYPES[c.caseType]} case, {SCHEMES[c.scheme]}
        </p>
        <h2>Check list</h2>
        <table className="pt">
          <thead>
            <tr>
              <th>Type</th>
              <th>Sr no.</th>
              <th>Document</th>
              <th>Attached (Yes/No)</th>
            </tr>
          </thead>
          <tbody>
            {check.map((r, i) => (
              <tr key={r.no}>
                <td>{i === 0 || check[i - 1].group !== r.group ? r.group : ''}</td>
                <td>{r.no}</td>
                <td>{r.label}</td>
                <td>{r.done ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="pt kvt">
          <tbody>
            <tr>
              <th>Case no.</th>
              <td>{c.caseNo}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 1.1 / 1.3 Case profile */}
      <section className="pp">
        <PrintHead small />
        <h2>Case Profile</h2>
        <table className="pt kvt">
          <tbody>
            <tr>
              <th>HOF Name</th>
              <td colSpan={3}>{h.headName}</td>
            </tr>
            <tr>
              <th>ITS ID</th>
              <td>{h.itsNo}</td>
              <th>Members</th>
              <td>{h.totalMembers}</td>
            </tr>
            <tr>
              <th>Mauze</th>
              <td>{c.mauze?.name}</td>
              <th>Jamiat</th>
              <td>{m.jamiat}</td>
            </tr>
            <tr>
              <th>Contact no.</th>
              <td colSpan={3}>{h.mobile || c.beneficiaryMobile}</td>
            </tr>
          </tbody>
        </table>
        <h3>Researcher Profile</h3>
        <table className="pt kvt">
          <tbody>
            <tr>
              <th>ITS ID</th>
              <td>{m.researcher?.itsNo}</td>
            </tr>
            <tr>
              <th>Name</th>
              <td>{m.researcher?.name}</td>
            </tr>
            <tr>
              <th>Contact no.</th>
              <td>{m.researcher?.mobile}</td>
            </tr>
            <tr>
              <th>Date</th>
              <td>{date(m.profileDate)}</td>
            </tr>
            <tr>
              <th>Researcher signature</th>
              <td className="sign" />
            </tr>
          </tbody>
        </table>
        <h3>Researcher remarks</h3>
        <div className="pbox">{m.researcherRemarks}</div>

        <h3>Family profile</h3>
        <table className="pt kvt">
          <tbody>
            <tr>
              <th>Family describes itself as</th>
              <td>{(h.categories || []).map((x) => CATEGORIES[x]).join(', ')}</td>
            </tr>
            <tr>
              <th>Main income / monthly income</th>
              <td>
                {h.mainIncomeSource || '—'} / {inr(h.monthlyHouseholdIncome)}
              </td>
            </tr>
            {h.business?.exists && (
              <tr>
                <th>Business</th>
                <td>
                  {[h.business.name, h.business.type].filter(Boolean).join(', ')}; turnover {inr(h.business.monthlyTurnover)}, net {inr(h.business.monthlyNetIncome)} per month
                </td>
              </tr>
            )}
            <tr>
              <th>Debts</th>
              <td>{inr(h.debts?.total)}</td>
            </tr>
          </tbody>
        </table>
        {h.members?.length > 0 && (
          <table className="pt">
            <thead>
              <tr>
                <th>Member</th>
                <th>Relation</th>
                <th>Age</th>
                <th>Occupation / class</th>
                <th>Income</th>
              </tr>
            </thead>
            <tbody>
              {h.members.map((x, i) => (
                <tr key={i}>
                  <td>{x.name}</td>
                  <td>{x.relation}</td>
                  <td>{x.age}</td>
                  <td>{x.occupation}</td>
                  <td>{x.earning ? inr(x.monthlyIncome) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3>Case details</h3>
        <table className="pt kvt">
          <tbody>
            <tr>
              <th>Case type / support route</th>
              <td>
                {CASE_TYPES[c.caseType]} / {SCHEMES[c.scheme]}
              </td>
            </tr>
            <tr>
              <th>Documented need</th>
              <td>{c.need}</td>
            </tr>
            {c.caseType === 'housing' && c.housing && (
              <tr>
                <th>Housing</th>
                <td>
                  {HOUSING_PURPOSE[c.housing.purpose]}. {c.housing.propertyDetails} Est. cost {inr(c.housing.estimatedCost)}, own contribution {inr(c.housing.ownContribution)}
                </td>
              </tr>
            )}
            {c.caseType === 'education' && c.education && (
              <tr>
                <th>Education</th>
                <td>
                  {c.education.studentName} ({c.education.relation}), {EDU_LEVEL[c.education.level] || ''} {c.education.course}, {c.education.institution}. Fees {inr(c.education.annualFees)}
                </td>
              </tr>
            )}
            {c.caseType === 'business' && c.businessDetail && (
              <tr>
                <th>Business</th>
                <td>
                  {BUSINESS_PURPOSE[c.businessDetail.purpose] || ''} {c.businessDetail.businessName}. Est. cost {inr(c.businessDetail.estimatedCost)}
                </td>
              </tr>
            )}
            <tr>
              <th>Target outcome</th>
              <td>{c.targetOutcome}</td>
            </tr>
            <tr>
              <th>Amounts</th>
              <td>
                Requested {inr(c.amountApplied)}, sanctioned {inr(c.financials?.sanctioned)}, disbursed {inr(c.financials?.disbursed)}, verified {inr(c.financials?.verified)}
              </td>
            </tr>
            <tr>
              <th>Status</th>
              <td>
                {STAGES[c.stage]}, {FINAL[c.finalStatus]}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 1.4 MPI survey + 2.1 analysis */}
      <section className="pp">
        <PrintHead small />
        <h2>MPI survey report</h2>
        <table className="pt">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Deprived / not deprived</th>
            </tr>
          </thead>
          <tbody>
            {MPI_DIMENSIONS.map(([k, l]) => (
              <tr key={k}>
                <td>{l}</td>
                <td>{dimLabel(m.dimensions?.[k])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>Deprivation summary (observation)</h3>
        <div className="pbox">{m.deprivationSummary}</div>
        <h2>MPI Analysis</h2>
        <h3>Applicable Sustainable Development Goals</h3>
        <div className="pbox">{m.sdgs}</div>
        <h3>Applicable Objectives</h3>
        <div className="pbox">{m.objectives}</div>
      </section>

      {/* 2.2 Deprivation investigation */}
      <section className="pp">
        <PrintHead small />
        <h2>Deprivation investigation</h2>
        {groups.map((gname) => (
          <div key={gname} className="avoid">
            <h3>{gname}</h3>
            <table className="pt">
              <thead>
                <tr>
                  <th style={{ width: '34%' }}>Indicator (tick the indicator applicable)</th>
                  <th>Detailed investigation (root cause)</th>
                </tr>
              </thead>
              <tbody>
                {MPI_INDICATORS.filter((i) => i.group === gname).map((i) => (
                  <tr key={i.key}>
                    <td>
                      {ind[i.key]?.applicable ? '☑' : '☐'} {i.indicator}
                    </td>
                    <td className="pre">{ind[i.key]?.investigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      {/* 2.3 Experts + 3.1 Action plan */}
      <section className="pp">
        <PrintHead small />
        <h2>Expert Advice (local) / Expert Consultation (Idara)</h2>
        {(m.experts?.length ? m.experts : [{ type: 'local' }, { type: 'idara' }]).map((e, i) => (
          <table className="pt avoid" key={i}>
            <tbody>
              <tr>
                <th>Type</th>
                <td>{e.type === 'idara' ? 'Idara' : 'Local'}</td>
                <th>Name & ITS</th>
                <td>
                  {e.name}
                  {e.itsNo ? ` (${e.itsNo})` : ''}
                </td>
              </tr>
              <tr>
                <th>Contact number</th>
                <td>{e.mobile}</td>
                <th>Expertise in</th>
                <td>{e.expertise}</td>
              </tr>
              <tr>
                <th>Dimension</th>
                <td>{e.dimension}</td>
                <th>Indicator</th>
                <td>{e.indicator}</td>
              </tr>
              <tr>
                <th>Proposed solution by expert</th>
                <td colSpan={3} className="pre tall">
                  {e.solution}
                </td>
              </tr>
            </tbody>
          </table>
        ))}
        <h2>Proposed action plan by researcher</h2>
        <table className="pt">
          <thead>
            <tr>
              <th>Sr no.</th>
              <th>Deprived indicator</th>
              <th>Proposed action plan</th>
              <th>Person responsible</th>
              <th>Time required</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(7, m.actionPlan?.length || 0) }).map((_, i) => {
              const a = m.actionPlan?.[i] || {};
              return (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{a.indicator}</td>
                  <td className="pre">{a.plan}</td>
                  <td>{a.responsible}</td>
                  <td>{a.timeRequired}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* 3.2 Budget */}
      <section className="pp landscape-ish">
        <PrintHead small />
        <h2>Budget sheet</h2>
        <table className="pt budget-print">
          <thead>
            <tr>
              <th colSpan={6}>Particulars</th>
              <th colSpan={5}>Financials</th>
            </tr>
            <tr>
              <th>Umoor</th>
              <th>Scope</th>
              <th>H.R (Counts)</th>
              <th>Skills (Type of Professional)</th>
              <th>Time Frame</th>
              <th />
              <th>Own Contribution (INR)</th>
              <th>Other Contribution (INR)</th>
              <th>Qardan Hasana (INR)</th>
              <th>Enayat (INR)</th>
              <th>Total (INR)</th>
            </tr>
          </thead>
          <tbody>
            {budget.map((b) => (
              <tr key={b.umoor}>
                <td>{b.umoor.toUpperCase()}</td>
                <td>
                  Potential: {b.potential ? 'Y' : ''}
                  <br />
                  Willingness: {b.willingness ? 'Y' : ''}
                </td>
                <td>{b.hrCount}</td>
                <td>{b.skills}</td>
                <td>{b.timeFrame}</td>
                <td />
                <td className="r">{b.own ? num(b.own) : ''}</td>
                <td className="r">{b.other ? num(b.other) : ''}</td>
                <td className="r">{b.qardanHasana ? num(b.qardanHasana) : ''}</td>
                <td className="r">{b.enayat ? num(b.enayat) : ''}</td>
                <td className="r">{total(b) ? num(total(b)) : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6}>GRAND TOTAL</td>
              <td className="r">{num(g.own)}</td>
              <td className="r">{num(g.other)}</td>
              <td className="r">{num(g.qh)}</td>
              <td className="r">{num(g.en)}</td>
              <td className="r">{num(g.own + g.other + g.qh + g.en)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* 4.2 Consents + 4.3 Journal + attachments */}
      <section className="pp">
        <PrintHead small />
        <h2>Consent forms</h2>
        <table className="pt">
          <thead>
            <tr>
              <th>Designated person</th>
              <th>Name</th>
              <th>Signature</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['aamil', 'Aamil Saheb'],
              ['jamaatSecretary', 'Jamaat Secretary'],
              ['marafiqMember', 'Marafiq Burhaniyah member'],
            ].map(([k, l]) => (
              <tr key={k}>
                <td>{l}</td>
                <td>{m.consents?.[k]?.name}</td>
                <td className="sign">{m.consents?.[k]?.signed ? '(signed copy attached)' : ''}</td>
                <td>{m.consents?.[k]?.date ? date(m.consents[k].date) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Daily journal log</h2>
        <table className="pt">
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Date</th>
              <th>Activity</th>
            </tr>
          </thead>
          <tbody>
            {(m.journal?.length ? m.journal : Array.from({ length: 6 }).map(() => ({}))).map((j, i) => (
              <tr key={i}>
                <td>{j.date ? date(j.date) : ''}</td>
                <td className="pre">{j.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Attachments</h2>
        <table className="pt">
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {(c.documents || []).length === 0 ? (
              <tr>
                <td colSpan={3}>No documents uploaded.</td>
              </tr>
            ) : (
              c.documents.map((x) => (
                <tr key={x._id}>
                  <td>{x.title}</td>
                  <td>{DOC_CATEGORIES[x.category] || x.category}</td>
                  <td>{date(x.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <p className="pfoot">Printed {date(new Date())}. Confidential: for authorised committee members only.</p>
      </section>
    </div>
  );
}

function PrintHead({ small }) {
  return (
    <div className={`ph ${small ? 'small' : ''}`}>
      <img src="/brand/logo-blue.png" alt="Upliftment Department" />
      <div className="ph-mid">
        <strong>Upliftment Department</strong>
        <span lang="ar" dir="rtl">
          رفع مستوى معيشة المؤمنين
        </span>
      </div>
      <img src="/brand/logo-red.png" alt="" />
    </div>
  );
}
