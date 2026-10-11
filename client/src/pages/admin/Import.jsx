import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useLoad, useToast, Loading } from '../../ui';

const BATCH = 200;
const STATUS = { created: 'New', updated: 'Update', skipped: 'Skipped', error: 'Problem' };

// HQ super-admin: bring an existing database (Excel / CSV) into the register
export default function Import() {
  const toast = useToast();
  const cols = useLoad(() => api('/households/import/columns'), []);
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [opts, setOpts] = useState({ createMissingMauze: true, updateExisting: true });
  const [check, setCheck] = useState(null);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const [filter, setFilter] = useState('');

  const known = new Set((cols.data || []).flatMap((c) => [c.header, c.key, ...(c.aliases || [])].map((h) => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''))));
  const matched = headers.filter((h) => known.has(h.toLowerCase().replace(/[^a-z0-9]/g, '')));
  const ignored = headers.filter((h) => !known.has(h.toLowerCase().replace(/[^a-z0-9]/g, '')));

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const c = cols.data || [];
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([c.map((x) => x.header), c.map((x) => x.example ?? '')]);
    sheet['!cols'] = c.map((x) => ({ wch: Math.max(14, x.header.length + 2) }));
    XLSX.utils.book_append_sheet(wb, sheet, 'Households');
    const help = XLSX.utils.aoa_to_sheet([['Column', 'Required', 'How to fill'], ...c.map((x) => [x.header, x.required ? 'Yes' : '', x.help || ''])]);
    help['!cols'] = [{ wch: 26 }, { wch: 10 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, help, 'How to fill');
    XLSX.writeFile(wb, 'upliftment-import-template.xlsx');
  };

  const onFile = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
      if (!data.length) throw new Error('The first sheet has no rows');
      setFile(f);
      setRows(data);
      setHeaders(Object.keys(data[0]));
      setCheck(null);
      setResult(null);
    } catch (x) {
      toast(`Could not read the file: ${x.message}`, 'err');
    }
  };

  const run = async (dryRun) => {
    const out = { summary: { rows: 0, created: 0, updated: 0, skipped: 0, cases: 0, errors: 0 }, results: [] };
    setProgress({ done: 0, total: rows.length, dryRun });
    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        const r = await api('/households/import', { method: 'POST', body: { rows: rows.slice(i, i + BATCH), dryRun, startRow: i + 2, ...opts } });
        Object.keys(out.summary).forEach((k) => (out.summary[k] += r.summary[k] || 0));
        out.results.push(...r.results);
        setProgress({ done: Math.min(i + BATCH, rows.length), total: rows.length, dryRun });
      }
      if (dryRun) setCheck(out);
      else {
        setResult(out);
        toast(`Imported: ${out.summary.created} new, ${out.summary.updated} updated`);
      }
    } catch (x) {
      toast(x.message, 'err');
    } finally {
      setProgress(null);
    }
  };

  const downloadProblems = async (res) => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res.results.map((r) => ({ Row: r.line, Name: r.name, Result: STATUS[r.status], Details: r.messages.join('; ') }))), 'Results');
    XLSX.writeFile(wb, 'import-results.xlsx');
  };

  const shown = (result || check)?.results.filter((r) => !filter || r.status === filter) || [];
  const view = result || check;

  return (
    <div className="page-admin">
      <div className="page-head">
        <div>
          <h1>Import from Excel</h1>
          <p className="sub">Bring your existing family database into the register. Families are matched by ITS number, so importing the same file twice updates rather than duplicates.</p>
        </div>
      </div>

      <ol className="import-steps">
        <li className="panel">
          <h2>Get the template</h2>
          <p className="small">Use our template, or your own sheet with similar column names. Only Mauze and Head of family are required. Fill Case type (Housing, Education or Business) and Need for support to open a case at the same time.</p>
          <button className="btn ghost" onClick={downloadTemplate} disabled={!cols.data}>
            Download Excel template
          </button>
        </li>

        <li className="panel">
          <h2>Choose your file</h2>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} hidden />
          <button className="btn" onClick={() => fileRef.current?.click()}>
            {file ? 'Choose a different file' : 'Choose Excel or CSV file'}
          </button>
          {file && (
            <div className="file-summary">
              <p>
                <strong>{file.name}</strong>: {rows.length} rows. {matched.length} columns recognised
                {ignored.length > 0 && <span className="tx-medium">, {ignored.length} ignored ({ignored.slice(0, 6).join(', ')}{ignored.length > 6 ? '…' : ''})</span>}.
              </p>
              <div className="grid-form">
                <label className="check">
                  <input type="checkbox" checked={opts.createMissingMauze} onChange={(e) => setOpts((o) => ({ ...o, createMissingMauze: e.target.checked }))} />
                  <span>Create Mauzes (and Zones) that don’t exist yet, using the Zone column</span>
                </label>
                <label className="check">
                  <input type="checkbox" checked={opts.updateExisting} onChange={(e) => setOpts((o) => ({ ...o, updateExisting: e.target.checked }))} />
                  <span>Update families already registered (same ITS number)</span>
                </label>
              </div>
            </div>
          )}
        </li>

        <li className="panel">
          <h2>Check, then import</h2>
          <p className="small">Checking reads the whole file and shows what will happen. Nothing is saved until you import.</p>
          <div className="row-actions">
            <button className="btn ghost" disabled={!rows.length || !!progress} onClick={() => run(true)}>
              Check file
            </button>
            <button className="btn" disabled={!check || !!progress || !!result} onClick={() => window.confirm(`Import ${check.summary.created} new and ${check.summary.updated} updated families?`) && run(false)}>
              Import now
            </button>
          </div>
          {progress && (
            <div className="progress">
              <div className="meter-track">
                <div className="meter-fill" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
              <small>
                {progress.dryRun ? 'Checking' : 'Importing'} {progress.done} of {progress.total} rows…
              </small>
            </div>
          )}
        </li>
      </ol>

      {cols.loading && <Loading />}

      {view && (
        <section className="panel">
          <div className="panel-head">
            <h2>{result ? 'Import complete' : 'Check results'}</h2>
            <button className="btn ghost sm" onClick={() => downloadProblems(view)}>
              Download results
            </button>
          </div>
          <div className="four compact import-sum">
            <div>
              <span>New families</span>
              <strong>{view.summary.created}</strong>
            </div>
            <div>
              <span>Updated</span>
              <strong>{view.summary.updated}</strong>
            </div>
            <div>
              <span>Cases {result ? 'opened' : 'to open'}</span>
              <strong>{view.summary.cases}</strong>
            </div>
            <div>
              <span>Problems / skipped</span>
              <strong className={view.summary.errors ? 'tx-high' : ''}>
                {view.summary.errors} / {view.summary.skipped}
              </strong>
            </div>
          </div>
          {result && (
            <p className="small">
              <Link to="/admin/households">Open the household survey</Link> to see the imported families.
            </p>
          )}
          {!result && view.summary.errors > 0 && <p className="small tx-medium">Rows with problems are left out. Fix them in Excel and import the file again; families already imported will just be updated.</p>}
          <div className="filters">
            <label>
              <span>Show</span>
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="">All rows</option>
                {Object.entries(STATUS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="r">Row</th>
                  <th>Head of family</th>
                  <th>Result</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, 500).map((r) => (
                  <tr key={r.line} className={r.status === 'error' ? 'row-late' : ''}>
                    <td className="r">{r.line}</td>
                    <td>{r.name}</td>
                    <td>
                      <span className={`badge imp-${r.status}`}>{STATUS[r.status]}</span>
                    </td>
                    <td className="small">{r.messages.join('. ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shown.length > 500 && <p className="small muted">Showing the first 500 rows. Download the results for the full list.</p>}
        </section>
      )}
    </div>
  );
}
