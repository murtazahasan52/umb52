import { api } from '../../api';
import { UploadBox, DocumentList } from '../../components/Documents';

// Upload to evidence storage, then attach to a case or household
export async function uploadAndAttach(files, meta, attachPath) {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  const up = await api('/uploads', { method: 'POST', form: fd });
  let last;
  for (const [i, url] of up.urls.entries()) {
    last = await api(attachPath, { method: 'POST', body: { title: meta.title || files[i].name, category: meta.category, url, fileName: files[i].name } });
  }
  return last;
}

export function DocumentsTab({ c, act }) {
  return (
    <section className="panel">
      <h2>Forms and documents</h2>
      <p className="small muted">Scanned forms, photo report, expert letterheads, quotations, the Araz and signed consent forms. Items marked here also tick the case-file checklist.</p>
      <UploadBox
        onUpload={async (files, meta) => {
          const fd = new FormData();
          files.forEach((f) => fd.append('files', f));
          const up = await api('/uploads', { method: 'POST', form: fd });
          for (const [i, url] of up.urls.entries()) {
            await act('/documents', 'POST', { title: meta.title || files[i].name, category: meta.category, url, fileName: files[i].name });
          }
        }}
      />
      <DocumentList docs={c.documents} onDelete={(d) => act(`/documents/${d._id}`, 'DELETE', undefined, 'Document removed')} />
    </section>
  );
}
