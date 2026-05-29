const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const accidentSchema = new mongoose.Schema({
    latitude:  { type: String },
    longitude: { type: String },
    status:    { type: String, default: 'Accident Detected' },
    timestamp: { type: Date, default: Date.now }
});

const Accident = mongoose.model('Accident', accidentSchema);

// POST — update existing or create new
app.post('/accident', async (req, res) => {
    try {
        const { lat, lon, status } = req.body;
        console.log('Received:', lat, lon, status);

        // Find existing record and update
        // If no record exists create one
        const record = await Accident.findOneAndUpdate(
            {},  // find any record
            {
                latitude:  lat    || '27.7172',
                longitude: lon    || '85.3240',
                status:    status || 'Accident Detected',
                timestamp: new Date()
            },
            {
                new: true,      // return updated record
                upsert: true,   // create if not exists
                sort: { timestamp: -1 }
            }
        );

        console.log('Updated MongoDB:', record);
        res.status(200).send('OK');

    } catch (err) {
        console.error(err);
        res.status(500).send('Error');
    }
});

// GET — latest accident
app.get('/latest', async (req, res) => {
    try {
        const record = await Accident.findOne()
                                     .sort({ timestamp: -1 });
        if (!record) {
            return res.status(404).json({ message: 'No data' });
        }
        res.json(record);
    } catch (err) {
        res.status(500).send('Error');
    }
});

// GET — all accidents
app.get('/accidents', async (req, res) => {
    try {
        const records = await Accident.find()
                                      .sort({ timestamp: -1 });
        res.json(records);
    } catch (err) {
        res.status(500).send('Error');
    }
});

// GET — dashboard
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ARS Dashboard</title>
            <style>
                body { font-family: Arial; padding: 20px; background: #f0f0f0; }
                h1 { color: #d32f2f; }
                table { width: 100%; border-collapse: collapse; background: white; }
                th { background: #d32f2f; color: white; padding: 10px; }
                td { padding: 10px; border-bottom: 1px solid #ddd; text-align: center; }
                tr:hover { background: #ffebee; }
                .map-link { color: blue; }
                .refresh { background: #d32f2f; color: white; 
                           padding: 10px 20px; border: none; 
                           cursor: pointer; border-radius: 5px; 
                           margin-bottom: 20px; }
                .status { color: green; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>Accident Detection System</h1>
            <p class="status" id="lastUpdate">Loading...</p>
            <button class="refresh" onclick="loadData()">Refresh</button>
            <table>
                <thead>
                    <tr>
                        <th>Latitude</th>
                        <th>Longitude</th>
                        <th>Status</th>
                        <th>Last Updated</th>
                        <th>Location</th>
                    </tr>
                </thead>
                <tbody id="tableBody">
                    <tr><td colspan="5">Loading...</td></tr>
                </tbody>
            </table>
            <script>
                async function loadData() {
                    const res = await fetch('/latest');
                    if (res.status === 404) {
                        document.getElementById('tableBody').innerHTML = 
                            '<tr><td colspan="5">No data yet</td></tr>';
                        return;
                    }
                    const a = await res.json();
                    document.getElementById('lastUpdate').textContent = 
                        'Last Updated: ' + new Date(a.timestamp).toLocaleString();
                    document.getElementById('tableBody').innerHTML = `
                        <tr>
                            <td>${a.latitude}</td>
                            <td>${a.longitude}</td>
                            <td>${a.status}</td>
                            <td>${new Date(a.timestamp).toLocaleString()}</td>
                            <td>
                                <a href="https://maps.google.com/?q=${a.latitude},${a.longitude}" 
                                   target="_blank">View on Map</a>
                            </td>
                        </tr>
                    `;
                }
                loadData();
                setInterval(loadData, 5000);
            </script>
        </body>
        </html>
    `);
});

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected!'))
    .catch(err => console.error('MongoDB error:', err));

module.exports = app;