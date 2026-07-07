const HF_API_URL =
  process.env.HF_API_URL ||
  "https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct/v1/chat/completions";
const HF_API_TOKEN = process.env.HF_API_TOKEN;

function buildLocalReviewDrafts({ businessName, stars, tags, count = 3 }) {
  const tagPhrase = tags && tags.length ? ` I especially noticed ${tags.join(" and ").toLowerCase()}.` : "";
  const templates = {
    5: [
      `Had a great experience at ${businessName}! Everything felt smooth and welcoming.${tagPhrase} I’d definitely come back.`,
      `${businessName} really impressed me today.${tagPhrase} The whole visit felt thoughtful and easy.`,
      `Really enjoyed my time at ${businessName}.${tagPhrase} It felt like a place that genuinely cares about guests.`,
    ],
    4: [
      `Had a solid experience at ${businessName}.${tagPhrase} There were a few small things that could be better, but overall it was great.`,
      `${businessName} delivered a good experience.${tagPhrase} I’d be happy to return and recommend it.`,
      `Enjoyed my visit to ${businessName}.${tagPhrase} The service felt warm and the overall experience was positive.`,
    ],
    3: [
      `${businessName} was okay.${tagPhrase} Some parts were strong, but there are a couple things that could improve.`,
      `My experience at ${businessName} was mixed.${tagPhrase} There were highlights, but it wasn’t perfect.`,
      `Visited ${businessName} and had a fairly average experience.${tagPhrase} I saw some strengths, though there is room to improve.`,
    ],
    2: [
      `My visit to ${businessName} fell short of expectations.${tagPhrase} A few things made the experience frustrating.`,
      `I had a disappointing experience at ${businessName}.${tagPhrase} It didn’t feel as polished as it should have.`,
      `${businessName} needs some attention.${tagPhrase} A few issues stood out during my visit.`,
    ],
    1: [
      `My experience at ${businessName} was very poor.${tagPhrase} Several things went wrong and it felt frustrating.`,
      `I was disappointed by ${businessName}.${tagPhrase} The visit did not meet basic expectations.`,
      `${businessName} needs urgent improvement.${tagPhrase} The experience felt careless and disappointing.`,
    ],
  };

  const options = templates[stars] || templates[3];
  return options.slice(0, count).map((text) => text.trim());
}

function buildLocalSuggestedTags({ stars, existingTags = [], count = 6 }) {
  const pool = {
    5: ["Great service", "Friendly team", "Smooth visit", "Welcoming atmosphere", "Attention to detail", "Would return"],
    4: ["Good value", "Pleasant visit", "Helpful team", "Nice ambiance", "Reliable service", "Would recommend"],
    3: ["Decent experience", "Room to improve", "Fair service", "Some highlights", "Average visit", "Could be better"],
    2: ["Needs improvement", "Poor service", "Long wait", "Disappointing visit", "Below expectations", "Not great"],
    1: ["Very disappointed", "Poor service", "Unacceptable wait", "Would not return", "Major issues", "Needs urgent fix"],
  };

  const existingLower = new Set(existingTags.map((t) => t.toLowerCase()));
  const suggestions = (pool[stars] || pool[3]).filter((tag) => !existingLower.has(tag.toLowerCase()));
  return suggestions.slice(0, count);
}

function buildPrompt({ businessName, stars, tags, draftCount }) {
  const tagLine =
    tags && tags.length
      ? `The customer highlighted: ${tags.join(", ")}.`
      : "No specific details were given.";

  const toneGuidance =
    {
      5: "enthusiastic and warm, but not over the top",
      4: "positive with maybe one small, mild caveat",
      3: "balanced — mention something good and something that could improve",
      2: "measured and specific about what fell short, not harsh or personal",
      1: "measured and specific about what went wrong, not harsh or personal",
    }[stars] || "balanced";

  return `You are drafting short, authentic-sounding customer reviews. Do not use markdown, headers, or quotation marks.

Business: ${businessName}
Rating: ${stars} out of 5 stars
${tagLine}

Write exactly ${draftCount} different review options in first person. Each should be 2-3 sentences. Tone should be ${toneGuidance}. Avoid generic phrases like "highly recommend" or "best ever" unless truly warranted by 5 stars. Keep each option natural and specific, not templated.

Return ONLY a JSON array of ${draftCount} strings, no other text. Example format: ["First review text.", "Second review text.", "Third review text."]`;
}

function parseJsonArray(raw) {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((s) => String(s).trim()).filter(Boolean);
    }
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          return parsed.map((s) => String(s).trim()).filter(Boolean);
        }
      } catch {
        /* fall through */
      }
    }
  }
  return [];
}

function parseDrafts(raw) {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((s) => String(s).trim()).filter(Boolean);
    }
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          return parsed.map((s) => String(s).trim()).filter(Boolean);
        }
      } catch {
        /* fall through */
      }
    }
  }
  if (trimmed) return [trimmed];
  return [];
}

export async function generateReviewDrafts({ businessName, stars, tags, count = 3 }) {
  if (!HF_API_TOKEN) {
    return buildLocalReviewDrafts({ businessName, stars, tags, count });
  }

  const prompt = buildPrompt({ businessName, stars, tags, draftCount: count });

  const res = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HF_API_TOKEN}`,
    },
    body: JSON.stringify({
      model: "meta-llama/Llama-3.1-8B-Instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.85,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Hugging Face request failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  const drafts = parseDrafts(text);

  if (drafts.length === 0) {
    throw new Error("LLM returned empty review drafts");
  }

  return drafts.slice(0, count);
}

function buildSuggestedTagsPrompt({ businessName, stars, existingTags, count }) {
  const existingLine =
    existingTags.length > 0
      ? `The business already uses these keywords — suggest different ones: ${existingTags.join(", ")}.`
      : "No existing keywords configured.";

  const toneHint =
    stars >= 4
      ? "positive aspects a happy customer might mention"
      : stars === 3
        ? "balanced aspects — something good and something to improve"
        : "constructive aspects a dissatisfied customer might mention";

  return `You suggest short review keyword phrases for customers leaving a Google review.

Business: ${businessName}
Rating: ${stars} out of 5 stars
${existingLine}

Suggest exactly ${count} short keyword phrases (2-4 words each) that fit ${toneHint}. They should feel natural for a real customer to tap, not marketing copy.

Return ONLY a JSON array of ${count} strings. Example: ["Quick checkout", "Helpful staff"]`;
}

export async function generateSuggestedTags({
  businessName,
  stars,
  existingTags = [],
  count = 6,
}) {
  if (!HF_API_TOKEN) {
    return buildLocalSuggestedTags({ stars, existingTags, count });
  }

  const prompt = buildSuggestedTagsPrompt({ businessName, stars, existingTags, count });

  const res = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HF_API_TOKEN}`,
    },
    body: JSON.stringify({
      model: "meta-llama/Llama-3.1-8B-Instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.9,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Hugging Face request failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  const tags = parseJsonArray(text);

  const existingLower = new Set(existingTags.map((t) => t.toLowerCase()));
  return tags
    .filter((t) => !existingLower.has(t.toLowerCase()))
    .slice(0, count);
}
