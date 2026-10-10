import { api } from '../../api';
import { useAuth } from '../../auth';
import { useLoad } from '../../ui';

// Zone / Mauze filter shown to HQ and ZBC users
export default function ScopeFilter({ value, onChange }) {
  const { user } = useAuth();
  const zones = useLoad(() => (user.role === 'hq' ? api('/org/zones') : Promise.resolve([])), [user.role]);
  const mauzes = useLoad(() => api('/org/mauzes'), []);
  if (!['hq', 'zbc'].includes(user.role)) return null;
  const list = (mauzes.data || []).filter((m) => !value.zone || String(m.zone?._id) === String(value.zone));
  return (
    <div className="filters">
      {user.role === 'hq' && (
        <label>
          <span>Zone</span>
          <select value={value.zone || ''} onChange={(e) => onChange({ zone: e.target.value, mauze: '' })}>
            <option value="">All zones</option>
            {(zones.data || []).map((z) => (
              <option key={z._id} value={z._id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        <span>Mauze</span>
        <select value={value.mauze || ''} onChange={(e) => onChange({ ...value, mauze: e.target.value })}>
          <option value="">All Mauzes</option>
          {list.map((m) => (
            <option key={m._id} value={m._id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export const scopeQuery = (s) => {
  const p = new URLSearchParams();
  if (s.zone) p.set('zone', s.zone);
  if (s.mauze) p.set('mauze', s.mauze);
  return p.toString();
};
