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

app.post('/accident', async (req, res) => {
    try {
        const { lat, lon, status } = req.body;
        console.log('Received:', lat, lon, status);
        const record = new Accident({
            latitude:  lat  || '27.7172',
            longitude: lon  || '85.3240',
            status:    status || 'Accident Detected'
        });
        await record.save();
        console.log('Saved to MongoDB!');
        res.status(200).send('OK');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error');
    }
});

app.get('/accidents', async (req, res) => {
    try {
        const records = await Accident.find().sort({ timestamp: -1 });
        res.json(records);
    } catch (err) {
        res.status(500).send('Error');
    }
});

app.get('/', (req, res) => {
    res.send('ARS Server is Running!');
});

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB Connected Successfully!');
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });