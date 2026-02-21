const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'db', 'cinemalog.db');
const db = new Database(dbPath);

try {
  db.exec(`ALTER TABLE users ADD COLUMN location TEXT DEFAULT NULL`);
  console.log('Added location column');
} catch (e) {
  console.log('location column already exists, skipping');
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN banner_url TEXT DEFAULT NULL`);
  console.log('Added banner_url column');
} catch (e) {
  console.log('banner_url column already exists, skipping');
}

db.close();
console.log('Migration done!');