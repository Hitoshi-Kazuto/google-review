import { Pool } from "pg";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "reviews.db");
const connectionString = process.env.DATABASE_URL;

const DEMO_EMAIL = "demo@cafeluna.com";
const DEMO_PASSWORD_HASH =
  "$2b$10$C.q.2M..XQHjF05S.MQJPeMs5pj2bqAG2mWfFHpX5s/KxctTbomvu";

function normalizeSqlForSqlite(sql) {
  return sql.replace(/\$([0-9]+)/g, "?");
}

function migrateBusinessesSqlite(sqlite) {
  const tableInfo = sqlite.prepare("PRAGMA table_info(businesses)").all();
  const columns = new Set(tableInfo.map((column) => column.name));

  if (!columns.has("email")) {
    sqlite.exec("ALTER TABLE businesses ADD COLUMN email TEXT");
  }
  if (!columns.has("password_hash")) {
    sqlite.exec("ALTER TABLE businesses ADD COLUMN password_hash TEXT");
  }

  sqlite.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_email ON businesses(email) WHERE email IS NOT NULL"
  );
}

function seedDemoBusinessSqlite(sqlite) {
  const existing = sqlite.prepare("SELECT COUNT(*) AS c FROM businesses").get();
  if (existing.c === 0) {
    sqlite
      .prepare(
        `INSERT INTO businesses (id, name, email, password_hash, logo_url, google_review_url, tag_options)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        "biz_demo",
        "Cafe Luna",
        DEMO_EMAIL,
        DEMO_PASSWORD_HASH,
        "",
        "https://search.google.com/local/writereview?placeid=REPLACE_WITH_REAL_PLACE_ID",
        JSON.stringify(["Fast service", "Friendly staff", "Clean space", "Great food"])
      );
  } else {
    sqlite
      .prepare(
        `UPDATE businesses SET email = ?, password_hash = ? WHERE id = 'biz_demo'`
      )
      .run(DEMO_EMAIL, DEMO_PASSWORD_HASH);
  }
}

function createSqliteAdapter() {
  const sqlite = new DatabaseSync(dbPath);
  sqlite.exec(`
  CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    password_hash TEXT,
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

  migrateBusinessesSqlite(sqlite);
  seedDemoBusinessSqlite(sqlite);

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

async function migrateBusinessesPostgres(db) {
  await db.run(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email TEXT`);
  await db.run(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS password_hash TEXT`);
  await db.run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_email ON businesses(email) WHERE email IS NOT NULL`
  );
}

async function seedDemoBusinessPostgres(db) {
  const existing = await db.get("SELECT COUNT(*)::int AS c FROM businesses");
  if (existing.c === 0) {
    await db.run(
      `INSERT INTO businesses (id, name, email, password_hash, logo_url, google_review_url, tag_options)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        "biz_demo",
        "Cafe Luna",
        DEMO_EMAIL,
        DEMO_PASSWORD_HASH,
        "",
        "https://search.google.com/local/writereview?placeid=REPLACE_WITH_REAL_PLACE_ID",
        JSON.stringify(["Fast service", "Friendly staff", "Clean space", "Great food"]),
      ]
    );
  } else {
    await db.run(`UPDATE businesses SET email = $1, password_hash = $2 WHERE id = 'biz_demo'`, [
      DEMO_EMAIL,
      DEMO_PASSWORD_HASH,
    ]);
  }
}

let db;

if (connectionString) {
  db = createPostgresAdapter();

  await db.run(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      password_hash TEXT,
      logo_url TEXT,
      google_review_url TEXT NOT NULL,
      tag_options TEXT NOT NULL DEFAULT '[]',
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

  await migrateBusinessesPostgres(db);
  await seedDemoBusinessPostgres(db);
} else {
  db = createSqliteAdapter();
}

export default db;
