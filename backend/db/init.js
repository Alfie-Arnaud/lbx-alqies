const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'cinemalog.db');
let db;
function getDatabase() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
    }
    return db;
}
function runMigrations(database) {
    // Migration: fix role constraint to include admin and higher_admin
    try {
        // Check if migration needed by trying to update a test (will fail if constraint wrong)
        // We recreate users table with correct constraint using SQLite's limited ALTER support
        database.exec(`
            CREATE TABLE IF NOT EXISTS users_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                display_name TEXT,
                bio TEXT DEFAULT '',
                avatar_url TEXT,
                banner_url TEXT,
                role TEXT DEFAULT 'free' CHECK (role IN ('owner', 'admin', 'higher_admin', 'patron', 'pro', 'lifetime', 'free')),
                is_banned INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Check if users_new is empty (first time) or users exists
        const userCount = database.prepare(`SELECT COUNT(*) as count FROM users`).get();
        if (userCount && userCount.count > 0) {
            // Copy data from old table to new
            database.exec(`
                INSERT OR IGNORE INTO users_new 
                SELECT id, email, username, password_hash, display_name, bio, avatar_url, 
                       CASE WHEN banner_url IS NOT NULL THEN banner_url ELSE NULL END,
                       CASE WHEN role IN ('owner', 'admin', 'higher_admin', 'patron', 'pro', 'lifetime', 'free') 
                            THEN role ELSE 'free' END,
                       is_banned, created_at, updated_at
                FROM users;
            `);
        }

        // Drop old table and rename new one
        database.exec(`DROP TABLE IF EXISTS users;`);
        database.exec(`ALTER TABLE users_new RENAME TO users;`);

        console.log('Migration completed: role constraint updated');
    } catch (error) {
        console.error('Migration error:', error.message);
    }
}

function initializeDatabase() {
    const database = getDatabase();
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Run migrations first
    runMigrations(database);

    // Split schema into individual statements and execute
    const statements = schema.split(';').filter(stmt => stmt.trim());
    for (const statement of statements) {
        if (statement.trim()) {
            try {
                database.exec(statement + ';');
            } catch (e) {
                // Ignore "already exists" errors
                if (!e.message.includes('already exists')) {
                    console.error('Schema error:', e.message);
                }
            }
        }
    }
    console.log('Database initialized successfully');
    return database;
}
module.exports = {
    getDatabase,
    initializeDatabase
};