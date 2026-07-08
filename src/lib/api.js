async function handle(res) {
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function fetchMonths() {
  return fetch('/api/months').then(handle);
}

export function createMonth(month) {
  return fetch('/api/months', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(month),
  }).then(handle);
}

export function deleteMonthApi(id) {
  return fetch(`/api/months/${id}`, { method: 'DELETE' }).then(handle);
}
