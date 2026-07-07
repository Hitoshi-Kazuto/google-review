const API_BASE = import.meta.env.VITE_API_BASE || "";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function getBusiness(businessId) {
  return request(`/api/business/${businessId}`);
}

export function generateReview(businessId, stars, tags) {
  return request("/api/generate-review", {
    method: "POST",
    body: JSON.stringify({ business_id: businessId, stars, tags }),
  });
}

export function regenerateReview(draftId) {
  return request("/api/regenerate-review", {
    method: "POST",
    body: JSON.stringify({ draft_id: draftId }),
  });
}

export function reviewAction(draftId, finalText, action) {
  return request("/api/review-action", {
    method: "POST",
    body: JSON.stringify({ draft_id: draftId, final_text: finalText, action }),
  });
}

export function sendPrivateFeedback(businessId, stars, text) {
  return request("/api/private-feedback", {
    method: "POST",
    body: JSON.stringify({ business_id: businessId, stars, text }),
  });
}

export function registerBusiness(data) {
  return request("/api/businesses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function loginBusiness(data) {
  return request("/api/businesses/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getAnalytics(businessId) {
  return request(`/api/business/${businessId}/analytics`);
}

export function updateBusiness(businessId, data) {
  return request(`/api/business/${businessId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function getSuggestedTags(businessId, stars) {
  return request(`/api/business/${businessId}/suggested-tags?stars=${stars}`);
}

const MOCK_SUGGESTED_BY_STARS = {
  5: ["Exceeded expectations", "Will come back", "Great atmosphere", "Attention to detail", "Smooth experience", "Worth recommending"],
  4: ["Mostly great", "Good value", "Pleasant visit", "Nice ambiance", "Helpful team", "Would return"],
  3: ["Mixed experience", "Average service", "Room to improve", "Decent but uneven", "Some highlights", "Could be better"],
  2: ["Long wait", "Below expectations", "Needs improvement", "Disappointing visit", "Service issues", "Not as advertised"],
  1: ["Very disappointed", "Poor service", "Unacceptable wait", "Would not return", "Major issues", "Needs urgent fix"],
};

export function mockSuggestedTags(stars, existingTags = []) {
  const existingLower = new Set(existingTags.map((t) => t.toLowerCase()));
  const pool = MOCK_SUGGESTED_BY_STARS[stars] || MOCK_SUGGESTED_BY_STARS[3];
  const suggested = pool.filter((t) => !existingLower.has(t.toLowerCase())).slice(0, 6);
  return Promise.resolve({ suggested });
}

export function mockGenerateReview(businessName, stars, tags) {
  const tagPhrase =
    tags.length > 0 ? ` I especially noticed ${tags.join(" and ").toLowerCase()}.` : "";

  const templates = {
    5: [
      `Had a great experience at ${businessName}! Everything exceeded my expectations.${tagPhrase} Will definitely be back.`,
      `${businessName} really impressed me today.${tagPhrase} The whole visit felt effortless and welcoming.`,
      `Really enjoyed my time at ${businessName}.${tagPhrase} It's the kind of place you want to tell friends about.`,
    ],
    4: [
      `Solid visit to ${businessName}.${tagPhrase} A few small things could be better, but overall I'd come again.`,
      `Good experience at ${businessName}.${tagPhrase} Mostly smooth, with just a minor hiccup or two.`,
      `${businessName} delivered on most of what I hoped for.${tagPhrase} Worth checking out.`,
    ],
    3: [
      `${businessName} was okay.${tagPhrase} Some things worked well, but a couple areas could use improvement.`,
      `Mixed experience at ${businessName}.${tagPhrase} There were highlights, though not everything landed.`,
      `Average visit to ${businessName}.${tagPhrase} Not bad, but room to step things up.`,
    ],
    2: [
      `My visit to ${businessName} fell short.${tagPhrase} A few issues made the experience frustrating.`,
      `Disappointed with ${businessName} today.${tagPhrase} Expected better based on what I'd heard.`,
      `${businessName} needs work.${tagPhrase} Several things didn't go as they should have.`,
    ],
    1: [
      `Very poor experience at ${businessName}.${tagPhrase} Multiple things went wrong during my visit.`,
      `Would not recommend ${businessName}.${tagPhrase} The service and overall experience were unacceptable.`,
      `${businessName} did not meet basic expectations.${tagPhrase} Hoping they improve soon.`,
    ],
  };

  const options = templates[stars] || templates[3];
  return Promise.resolve({
    drafts: options.map((text, i) => ({
      draft_id: `mock_${Date.now()}_${i}`,
      text,
    })),
  });
}
