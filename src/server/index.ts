import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { DeviceDiscovery } from './discovery.js';
import { calculatePrayerTimes, INDONESIAN_CITIES, detectLocationFromIP } from './prayer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const discovery = new DeviceDiscovery();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Serve CleanYourTV APK for direct download & sideloading
const APK_PATH = path.resolve('/Volumes/Work/project/cleanyourtv/launcher/app/build/outputs/apk/release/app-release.apk');
app.get(['/download/cleanyourtv.apk', '/apk'], (_req, res) => {
  if (fs.existsSync(APK_PATH)) {
    res.download(APK_PATH, 'cleanyourtv.apk');
  } else {
    res.redirect('https://github.com/reyhanfahlevi/cleanyourtv/releases/latest/download/app-release.apk');
  }
});

// List all discovered TVs
app.get('/api/devices', (_req, res) => {
  res.json({ devices: discovery.getDevices() });
});

// Trigger a network subnet scan
app.post('/api/scan', async (req, res) => {
  const subnet = req.body?.subnet || '10.20.50';
  const devices = await discovery.scanSubnet(subnet);
  res.json({ devices });
});

// Helper to resolve device IP
function getTargetIp(idOrIp: string): string {
  const dev = discovery.getDevice(idOrIp);
  return dev ? dev.ip : idOrIp;
}

// Get device status
app.get('/api/devices/:id/status', async (req, res) => {
  const ip = getTargetIp(req.params.id);
  try {
    const response = await fetch(`http://${ip}:8080/api/status`, {
      signal: AbortSignal.timeout(2000),
    });
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: `Cannot reach TV at ${ip}: ${err.message}` });
  }
});

// Get device config
app.get('/api/devices/:id/config', async (req, res) => {
  const ip = getTargetIp(req.params.id);
  try {
    const response = await fetch(`http://${ip}:8080/api/config`, {
      signal: AbortSignal.timeout(2000),
    });
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: `Cannot reach TV at ${ip}: ${err.message}` });
  }
});

// Update device config
app.post('/api/devices/:id/config', async (req, res) => {
  const ip = getTargetIp(req.params.id);
  try {
    const response = await fetch(`http://${ip}:8080/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(3000),
    });
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: `Failed to update TV config at ${ip}: ${err.message}` });
  }
});

// List apps on TV
app.get('/api/devices/:id/apps', async (req, res) => {
  const ip = getTargetIp(req.params.id);
  try {
    const response = await fetch(`http://${ip}:8080/api/apps`, {
      signal: AbortSignal.timeout(2000),
    });
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: `Cannot fetch apps from ${ip}: ${err.message}` });
  }
});

// Launch app on TV (or all)
app.post('/api/devices/:id/launch', async (req, res) => {
  if (req.params.id === 'all') {
    const devices = discovery.getDevices();
    for (const dev of devices) {
      try {
        await fetch(`http://${dev.ip}:8080/api/action/launch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body),
          signal: AbortSignal.timeout(2000),
        });
      } catch {}
    }
    return res.json({ status: 'ok', broadcast: true });
  }

  const ip = getTargetIp(req.params.id);
  try {
    const response = await fetch(`http://${ip}:8080/api/action/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(2000),
    });
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: `Failed to launch app on ${ip}: ${err.message}` });
  }
});

// Send remote key event (or all)
app.post('/api/devices/:id/key', async (req, res) => {
  if (req.params.id === 'all') {
    const devices = discovery.getDevices();
    for (const dev of devices) {
      try {
        await fetch(`http://${dev.ip}:8080/api/action/key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body),
          signal: AbortSignal.timeout(2000),
        });
      } catch {}
    }
    return res.json({ status: 'ok', broadcast: true });
  }

  const ip = getTargetIp(req.params.id);
  try {
    const response = await fetch(`http://${ip}:8080/api/action/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(2000),
    });
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: `Failed to send key to ${ip}: ${err.message}` });
  }
});

// List wallpapers on a specific TV
app.get('/api/devices/:id/wallpapers', async (req, res) => {
  const ip = getTargetIp(req.params.id);
  try {
    const response = await fetch(`http://${ip}:8080/api/wallpapers`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: `Failed to get wallpapers from ${ip}: ${err.message}` });
  }
});

// Proxy wallpaper image binary
app.get('/api/devices/:id/wallpapers/:name/file', async (req, res) => {
  const ip = getTargetIp(req.params.id);
  const name = encodeURIComponent(req.params.name);
  try {
    const response = await fetch(`http://${ip}:8080/api/wallpaper/file?name=${name}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Wallpaper file not found' });
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    res.status(502).json({ error: `Failed to stream wallpaper from ${ip}: ${err.message}` });
  }
});

// Delete wallpaper on a specific TV
app.delete('/api/devices/:id/wallpapers/:name', async (req, res) => {
  const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const ip = getTargetIp(targetId);
  const name = encodeURIComponent(req.params.name);
  try {
    const response = await fetch(`http://${ip}:8080/api/wallpaper?name=${name}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: `Failed to delete wallpaper on ${ip}: ${err.message}` });
  }
});

// Set active wallpaper on a specific TV (or 'auto' for rotation)
app.post('/api/devices/:id/wallpapers/active', async (req, res) => {
  const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const ip = getTargetIp(targetId);
  const name = req.body?.name || req.query.name || '';
  try {
    const response = await fetch(`http://${ip}:8080/api/wallpaper/active?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      signal: AbortSignal.timeout(4000),
    });
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: `Failed to set active wallpaper on ${ip}: ${err.message}` });
  }
});

// Broadcast active wallpaper to all TVs
app.post('/api/broadcast/wallpapers/active', async (req, res) => {
  const devices = discovery.getDevices();
  const name = req.body?.name || req.query.name || '';
  const results: any[] = [];
  for (const dev of devices) {
    try {
      const response = await fetch(`http://${dev.ip}:8080/api/wallpaper/active?name=${encodeURIComponent(name)}`, {
        method: 'POST',
        signal: AbortSignal.timeout(4000),
      });
      const data = await response.json();
      results.push({ id: dev.id, ip: dev.ip, status: 'ok', data });
    } catch (err: any) {
      results.push({ id: dev.id, ip: dev.ip, status: 'error', error: err.message });
    }
  }
  res.json({ results });
});

// Widget: List available cities for prayer times
app.get('/api/widgets/prayer/cities', (_req, res) => {
  res.json({ cities: INDONESIAN_CITIES });
});

// Widget: Auto-detect location via IP
app.get('/api/widgets/prayer/detect', async (_req, res) => {
  try {
    const loc = await detectLocationFromIP();
    const data = calculatePrayerTimes(loc);
    res.json({ location: loc, data });
  } catch (err: any) {
    res.status(500).json({ error: `Detection failed: ${err.message}` });
  }
});

// Widget: Calculate prayer times for city or auto
app.get('/api/widgets/prayer', async (req, res) => {
  const city = (req.query.city as string) || 'jakarta';
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);

  if (!isNaN(lat) && !isNaN(lon)) {
    const name = (req.query.name as string) || 'Custom';
    const data = calculatePrayerTimes({ name, latitude: lat, longitude: lon, timezone: 'Asia/Jakarta' });
    return res.json({ data });
  }

  if (city === 'auto') {
    const loc = await detectLocationFromIP();
    const data = calculatePrayerTimes(loc);
    return res.json({ data, location: loc });
  }

  const data = calculatePrayerTimes(city);
  res.json({ data });
});

// Widget: Apply prayer widget to specific TV
app.post('/api/devices/:id/widgets/prayer', async (req, res) => {
  const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const ip = getTargetIp(targetId);
  const enabled = req.body?.enabled ?? true;
  const position = req.body?.position || 'header_left';
  const mode = req.body?.mode || 'compact';
  const city = req.body?.city || 'jakarta';
  const coords = req.body?.coords;

  let data;
  if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
    data = calculatePrayerTimes(coords);
  } else if (city === 'auto') {
    const loc = await detectLocationFromIP();
    data = calculatePrayerTimes(loc);
  } else {
    data = calculatePrayerTimes(city);
  }

  const payload = {
    widget_prayer: {
      enabled,
      position,
      mode,
      city: data.cityName,
      city_key: city,
      title: data.title,
      subtitle: data.subtitle,
      fajr: data.fajr,
      dhuhr: data.dhuhr,
      asr: data.asr,
      maghrib: data.maghrib,
      isha: data.isha,
    }
  };

  try {
    const response = await fetch(`http://${ip}:8080/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    });
    const result = await response.json();
    res.json({ status: 'ok', data, result });
  } catch (err: any) {
    res.status(502).json({ error: `Failed to update prayer widget on ${ip}: ${err.message}` });
  }
});

// Widget: Broadcast prayer widget to all TVs
app.post('/api/broadcast/widgets/prayer', async (req, res) => {
  const enabled = req.body?.enabled ?? true;
  const position = req.body?.position || 'header_left';
  const mode = req.body?.mode || 'compact';
  const city = req.body?.city || 'jakarta';
  const coords = req.body?.coords;

  let data;
  if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
    data = calculatePrayerTimes(coords);
  } else if (city === 'auto') {
    const loc = await detectLocationFromIP();
    data = calculatePrayerTimes(loc);
  } else {
    data = calculatePrayerTimes(city);
  }

  const devices = discovery.getDevices();
  const payload = {
    widget_prayer: {
      enabled,
      position,
      mode,
      city: data.cityName,
      city_key: city,
      title: data.title,
      subtitle: data.subtitle,
      fajr: data.fajr,
      dhuhr: data.dhuhr,
      asr: data.asr,
      maghrib: data.maghrib,
      isha: data.isha,
    }
  };
  const results: any[] = [];
  for (const dev of devices) {
    try {
      const response = await fetch(`http://${dev.ip}:8080/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });
      const result = await response.json();
      results.push({ id: dev.id, ip: dev.ip, status: 'ok', result });
    } catch (err: any) {
      results.push({ id: dev.id, ip: dev.ip, status: 'error', error: err.message });
    }
  }
  res.json({ results, data });
});

// Upload wallpaper to a specific TV
app.post('/api/devices/:id/wallpaper', upload.single('wallpaper'), async (req, res) => {
  const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const ip = getTargetIp(targetId);
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const blob = new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype });
    const formData = new FormData();
    formData.append('file', blob, req.file.originalname);

    const response = await fetch(`http://${ip}:8080/api/wallpaper?filename=${encodeURIComponent(req.file.originalname)}`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: `Failed to upload wallpaper to ${ip}: ${err.message}` });
  }
});

// Broadcast wallpaper to ALL discovered TVs
app.post('/api/broadcast/wallpaper', upload.single('wallpaper'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const devices = discovery.getDevices();
  const results: any[] = [];

  for (const dev of devices) {
    try {
      const blob = new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype });
      const formData = new FormData();
      formData.append('file', blob, req.file.originalname);

      const response = await fetch(`http://${dev.ip}:8080/api/wallpaper?filename=${encodeURIComponent(req.file.originalname)}`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json();
      results.push({ id: dev.id, ip: dev.ip, status: 'ok', data });
    } catch (err: any) {
      results.push({ id: dev.id, ip: dev.ip, status: 'error', error: err.message });
    }
  }

  res.json({ results });
});

// Broadcast config to ALL discovered TVs
app.post('/api/broadcast/config', async (req, res) => {
  const devices = discovery.getDevices();
  const results: any[] = [];

  for (const dev of devices) {
    try {
      const response = await fetch(`http://${dev.ip}:8080/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(3000),
      });
      const data = await response.json();
      results.push({ id: dev.id, ip: dev.ip, status: 'ok', data });
    } catch (err: any) {
      results.push({ id: dev.id, ip: dev.ip, status: 'error', error: err.message });
    }
  }

  res.json({ results });
});

// Helper to find local IPv4 address
function getLocalIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Serve frontend static build
const possibleDistPaths = [
  path.resolve(__dirname, '../client'),
  path.resolve(__dirname, '../../dist/client'),
  path.resolve(process.cwd(), 'dist/client')
];
const clientDist = possibleDistPaths.find(p => fs.existsSync(p));

if (clientDist) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`\n======================================================`);
  console.log(`🚀 tvhub server running at http://localhost:${PORT}`);
  console.log(`🌐 Network: http://${localIp}:${PORT}`);
  console.log(`======================================================\n`);
});
