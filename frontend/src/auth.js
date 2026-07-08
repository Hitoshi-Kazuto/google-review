const STORAGE_KEY = "reviewdo_business_auth";

export function saveBusinessAuth(businessId, token) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ businessId, token }));
}

export function getBusinessAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAuthToken() {
  return getBusinessAuth()?.token ?? null;
}

export function clearBusinessAuth() {
  localStorage.removeItem(STORAGE_KEY);
}
