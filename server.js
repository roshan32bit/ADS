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
const SENDER_EMAIL    = 'rthokar190@gmail.com';
const SENDER_PASSWORD = 'uecf ecuu qbox kkwe';
const DASHBOARD_URL   = 'https://vds-sigma-murex.vercel.app/'; // Update with your VDS URL

const RECEIVER_EMAILS = [
    'themailofaayush@gmail.com',
    'shishirgyawali222@gmail.com',
    'roshan31bit2024@kcc.edu.np'
];

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
// SEND EMAIL FUNCTION WITH XYZ COORDINATES
// =====================
async function sendVibrationEmail(x_axis, y_axis, z_axis, timestamp) {
    const time = new Date(timestamp).toLocaleString();

    const htmlBody = `
    <div style="font-family:Arial;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:10px;overflow:hidden;">
      <div style="background:#ff9800;padding:25px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:24px;">📳 VDS SYSTEM ALERT</h1>
        <p style="color:white;opacity:0.9;margin:5px 0 0;">Vibration Detection System</p>
      </div>
      <div style="padding:25px;">
        <h2 style="color:#ff9800;">⚠️ Significant Vibration Detected!</h2>
        <p style="color:#555;font-size:15px;line-height:1.6;">
          Our system has detected significant vibration that may indicate abnormal activity.
        </p>
        <div style="background:#f9f9f9;border-radius:8px;padding:15px;margin:20px 0;">
          <h3 style="color:#ff9800;margin:0 0 15px 0;font-size:16px;">📊 Vibration Data:</h3>
          <table style="width:100%;font-size:14px;">
            <tr>
              <td style="color:#999;padding:6px 0;">X-Axis (Acceleration)</td>
              <td style="color:#333;font-weight:bold;">${x_axis}</td>
              <td style="color:#999;font-size:11px;">Left/Right</td>
            </tr>
            <tr>
              <td style="color:#999;padding:6px 0;">Y-Axis (Acceleration)</td>
              <td style="color:#333;font-weight:bold;">${y_axis}</td>
              <td style="color:#999;font-size:11px;">Forward/Backward</td>
            </tr>
            <tr>
              <td style="color:#999;padding:6px 0;">Z-Axis (Acceleration)</td>
              <td style="color:#333;font-weight:bold;">${z_axis}</td>
              <td style="color:#999;font-size:11px;">Up/Down</td>
            </tr>
            <tr>
              <td style="color:#999;padding:6px 0;">Time</td>
              <td colspan="2" style="color:#333;font-weight:bold;">${time}</td>
            </tr>
            <tr>
              <td style="color:#999;padding:6px 0;">Status</td>
              <td colspan="2"><span style="background:#ff9800;color:white;padding:2px 10px;border-radius:12px;font-size:12px;">📳 VIBRATION</span></td>
            </tr>
          </table>
        </div>
        <a href="${DASHBOARD_URL}"
           style="display:block;background:#ff9800;color:white;text-align:center;
                  padding:12px;border-radius:8px;text-decoration:none;
                  font-size:14px;">
          📊 Open VDS Live Dashboard
        </a>
        <p style="color:#999;font-size:12px;text-align:center;margin-top:20px;">
          This is an automated alert from Vibration Detection System (VDS).<br>
          Please check the dashboard for more information.
        </p>
      </div>
    </div>`;

    const mailOptions = {
        from:    '"VDS System 📳" <' + SENDER_EMAIL + '>',
        to:      RECEIVER_EMAILS.join(','),
        subject: '📳 VDS SYSTEM — Significant Vibration Detected!',
        html:    htmlBody
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Vibration email sent to all receivers');
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

        if (!data.field4 || data.field4 !== 'VIBRATION') return;

        // Only send email if data was created within last 2 minutes
        const dataTime = new Date(data.created_at).getTime();
        const now = Date.now();
        const ageInSeconds = (now - dataTime) / 1000;

        if (ageInSeconds > 120) return;

        if (data.created_at === lastNotifiedTimestamp) return;

        lastNotifiedTimestamp = data.created_at;
        
        // Send email with X, Y, Z coordinates (field1, field2, field3)
        await sendVibrationEmail(
            data.field1 || 'N/A', 
            data.field2 || 'N/A', 
            data.field3 || 'N/A', 
            data.created_at
        );

    } catch (err) {
        console.error('ThingSpeak poll error:', err);
    }
}

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
            x_axis:    data.field1 || null,
            y_axis:    data.field2 || null,
            z_axis:    data.field3 || null,
            status:    data.field4 || null,
            timestamp: data.created_at || null
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching data' });
    }
});

app.get('/history', async (req, res) => {
    try {
        const response = await fetch(
            'https://api.thingspeak.com/channels/' +
            TS_CHANNEL +
            '/feeds.json?api_key=' +
            TS_READ_KEY +
            '&results=10'
        );
        const data = await response.json();
        const feeds = (data.feeds || [])
            .filter(f => f.field4 === 'VIBRATION')
            .reverse()
            .slice(0, 10)
            .map((f, i) => ({
                no:        i + 1,
                x_axis:    f.field1 || null,
                y_axis:    f.field2 || null,
                z_axis:    f.field3 || null,
                status:    f.field4 || null,
                timestamp: f.created_at || null
            }));
        res.json(feeds);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching history' });
    }
});

// Serve Dashboard
app.get('/', async (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html>
<head>
<title>VDS - Vibration Detection System Dashboard</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial;background:#f0f0f0;}
.header{background:#ff9800;color:white;padding:20px;text-align:center;}
.header h1{font-size:24px;}
.header p{font-size:13px;opacity:0.8;}
.container{padding:20px;}
.card{background:white;border-radius:10px;padding:20px;margin-bottom:20px;box-shadow:0 2px 5px rgba(0,0,0,0.1);}
.card h2{color:#ff9800;font-size:16px;margin-bottom:15px;}
.info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
.info-box{background:#f9f9f9;border-radius:8px;padding:12px;text-align:center;}
.info-box .label{font-size:11px;color:#999;margin-bottom:5px;}
.info-box .value{font-size:18px;font-weight:bold;color:#333;}
.status-badge{display:inline-block;background:#ff9800;color:white;padding:5px 15px;border-radius:20px;font-size:13px;}
.refresh-btn{background:#ff9800;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;width:100%;margin-bottom:10px;}
.update-time{text-align:center;color:#999;font-size:12px;margin-bottom:15px;}
.dot{height:10px;width:10px;border-radius:50%;display:inline-block;margin-right:5px;}
.dot-green{background:#4caf50;}
.dot-orange{background:#ff9800;}
.table-wrapper{overflow-x:auto;margin-top:5px;}
table{width:100%;border-collapse:collapse;font-size:13px;}
thead tr{background:#ff9800;color:white;}
thead th{padding:10px 12px;text-align:left;white-space:nowrap;font-weight:600;}
tbody tr{border-bottom:1px solid #f0f0f0;transition:background 0.2s;}
tbody tr:hover{background:#fff3e0;}
tbody tr:nth-child(even){background:#fafafa;}
tbody tr:nth-child(even):hover{background:#fff3e0;}
tbody td{padding:10px 12px;color:#444;white-space:nowrap;}
tbody td:first-child{font-weight:bold;color:#ff9800;text-align:center;width:40px;}
.tbl-badge{display:inline-block;background:#ff9800;color:white;padding:2px 10px;border-radius:12px;font-size:11px;}
.no-data{text-align:center;color:#999;padding:20px;font-size:13px;}
.null-val{color:#ccc;font-style:italic;font-size:12px;}
.warning{background:#fff3e0;border:1px solid #ffe0b2;border-radius:8px;padding:12px;text-align:center;margin-top:15px;}
.warning p{color:#e65100;font-size:12px;}
</style>
</head>
<body>
<div class="header">
  <h1>📳 VDS System</h1>
  <p>Vibration Detection System - Live Vibration Monitoring Dashboard</p>
</div>
<div class="container">
  <div class="update-time" id="upd">Loading...</div>
  <button class="refresh-btn" onclick="load()">🔄 Refresh Now</button>
  <div class="card">
    <h2>📊 Latest Vibration Data</h2>
    <div class="info-grid" id="grid">
      <div style="text-align:center;color:#999;padding:20px;grid-column:span 3">Waiting for data...</div>
    </div>
    <div class="warning" id="warningMsg" style="display:none;">
      <p>📳 SIGNIFICANT VIBRATION DETECTED! Immediate attention may be required.</p>
    </div>
  </div>
  <div class="card">
    <h2>📜 Vibration History (Last 10)</h2>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>X-Axis</th>
            <th>Y-Axis</th>
            <th>Z-Axis</th>
            <th>Status</th>
            <th>Date &amp; Time</th>
          </tr>
        </thead>
        <tbody id="histbody">
          <tr><td colspan="6" class="no-data">Loading history...</td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <div class="card">
    <h2>ℹ️ System Information</h2>
    <p style="font-size:13px;color:#666;line-height:2">
      🖥️ Device: AT89S52 Microcontroller<br>
      📡 GSM Module: SIM800L (NTC Network)<br>
      📳 Sensor: GY-87 MPU6050 Accelerometer<br>
      ☁️ Data Platform: ThingSpeak Analytics<br>
      📧 Alert System: Email Notification (3 Recipients)<br>
      ⚡ Threshold: ±15000 (Raw accelerometer values)<br>
      🎯 Purpose: Real-time vibration monitoring and alerting
    </p>
  </div>
</div>
<script>
function formatValue(val){return(val&&val!=='null')?val:'<span class="null-val">—</span>';}
function formatTime(ts){if(!ts)return '<span class="null-val">—</span>';return new Date(ts).toLocaleString();}
function getVibrationLevel(z){
  let zVal = parseFloat(z);
  if(isNaN(zVal)) return '';
  if(Math.abs(zVal) > 20000) return '🔴 EXTREME VIBRATION';
  if(Math.abs(zVal) > 15000) return '🟠 HIGH VIBRATION';
  if(Math.abs(zVal) > 10000) return '🟡 MODERATE VIBRATION';
  return '🟢 LOW VIBRATION';
}
async function load(){
  document.getElementById('upd').textContent='Refreshing...';
  try{
    let r=await fetch('/latest');
    let a=await r.json();
    if(!a.status || a.status!=='VIBRATION'){
      document.getElementById('upd').innerHTML="<span class='dot dot-orange'></span>No recent vibrations";
      document.getElementById('grid').innerHTML="<div style='text-align:center;color:#999;padding:20px;grid-column:span 3'>No vibration data yet. System monitoring...</div>";
      document.getElementById('warningMsg').style.display='none';
    }else{
      let t=formatTime(a.timestamp);
      document.getElementById('upd').innerHTML="<span class='dot dot-green'></span>Last vibration: "+t;
      document.getElementById('grid').innerHTML=
        "<div class='info-box'><div class='label'>X-AXIS (Left/Right)</div><div class='value'>"+formatValue(a.x_axis)+"</div></div>"+
        "<div class='info-box'><div class='label'>Y-AXIS (Forward/Back)</div><div class='value'>"+formatValue(a.y_axis)+"</div></div>"+
        "<div class='info-box'><div class='label'>Z-AXIS (Up/Down)</div><div class='value'>"+formatValue(a.z_axis)+"<br><span style='font-size:11px;color:#666;'>"+getVibrationLevel(a.z_axis)+"</span></div></div>";
      document.getElementById('warningMsg').style.display='block';
    }
    let hr=await fetch('/history');
    let hist=await hr.json();
    if(!hist.length){
      document.getElementById('histbody').innerHTML='<tr><td colspan="6" class="no-data">No vibration history yet</td></tr>';
      return;
    }
    let rows='';
    for(let i=0;i<hist.length;i++){
      let h=hist[i];
      rows+='<tr>'+
        '<td>'+h.no+'</td>'+
        '<td>'+formatValue(h.x_axis)+'</td>'+
        '<td>'+formatValue(h.y_axis)+'</td>'+
        '<td>'+formatValue(h.z_axis)+'</td>'+
        '<td>'+(h.status?"<span class='tbl-badge'>"+h.status+"</span>":"<span class='null-val'>—</span>")+'</td>'+
        '<td>'+formatTime(h.timestamp)+'</td>'+
        '</tr>';
    }
    document.getElementById('histbody').innerHTML=rows;
  }catch(e){
    document.getElementById('upd').innerHTML="<span class='dot dot-orange'></span>Error: "+e;
  }
}
load();
setInterval(load,5000);
</script>
</body>
</html>`);
});

module.exports = app;