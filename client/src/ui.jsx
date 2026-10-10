import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getPath, setPath, RISK_SHORT, STAGES, FINAL } from './lib';

// ---------------- Toasts
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text, kind = 'ok') => {
    const id = Math.random();
    setItems((x) => [...x, { id, text, kind }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ---------------- Data loading hook
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    return fn()
      .then((data) => setState({ data, loading: false, error: '' }))
      .catch((e) => setState({ data: null, loading: false, error: e.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    run();
  }, [run]);
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) };
}

// ---------------- Form field bound to a state object
export function Field({ label, name, form, setForm, type = 'text', options, hint, required, span, placeholder, min, max, step, rows = 3, disabled }) {
  const id = `f-${name.replace(/\./g, '-')}`;
  const value = getPath(form, name);
  const onChange = (e) => {
    let v = e.target.value;
    if (type === 'checkbox') v = e.target.checked;
    else if (type === 'number') v = v === '' ? '' : Number(v);
    setForm((f) => setPath(f, name, v));
  };
  let input;
  if (type === 'select') {
    input = (
      <select id={id} value={value ?? ''} onChange={onChange} required={required} disabled={disabled}>
        <option value="">Select…</option>
        {Object.entries(options || {}).map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
    );
  } else if (type === 'textarea') {
    input = <textarea id={id} rows={rows} value={value ?? ''} onChange={onChange} required={required} placeholder={placeholder} disabled={disabled} />;
  } else if (type === 'checkbox') {
    return (
      <label className={`check ${span ? `span-${span}` : ''}`} htmlFor={id}>
        <input id={id} type="checkbox" checked={!!value} onChange={onChange} disabled={disabled} />
        <span>{label}</span>
      </label>
    );
  } else {
    const v = type === 'date' && value ? String(value).slice(0, 10) : value ?? '';
    input = <input id={id} type={type} value={v} onChange={onChange} required={required} placeholder={placeholder} min={min} max={max} step={step} disabled={disabled} inputMode={type === 'number' ? 'decimal' : undefined} />;
  }
  return (
    <div className={`field ${span ? `span-${span}` : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="req" aria-hidden="true"> *</span>}
      </label>
      {input}
      {hint && <small className="hint">{hint}</small>}
    </div>
  );
}

// Multi-choice chips (for arrays like categories, interventions)
export function Chips({ label, name, form, setForm, options, hint }) {
  const value = getPath(form, name) || [];
  const toggle = (k) => setForm((f) => setPath(f, name, value.includes(k) ? value.filter((x) => x !== k) : [...value, k]));
  return (
    <fieldset className="field span-2 chips-field">
      <legend>{label}</legend>
      <div className="chips">
        {Object.entries(options).map(([k, l]) => (
          <button type="button" key={k} className={`chip ${value.includes(k) ? 'on' : ''}`} aria-pressed={value.includes(k)} onClick={() => toggle(k)}>
            {l}
          </button>
        ))}
      </div>
      {hint && <small className="hint">{hint}</small>}
    </fieldset>
  );
}

// ---------------- Modal
export function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.querySelector('input,select,textarea,button')?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header>
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// Form inside modal with submit handling
export function FormModal({ title, initial = {}, onSubmit, onClose, children, submitLabel = 'Save', wide }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await onSubmit(form);
      onClose();
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={title} onClose={onClose} wide={wide}>
      <form onSubmit={submit}>
        <div className="grid-form">{children(form, setForm)}</div>
        {err && <p className="form-error">{err}</p>}
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={busy}>
            {busy ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------- Small pieces
export const RiskBadge = ({ risk }) => <span className={`badge risk-${risk}`}>{RISK_SHORT[risk] || risk}</span>;
export const StageBadge = ({ stage }) => <span className={`badge stage stage-${stage}`}>{STAGES[stage] || stage}</span>;
export const FinalBadge = ({ status }) => <span className={`badge final-${status}`}>{FINAL[status] || status}</span>;

export function Loading({ text = 'Loading…' }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      {text}
    </div>
  );
}
export function ErrorBox({ error, onRetry }) {
  return (
    <div className="error-box">
      <p>{error}</p>
      {onRetry && (
        <button className="btn ghost sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Empty({ title, children }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={active === t.key} className={active === t.key ? 'on' : ''} onClick={() => onChange(t.key)}>
          {t.label}
          {t.count != null && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// Percentage + actual numbers, as the framework requires
export function Meter({ num, den, target }) {
  const p = den ? Math.min(100, (num / den) * 100) : 0;
  const tone = target == null ? 'neutral' : p >= target ? 'good' : p >= target * 0.7 ? 'warn' : 'bad';
  return (
    <div className={`meter meter-${tone}`}>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${p}%` }} />
        {target != null && <div className="meter-target" style={{ left: `${target}%` }} title={`Target ${target}%`} />}
      </div>
    </div>
  );
}

export function Confirm({ text, onYes, children }) {
  return (
    <span
      onClick={(e) => {
        if (window.confirm(text)) onYes(e);
      }}
    >
      {children}
    </span>
  );
}
