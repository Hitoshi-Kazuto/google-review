const STORAGE_KEY = "review_funnel_business_auth";

export function saveBusinessAuth(businessId, loginCode) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ businessId, loginCode }));
}

export function getBusinessAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearBusinessAuth() {
  localStorage.removeItem(STORAGE_KEY);
}
