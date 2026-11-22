let csrf;
let csrfPreparation;
let csrfGeneration = 0;
let privateEpoch = 0;
const privateRequests = new Set();
export function privateCheckpoint() {
  const epoch = privateEpoch;
  return () => {
    if (epoch !== privateEpoch)
      throw new ApiError({ code: 'SESSION_REQUIRED', message: 'Sesi telah berakhir.' }, 401);
  };
}
export function clearPrivateRequests() {
  privateEpoch++;
  for (const controller of privateRequests) controller.abort();
  privateRequests.clear();
}
function announce(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
async function fetchSafe(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    if (options.signal?.aborted)
      throw new ApiError(
        {
          code: options.signal.reason?.name === 'TimeoutError' ? 'TIMEOUT' : 'CANCELLED',
          message:
            options.signal.reason?.name === 'TimeoutError'
              ? 'Server belum merespons. Periksa status simpan sebelum mencoba kembali.'
              : 'Permintaan dibatalkan.',
        },
        0
      );
    throw new ApiError(
      {
        code: 'NETWORK',
        message:
          'Tidak tersambung ke server. Isian tetap tersedia; periksa koneksi lalu coba lagi.',
      },
      0
    );
  }
}
async function csrfToken() {
  if (csrf) return csrf;
  if (!csrfPreparation) {
    const generation = csrfGeneration;
    const preparing = (async () => {
      const r = await fetchSafe('/api/auth/csrf', {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      const json = await readJson(r);
      if (!r.ok || !json.data?.token)
        throw new ApiError({ code: 'CSRF', message: 'Tidak dapat menyiapkan sesi.' }, r.status);
      if (generation !== csrfGeneration)
        throw new ApiError({ code: 'SESSION_REQUIRED', message: 'Sesi telah berubah.' }, 401);
      csrf = json.data.token;
      return csrf;
    })();
    csrfPreparation = preparing;
    preparing
      .finally(() => {
        if (csrfPreparation === preparing) csrfPreparation = null;
      })
      .catch(() => {});
  }
  return csrfPreparation;
}
async function readJson(response) {
  try {
    return await response.json();
  } catch {
    throw new ApiError(
      {
        code: 'INVALID_RESPONSE',
        message: 'Respons server belum dapat dibaca. Periksa koneksi dan coba kembali.',
      },
      response.status
    );
  }
}
export class ApiError extends Error {
  constructor(error, status) {
    super(
      error.message +
        (error.fields?.length
          ? ' ' + error.fields.map((f) => `${f.path}: ${f.message}`).join('; ')
          : '')
    );
    this.code = error.code;
    this.fields = error.fields;
    this.status = status;
  }
}
export async function api(path, { method = 'GET', body, headers = {}, ...options } = {}) {
  const privateRequest = !path.startsWith('/auth/');
  const epoch = privateEpoch;
  const ensureCurrent = () => {
    if (privateRequest && epoch !== privateEpoch)
      throw new ApiError({ code: 'SESSION_REQUIRED', message: 'Sesi telah berakhir.' }, 401);
  };
  const token = method !== 'GET' ? await csrfToken() : null;
  ensureCurrent();
  const controller = new AbortController();
  if (privateRequest) privateRequests.add(controller);
  try {
    const response = await fetchSafe(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' ? { 'X-CSRF-Token': token } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...options,
      cache: 'no-store',
      signal: AbortSignal.any([
        controller.signal,
        AbortSignal.timeout(15000),
        ...(options.signal ? [options.signal] : []),
      ]),
    });
    ensureCurrent();
    const expiresAt = Number(response.headers.get('X-Session-Expires-At'));
    if (expiresAt) announce('pilihanku:session-deadline', expiresAt);
    const json = await readJson(response);
    ensureCurrent();
    if (!response.ok) {
      if (json.error?.code === 'CSRF') clearCsrf();
      if (response.status === 401 && json.error?.code === 'SESSION_REQUIRED')
        announce('pilihanku:session-ended');
      throw new ApiError(json.error || { message: 'Operasi gagal.' }, response.status);
    }
    if (json.data?.csrf) {
      clearCsrf();
      csrf = json.data.csrf;
    }
    return json.data;
  } finally {
    privateRequests.delete(controller);
  }
}
export const clearCsrf = () => {
  csrfGeneration++;
  csrf = null;
  csrfPreparation = null;
};
