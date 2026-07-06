import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "reviews.db");

const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  google_review_url TEXT NOT NULL,
  tag_options TEXT NOT NULL DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS review_drafts (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  stars INTEGER NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  generated_text TEXT NOT NULL,
  final_text TEXT,
  was_edited INTEGER DEFAULT 0,
  regeneration_count INTEGER DEFAULT 0,
  action TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE IF NOT EXISTS private_feedback (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  stars INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);
`);

const existing = db.prepare("SELECT COUNT(*) AS c FROM businesses").get();
if (existing.c === 0) {
  db.prepare(
    `INSERT INTO businesses (id, name, logo_url, google_review_url, tag_options)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    "biz_demo",
    "Cafe Luna",
    "",
    "https://search.google.com/local/writereview?placeid=REPLACE_WITH_REAL_PLACE_ID",
    JSON.stringify(["Fast service", "Friendly staff", "Clean space", "Great food"])
  );
}

export default db;
