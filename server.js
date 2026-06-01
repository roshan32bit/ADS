const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());

const TS_READ_KEY = 'PDKWYWD6ZO5E1MXJ';
const TS_CHANNEL  = '3397361';

// =====================
// EMAIL CONFIG
// =====================
const SENDER_EMAIL    = 'rthokar190@gmail.com';      // ← your Gmail
const SENDER_PASSWORD = 'uecf ecuu qbox kkwe';       // ← Gmail App Password
const DASHBOARD_URL   = 'https://ads-sigma-murex.vercel.app/'; // ← your Vercel URL

const RECEIVER_EMAILS = [
    'themailofaayush@gmail.com',   // ← add email 1
    'shishirgyawali222@gmail.com',   // ← add email 2
    'roshan31bit2024@kcc.edu.np'// ← add email 3
];

// Track last notified entry to avoid duplicate emails
let lastNotifiedTimestamp = null;

// =====================
// NODEMAILER SETUP
// =====================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: SENDER_EMAIL,
        pass: SENDER_PASSWORD,
    }
});

// =====================
// SEND EMAIL FUNCTION
// =====================
async function sendCrashEmail(latitude, longitude, timestamp) {
    const mapsUrl = 'https://maps.google.com/?q=' + latitude + ',' + longitude;
    const time    = new Date(timestamp).toLocaleString();

    const htmlBody = `
    <div style="font-family:Arial;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:10px;overflow:hidden;">
      <div style="background:#d32f2f;padding:25px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:24px;">🚨 ADS SYSTEM ALERT</h1>
        <p style="color:white;opacity:0.9;margin:5px 0 0;">Accident Detection System</p>
      </div>
      <div style="padding:25px;">
        <h2 style="color:#d32f2f;">Crash Has Been Detected!</h2>
        <p style="color:#555;font-size:15px;line-height:1.6;">
          Our system has detected a crash. Immediate attention may be required.
        </p>
        <div style="background:#f9f9f9;border-radius:8px;padding:15px;margin:20px 0;">
          <table style="width:100%;font-size:14px;">
            <tr>
              <td style="color:#999;padding:6px 0;">Latitude</td>
              <td style="color:#333;font-weight:bold;">${latitude}</td>
            </tr>
            <tr>
              <td style="color:#999;padding:6px 0;">Longitude</td>
              <td style="color:#333;font-weight:bold;">${longitude}</td>
            </tr>
            <tr>
              <td style="color:#999;padding:6px 0;">Time</td>
              <td style="color:#333;font-weight:bold;">${time}</td>
            </tr>
            <tr>
              <td style="color:#999;padding:6px 0;">Status</td>
              <td><span style="background:#d32f2f;color:white;padding:2px 10px;border-radius:12px;font-size:12px;">Accident</span></td>
            </tr>
          </table>
        </div>
        <a href="${mapsUrl}"
           style="display:block;background:#1976d2;color:white;text-align:center;
                  padding:12px;border-radius:8px;text-decoration:none;
                  font-size:14px;margin-bottom:10px;">
          📍 View Location on Google Maps
        </a>
        <a href="${DASHBOARD_URL}"
           style="display:block;background:#d32f2f;color:white;text-align:center;
                  padding:12px;border-radius:8px;text-decoration:none;
                  font-size:14px;">
          📊 Open Live Dashboard
        </a>
        <p style="color:#999;font-size:12px;text-align:center;margin-top:20px;">
          This is an automated alert from ADS System.<br>
          Please check the dashboard for more information.
        </p>
      </div>
    </div>`;

    const mailOptions = {
        from:    '"ADS System 🚨" <' + SENDER_EMAIL + '>',
        to:      RECEIVER_EMAILS.join(','),
        subject: '🚨 ADS SYSTEM — Crash Detected!',
        html:    htmlBody
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Crash email sent to all receivers');
    } catch (err) {
        console.error('Email send error:', err);
    }
}

// =====================
// POLL THINGSPEAK & NOTIFY
// =====================
async function checkAndNotify() {
    try {
        const response = await fetch(
            'https://api.thingspeak.com/channels/' +
            TS_CHANNEL +
            '/feeds/last.json?api_key=' +
            TS_READ_KEY
        );
        const data = await response.json();

        if (!data.field1 || !data.field3) return;

        // Only send email if data was created within last 2 minutes
        const dataTime = new Date(data.created_at).getTime();
        const now = Date.now();
        const ageInSeconds = (now - dataTime) / 1000;

        // If data is older than 2 minutes → skip (already old data)
        if (ageInSeconds > 120) return;

        // Avoid duplicate emails for same entry
        if (data.created_at === lastNotifiedTimestamp) return;

        lastNotifiedTimestamp = data.created_at;
        await sendCrashEmail(data.field1, data.field2, data.created_at);

    } catch (err) {
        console.error('ThingSpeak poll error:', err);
    }
}

// Poll every 10 seconds
setInterval(checkAndNotify, 10000);

// =====================
// API ROUTES
// =====================
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
            latitude:  data.field1 || null,
            longitude: data.field2 || null,
            status:    data.field3 || null,
            timestamp: data.created_at || null
        });
    } catch (err) {
        res.status(500).json({ message: 'Error' });
    }
});

app.get('/history', async (req, res) => {
    try {
        const response = await fetch(
            'https://api.thingspeak.com/channels/' +
            TS_CHANNEL +
            '/feeds.json?api_key=' +
            TS_READ_KEY +
            '&results=5'
        );
        const data = await response.json();
        const feeds = (data.feeds || []).reverse().map((f, i) => ({
            no:        i + 1,
            latitude:  f.field1 || null,
            longitude: f.field2 || null,
            status:    f.field3 || null,
            timestamp: f.created_at || null
        }));
        res.json(feeds);
    } catch (err) {
        res.status(500).json({ message: 'Error' });
    }
});

app.get('/', async (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html>
<head>
<title>ADS Dashboard</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial;background:#f0f0f0;}
.header{background:#d32f2f;color:white;padding:20px;text-align:center;}
.header h1{font-size:24px;}
.header p{font-size:13px;opacity:0.8;}
.container{padding:20px;}
.card{background:white;border-radius:10px;padding:20px;
margin-bottom:20px;box-shadow:0 2px 5px rgba(0,0,0,0.1);}
.card h2{color:#d32f2f;font-size:16px;margin-bottom:15px;}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.info-box{background:#f9f9f9;border-radius:8px;padding:12px;text-align:center;}
.info-box .label{font-size:11px;color:#999;margin-bottom:5px;}
.info-box .value{font-size:18px;font-weight:bold;color:#333;}
.status-badge{display:inline-block;background:#d32f2f;
color:white;padding:5px 15px;border-radius:20px;font-size:13px;}
.map-btn{display:block;background:#1976d2;color:white;
text-align:center;padding:12px;border-radius:8px;
text-decoration:none;margin-top:10px;font-size:14px;}
.refresh-btn{background:#d32f2f;color:white;border:none;
padding:10px 20px;border-radius:8px;cursor:pointer;
font-size:14px;width:100%;margin-bottom:10px;}
.update-time{text-align:center;color:#999;font-size:12px;margin-bottom:15px;}
.dot{height:10px;width:10px;border-radius:50%;display:inline-block;margin-right:5px;}
.dot-green{background:#4caf50;}
.dot-red{background:#d32f2f;}
.table-wrapper{overflow-x:auto;margin-top:5px;}
table{width:100%;border-collapse:collapse;font-size:13px;}
thead tr{background:#d32f2f;color:white;}
thead th{padding:10px 12px;text-align:left;white-space:nowrap;font-weight:600;}
tbody tr{border-bottom:1px solid #f0f0f0;transition:background 0.2s;}
tbody tr:hover{background:#fff3f3;}
tbody tr:nth-child(even){background:#fafafa;}
tbody tr:nth-child(even):hover{background:#fff3f3;}
tbody td{padding:10px 12px;color:#444;white-space:nowrap;}
tbody td:first-child{font-weight:bold;color:#d32f2f;text-align:center;width:40px;}
.tbl-badge{display:inline-block;background:#d32f2f;color:white;
padding:2px 10px;border-radius:12px;font-size:11px;}
.tbl-map{color:#1976d2;text-decoration:none;font-size:12px;}
.tbl-map:hover{text-decoration:underline;}
.no-data{text-align:center;color:#999;padding:20px;font-size:13px;}
.null-val{color:#ccc;font-style:italic;font-size:12px;}
</style>
</head>
<body>
<div class="header">
  <h1>ADS System</h1>
  <p>Accident Detection System Live Dashboard</p>
</div>
<div class="container">
  <div class="update-time" id="upd">Loading...</div>
  <button class="refresh-btn" onclick="load()">Refresh Now</button>
  <div class="card">
    <h2>Last Accident Location</h2>
    <div class="info-grid" id="grid">
      <div style="text-align:center;color:#999;padding:20px;grid-column:span 2">Waiting for data...</div>
    </div>
  </div>
  <div class="card" id="mapcard" style="display:none">
    <h2>Location Map</h2>
    <a class="map-btn" id="maplink" href="#" target="_blank">Open in Google Maps</a>
  </div>
  <div class="card">
    <h2>Accident History (Last 5)</h2>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Latitude</th>
            <th>Longitude</th>
            <th>Status</th>
            <th>Date &amp; Time</th>
            <th>Map</th>
          </tr>
        </thead>
        <tbody id="histbody">
          <tr><td colspan="6" class="no-data">Loading history...</td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <div class="card">
    <h2>System Info</h2>
    <p style="font-size:13px;color:#666;line-height:2">
      Device: AT89S52<br>
      GSM: SIM800L NTC<br>
      Sensor: GY-87 MPU6050<br>
      Data: ThingSpeak
    </p>
  </div>
</div>
<script>
function fmt(val){return(val&&val!=='null')?val:'<span class="null-val">—</span>';}
function fmtTime(ts){if(!ts)return '<span class="null-val">—</span>';return new Date(ts).toLocaleString();}
async function load(){
  document.getElementById('upd').textContent='Refreshing...';
  try{
    var r=await fetch('/latest');
    var a=await r.json();
    if(!a.latitude){
      document.getElementById('upd').innerHTML="<span class='dot dot-red'></span>No data yet";
      document.getElementById('grid').innerHTML="<div style='text-align:center;color:#999;padding:20px;grid-column:span 2'>Waiting for first accident...</div>";
    }else{
      var t=fmtTime(a.timestamp);
      document.getElementById('upd').innerHTML="<span class='dot dot-green'></span>Last updated: "+new Date(a.timestamp).toLocaleString();
      document.getElementById('grid').innerHTML=
        "<div class='info-box'><div class='label'>LATITUDE</div><div class='value'>"+fmt(a.latitude)+"</div></div>"+
        "<div class='info-box'><div class='label'>LONGITUDE</div><div class='value'>"+fmt(a.longitude)+"</div></div>"+
        "<div class='info-box'><div class='label'>STATUS</div><div class='value'><span class='status-badge'>"+fmt(a.status)+"</span></div></div>"+
        "<div class='info-box'><div class='label'>TIME</div><div class='value' style='font-size:13px'>"+t+"</div></div>";
      if(a.latitude&&a.longitude){
        document.getElementById('maplink').href='https://maps.google.com/?q='+a.latitude+','+a.longitude;
        document.getElementById('mapcard').style.display='block';
      }
    }
    var hr=await fetch('/history');
    var hist=await hr.json();
    if(!hist.length){
      document.getElementById('histbody').innerHTML='<tr><td colspan="6" class="no-data">No history yet</td></tr>';
      return;
    }
    var rows='';
    for(var i=0;i<hist.length;i++){
      var h=hist[i];
      var hasCoords=h.latitude&&h.longitude;
      var mapUrl=hasCoords?'https://maps.google.com/?q='+h.latitude+','+h.longitude:null;
      rows+='<tr>'+
        '<td>'+h.no+'</td>'+
        '<td>'+fmt(h.latitude)+'</td>'+
        '<td>'+fmt(h.longitude)+'</td>'+
        '<td>'+(h.status?"<span class='tbl-badge'>"+h.status+"</span>":"<span class='null-val'>—</span>")+'</td>'+
        '<td>'+fmtTime(h.timestamp)+'</td>'+
        '<td>'+(hasCoords?"<a class='tbl-map' href='"+mapUrl+"' target='_blank'>📍 View</a>":"<span class='null-val'>—</span>")+'</td>'+
        '</tr>';
    }
    document.getElementById('histbody').innerHTML=rows;
  }catch(e){
    document.getElementById('upd').innerHTML="<span class='dot dot-red'></span>Error: "+e;
  }
}
load();
setInterval(load,5000);
</script>
</body>
</html>`);
});

module.exports = app;