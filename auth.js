const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('./database.js');

const router = express.Router();
const JWT_SECRET = 'your_super_secret_jwt_key'; // Replace with a real secret in production

// Register a new user
router.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required." });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);

    const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.run(sql, [username, hashedPassword], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ message: "Username already exists." });
            }
            return res.status(500).json({ message: "Database error during registration.", error: err.message });
        }
        res.status(201).json({ message: "User registered successfully.", userId: this.lastID });
    });
});

// Login a user
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required." });
    }

    const sql = 'SELECT * FROM users WHERE username = ?';
    db.get(sql, [username], (err, user) => {
        if (err) {
            return res.status(500).json({ message: "Database error during login.", error: err.message });
        }
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) {
            return res.status(401).json({ message: "Invalid password." });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, {
            expiresIn: 86400 // 24 hours
        });

        res.status(200).json({
            id: user.id,
            username: user.username,
            accessToken: token
        });
    });
});

module.exports = router;