import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { useLoad, Loading, ErrorBox, Tabs, RiskBadge, StageBadge, FinalBadge, FormModal, Field, useToast } from '../../ui';
import { SCHEMES, STAGES, STAGE_ORDER, FINAL, inr, date } from '../../lib';
import { PlanTab, FeasibilityTab, MoneyTab, UtilizationTab, ProgressTab, VisitsTab, TrainingTab, AlertsTab, OutcomeTab, HistoryTab } from './CaseTabs';

export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const d = useLoad(() => api(`/cases/${id}`), [id]);
  const [tab, setTab] = useState('plan');
  const [statusOpen, setStatusOpen] = useState(false);

  if (d.loading && !d.data) return <Loading />;
  if (d.error) return <ErrorBox error={d.error} onRetry={d.reload} />;
  const c = d.data;

  // Every mutation returns the full updated case
  const act = async (path, method, body, msg) => {
    const r = await api(`/cases/${c._id}${path}`, { method, body });
    d.setData({ ...r, history: c.history });
    if (msg) toast(msg);
    return r;
  };

  const isMoney = ['QH', 'WELFARE'].includes(c.scheme) || c.financials.disbursed > 0;
  const tabs = [
    { key: 'plan', label: 'Plan' },
    ...(c.scheme === 'QH' ? [{ key: 'feasibility', label: 'Feasibility' }] : []),
    ...(isMoney ? [{ key: 'money', label: 'Disbursement & repayment' }] : []),
    ...(isMoney ? [{ key: 'utilization', label: 'Utilization', count: c.utilizations.length }] : []),
    { key: 'progress', label: 'Monthly progress', count: c.monthlyUpdates.length },
    { key: 'visits', label: 'Visits & reviews', count: c.visits.length },
    { key: 'training', label: 'Capability', count: c.trainings.length },
    { key: 'alerts', label: 'Alerts', count: c.alerts.filter((a) => !a.resolved).length || undefined },
    { key: 'outcome', label: 'Outcomes' },
    { key: 'history', label: 'History' },
  ];
  const f = c.financials;
  // Only QH goes through feasibility & sanction; welfare skips feasibility; TR / skill cases have no money stages
  const skip = c.scheme === 'QH' ? [] : c.scheme === 'WELFARE' ? ['feasibility'] : ['feasibility', 'sanctioned', 'disbursed'];
  const stages = STAGE_ORDER.filter((s) => !skip.includes(s) || s === c.stage);
  const idx = stages.indexOf(c.stage);

  return (
    <div className="page-admin">
      <div className="page-head">
        <div>
          <p className="crumb">
            <Link to="/admin/cases">Cases</Link> / {c.caseNo}
          </p>
          <h1>{c.beneficiaryName}</h1>
          <p className="sub">
            {SCHEMES[c.scheme]}, {c.mauze?.name}. Household <Link to={`/admin/households/${c.household?._id}`}>{c.household?.code}</Link>
            {c.counsellor ? `. Counsellor ${c.counsellor.name}` : ''}
          </p>
        </div>
        <div className="head-actions">
          <RiskBadge risk={c.risk} />
          <FinalBadge status={c.finalStatus} />
          <button className="btn ghost sm" onClick={() => setStatusOpen(true)}>
            Change status
          </button>
        </div>
      </div>

      <ol className="stages" aria-label="Case stage">
        {stages.map((s, i) => (
          <li key={s} className={i < idx ? 'done' : i === idx ? 'now' : ''} aria-current={i === idx ? 'step' : undefined}>
            {STAGES[s]}
          </li>
        ))}
      </ol>

      {c.riskReasons?.length > 0 && (
        <div className={`risk-box rb-${c.risk}`}>
          <strong>{c.risk === 'high' ? 'Immediate intervention needed' : 'Corrective action needed'}</strong>
          <ul>
            {c.riskReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <button className="link-btn" onClick={() => setTab('alerts')}>
            Record a recovery plan
          </button>
        </div>
      )}

      <div className="four compact">
        <div>
          <span>Sanctioned</span>
          <strong>{f.sanctioned ? inr(f.sanctioned) : '—'}</strong>
          {c.sanctionDate && <small>{date(c.sanctionDate)}</small>}
        </div>
        <div>
          <span>Disbursed</span>
          <strong>{f.disbursed ? inr(f.disbursed) : '—'}</strong>
          {f.disbursed > 0 && f.repaid > 0 && <small>Repaid {inr(f.repaid)}</small>}
        </div>
        <div>
          <span>Verified as properly used</span>
          <strong>{f.disbursed ? inr(f.verified) : '—'}</strong>
          {f.diverted > 0 && <small className="tx-high">{inr(f.diverted)} unapproved</small>}
        </div>
        <div>
          <span>Better off than baseline?</span>
          <strong className={c.improvement.hasData ? (c.improvement.improved ? 'tx-good' : 'tx-medium') : ''}>
            {c.improvement.hasData ? (c.improvement.improved ? 'Yes' : 'Not yet') : 'No data yet'}
          </strong>
          {c.improvement.incomeChange != null && (
            <small>
              Income {c.improvement.incomeChange >= 0 ? '+' : ''}
              {inr(c.improvement.incomeChange)} / month
            </small>
          )}
        </div>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      <div className="tab-body">
        {tab === 'plan' && <PlanTab c={c} act={act} user={user} />}
        {tab === 'feasibility' && <FeasibilityTab c={c} act={act} user={user} />}
        {tab === 'money' && <MoneyTab c={c} act={act} user={user} />}
        {tab === 'utilization' && <UtilizationTab c={c} act={act} user={user} />}
        {tab === 'progress' && <ProgressTab c={c} act={act} user={user} />}
        {tab === 'visits' && <VisitsTab c={c} act={act} user={user} />}
        {tab === 'training' && <TrainingTab c={c} act={act} user={user} />}
        {tab === 'alerts' && <AlertsTab c={c} act={act} user={user} />}
        {tab === 'outcome' && <OutcomeTab c={c} act={act} />}
        {tab === 'history' && <HistoryTab c={c} />}
      </div>

      {statusOpen && (
        <FormModal
          title="Change case status"
          initial={{ stage: c.stage, finalStatus: c.finalStatus, closureNote: c.closureNote }}
          onClose={() => setStatusOpen(false)}
          onSubmit={(v) => act('/status', 'PATCH', v, 'Status updated')}
        >
          {(form, setForm) => (
            <>
              <Field label="Stage" name="stage" type="select" options={STAGES} form={form} setForm={setForm} />
              <Field label="Final status" name="finalStatus" type="select" options={FINAL} form={form} setForm={setForm} />
              <Field label="Note" name="closureNote" type="textarea" span={2} form={form} setForm={setForm} hint="Required when closing: what was achieved or why the case ended." />
            </>
          )}
        </FormModal>
      )}
    </div>
  );
}
