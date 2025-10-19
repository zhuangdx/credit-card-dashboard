const express = require('express');
const { db } = require('./database.js');
const { verifyToken } = require('./middleware.js');

const router = express.Router();

// All routes in this file are protected
router.use(verifyToken);

// GET all cards for the logged-in user
router.get('/cards', (req, res) => {
    const sql = "SELECT * FROM cards WHERE user_id = ?";
    db.all(sql, [req.userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: "Database error.", error: err.message });
        }
        res.json(rows);
    });
});

// ADD a new card
router.post('/cards', (req, res) => {
    const { name, billing_day, repayment_day, current_bill_amount = 0, unbilled_amount = 0 } = req.body;
    if (!name || billing_day === undefined || repayment_day === undefined) {
        return res.status(400).json({ message: "Missing required fields: name, billing_day, repayment_day" });
    }
    const sql = `INSERT INTO cards (user_id, name, billing_day, repayment_day, current_bill_amount, unbilled_amount) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [req.userId, name, billing_day, repayment_day, current_bill_amount, unbilled_amount], function(err) {
        if (err) {
            return res.status(500).json({ message: "Database error.", error: err.message });
        }
        res.status(201).json({ id: this.lastID, ...req.body });
    });
});

// UPDATE a card
router.put('/cards/:id', (req, res) => {
    const { name, billing_day, repayment_day, current_bill_amount, unbilled_amount } = req.body;
    const sql = `UPDATE cards SET 
                    name = COALESCE(?, name), 
                    billing_day = COALESCE(?, billing_day), 
                    repayment_day = COALESCE(?, repayment_day),
                    current_bill_amount = COALESCE(?, current_bill_amount),
                    unbilled_amount = COALESCE(?, unbilled_amount)
                 WHERE id = ? AND user_id = ?`;
    db.run(sql, [name, billing_day, repayment_day, current_bill_amount, unbilled_amount, req.params.id, req.userId], function(err) {
        if (err) {
            return res.status(500).json({ message: "Database error.", error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: "Card not found or user not authorized." });
        }
        res.json({ message: "Card updated successfully." });
    });
});

// DELETE a card
router.delete('/cards/:id', (req, res) => {
    const sql = "DELETE FROM cards WHERE id = ? AND user_id = ?";
    db.run(sql, [req.params.id, req.userId], function(err) {
        if (err) {
            return res.status(500).json({ message: "Database error.", error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: "Card not found or user not authorized." });
        }
        res.json({ message: "Card deleted successfully." });
    });
});

// IMPORT cards from JSON
router.post('/cards/import', (req, res) => {
    const cards = req.body;
    if (!Array.isArray(cards)) {
        return res.status(400).json({ message: "Request body must be an array of cards." });
    }

    const sql = 'INSERT INTO cards (user_id, name, billing_day, repayment_day) VALUES (?, ?, ?, ?)';
    const stmt = db.prepare(sql, (err) => {
        if (err) return res.status(500).json({ message: "Database error preparing statement.", error: err.message });
    });

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        cards.forEach(card => {
            stmt.run(req.userId, card.name, card.billingDay, card.repaymentDay);
        });
        db.run("COMMIT", (err) => {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ message: "Transaction failed.", error: err.message });
            }
            stmt.finalize();
            res.status(201).json({ message: `${cards.length} cards imported successfully.` });
        });
    });
});


module.exports = router;