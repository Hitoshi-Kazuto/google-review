import "dotenv/config";
import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import db from "../db/index.js";
import { generateReviewDrafts, generateSuggestedTags } from "./llm.js";
import { hashPassword, verifyPassword, signToken, verifyToken } from "./auth.js";

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (origin.includes("vercel.app") || origin.includes("vercel-preview.app")) return true;
  if (origin.startsWith("http://localhost") || origin.startsWith("https://localhost")) return true;
  return false;
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));



app.use(express.json());

const MAX_REGENERATIONS = Number(process.env.MAX_REGENERATIONS || 3);
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5173";

function formatBusiness(biz, { includeEmail = false } = {}) {
  const result = {
    id: biz.id,
    name: biz.name,
    logo_url: biz.logo_url,
    google_review_url: biz.google_review_url,
    tag_options: JSON.parse(biz.tag_options),
    qr_url: `${APP_BASE_URL}/r/${biz.id}`,
    created_at: biz.created_at,
  };
  if (includeEmail && biz.email) {
    result.email = biz.email;
  }
  return result;
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = verifyToken(authHeader.slice(7));
    req.businessId = payload.businessId;

    const routeBusinessId = req.params.business_id;
    if (routeBusinessId && routeBusinessId !== payload.businessId) {
      return res.status(403).json({ error: "Access denied" });
    }

    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// GET /api/business/:business_id — public (customer review flow)
app.get("/api/business/:business_id", async (req, res) => {
  const biz = await db.get("SELECT * FROM businesses WHERE id = $1", [req.params.business_id]);

  if (!biz) return res.status(404).json({ error: "Business not found" });
  res.json(formatBusiness(biz));
});

// POST /api/businesses — register a new business
app.post("/api/businesses", async (req, res) => {
  const {
    name,
    email,
    password,
    google_review_url,
    tag_options = [],
    logo_url = "",
  } = req.body;

  if (!name?.trim() || !email?.trim() || !password || !google_review_url?.trim()) {
    return res.status(400).json({
      error: "name, email, password, and google_review_url are required",
    });
  }

  if (!isValidEmail(email.trim())) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.get("SELECT id FROM businesses WHERE LOWER(email) = $1", [
      normalizedEmail,
    ]);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const tags = Array.isArray(tag_options)
      ? tag_options.map((t) => String(t).trim()).filter(Boolean)
      : [];

    const id = `biz_${nanoid(8)}`;
    const passwordHash = await hashPassword(password);

    await db.run(
      `INSERT INTO businesses (id, name, email, password_hash, logo_url, google_review_url, tag_options)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        name.trim(),
        normalizedEmail,
        passwordHash,
        logo_url.trim(),
        google_review_url.trim(),
        JSON.stringify(tags),
      ]
    );

    const biz = await db.get("SELECT * FROM businesses WHERE id = $1", [id]);
    const token = signToken(id);
    return res.status(201).json({ ...formatBusiness(biz, { includeEmail: true }), token });
  } catch (err) {
    console.error("Business registration failed", err);
    return res.status(503).json({
      error: "Database unavailable. Please try again later or configure DATABASE_URL.",
    });
  }
});

// POST /api/businesses/login
app.post("/api/businesses/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const biz = await db.get("SELECT * FROM businesses WHERE LOWER(email) = $1", [
    normalizedEmail,
  ]);

  if (!biz || !(await verifyPassword(password, biz.password_hash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken(biz.id);
  res.json({ ...formatBusiness(biz, { includeEmail: true }), token });
});

// PATCH /api/business/:business_id — update business settings
app.patch("/api/business/:business_id", requireAuth, async (req, res) => {
  const biz = await db.get("SELECT * FROM businesses WHERE id = $1", [req.params.business_id]);

  if (!biz) return res.status(404).json({ error: "Business not found" });

  const { tag_options, name, google_review_url, logo_url } = req.body;
  const updates = [];
  const values = [];

  if (tag_options !== undefined) {
    const tags = Array.isArray(tag_options)
      ? tag_options.map((t) => String(t).trim()).filter(Boolean)
      : [];
    updates.push("tag_options = ?");
    values.push(JSON.stringify(tags));
  }

  if (name?.trim()) {
    updates.push("name = ?");
    values.push(name.trim());
  }

  if (google_review_url?.trim()) {
    updates.push("google_review_url = ?");
    values.push(google_review_url.trim());
  }

  if (logo_url !== undefined) {
    updates.push("logo_url = ?");
    values.push(String(logo_url).trim());
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  values.push(req.params.business_id);
  const placeholders = updates.map((_, index) => `$${index + 1}`).join(", ");
  await db.run(`UPDATE businesses SET ${updates.join(", ")} WHERE id = $${values.length}`, values);

  const updated = await db.get("SELECT * FROM businesses WHERE id = $1", [req.params.business_id]);
  res.json(formatBusiness(updated));
});

// GET /api/business/:business_id/suggested-tags?stars=5
app.get("/api/business/:business_id/suggested-tags", async (req, res) => {
  const stars = Number(req.query.stars);
  if (!stars || stars < 1 || stars > 5) {
    return res.status(400).json({ error: "stars query param (1-5) is required" });
  }

  const biz = await db.get("SELECT * FROM businesses WHERE id = $1", [req.params.business_id]);

  if (!biz) return res.status(404).json({ error: "Business not found" });

  const existingTags = JSON.parse(biz.tag_options);

  try {
    const suggested = await generateSuggestedTags({
      businessName: biz.name,
      stars,
      existingTags,
      count: 6,
    });
    res.json({ suggested });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to generate suggested tags." });
  }
});

// GET /api/business/:business_id/analytics
app.get("/api/business/:business_id/analytics", requireAuth, async (req, res) => {
  const biz = await db.get("SELECT * FROM businesses WHERE id = $1", [req.params.business_id]);

  if (!biz) return res.status(404).json({ error: "Business not found" });

  const drafts = await db.all(
    `SELECT stars, action, was_edited, created_at
     FROM review_drafts WHERE business_id = $1`,
    [req.params.business_id]
  );

  const feedback = await db.all(
    `SELECT stars, created_at FROM private_feedback WHERE business_id = $1`,
    [req.params.business_id]
  );

  const posted = drafts.filter((d) => d.action === "posted_to_google").length;
  const privateCount = drafts.filter((d) => d.action === "sent_private_feedback").length;
  const edited = drafts.filter((d) => d.was_edited).length;
  const totalGenerated = drafts.length;

  const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const d of drafts) {
    if (starCounts[d.stars] !== undefined) starCounts[d.stars]++;
  }
  for (const f of feedback) {
    if (starCounts[f.stars] !== undefined) starCounts[f.stars]++;
  }

  const allStars = [...drafts.map((d) => d.stars), ...feedback.map((f) => f.stars)];
  const avgStars =
    allStars.length > 0
      ? Math.round((allStars.reduce((a, b) => a + b, 0) / allStars.length) * 10) / 10
      : null;

  res.json({
    business_id: biz.id,
    business_name: biz.name,
    total_reviews_generated: totalGenerated,
    posted_to_google: posted,
    sent_private_feedback: privateCount + feedback.length,
    edited_before_posting: edited,
    average_stars: avgStars,
    star_distribution: starCounts,
    recent_activity: [
      ...drafts.map((d) => ({
        type: d.action || "draft",
        stars: d.stars,
        created_at: d.created_at,
      })),
      ...feedback.map((f) => ({
        type: "private_feedback",
        stars: f.stars,
        created_at: f.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20),
  });
});

// POST /api/generate-review — returns 2-3 drafts
app.post("/api/generate-review", async (req, res) => {
  const { business_id, stars, tags = [] } = req.body;

  if (!business_id || !stars || stars < 1 || stars > 5) {
    return res.status(400).json({ error: "business_id and stars (1-5) are required" });
  }

  const biz = await db.get("SELECT * FROM businesses WHERE id = $1", [business_id]);
  if (!biz) return res.status(404).json({ error: "Business not found" });

  try {
    const texts = await generateReviewDrafts({
      businessName: biz.name,
      stars,
      tags,
      count: 3,
    });

    const drafts = [];
    for (const text of texts) {
      const id = nanoid();
      await db.run(
        `INSERT INTO review_drafts (id, business_id, stars, tags, generated_text)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, business_id, stars, JSON.stringify(tags), text]
      );
      drafts.push({ draft_id: id, text });
    }

    res.json({ drafts });
  } catch (err) {
    console.error(err);
    res.status(502).json({
      error:
        "Failed to generate reviews. Check HF_API_TOKEN is set and the Llama model license is accepted on Hugging Face.",
    });
  }
});

// POST /api/regenerate-review
app.post("/api/regenerate-review", async (req, res) => {
  const { draft_id } = req.body;
  const draft = await db.get("SELECT * FROM review_drafts WHERE id = $1", [draft_id]);
  if (!draft) return res.status(404).json({ error: "Draft not found" });

  if (draft.regeneration_count >= MAX_REGENERATIONS) {
    return res.status(429).json({ error: "Regeneration limit reached" });
  }

  const biz = await db.get("SELECT * FROM businesses WHERE id = $1", [draft.business_id]);

  try {
    const texts = await generateReviewDrafts({
      businessName: biz.name,
      stars: draft.stars,
      tags: JSON.parse(draft.tags),
      count: 1,
    });
    const text = texts[0];

    await db.run(
      `UPDATE review_drafts SET generated_text = $1, regeneration_count = regeneration_count + 1
       WHERE id = $2`,
      [text, draft_id]
    );

    res.json({ draft_id, text });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to regenerate review." });
  }
});

// POST /api/review-action
app.post("/api/review-action", async (req, res) => {
  const { draft_id, final_text, action } = req.body;

  if (!["posted_to_google", "sent_private_feedback"].includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  const draft = await db.get("SELECT * FROM review_drafts WHERE id = $1", [draft_id]);
  if (!draft) return res.status(404).json({ error: "Draft not found" });

  const wasEdited =
    final_text && final_text.trim() !== draft.generated_text.trim() ? 1 : 0;

  await db.run(
    `UPDATE review_drafts SET final_text = $1, was_edited = $2, action = $3 WHERE id = $4`,
    [final_text || draft.generated_text, wasEdited, action, draft_id]
  );

  res.json({ ok: true });
});

// POST /api/private-feedback
app.post("/api/private-feedback", async (req, res) => {
  const { business_id, stars, text } = req.body;
  if (!business_id || !stars || !text) {
    return res.status(400).json({ error: "business_id, stars, and text are required" });
  }

  const id = nanoid();
  await db.run(
    `INSERT INTO private_feedback (id, business_id, stars, text) VALUES ($1, $2, $3, $4)`,
    [id, business_id, stars, text]
  );

  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`ReviewDo backend running on http://localhost:${PORT}`);
    console.log(`Demo login: demo@cafeluna.com / demo1234`);
  });
}

export default app;
