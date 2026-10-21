import { Bonjour } from 'bonjour-service';

export interface TVDevice {
  id: string;
  ip: string;
  port: number;
  model: string;
  device: string;
  manufacturer: string;
  androidVersion: string;
  sdk: number;
  wallpapersCount: number;
  lastSeen: number;
  memory?: {
    total_mb: number;
    available_mb: number;
    low_memory: boolean;
  };
  storage?: {
    total_mb: number;
    free_mb: number;
  };
}

export class DeviceDiscovery {
  private devices: Map<string, TVDevice> = new Map();
  private bonjour: Bonjour | null = null;
  private isScanning = false;

  constructor() {
    this.startMdns();
    // Initial scan on startup
    this.scanSubnet();
    // Periodic refresh every 30 seconds
    setInterval(() => this.refreshStatus(), 30000);
  }

  public getDevices(): TVDevice[] {
    return Array.from(this.devices.values());
  }

  public getDevice(idOrIp: string): TVDevice | undefined {
    // Check by ID or IP
    for (const dev of this.devices.values()) {
      if (dev.id === idOrIp || dev.ip === idOrIp) {
        return dev;
      }
    }
    return undefined;
  }

  private startMdns() {
    try {
      this.bonjour = new Bonjour();
      const browser = this.bonjour.find({ type: 'tvhub' }, async (service) => {
        const ip = service.addresses?.find((addr) => addr.includes('.') && !addr.startsWith('127.'));
        if (ip) {
          console.log(`[mDNS] Found service '${service.name}' at ${ip}:${service.port}`);
          await this.probeDevice(ip, service.port || 8080);
        }
      });
      console.log('[mDNS] Listening for _tvhub._tcp services...');
    } catch (err) {
      console.warn('[mDNS] Warning starting mDNS listener:', err);
    }
  }

  public async scanSubnet(subnetPrefix = '10.20.50'): Promise<TVDevice[]> {
    if (this.isScanning) return this.getDevices();
    this.isScanning = true;
    console.log(`[Scanner] Scanning subnet ${subnetPrefix}.0/24 on port 8080...`);

    const promises: Promise<void>[] = [];
    for (let i = 1; i <= 254; i++) {
      const ip = `${subnetPrefix}.${i}`;
      promises.push(this.probeDevice(ip, 8080));
    }

    await Promise.all(promises);
    this.isScanning = false;
    console.log(`[Scanner] Scan complete. Found ${this.devices.size} TV(s).`);
    return this.getDevices();
  }

  public async probeDevice(ip: string, port = 8080): Promise<boolean> {
    try {
      const res = await fetch(`http://${ip}:${port}/api/status`, {
        signal: AbortSignal.timeout(700),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data && data.model) {
        const device: TVDevice = {
          id: data.id || `${data.model}-${ip}`,
          ip,
          port,
          model: data.model,
          device: data.device || '',
          manufacturer: data.manufacturer || '',
          androidVersion: data.android_version || '',
          sdk: data.sdk || 0,
          wallpapersCount: data.wallpapers_count || 0,
          memory: data.memory,
          storage: data.storage,
          lastSeen: Date.now(),
        };
        const isNew = !this.devices.has(device.id);
        this.devices.set(device.id, device);
        if (isNew) {
          console.log(`[Discovery] Registered TV: ${device.model} (${device.ip})`);
        }
        return true;
      }
    } catch {
      // not a tvhub or offline
    }
    return false;
  }

  private async refreshStatus() {
    for (const [id, dev] of this.devices.entries()) {
      try {
        const ok = await this.probeDevice(dev.ip, dev.port);
        if (!ok) {
          // If offline for over 2 minutes, keep it or mark offline
        }
      } catch {
        // failed
      }
    }
  }
}
