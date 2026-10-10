const BASE = import.meta.env.VITE_API_URL || '';

export const getToken = () => {
  try {
    return localStorage.getItem('um_token');
  } catch {
    return null;
  }
};
export const setToken = (t) => {
  try {
    if (t) localStorage.setItem('um_token', t);
    else localStorage.removeItem('um_token');
  } catch {
    /* storage unavailable */
  }
};

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !form) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}/api${path}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token && !path.startsWith('/auth/login')) {
    setToken(null);
    if (!location.pathname.startsWith('/login')) location.href = `/login?next=${encodeURIComponent(location.pathname)}`;
  }
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

export const fileUrl = (u) => (u ? `${BASE}${u}?t=${encodeURIComponent(getToken() || '')}` : '');

export async function download(path, filename) {
  const res = await fetch(`${BASE}/api${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
