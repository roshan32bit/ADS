const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const TS_READ_KEY = 'PDKWYWD6ZO5E1MXJ';
const TS_CHANNEL  = '3397361';

app.get('/latest', async (req, res) => {
    try {
        const response = await fetch(
            'https://api.thingspeak.com/channels/' +
            TS_CHANNEL +
            '/feeds/last.json?api_key=' +
            TS_READ_KEY
        );
        const data = await response.json();
        res.json({
            latitude:  data.field1 || 'N/A',
            longitude: data.field2 || 'N/A',
            status:    data.field3 || 'N/A',
            timestamp: data.created_at
        });
    } catch (err) {
        res.status(500).json({ message: 'Error' });
    }
});

app.get('/', async (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(
        '<!DOCTYPE html>' +
        '<html><head><title>ADS Dashboard</title>' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<style>' +
        '*{box-sizing:border-box;margin:0;padding:0;}' +
        'body{font-family:Arial;background:#f0f0f0;}' +
        '.header{background:#d32f2f;color:white;padding:20px;text-align:center;}' +
        '.header h1{font-size:24px;}' +
        '.header p{font-size:13px;opacity:0.8;}' +
        '.container{padding:20px;}' +
        '.card{background:white;border-radius:10px;padding:20px;' +
        'margin-bottom:20px;box-shadow:0 2px 5px rgba(0,0,0,0.1);}' +
        '.card h2{color:#d32f2f;font-size:16px;margin-bottom:15px;}' +
        '.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}' +
        '.info-box{background:#f9f9f9;border-radius:8px;padding:12px;text-align:center;}' +
        '.info-box .label{font-size:11px;color:#999;margin-bottom:5px;}' +
        '.info-box .value{font-size:18px;font-weight:bold;color:#333;}' +
        '.status-badge{display:inline-block;background:#d32f2f;' +
        'color:white;padding:5px 15px;border-radius:20px;font-size:13px;}' +
        '.map-btn{display:block;background:#1976d2;color:white;' +
        'text-align:center;padding:12px;border-radius:8px;' +
        'text-decoration:none;margin-top:10px;font-size:14px;}' +
        '.refresh-btn{background:#d32f2f;color:white;border:none;' +
        'padding:10px 20px;border-radius:8px;cursor:pointer;' +
        'font-size:14px;width:100%;margin-bottom:10px;}' +
        '.update-time{text-align:center;color:#999;font-size:12px;margin-bottom:15px;}' +
        '.dot{height:10px;width:10px;border-radius:50%;display:inline-block;margin-right:5px;}' +
        '.dot-green{background:#4caf50;}' +
        '.dot-red{background:#d32f2f;}' +
        '</style></head><body>' +
        '<div class="header">' +
        '<h1>ADS System</h1>' +
        '<p>Accident Detection System Live Dashboard</p>' +
        '</div>' +
        '<div class="container">' +
        '<div class="update-time" id="upd">Loading...</div>' +
        '<button class="refresh-btn" onclick="load()">Refresh Now</button>' +
        '<div class="card">' +
        '<h2>Last Accident Location</h2>' +
        '<div class="info-grid" id="grid">' +
        '<div style="text-align:center;color:#999;padding:20px;grid-column:span 2">Waiting...</div>' +
        '</div></div>' +
        '<div class="card" id="mapcard" style="display:none">' +
        '<h2>Location Map</h2>' +
        '<a class="map-btn" id="maplink" href="#" target="_blank">Open in Google Maps</a>' +
        '</div>' +
        '<div class="card">' +
        '<h2>System Info</h2>' +
        '<p style="font-size:13px;color:#666;line-height:2">' +
        'Device: AT89S52<br>' +
        'GSM: SIM800L NTC<br>' +
        'Sensor: GY-87 MPU6050<br>' +
        'GPS: NEO-6M<br>' +
        'Data: ThingSpeak' +
        '</p></div>' +
        '</div>' +
        '<script>' +
        'async function load(){' +
        'document.getElementById("upd").textContent="Refreshing...";' +
        'try{' +
        'var r=await fetch("/latest");' +
        'var a=await r.json();' +
        'if(!a.latitude||a.latitude==="N/A"){' +
        'document.getElementById("upd").innerHTML=' +
        '"<span class=\'dot dot-red\'></span>No data yet";' +
        'return;}' +
        'var t=new Date(a.timestamp).toLocaleString();' +
        'document.getElementById("upd").innerHTML=' +
        '"<span class=\'dot dot-green\'></span>Last updated: "+t;' +
        'document.getElementById("grid").innerHTML=' +
        '"<div class=\'info-box\'>"' +
        '+"<div class=\'label\'>LATITUDE</div>"' +
        '+"<div class=\'value\'>"+a.latitude+"</div></div>"' +
        '+"<div class=\'info-box\'>"' +
        '+"<div class=\'label\'>LONGITUDE</div>"' +
        '+"<div class=\'value\'>"+a.longitude+"</div></div>"' +
        '+"<div class=\'info-box\'>"' +
        '+"<div class=\'label\'>STATUS</div>"' +
        '+"<div class=\'value\'><span class=\'status-badge\'>"+a.status+"</span></div></div>"' +
        '+"<div class=\'info-box\'>"' +
        '+"<div class=\'label\'>TIME</div>"' +
        '+"<div class=\'value\' style=\'font-size:13px\'>"+t+"</div></div>";' +
        'var m="https://maps.google.com/?q="+a.latitude+","+a.longitude;' +
        'document.getElementById("maplink").href=m;' +
        'document.getElementById("mapcard").style.display="block";' +
        '}catch(e){' +
        'document.getElementById("upd").innerHTML=' +
        '"<span class=\'dot dot-red\'></span>Error: "+e;' +
        '}}' +
        'load();' +
        'setInterval(load,5000);' +
        '</script>' +
        '</body></html>'
    );
});

module.exports = app;