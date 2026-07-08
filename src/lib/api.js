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

export function addBrandToMonthApi(monthId, brandEntry) {
  return fetch(`/api/months/${monthId}/brands`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brandEntry),
  }).then(handle);
}

export function fetchIntegrationSettings() {
  return fetch('/api/integration/settings').then(handle);
}

export function saveIntegrationSettings(settings) {
  return fetch('/api/integration/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  }).then(handle);
}

export function testIntegrationSettings(settings) {
  return fetch('/api/integration/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  }).then(handle);
}

export function fetchExternalSalesData(params) {
  const qs = new URLSearchParams(params).toString();
  return fetch(`/api/integration/data?${qs}`).then(handle);
}

export function saveExternalSalesData(items) {
  return fetch('/api/integration/data/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  }).then(handle);
}

export function fetchSavedExternalSales(params) {
  const qs = new URLSearchParams(params).toString();
  return fetch(`/api/external-sales?${qs}`).then(handle);
}

export function matchExternalSalesByVin(vins) {
  return fetch('/api/external-sales/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vins }),
  }).then(handle);
}

export function fetchFinancierMapping() {
  return fetch('/api/financier-mapping').then(handle);
}

export function saveFinancierMapping(mappings) {
  return fetch('/api/financier-mapping', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mappings }),
  }).then(handle);
}
