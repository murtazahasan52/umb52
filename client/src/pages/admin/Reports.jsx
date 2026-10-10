import { useState } from 'react';
import { api, download } from '../../api';
import { useAuth } from '../../auth';
import { useLoad, Loading, useToast } from '../../ui';
import ScopeFilter, { scopeQuery } from './ScopeFilter';

export default function Reports() {
  const { user } = useAuth();
  const toast = useToast();
  const [scope, setScope] = useState({});
  const audit = useLoad(() => (user.role === 'hq' ? api('/dashboard/audit?limit=150') : Promise.resolve(null)), []);
  const get = async (path, name) => {
    try {
      await download(`${path}?${scopeQuery(scope)}`, name);
    } catch (e) {
      toast(e.message, 'err');
    }
  };
  return (
    <div className="page-admin">
      <div className="page-head">
        <div>
          <h1>Reports and exports</h1>
          <p className="sub">Download the register as spreadsheets for the quarterly ZBC review or the annual HQ report.</p>
        </div>
        <ScopeFilter value={scope} onChange={setScope} />
      </div>

      <div className="cols-2">
        <section className="panel">
          <h2>Beneficiary cases</h2>
          <p>Every case with sanctioned, disbursed, verified and repaid amounts kept in separate columns, baseline and current income, improvement and active warnings.</p>
          <button className="btn" onClick={() => get('/dashboard/export/cases.csv', 'cases.csv')}>
            Download cases (CSV)
          </button>
        </section>
        <section className="panel">
          <h2>Household survey</h2>
          <p>All surveyed households with categories, income, business, debts, level of need and assessment date. Handle this file as confidential.</p>
          <button className="btn" onClick={() => get('/dashboard/export/households.csv', 'households.csv')}>
            Download households (CSV)
          </button>
        </section>
      </div>

      {user.role === 'hq' && (
        <section className="panel">
          <h2>Access log</h2>
          <p className="small muted">Who viewed or changed confidential records.</p>
          {audit.loading ? (
            <Loading />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Who</th>
                    <th>Action</th>
                    <th>Record</th>
                  </tr>
                </thead>
                <tbody>
                  {(audit.data || []).map((a) => (
                    <tr key={a._id}>
                      <td className="nowrap small">{new Date(a.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                      <td>
                        {a.userName} <small className="muted">{a.role}</small>
                      </td>
                      <td>{a.action}</td>
                      <td className="small">
                        {a.entity} {a.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
