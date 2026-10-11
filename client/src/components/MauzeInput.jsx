import { useId, useMemo } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useLoad } from '../ui';

// Type a Mauze (and its Zone if new). Existing names are suggested as you type.
// value = { mauzeName, zoneName }. Call resolveMauze(value) on save to get the Mauze id.
export default function MauzeInput({ value, onChange, required = true }) {
  const { user } = useAuth();
  const id = useId();
  const mauzes = useLoad(() => api('/org/mauzes'), []);
  const zones = useLoad(() => (user.role === 'hq' ? api('/org/zones') : Promise.resolve([])), [user.role]);

  const fixed = ['mauze', 'counsellor'].includes(user.role);
  const list = mauzes.data || [];
  const typed = (value?.mauzeName || '').trim().toLowerCase();
  const match = useMemo(() => list.find((m) => m.name.toLowerCase() === typed || (m.code || '').toLowerCase() === typed), [list, typed]);
  const isNew = typed && !match && !mauzes.loading;

  if (fixed) {
    return (
      <div className="field">
        <label>Mauze</label>
        <input value={user.mauze?.name || ''} disabled />
      </div>
    );
  }

  return (
    <>
      <div className="field">
        <label htmlFor={`${id}-m`}>
          Mauze{required && <span className="req" aria-hidden="true"> *</span>}
        </label>
        <input
          id={`${id}-m`}
          list={`${id}-ml`}
          value={value?.mauzeName || ''}
          onChange={(e) => onChange({ ...value, mauzeName: e.target.value })}
          placeholder="Type or pick a Mauze"
          required={required}
          autoComplete="off"
        />
        <datalist id={`${id}-ml`}>
          {list.map((m) => (
            <option key={m._id} value={m.name}>
              {m.zone?.name}
            </option>
          ))}
        </datalist>
        {match && <small className="hint">Zone: {match.zone?.name}</small>}
        {isNew && <small className="hint tx-medium">New Mauze. It will be created when you save.</small>}
      </div>
      {isNew && user.role === 'hq' && (
        <div className="field">
          <label htmlFor={`${id}-z`}>
            Zone for the new Mauze<span className="req" aria-hidden="true"> *</span>
          </label>
          <input
            id={`${id}-z`}
            list={`${id}-zl`}
            value={value?.zoneName || ''}
            onChange={(e) => onChange({ ...value, zoneName: e.target.value })}
            placeholder="Type or pick a Zone"
            required
            autoComplete="off"
          />
          <datalist id={`${id}-zl`}>
            {(zones.data || []).map((z) => (
              <option key={z._id} value={z.name} />
            ))}
          </datalist>
          {value?.zoneName && !(zones.data || []).some((z) => z.name.toLowerCase() === value.zoneName.trim().toLowerCase()) && (
            <small className="hint tx-medium">New Zone. It will be created too.</small>
          )}
        </div>
      )}
      {isNew && user.role === 'zbc' && (
        <div className="field">
          <label>Zone</label>
          <input value={user.zone?.name || ''} disabled />
        </div>
      )}
    </>
  );
}

// Returns the Mauze id for the typed name, creating Mauze/Zone if allowed
export async function resolveMauze(user, value) {
  if (['mauze', 'counsellor'].includes(user.role)) return user.mauze?._id || user.mauze;
  const r = await api('/org/mauzes/resolve', { method: 'POST', body: value });
  return r.mauze._id;
}
