/**
 * apiService.js
 * -------------
 * Centralised API layer for the Hostel Management System.
 *
 * Request routing strategy
 * ────────────────────────
 * Every request is sent to the Azure backend first.
 * A fallback to the Render backup is triggered when:
 *   • There is no HTTP response at all  (network error, DNS failure, timeout)
 *   • The server returns a 5xx status   (crash, cold-start, gateway error)
 *
 * 4xx responses are NOT retried – they are valid answers that the backup
 * server would return identically (bad input, not found, etc.).
 */

import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Backend base URLs
// ─────────────────────────────────────────────────────────────────────────────
export const AZURE_API_BASE_URL =
  'https://hostel-management-backend-ahdgaagpdxemagaw.southeastasia-01.azurewebsites.net/api';

export const RENDER_API_BASE_URL =
  'https://hostel-management-backend-rc9d.onrender.com/api';

// ─────────────────────────────────────────────────────────────────────────────
// Axios instances
// ─────────────────────────────────────────────────────────────────────────────
const azureClient = axios.create({
  baseURL: AZURE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10 s — Azure is the primary, fail fast so fallback is quick
});

const renderClient = axios.create({
  baseURL: RENDER_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000, // 20 s — Render free tier may need extra time to wake up
});

// ─────────────────────────────────────────────────────────────────────────────
// Interceptors
// ─────────────────────────────────────────────────────────────────────────────

// Log every outgoing Azure request so it is visible in the browser console.
azureClient.interceptors.request.use(
  (config) => {
    console.log(`[API] Using Azure backend → ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Log every outgoing Render (backup) request.
renderClient.interceptors.request.use(
  (config) => {
    console.log(`[API] Using Render backup  → ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────────────────────────
// Fallback helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when the request should be retried on the backup server.
 * Network errors have no `error.response`; 5xx means the server is unhealthy.
 */
const shouldFallback = (error) => {
  if (!error.response) return true;              // network / timeout / DNS
  if (error.response.status >= 500) return true; // server-side failure
  return false;
};

/**
 * apiRequest – the single entry-point for every HTTP call.
 *
 * Sends the request to Azure first.  If that fails with a network-level or
 * server error, logs the switch and replays the identical request on Render.
 *
 * @param {import('axios').AxiosRequestConfig} config
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const apiRequest = async (config) => {
  try {
    return await azureClient(config);
  } catch (error) {
    if (shouldFallback(error)) {
      console.warn(
        `[API] Azure failed, switching to Render backup (reason: ${error.message})`
      );
      return renderClient(config);
    }
    // Re-throw 4xx and any other non-retryable errors as-is so components
    // receive the original error object (preserving error.response.data, etc.)
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Thin axios-compatible proxy used by the resource API objects below.
// Only the four HTTP verbs actually used by components need to be present.
// ─────────────────────────────────────────────────────────────────────────────
const api = {
  get:    (url, config)        => apiRequest({ method: 'get',    url, ...config }),
  post:   (url, data, config)  => apiRequest({ method: 'post',   url, data, ...config }),
  put:    (url, data, config)  => apiRequest({ method: 'put',    url, data, ...config }),
  delete: (url, config)        => apiRequest({ method: 'delete', url, ...config }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Resource API objects
// Consumed by components via the re-export in src/services/api.js
// ─────────────────────────────────────────────────────────────────────────────

export const studentAPI = {
  getAll:          ()               => api.get('/students'),
  getById:         (id)             => api.get(`/students/${id}`),
  getByRollNumber: (rollNumber)     => api.get(`/students/roll/${rollNumber}`),
  create:          (data)           => api.post('/students', data),
  update:          (id, data)       => api.put(`/students/${id}`, data),
  delete:          (id)             => api.delete(`/students/${id}`),
};

export const hostelAPI = {
  getAll:    ()           => api.get('/hostels'),
  getById:   (id)         => api.get(`/hostels/${id}`),
  getByType: (type)       => api.get(`/hostels/type/${type}`),
  create:    (data)       => api.post('/hostels', data),
  update:    (id, data)   => api.put(`/hostels/${id}`, data),
  delete:    (id)         => api.delete(`/hostels/${id}`),
};

export const roomAPI = {
  getAll:                 ()           => api.get('/rooms'),
  getById:                (id)         => api.get(`/rooms/${id}`),
  getByHostelId:          (hostelId)   => api.get(`/rooms/hostel/${hostelId}`),
  getAvailableByHostelId: (hostelId)   => api.get(`/rooms/hostel/${hostelId}/available`),
  create:                 (data)       => api.post('/rooms', data),
  update:                 (id, data)   => api.put(`/rooms/${id}`, data),
  delete:                 (id)         => api.delete(`/rooms/${id}`),
};

export const allocationAPI = {
  getAll:         ()                      => api.get('/allocations'),
  getById:        (id)                    => api.get(`/allocations/${id}`),
  getByStudentId: (studentId)             => api.get(`/allocations/student/${studentId}`),
  getByRoomId:    (roomId)                => api.get(`/allocations/room/${roomId}`),
  getActive:      ()                      => api.get('/allocations/active'),
  allocate:       (studentId, roomId)     => api.post('/allocations/allocate', { studentId, roomId }),
  checkIn:        (id, checkInDate)       => api.put(`/allocations/${id}/checkin`,  { checkInDate }),
  checkOut:       (id, checkOutDate)      => api.put(`/allocations/${id}/checkout`, { checkOutDate }),
  delete:         (id)                    => api.delete(`/allocations/${id}`),
};

export default api;
