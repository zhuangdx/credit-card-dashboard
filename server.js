// Main server file
const express = require('express');
const cors = require('cors');
const db = require('./database.js');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the root directory
app.use(express.static('.'));

// Import routes
const authRoutes = require('./auth.js');
const apiRoutes = require('./api.js');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// A simple test route
app.get('/', (req, res) => {
    res.send('Credit Card Dashboard Backend is running!');
});

// Initialize database and start server
db.initDb((err) => {
    if (err) {
        console.error("Failed to initialize database:", err);
        process.exit(1);
    } else {
        app.listen(port, () => {
            console.log(`Server listening on http://localhost:${port}`);
        });
    }
});