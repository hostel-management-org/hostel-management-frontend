/**
 * src/services/api.js
 * -------------------
 * Compatibility shim — re-exports everything from the canonical API service.
 *
 * All components import from this path ( ../services/api ) and require zero
 * changes.  The actual implementation and fallback logic lives in:
 *   src/api/apiService.js
 */
export {
  studentAPI,
  hostelAPI,
  roomAPI,
  allocationAPI,
  apiRequest,
  API_BASE_URL,
  default,
} from '../api/apiService';
