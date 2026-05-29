const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
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

let isConnected = false;
let lastSaveTime = 0;
const DEBOUNCE_MS = 10000; // ignore duplicate hits within 10 seconds

async function connectDB() {
    if (isConnected) return;
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
}

app.get('/update', async (req, res) => {
    try {
        await connectDB();
        const now = Date.now();

        // Debounce — ignore if same data came in within 10s
        if (now - lastSaveTime < DEBOUNCE_MS) {
            console.log('Debounced duplicate request');
            return res.status(200).send('OK');
        }
        lastSaveTime = now;

        const lat    = req.query.lat    || '27.7172';
        const lon    = req.query.lon    || '85.3240';
        const status = req.query.status || 'Accident Detected';

        console.log('Received GET:', lat, lon, status);

        await Accident.findOneAndUpdate(
            {},
            { latitude: lat, longitude: lon, status, timestamp: new Date() },
            { returnDocument: 'after', upsert: true }
        );

        console.log('Saved!');
        res.status(200).send('OK');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error');
    }
});

app.post('/accident', async (req, res) => {
    try {
        await connectDB();
        const { lat, lon, status } = req.body;
        console.log('Received POST:', lat, lon, status);

        await Accident.findOneAndUpdate(
            {},
            {
                latitude:  lat    || '27.7172',
                longitude: lon    || '85.3240',
                status:    status || 'Accident Detected',
                timestamp: new Date()
            },
            { returnDocument: 'after', upsert: true }
        );

        res.status(200).send('OK');
    } catch (err) {
        res.status(500).send('Error');
    }
});

app.get('/latest', async (req, res) => {
    try {
        await connectDB();
        const record = await Accident.findOne().sort({ timestamp: -1 });
        if (!record) return res.status(404).json({ message: 'No data' });
        res.json(record);
    } catch (err) {
        res.status(500).send('Error');
    }
});

app.get('/accidents', async (req, res) => {
    try {
        await connectDB();
        const records = await Accident.find().sort({ timestamp: -1 });
        res.json(records);
    } catch (err) {
        res.status(500).send('Error');
    }
});

app.get('/', async (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(
        '<!DOCTYPE html>' +
        '<html><head><title>ARS Dashboard</title>' +
        '<style>' +
        'body{font-family:Arial;padding:20px;background:#f0f0f0;}' +
        'h1{color:#d32f2f;}' +
        'table{width:100%;border-collapse:collapse;background:white;}' +
        'th{background:#d32f2f;color:white;padding:10px;}' +
        'td{padding:10px;border-bottom:1px solid #ddd;text-align:center;}' +
        'tr:hover{background:#ffebee;}' +
        'a{color:blue;}' +
        '.btn{background:#d32f2f;color:white;padding:10px 20px;' +
        'border:none;cursor:pointer;border-radius:5px;margin-bottom:20px;}' +
        '.status{color:green;font-weight:bold;}' +
        '</style></head><body>' +
        '<h1>Accident Detection System</h1>' +
        '<p class="status" id="upd">Loading...</p>' +
        '<button class="btn" onclick="load()">Refresh</button>' +
        '<table><thead><tr>' +
        '<th>Latitude</th><th>Longitude</th>' +
        '<th>Status</th><th>Last Updated</th><th>Map</th>' +
        '</tr></thead>' +
        '<tbody id="tb"><tr><td colspan="5">Loading...</td></tr></tbody>' +
        '</table>' +
        '<script>' +
        'async function load(){' +
        'try{' +
        'var r=await fetch("/latest");' +
        'if(r.status===404){document.getElementById("tb").innerHTML="<tr><td colspan=5>No data</td></tr>";return;}' +
        'var a=await r.json();' +
        'document.getElementById("upd").textContent="Last Updated: "+new Date(a.timestamp).toLocaleString();' +
        'document.getElementById("tb").innerHTML="<tr>"' +
        '+"<td>"+a.latitude+"</td>"' +
        '+"<td>"+a.longitude+"</td>"' +
        '+"<td>"+a.status+"</td>"' +
        '+"<td>"+new Date(a.timestamp).toLocaleString()+"</td>"' +
        '+"<td><a href=\'https://maps.google.com/?q="+a.latitude+","+a.longitude+"\' target=\'_blank\'>View Map</a></td>"' +
        '+"</tr>";}' +
        'catch(e){document.getElementById("upd").textContent="Error: "+e;}' +
        '}' +
        'load();setInterval(load,5000);' +
        '</script></body></html>'
    );
});

module.exports = app;