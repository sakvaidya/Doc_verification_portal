const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export function getSession() {
  return JSON.parse(localStorage.getItem('session') || 'null');
}

export function saveSession(session) {
  localStorage.setItem('session', JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem('session');
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  const token = getSession()?.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body instanceof FormData ? body : body && JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res;
}

export const api = {
  get: (path) => request(path).then((r) => r.json()),
  post: (path, body) => request(path, { method: 'POST', body }).then((r) => r.json()),
  // Downloads need the JWT header, so fetch the blob and click a temporary link.
  download: async (path, fileName) => {
    const blob = await (await request(path)).blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};
