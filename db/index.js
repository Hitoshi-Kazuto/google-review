import { Pool } from "pg";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "reviews.db");
const connectionString = process.env.DATABASE_URL;

function normalizeSqlForSqlite(sql) {
  return sql.replace(/\$([0-9]+)/g, "?");
}

function createSqliteAdapter() {
  const sqlite = new Database(dbPath);
  sqlite.exec(`
  CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT,
    google_review_url TEXT NOT NULL,
    tag_options TEXT NOT NULL DEFAULT '[]',
    login_code TEXT,
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

  const tableInfo = sqlite.prepare("PRAGMA table_info(businesses)").all();
  const hasLoginCode = tableInfo.some((column) => column.name === "login_code");
  if (!hasLoginCode) {
    sqlite.exec("ALTER TABLE businesses ADD COLUMN login_code TEXT");
  }

  const existing = sqlite.prepare("SELECT COUNT(*) AS c FROM businesses").get();
  if (existing.c === 0) {
    sqlite.prepare(
      `INSERT INTO businesses (id, name, logo_url, google_review_url, tag_options, login_code)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      "biz_demo",
      "Cafe Luna",
      "",
      "https://search.google.com/local/writereview?placeid=REPLACE_WITH_REAL_PLACE_ID",
      JSON.stringify(["Fast service", "Friendly staff", "Clean space", "Great food"]),
      "BIZ-DEMO1"
    );
  } else {
    sqlite.prepare(`UPDATE businesses SET login_code = ? WHERE id = 'biz_demo'`).run("BIZ-DEMO1");
  }

  return {
    prepare(sql) {
      const statement = sqlite.prepare(normalizeSqlForSqlite(sql));
      return {
        get: (...params) => statement.get(...params),
        all: (...params) => statement.all(...params),
        run: (...params) => statement.run(...params),
      };
    },
    async get(sql, params = []) {
      return this.prepare(sql).get(...params);
    },
    async all(sql, params = []) {
      return this.prepare(sql).all(...params);
    },
    async run(sql, params = []) {
      return this.prepare(sql).run(...params);
    },
    close() {
      sqlite.close();
    },
  };
}

function createPostgresAdapter() {
  const pool = new Pool({ connectionString });
  return {
    async get(sql, params = []) {
      const result = await pool.query(sql, params);
      return result.rows[0];
    },
    async all(sql, params = []) {
      const result = await pool.query(sql, params);
      return result.rows;
    },
    async run(sql, params = []) {
      const result = await pool.query(sql, params);
      return result;
    },
    async close() {
      await pool.end();
    },
  };
}

let db;

if (connectionString) {
  db = createPostgresAdapter();

  await db.run(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo_url TEXT,
      google_review_url TEXT NOT NULL,
      tag_options TEXT NOT NULL DEFAULT '[]',
      login_code TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.run(`
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
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    );
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS private_feedback (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      stars INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    );
  `);

  const existing = await db.get("SELECT COUNT(*)::int AS c FROM businesses");
  if (existing.c === 0) {
    await db.run(
      `INSERT INTO businesses (id, name, logo_url, google_review_url, tag_options, login_code)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        "biz_demo",
        "Cafe Luna",
        "",
        "https://search.google.com/local/writereview?placeid=REPLACE_WITH_REAL_PLACE_ID",
        JSON.stringify(["Fast service", "Friendly staff", "Clean space", "Great food"]),
        "BIZ-DEMO1",
      ]
    );
  } else {
    await db.run(`UPDATE businesses SET login_code = $1 WHERE id = 'biz_demo'`, ["BIZ-DEMO1"]);
  }
} else {
  db = createSqliteAdapter();
}

export default db;
