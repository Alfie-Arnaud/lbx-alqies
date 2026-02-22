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
    try {
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
        const userCount = database.prepare(`SELECT COUNT(*) as count FROM users`).get();
        if (userCount && userCount.count > 0) {
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
    const statements = schema.split(';').filter(stmt => stmt.trim());
    for (const statement of statements) {
        if (statement.trim()) {
            try {
                database.exec(statement + ';');
            } catch (e) {
                if (!e.message.includes('already exists')) {
                    console.error('Schema error:', e.message);
                }
            }
        }
    }
   // runMigrations(database);
    console.log('Database initialized successfully');
    return database;
}
module.exports = {
    getDatabase,
    initializeDatabase
};