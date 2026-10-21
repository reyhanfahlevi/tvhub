import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { DeviceDiscovery } from './discovery.js';

const app = express();
const PORT = process.env.PORT || 3000;
const discovery = new DeviceDiscovery();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

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

// Upload wallpaper to a specific TV
app.post('/api/devices/:id/wallpaper', upload.single('wallpaper'), async (req, res) => {
  const ip = getTargetIp(req.params.id);
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
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
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
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

// Serve frontend static build if exists
const clientDist = path.resolve(process.cwd(), 'dist/client');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 tvhub server running at http://localhost:${PORT}`);
  console.log(`🌐 Network: http://10.20.50.153:${PORT}`);
  console.log(`======================================================\n`);
});
