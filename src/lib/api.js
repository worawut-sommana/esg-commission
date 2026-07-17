let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function handle(res) {
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      // ignore non-JSON error bodies
    }
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function login(username, password) {
  return fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }).then(handle);
}

export function logout() {
  return fetch('/api/auth/logout', { method: 'POST' }).then(handle);
}

export function fetchMe() {
  return fetch('/api/auth/me').then(handle);
}

export function fetchUsers() {
  return fetch('/api/users').then(handle);
}

export function createUser(user) {
  return fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  }).then(handle);
}

export function updateUser(id, patch) {
  return fetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).then(handle);
}

export function deleteUser(id) {
  return fetch(`/api/users/${id}`, { method: 'DELETE' }).then(handle);
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

export function fetchVehicleRegistrations() {
  return fetch('/api/vehicle-registrations').then(handle);
}

export function createVehicleRegistration(entry) {
  return fetch('/api/vehicle-registrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).then(handle);
}

export function updateVehicleRegistration(id, patch) {
  return fetch(`/api/vehicle-registrations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).then(handle);
}

export function deleteVehicleRegistration(id) {
  return fetch(`/api/vehicle-registrations/${id}`, { method: 'DELETE' }).then(handle);
}

export function importVehicleRegistrations(rows) {
  return fetch('/api/vehicle-registrations/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
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
