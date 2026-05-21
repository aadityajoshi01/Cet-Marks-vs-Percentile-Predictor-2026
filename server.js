const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.static(__dirname)); // Serve the static files (index.html, script.js, etc.)

// Initialize db.json if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ visitors: 0 }));
}

// API endpoint to increment and get visitor count
app.get('/api/visitors', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        data.visitors += 1;
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        res.json({ count: data.visitors });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update visitor count' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Open the link above in your browser to view the MHT CET Predictor.');
});
