// Thin wrapper around the Flask API. All calls go to /api (proxied to Flask in dev).
async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, { credentials: 'same-origin', ...options })
  let data = null
  try {
    data = await res.json()
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const e = new Error(data?.error || 'Something went wrong. Please try again.')
    e.status = res.status
    throw e
  }
  return data
}

const send = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body ?? {}),
})

export const api = {
  // auth
  me: () => request('/auth/me'),
  login: (body) => request('/auth/login', send('POST', body)),
  signup: (body) => request('/auth/signup', send('POST', body)),
  logout: () => request('/auth/logout', send('POST')),

  // patient: records
  records: () => request('/records'),
  uploadRecord: (formData) => request('/records', { method: 'POST', body: formData }),
  deleteRecord: (id) => request(`/records/${id}`, { method: 'DELETE' }),
  sharedWithMe: () => request('/shared-with-me'),

  // patient: sharing, people, requests
  share: (user_id, record_ids) => request('/shares', send('POST', { user_id, record_ids })),
  revoke: (user_id, record_ids) => request('/shares/revoke', send('POST', { user_id, record_ids })),
  people: () => request('/people'),
  disconnectDoctor: (linkId) => request(`/connections/${linkId}`, { method: 'DELETE' }),
  disconnectFamily: (linkId) => request(`/family/${linkId}`, { method: 'DELETE' }),
  requests: () => request('/requests'),
  decide: (kind, id, decision) => request(`/requests/${kind}/${id}/decision`, send('POST', { decision })),
  familyRequest: (email) => request('/family/request', send('POST', { email })),

  // doctor
  doctorPatients: () => request('/doctor/patients'),
  patientRecords: (pid) => request(`/doctor/patients/${pid}/records`),
  doctorRequest: (identifier) => request('/doctor/requests', send('POST', { identifier })),
  doctorRequests: () => request('/doctor/requests'),

  // appointments
  appointments: () => request('/appointments'),
  createAppointment: (body) => request('/appointments', send('POST', body)),
  deleteAppointment: (id) => request(`/appointments/${id}`, { method: 'DELETE' }),
}

export const recordFileUrl = (id, download = false) => `/api/records/${id}/file${download ? '?download=1' : ''}`

export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(`${iso.slice(0, 10)}T00:00`)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
