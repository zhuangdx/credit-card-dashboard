const sqlite3 = require('sqlite3').verbose();
// Use environment variable for database path in production, default to local file for development
const DB_SOURCE = process.env.DATABASE_URL || "credit_cards.db";

console.log(`Using database source: ${DB_SOURCE}`);

let db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) {
      console.error(err.message);
      throw err;
    }
});

const initDb = (callback) => {
    db.serialize(() => {
        // Create users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`, (err) => {
            if (err) return callback(err);
        });

        // Create cards table
        db.run(`CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT,
            billing_day INTEGER,
            repayment_day INTEGER,
            current_bill_amount REAL DEFAULT 0,
            unbilled_amount REAL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`, (err) => {
            if (err) return callback(err);
        });
        
        console.log("Database tables created or already exist.");
        callback(null);
    });
};

module.exports = { db, initDb };