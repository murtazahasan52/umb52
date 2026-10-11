import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { RiskBadge } from '../ui';
import { SCHEMES } from '../lib';

// Real-time search: partial name (any order), ITS number, mobile, household code or case number
export default function GlobalSearch() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setRes(null);
      return undefined;
    }
    const n = ++seq.current;
    setBusy(true);
    const t = setTimeout(() => {
      api(`/search?q=${encodeURIComponent(term)}`)
        .then((r) => n === seq.current && (setRes(r), setActive(0)))
        .catch(() => n === seq.current && setRes({ households: [], cases: [] }))
        .finally(() => n === seq.current && setBusy(false));
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Keyboard shortcut: "/" focuses search
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        box.current?.querySelector('input')?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const items = res ? [...res.cases.map((c) => ({ type: 'case', ...c })), ...res.households.map((h) => ({ type: 'hh', ...h }))] : [];
  const go = (it) => {
    setOpen(false);
    setQ('');
    nav(it.type === 'case' ? `/admin/cases/${it._id}` : `/admin/households/${it._id}`);
  };
  const onKeyDown = (e) => {
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(items[active]);
    } else if (e.key === 'Escape') setOpen(false);
  };

  const mark = (text) => {
    const words = q.trim().split(/\s+/).filter((w) => w.length > 0);
    if (!text || !words.length) return text;
    const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
    return String(text)
      .split(re)
      .map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
  };

  return (
    <div className="gsearch" ref={box}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </svg>
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search name, ITS or mobile"
        aria-label="Search families and cases by name, ITS number or mobile"
        role="combobox"
        aria-expanded={open && !!res}
        aria-controls="gsearch-list"
        autoComplete="off"
      />
      {busy && <span className="spinner sm" aria-hidden="true" />}
      {open && res && (
        <div className="gsearch-pop" id="gsearch-list" role="listbox">
          {items.length === 0 ? (
            <p className="muted gs-empty">No family or case matches “{q.trim()}”.</p>
          ) : (
            <>
              {res.cases.length > 0 && <p className="gs-group">Cases</p>}
              {items.map((it, i) =>
                it.type === 'case' ? (
                  <button key={`c${it._id}`} role="option" aria-selected={i === active} className={i === active ? 'on' : ''} onMouseEnter={() => setActive(i)} onClick={() => go(it)}>
                    <span className="gs-main">
                      <strong>{mark(it.beneficiaryName)}</strong>
                      <small>
                        {mark(it.caseNo)}, {SCHEMES[it.scheme]}, {it.mauze}
                        {it.beneficiaryMobile ? <>, {mark(it.beneficiaryMobile)}</> : null}
                      </small>
                    </span>
                    <RiskBadge risk={it.risk} />
                  </button>
                ) : (
                  <span key={`h${it._id}`}>
                    {i === res.cases.length && <p className="gs-group">Families</p>}
                    <button role="option" aria-selected={i === active} className={i === active ? 'on' : ''} onMouseEnter={() => setActive(i)} onClick={() => go(it)}>
                      <span className="gs-main">
                        <strong>{mark(it.headName)}</strong>
                        <small>
                          {it.code}, {it.mauze}
                          {it.itsNo ? <>, ITS {mark(it.itsNo)}</> : null}
                          {it.mobile ? <>, {mark(it.mobile)}</> : null}
                        </small>
                        {it.matchedMember && <small className="gs-member">Member: {mark(it.matchedMember)}</small>}
                      </span>
                    </button>
                  </span>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
