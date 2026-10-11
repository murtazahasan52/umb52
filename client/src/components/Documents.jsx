import { useRef, useState } from 'react';
import { fileUrl } from '../api';
import { useToast, Empty } from '../ui';
import { date } from '../lib';

export const DOC_CATEGORIES = {
  photo_report: 'Photo report (home visit)',
  consultant_letter: 'Consultant / expert letterhead',
  quotation: 'Quotation',
  araz: 'Araz to Al-Vazarat al-Saifiyah',
  consent_form: 'Signed consent form',
  case_profile: 'Case profile (scanned)',
  mpi_survey: 'MPI survey report (scanned)',
  budget_sheet: 'Budget sheet (scanned)',
  journal_log: 'Daily journal log (scanned)',
  survey_form: 'Survey form',
  application_form: 'Application form',
  id_proof: 'ID proof (ITS / Aadhaar)',
  income_proof: 'Income proof',
  business_document: 'Business document (GST, Udyam, licence)',
  bank_statement: 'Bank statement',
  invoice: 'Invoice / bill',
  photo: 'Photo',
  agreement: 'Agreement / undertaking',
  other: 'Other',
};

// Shrink phone photos so they stay under the 4 MB upload limit; PDFs pass through unchanged
export async function compressImage(file) {
  if (!file.type.startsWith('image/') || file.size < 900 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export async function prepareFiles(fileList) {
  const out = [];
  for (const f of fileList) {
    const c = await compressImage(f);
    if (c.size > 4 * 1024 * 1024) throw new Error(`${f.name} is larger than 4 MB. Scan at a lower quality or split the PDF.`);
    out.push(c);
  }
  return out;
}

// Picker: choose type, title, files. onUpload(FormData-ready files, {category,title}) does the actual upload.
export const FAMILY_DOC_CATEGORIES = {
  id_proof: 'ITS card / Aadhaar',
  income_proof: 'Income proof',
  application_form: 'Filled form (photo or scan)',
  invoice: 'Fee receipt / bill',
  quotation: 'Quotation',
  business_document: 'Business document (GST, Udyam, licence)',
  bank_statement: 'Bank statement',
  photo: 'Photo of home or shop',
  other: 'Other',
};

export function UploadBox({ onUpload, compact, categories = DOC_CATEGORIES, queued = false }) {
  const toast = useToast();
  const [category, setCategory] = useState(Object.keys(categories).includes('application_form') ? 'application_form' : Object.keys(categories)[0]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const onFiles = async (e) => {
    const picked = [...e.target.files];
    e.target.value = '';
    if (!picked.length) return;
    setBusy(true);
    try {
      const files = await prepareFiles(picked.slice(0, 4));
      await onUpload(files, { category, title: title.trim() });
      setTitle('');
      toast(`${files.length} file${files.length > 1 ? 's' : ''} ${queued ? 'added. They upload when you save.' : 'uploaded'}`);
    } catch (x) {
      toast(x.message, 'err');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`upload-box ${compact ? 'compact' : ''}`}>
      <div className="field">
        <label htmlFor="doc-cat">Document type</label>
        <select id="doc-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
          {Object.entries(categories).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="doc-title">Title (optional)</label>
        <input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Signed application, page 1" />
      </div>
      <div className="upload-actions">
        <input ref={input} type="file" accept="image/*,.pdf" multiple capture={undefined} onChange={onFiles} hidden />
        <button type="button" className="btn" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Uploading…' : 'Choose files or take photo'}
        </button>
        <small className="hint">JPG, PNG or PDF, up to 4 files at a time. Photos are reduced automatically.</small>
      </div>
    </div>
  );
}

export function DocumentList({ docs, onDelete, viewable = true }) {
  if (!docs?.length) return <Empty title="No documents yet">Upload scanned forms, ID proof, income proof or photos.</Empty>;
  return (
    <ul className="doc-list">
      {[...docs].reverse().map((d) => (
        <li key={d._id}>
          <span className="doc-icon" aria-hidden="true">
            {/\.pdf$/i.test(d.fileName || d.title || '') ? 'PDF' : 'IMG'}
          </span>
          <span className="doc-main">
            {viewable ? (
              <a href={fileUrl(d.url)} target="_blank" rel="noreferrer">
                {d.title}
              </a>
            ) : (
              <strong>{d.title}</strong>
            )}
            <small className="muted block">
              {DOC_CATEGORIES[d.category] || d.category}
              {d.createdAt ? `, ${date(d.createdAt)}` : ''}
              {d.byName ? `, by ${d.byName}` : ''}
            </small>
            {d.note && <small className="block muted">{d.note}</small>}
          </span>
          {onDelete && (
            <button type="button" className="link-btn danger" onClick={() => window.confirm(`Remove "${d.title}"?`) && onDelete(d)}>
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
