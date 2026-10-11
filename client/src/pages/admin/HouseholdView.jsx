import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { UploadBox, DocumentList } from '../../components/Documents';
import { TypeBadge } from '../../components/TypeDetails';
import { SendFormModal, ShareLink } from './Forms';
import { uploadAndAttach } from './CaseDocs';
import { api } from '../../api';
import { useLoad, Loading, ErrorBox, RiskBadge, StageBadge, FinalBadge } from '../../ui';
import { CATEGORIES, NEED, SCHEMES, inr, date, num } from '../../lib';

export default function HouseholdView() {
  const { id } = useParams();
  const d = useLoad(() => api(`/households/${id}`), [id]);
  const [sendOpen, setSendOpen] = useState(false);
  const [share, setShare] = useState(null);
  if (d.loading) return <Loading />;
  if (d.error) return <ErrorBox error={d.error} onRetry={d.reload} />;
  const { household: h, cases } = d.data;
  const yes = (b) => (b ? 'Yes' : 'No');

  return (
    <div className="page-admin">
      <div className="page-head">
        <div>
          <h1>{h.headName}</h1>
          <p className="sub">
            {h.code}, {h.mauze?.name}
            {h.itsNo ? `, ITS ${h.itsNo}` : ''}
            {h.mobile ? `, ${h.mobile}` : ''}
          </p>
        </div>
        <div className="head-actions">
          <button className="btn ghost" onClick={() => setSendOpen(true)}>
            Send update form
          </button>
          <Link className="btn ghost" to={`/admin/households/${h._id}/edit`}>
            Edit survey
          </Link>
          <Link className="btn" to={`/admin/cases/new?household=${h._id}`}>
            Open a case
          </Link>
        </div>
      </div>

      <div className="cols-2">
        <section className="panel">
          <h2>Summary</h2>
          <dl className="kv">
            <dt>Categories</dt>
            <dd>{(h.categories || []).map((c) => CATEGORIES[c]).join(', ') || '—'}</dd>
            <dt>Members / earning</dt>
            <dd>
              {num(h.totalMembers)} / {num(h.earningMembers)}
            </dd>
            <dt>Main income</dt>
            <dd>{h.mainIncomeSource || '—'}</dd>
            <dt>Monthly income</dt>
            <dd>{inr(h.monthlyHouseholdIncome)}</dd>
            <dt>Debts</dt>
            <dd>
              {inr(h.debts?.total)} {h.debts?.monthlyEmi ? `(EMI ${inr(h.debts.monthlyEmi)})` : ''}
            </dd>
            <dt>Housing</dt>
            <dd>{h.housing || '—'}</dd>
            <dt>Level of need</dt>
            <dd>
              <span className={`need need-${h.needLevel}`}>{NEED[h.needLevel]}</span>
            </dd>
            <dt>Assessed</dt>
            <dd>{h.assessedAt ? `${date(h.assessedAt)}${h.assessedBy ? ` by ${h.assessedBy.name}` : ''}` : 'Not yet'}</dd>
          </dl>
        </section>
        <section className="panel">
          <h2>Business</h2>
          {h.business?.exists ? (
            <dl className="kv">
              <dt>Name / type</dt>
              <dd>
                {h.business.name || '—'}, {h.business.type || '—'}
              </dd>
              <dt>Years running</dt>
              <dd>{num(h.business.yearsRunning)}</dd>
              <dt>Monthly turnover</dt>
              <dd>{inr(h.business.monthlyTurnover)}</dd>
              <dt>Net income</dt>
              <dd>{inr(h.business.monthlyNetIncome)}</dd>
              <dt>GST / Udyam</dt>
              <dd>
                {yes(h.business.gstRegistered)} / {yes(h.business.udyamRegistered)}
              </dd>
              <dt>Digital payments</dt>
              <dd>{yes(h.business.digitalPayments)}</dd>
            </dl>
          ) : (
            <p className="muted">No business recorded.</p>
          )}
        </section>
      </div>

      <div className="cols-2">
        <section className="panel">
          <h2>Needs, skills and opportunities</h2>
          <dl className="kv">
            {[
              ['Housing need', h.housingNeed],
              ['Education need', h.educationNeed],
              ['Healthcare need', h.healthcareNeed],
              ['Other needs', h.otherNeeds],
              ['Skills', h.skills],
              ['Employment interests', h.employmentInterests],
              ['Business opportunities', h.businessOpportunities],
            ].map(([k, v]) => (
              <div className="kv-row" key={k}>
                <dt>{k}</dt>
                <dd>{v || '—'}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="panel">
          <h2>Existing support</h2>
          <dl className="kv">
            <dt>Qardan Hasana</dt>
            <dd>{h.existingQH ? inr(h.existingQHAmount) : 'No'}</dd>
            <dt>Tijaarat Raabehah</dt>
            <dd>{yes(h.existingTR)}</dd>
            <dt>Notes</dt>
            <dd>{h.existingSupportNotes || '—'}</dd>
          </dl>
          {h.confidentialNotes && (
            <div className="confidential">
              <strong>Confidential notes</strong>
              <p>{h.confidentialNotes}</p>
            </div>
          )}
        </section>
      </div>

      {h.members?.length > 0 && (
        <section className="panel">
          <h2>Members</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Relation</th>
                  <th className="r">Age</th>
                  <th>Occupation</th>
                  <th className="r">Income</th>
                  <th>Skills</th>
                </tr>
              </thead>
              <tbody>
                {h.members.map((m, i) => (
                  <tr key={i}>
                    <td>{m.name}</td>
                    <td>{m.relation}</td>
                    <td className="r">{m.age}</td>
                    <td>{m.occupation}</td>
                    <td className="r">{m.earning ? inr(m.monthlyIncome) : '—'}</td>
                    <td>{m.skills}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Forms and documents</h2>
        <UploadBox
          onUpload={async (files, meta) => {
            await uploadAndAttach(files, meta, `/households/${h._id}/documents`);
            d.reload();
          }}
        />
        <DocumentList
          docs={h.documents}
          onDelete={async (doc) => {
            await api(`/households/${h._id}/documents/${doc._id}`, { method: 'DELETE' });
            d.reload();
          }}
        />
      </section>

      {sendOpen && <SendFormModal household={h} onClose={() => setSendOpen(false)} onCreated={(f) => setShare({ ...f, mauze: h.mauze?.name })} />}
      {share && <ShareLink form={share} onClose={() => setShare(null)} />}

      <section className="panel">
        <h2>Cases for this family</h2>
        {cases.length === 0 ? (
          <p className="muted">
            No cases yet. <Link to={`/admin/cases/new?household=${h._id}`}>Open a case</Link> once an upliftment plan is agreed.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Type</th>
                  <th>Scheme</th>
                  <th>Stage</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th className="r">Sanctioned</th>
                  <th>Opened</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <Link to={`/admin/cases/${c._id}`}>{c.caseNo}</Link>
                    </td>
                    <td>
                      <TypeBadge type={c.caseType} />
                    </td>
                    <td>{SCHEMES[c.scheme]}</td>
                    <td>
                      <StageBadge stage={c.stage} />
                    </td>
                    <td>
                      <FinalBadge status={c.finalStatus} />
                    </td>
                    <td>
                      <RiskBadge risk={c.risk} />
                    </td>
                    <td className="r">{inr(c.amountSanctioned)}</td>
                    <td>{date(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
