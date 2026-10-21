import React, { useState, useEffect } from 'react';
import {
  Tv,
  RefreshCw,
  Upload,
  Play,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Check,
  Layers,
  HardDrive,
  Cpu,
  Clock,
  Sliders,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Eye,
  X,
  Compass,
  Moon,
  Sparkles,
  MapPin,
  Calendar,
  LayoutGrid,
  PanelTop,
  AlignLeft,
  AlignRight,
  AlignCenter
} from 'lucide-react';

interface WallpaperItem {
  name: string;
  size_bytes?: number;
}

interface TVDevice {
  id: string;
  ip: string;
  port: number;
  model: string;
  manufacturer: string;
  device: string;
  androidVersion?: string;
  android_version?: string;
  sdk: number;
  uptimeMs?: number;
  uptime_ms?: number;
  memory: {
    total_mb: number;
    available_mb: number;
    low_memory: boolean;
  };
  storage: {
    total_mb: number;
    free_mb: number;
  };
  wallpapersCount?: number;
  wallpapers_count?: number;
  lastSeen?: number;
}

interface TVConfig {
  wallpaper?: boolean;
  wallpaper_rotation_minutes?: number;
  wallpaper_dim?: number;
  ambient_glow?: boolean;
  dock_glass?: boolean;
  dock_opacity?: number;
  greeting_name?: string;
  show_stats?: boolean;
  columns?: number;
  dock_apps?: string[];
  [key: string]: any;
}

export default function App() {
  const [devices, setDevices] = useState<TVDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(false);
  const [config, setConfig] = useState<TVConfig>({
    dock_opacity: 50,
    dock_glass: true,
    ambient_glow: false,
    wallpaper_dim: 0,
    wallpaper_rotation_minutes: 30,
    greeting_name: '',
    show_stats: true,
    columns: 4,
  });
  const [apps, setApps] = useState<any[]>([]);
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>([]);
  const [activeTvWallpaper, setActiveTvWallpaper] = useState<string>('auto');
  const [activeSimWallpaper, setActiveSimWallpaper] = useState<string | null>(null);
  const [previewModalImg, setPreviewModalImg] = useState<{ name: string; url: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'launcher' | 'widgets'>('launcher');
  const [prayerEnabled, setPrayerEnabled] = useState<boolean>(true);
  const [prayerMode, setPrayerMode] = useState<'compact' | 'full'>('full');
  const [prayerPosition, setPrayerPosition] = useState<'header_left' | 'header_right' | 'above_dock'>('above_dock');
  const [prayerCity, setPrayerCity] = useState<string>('jakarta');
  const [citiesList, setCitiesList] = useState<Record<string, { name: string; timezone: string }>>({});
  const [prayerPreview, setPrayerPreview] = useState<any>(null);
  const [prayerLoading, setPrayerLoading] = useState<boolean>(false);

  // Status feedback toast
  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Fetch discovered devices
  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      const list: TVDevice[] = data.devices || [];
      setDevices(list);
      // Auto select first device if none selected
      setSelectedId(prev => {
        if (!prev && list.length > 0) return list[0].id;
        if (prev !== 'all' && !list.some(d => d.id === prev) && list.length > 0) return list[0].id;
        return prev;
      });
    } catch (err) {
      console.error('Failed to fetch devices', err);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000);
    // Fetch available prayer cities
    fetch('/api/widgets/prayer/cities')
      .then(res => res.json())
      .then(data => {
        if (data.cities) setCitiesList(data.cities);
      })
      .catch(() => {});
    return () => clearInterval(interval);
  }, []);

  // Fetch prayer preview whenever prayerCity changes
  useEffect(() => {
    fetch(`/api/widgets/prayer?city=${prayerCity}`)
      .then(res => res.json())
      .then(data => {
        if (data.data) setPrayerPreview(data.data);
      })
      .catch(() => {});
  }, [prayerCity]);

  // Fetch config, apps, wallpapers for selected device
  useEffect(() => {
    const target = selectedId === 'all' ? (devices[0]?.id || '') : selectedId;
    if (!target) return;
    const loadDetails = async () => {
      try {
        const [cfgRes, appRes, wpRes] = await Promise.all([
          fetch(`/api/devices/${target}/config`),
          fetch(`/api/devices/${target}/apps`),
          fetch(`/api/devices/${target}/wallpapers`),
        ]);
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          setConfig(prev => ({ ...prev, ...cfg }));
          if (cfg.widget_prayer) {
            setPrayerEnabled(cfg.widget_prayer.enabled ?? true);
            if (cfg.widget_prayer.city_key) {
              setPrayerCity(cfg.widget_prayer.city_key);
            }
            if (cfg.widget_prayer.position) {
              setPrayerPosition(cfg.widget_prayer.position);
            }
            if (cfg.widget_prayer.mode) {
              setPrayerMode(cfg.widget_prayer.mode);
            }
          }
        }
        if (appRes.ok) {
          const appData = await appRes.json();
          setApps(appData.apps || []);
        }
        if (wpRes.ok) {
          const wpData = await wpRes.json();
          const list = (wpData.wallpapers || []).map((w: any) => 
            typeof w === 'string' ? { name: w } : w
          );
          setWallpapers(list);
          if (wpData.active_wallpaper) {
            setActiveTvWallpaper(wpData.active_wallpaper);
          }
        }
      } catch (err) {
        console.error('Failed to load device details', err);
      }
    };
    loadDetails();
  }, [selectedId, devices.length]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      const data = await res.json();
      setDevices(data.devices || []);
      showToast(`Scan complete: ${data.devices?.length || 0} TV(s) detected`);
    } catch {
      showToast('Network scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleSaveConfig = async () => {
    const target = selectedId === 'all' ? 'all' : (selectedId || devices[0]?.id);
    if (!target) return;

    try {
      if (target === 'all') {
        await fetch('/api/broadcast/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });
        showToast('Settings broadcasted to all TVs');
      } else {
        await fetch(`/api/devices/${target}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });
        showToast('Settings saved & applied live on TV');
      }
      // Re-fetch config to sync state
      const checkTarget = target === 'all' ? (devices[0]?.id || '') : target;
      if (checkTarget) {
        const cfgRes = await fetch(`/api/devices/${checkTarget}/config`);
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          setConfig(prev => ({ ...prev, ...cfg }));
        }
      }
    } catch (err: any) {
      showToast(`Error saving config: ${err.message}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('wallpaper', file);

    const target = selectedId === 'all' ? 'all' : (selectedId || devices[0]?.id);

    try {
      if (target === 'all') {
        await fetch('/api/broadcast/wallpaper', {
          method: 'POST',
          body: formData,
        });
        showToast('Wallpaper pushed to all TVs');
      } else {
        await fetch(`/api/devices/${target}/wallpaper`, {
          method: 'POST',
          body: formData,
        });
        showToast(`Wallpaper uploaded to TV`);
      }
      // Reload wallpapers list
      const checkTarget = target === 'all' ? (devices[0]?.id || '') : target;
      if (checkTarget) {
        const wpRes = await fetch(`/api/devices/${checkTarget}/wallpapers`);
        if (wpRes.ok) {
          const wpData = await wpRes.json();
          const list = (wpData.wallpapers || []).map((w: any) => 
            typeof w === 'string' ? { name: w } : w
          );
          setWallpapers(list);
          if (wpData.active_wallpaper) {
            setActiveTvWallpaper(wpData.active_wallpaper);
          }
        }
      }
      fetchDevices();
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteWallpaper = async (filename: string) => {
    const target = selectedId === 'all' ? (devices[0]?.id || '') : selectedId;
    if (!target) return;
    try {
      const res = await fetch(`/api/devices/${target}/wallpapers/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast(`Wallpaper '${filename}' deleted`);
      // Reload wallpapers
      const wpRes = await fetch(`/api/devices/${target}/wallpapers`);
      if (wpRes.ok) {
        const wpData = await wpRes.json();
        const list = (wpData.wallpapers || []).map((w: any) => 
          typeof w === 'string' ? { name: w } : w
        );
        setWallpapers(list);
        if (wpData.active_wallpaper) {
          setActiveTvWallpaper(wpData.active_wallpaper);
        }
      }
    } catch (err: any) {
      showToast(`Failed to delete wallpaper: ${err.message}`);
    }
  };

  const handleSetActiveWallpaper = async (filename: string) => {
    const target = selectedId === 'all' ? (devices[0]?.id || '') : selectedId;
    if (!target) return;
    try {
      const res = await fetch(`/api/devices/${target}/wallpapers/active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: filename }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveTvWallpaper(data.active_wallpaper || filename);
        setActiveSimWallpaper(filename === 'auto' ? null : filename);
        showToast(filename === 'auto' ? 'Auto-rotation mode active on TV' : `Wallpaper '${filename}' set active on TV!`);
      } else {
        showToast(`Failed to set wallpaper: ${data.error || res.statusText}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const sendKey = async (key: string) => {
    const target = selectedId || (devices[0]?.id) || 'all';
    try {
      const res = await fetch(`/api/devices/${target}/key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        showToast(`Remote: ${key.toUpperCase()}`);
      } else {
        showToast(`Failed to send ${key}: ${res.statusText}`);
      }
    } catch (err: any) {
      showToast(`Connection error: ${err.message}`);
    }
  };

  const launchApp = async (pkg: string, label?: string) => {
    const target = selectedId || (devices[0]?.id) || 'all';
    try {
      await fetch(`/api/devices/${target}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: pkg }),
      });
      showToast(`Launching ${label || pkg}...`);
    } catch (err: any) {
      showToast(`Launch failed: ${err.message}`);
    }
  };

  const handleApplyPrayerWidget = async (
    overrideEnabled?: boolean,
    overridePosition?: 'header_left' | 'header_right' | 'above_dock',
    overrideMode?: 'compact' | 'full'
  ) => {
    const isEn = overrideEnabled !== undefined ? overrideEnabled : prayerEnabled;
    const pos = overridePosition !== undefined ? overridePosition : prayerPosition;
    const m = overrideMode !== undefined ? overrideMode : prayerMode;
    const target = selectedId === 'all' ? 'all' : (selectedId || devices[0]?.id);
    if (!target) return;
    setPrayerLoading(true);
    try {
      const url = target === 'all' ? '/api/broadcast/widgets/prayer' : `/api/devices/${target}/widgets/prayer`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: isEn, position: pos, mode: m, city: prayerCity }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(isEn ? `Prayer Widget (${m === 'full' ? 'Full Schedule' : pos.replace('_', ' ')}) applied!` : 'Prayer Widget disabled');
        if (data.data) setPrayerPreview(data.data);
      } else {
        showToast(`Failed: ${data.error || res.statusText}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setPrayerLoading(false);
    }
  };

  const handleAutoDetect = async () => {
    setPrayerLoading(true);
    try {
      const res = await fetch('/api/widgets/prayer/detect');
      const data = await res.json();
      if (res.ok && data.location) {
        setPrayerCity('auto');
        setPrayerPreview(data.data);
        showToast(`Location detected: ${data.location.name}`);
      } else {
        showToast('Failed to detect location');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setPrayerLoading(false);
    }
  };

  const handleBrowserGps = () => {
    if (!navigator.geolocation) {
      showToast('Browser does not support GPS Geolocation');
      return;
    }
    setPrayerLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const target = selectedId === 'all' ? 'all' : (selectedId || devices[0]?.id);
          const url = target === 'all' ? '/api/broadcast/widgets/prayer' : `/api/devices/${target}/widgets/prayer`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              enabled: prayerEnabled,
              coords: {
                name: 'Browser GPS Location',
                latitude: lat,
                longitude: lon,
                timezone: 'Asia/Jakarta'
              }
            })
          });
          const data = await res.json();
          if (res.ok && data.data) {
            setPrayerPreview(data.data);
            showToast(`Prayer times updated via GPS (${lat.toFixed(2)}, ${lon.toFixed(2)})!`);
          }
        } catch (err: any) {
          showToast(`GPS Error: ${err.message}`);
        } finally {
          setPrayerLoading(false);
        }
      },
      (err) => {
        setPrayerLoading(false);
        showToast(`GPS permission denied: ${err.message}`);
      },
      { timeout: 10000 }
    );
  };

  const activeDevice = devices.find(d => d.id === selectedId) || devices[0];
  const target = selectedId === 'all' ? (devices[0]?.id || '') : (selectedId || devices[0]?.id || '');
  const dockOpacityValue = config.dock_opacity ?? 50;
  const isGlass = config.dock_glass ?? true;

  const androidVer = activeDevice?.androidVersion || activeDevice?.android_version || '14';
  const uptimeHours = Math.max(1, Math.round(((activeDevice?.uptimeMs || activeDevice?.uptime_ms || 11200000) / 3600000)));
  const wallpaperTotal = wallpapers.length > 0 ? wallpapers.length : (activeDevice?.wallpapersCount || activeDevice?.wallpapers_count || 4);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex flex-col font-sans pb-16">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="fixed bottom-8 right-8 z-50 bg-[#1d1d1f] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold tracking-wide border border-white/10 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[#e5e5ea] bg-white/80 backdrop-blur-xl px-6 md:px-12 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#1d1d1f] flex items-center justify-center text-white shadow-sm">
            <Tv className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-[#1d1d1f]">tvhub</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f0f0f2] border border-[#e5e5ea] text-[#6e6e73]">CleanYourTV</span>
            </div>
            <div className="text-[11px] text-[#6e6e73]">Fast &amp; lightweight control panel for Android TV</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-[#eaeaed] border border-[#e5e5ea]">
          <button
            onClick={() => setActiveTab('launcher')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'launcher'
                ? 'bg-white text-[#1d1d1f] shadow-xs'
                : 'text-[#6e6e73] hover:text-[#1d1d1f]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Launcher</span>
          </button>
          <button
            onClick={() => setActiveTab('widgets')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'widgets'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-[#6e6e73] hover:text-[#1d1d1f]'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Widgets</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </button>
        </div>

        {/* TV Device Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#eaeaed] border border-[#e5e5ea]">
            <button
              onClick={() => setSelectedId('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                selectedId === 'all'
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All TVs ({devices.length})</span>
            </button>

            {devices.map((dev) => {
              const isOnline = (Date.now() - (dev.lastSeen || 0)) < 90000;
              return (
                <button
                  key={dev.id}
                  onClick={() => setSelectedId(dev.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                    selectedId === dev.id
                      ? 'bg-[#0071e3] text-white shadow-sm'
                      : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    selectedId === dev.id 
                      ? 'bg-white' 
                      : (isOnline ? 'bg-emerald-500' : 'bg-amber-400')
                  }`} />
                  <span>{dev.model === 'SWTV' ? 'Coocaa TV' : dev.model}</span>
                  {!isOnline && <span className="text-[9px] font-medium px-1 py-0.2 rounded bg-amber-100 text-amber-700">Sleep</span>}
                  <span className="text-[10px] font-mono opacity-80">({dev.ip})</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleScan}
            disabled={scanning}
            className="p-2.5 rounded-xl bg-white hover:bg-[#f0f0f2] border border-[#e5e5ea] text-[#1d1d1f] transition disabled:opacity-50 shadow-sm"
            title="Scan Subnet for TVs"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin text-[#0071e3]' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 pt-8 space-y-8">
        {/* Live TV Screen Mirror & Telemetry Hero */}
        <div className="apple-card rounded-3xl p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Live TV Mockup Canvas (16:9 Bezel) */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <div className="text-xs uppercase tracking-wider font-semibold text-[#86868b] flex items-center gap-2 self-start mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Live TV Simulation Preview</span>
              </div>

              {/* 16:9 TV Screen Frame */}
              <div 
                className="w-full aspect-video rounded-2xl tv-mockup-frame relative overflow-hidden flex flex-col justify-between p-5 select-none transition-all duration-300"
                style={{
                  backgroundImage: (activeSimWallpaper || (activeTvWallpaper !== 'auto' ? activeTvWallpaper : wallpapers[0]?.name)) && target
                    ? `url(/api/devices/${target}/wallpapers/${encodeURIComponent(activeSimWallpaper || (activeTvWallpaper !== 'auto' ? activeTvWallpaper : wallpapers[0]?.name))}/file)`
                    : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: '#0c0d14',
                }}
              >
                {/* Wallpaper Darken Dim Overlay */}
                <div 
                  className="absolute inset-0 bg-black transition-opacity pointer-events-none"
                  style={{ opacity: (config.wallpaper_dim ?? 0) / 100 }}
                />

                {/* Top Status Header on TV */}
                <div className="relative z-10 flex items-start justify-between text-white/90">
                  <div>
                    <div className="text-[10px] tracking-wider uppercase font-semibold text-white/60">
                      {config.greeting_name ? `GOOD AFTERNOON, ${config.greeting_name.toUpperCase()}` : 'GOOD AFTERNOON'}
                    </div>
                    <div className="text-2xl font-bold tracking-tight">12:45 <span className="text-xs font-normal text-white/70">PM</span></div>
                    {config.show_stats && (
                      <div className="text-[9px] font-mono text-white/60 mt-0.5">
                        RAM {activeDevice?.memory?.available_mb || 600} MB free • Storage {((activeDevice?.storage?.free_mb || 23000) / 1024).toFixed(1)} GB free
                      </div>
                    )}
                    {/* Realtime Prayer Widget Preview Pill (Header Left) */}
                    {prayerEnabled && prayerPreview && prayerMode === 'compact' && prayerPosition === 'header_left' && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[9px] font-medium text-white shadow-xs">
                        <span>{prayerPreview.title}</span>
                        <span className="text-white/70 font-light">• {prayerPreview.countdownText}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Realtime Prayer Widget Preview Pill (Header Right) */}
                    {prayerEnabled && prayerPreview && prayerMode === 'compact' && prayerPosition === 'header_right' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/25 backdrop-blur-md border border-emerald-400/40 text-[9px] font-semibold text-emerald-200">
                        <span>{prayerPreview.title}</span>
                        <span className="text-white/70 font-light">• {prayerPreview.countdownText}</span>
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-medium border border-white/10 text-white">Inputs</span>
                    <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-medium border border-white/10 text-white">Wi-Fi</span>
                    <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-medium border border-white/10 text-white">Settings</span>
                  </div>
                </div>

                {/* Simulated Dock with REALTIME Opacity & Glass Reflection */}
                <div className="relative z-10 flex flex-col items-center">
                  {/* Realtime Prayer Widget Preview (Full Schedule Strip vs Compact Pill) */}
                  {prayerEnabled && prayerPreview && (
                    prayerMode === 'full' ? (
                      <div className="self-center mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[9px] font-medium text-white shadow-md">
                        <span className={prayerPreview.nextPrayer === 'fajr' ? 'text-white font-bold' : 'text-white/60'}>Subuh {prayerPreview.fajr}</span>
                        <span className="text-white/30">|</span>
                        <span className={prayerPreview.nextPrayer === 'dhuhr' ? 'text-white font-bold' : 'text-white/60'}>Dzuhur {prayerPreview.dhuhr}</span>
                        <span className="text-white/30">|</span>
                        <span className={prayerPreview.nextPrayer === 'asr' ? 'text-white font-bold' : 'text-white/60'}>Ashar {prayerPreview.asr}</span>
                        <span className="text-white/30">|</span>
                        <span className={prayerPreview.nextPrayer === 'maghrib' ? 'text-white font-bold' : 'text-white/60'}>Maghrib {prayerPreview.maghrib}</span>
                        <span className="text-white/30">|</span>
                        <span className={prayerPreview.nextPrayer === 'isha' ? 'text-white font-bold' : 'text-white/60'}>Isya {prayerPreview.isha}</span>
                        <span className="text-emerald-300 font-semibold">• 🕌 {prayerPreview.nextPrayerNameId} in {prayerPreview.countdownText}</span>
                      </div>
                    ) : (
                      prayerPosition === 'above_dock' && (
                        <div className="self-center mb-2 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[10px] font-semibold text-white shadow-md">
                          <span>{prayerPreview.title}</span>
                          <span className="text-white/70 font-normal">• {prayerPreview.countdownText}</span>
                          <span className="text-white/50 text-[9px]">• {prayerPreview.cityName}</span>
                        </div>
                      )
                    )
                  )}

                  <div className="text-xs font-semibold text-white/90 mb-2 self-start drop-shadow">
                    Netflix
                  </div>

                  {/* Dock Container */}
                  <div 
                    className="w-full px-4 py-3 rounded-2xl flex items-center justify-around gap-2.5 transition-all duration-200"
                    style={{
                      backgroundColor: `rgba(20, 22, 28, ${dockOpacityValue / 100})`,
                      backdropFilter: isGlass ? 'blur(16px)' : 'none',
                      WebkitBackdropFilter: isGlass ? 'blur(16px)' : 'none',
                      border: isGlass ? '1.5px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: isGlass ? '0 12px 28px -4px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.35)' : 'none',
                    }}
                  >
                    {/* Simulated App Cards */}
                    <div className="w-16 h-10 rounded-xl bg-[#e50914] text-white flex items-center justify-center font-black text-[9px] tracking-tighter shadow-md ring-2 ring-white/90 scale-105 transition">
                      NETFLIX
                    </div>
                    <div className="w-16 h-10 rounded-xl bg-gradient-to-br from-[#0063e5] to-[#04153b] text-white flex items-center justify-center font-bold text-[8px] opacity-80">
                      DISNEY+
                    </div>
                    <div className="w-16 h-10 rounded-xl bg-[#e20613] text-white flex items-center justify-center font-bold text-[8px] opacity-80">
                      VIDIO
                    </div>
                    <div className="w-16 h-10 rounded-xl bg-[#ffb800] text-black flex items-center justify-center font-bold text-[8px] opacity-80">
                      VIU
                    </div>
                    <div className="w-16 h-10 rounded-xl bg-[#1db954] text-black flex items-center justify-center font-bold text-[8px] opacity-80">
                      SPOTIFY
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hardware Telemetry Details */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-[#0071e3]">Connected TV Device</span>
                <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f] mt-1">
                  {activeDevice ? activeDevice.model : 'Scanning Network...'}
                </h2>
                <p className="text-xs text-[#6e6e73] mt-1">
                  {activeDevice ? `${activeDevice.manufacturer} • Android ${androidVer} (API ${activeDevice.sdk})` : 'No device selected'}
                </p>
              </div>

              {activeDevice && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea]">
                    <div className="text-[10px] uppercase font-semibold text-[#6e6e73] flex items-center gap-1.5 mb-1">
                      <Cpu className="w-3.5 h-3.5 text-[#0071e3]" />
                      <span>Memory Available</span>
                    </div>
                    <div className="text-base font-bold text-[#1d1d1f] font-mono">
                      {activeDevice?.memory?.available_mb ?? 600} <span className="text-xs text-[#6e6e73] font-normal">MB</span>
                    </div>
                    <div className="text-[10px] text-[#86868b] font-mono mt-0.5">
                      of {activeDevice?.memory?.total_mb ?? 1500} MB RAM
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea]">
                    <div className="text-[10px] uppercase font-semibold text-[#6e6e73] flex items-center gap-1.5 mb-1">
                      <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Free Storage</span>
                    </div>
                    <div className="text-base font-bold text-[#1d1d1f] font-mono">
                      {activeDevice?.storage?.free_mb ? (activeDevice.storage.free_mb / 1024).toFixed(1) : '22.5'} <span className="text-xs text-[#6e6e73] font-normal">GB</span>
                    </div>
                    <div className="text-[10px] text-[#86868b] font-mono mt-0.5">
                      of {activeDevice?.storage?.total_mb ? (activeDevice.storage.total_mb / 1024).toFixed(1) : '32.0'} GB Storage
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea]">
                    <div className="text-[10px] uppercase font-semibold text-[#6e6e73] flex items-center gap-1.5 mb-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Device Uptime</span>
                    </div>
                    <div className="text-base font-bold text-[#1d1d1f] font-mono">
                      {uptimeHours} <span className="text-xs text-[#6e6e73] font-normal">Hours</span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-mono mt-0.5 font-medium">
                      ● ONLINE ({activeDevice.ip}:8080)
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea]">
                    <div className="text-[10px] uppercase font-semibold text-[#6e6e73] flex items-center gap-1.5 mb-1">
                      <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
                      <span>Wallpapers</span>
                    </div>
                    <div className="text-base font-bold text-[#1d1d1f] font-mono">
                      {wallpaperTotal} <span className="text-xs text-[#6e6e73] font-normal">Loaded</span>
                    </div>
                    <div className="text-[10px] text-[#86868b] font-mono mt-0.5">
                      Rotate every {config.wallpaper_rotation_minutes ?? 30}m
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2-Column Studio Workbench or Widget Studio Tab */}
        {activeTab === 'launcher' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT: Dock & Display Calibration Studio (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Dock Calibration Panel */}
            <div className="apple-card rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#e5e5ea]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/20">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1d1d1f]">Dock &amp; Display Settings</h3>
                    <p className="text-[11px] text-[#6e6e73]">Calibrate dock opacity, icon slots, and wallpaper dimming</p>
                  </div>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#f0f0f2] text-[#1d1d1f] border border-[#e5e5ea]">
                  {selectedId === 'all' ? 'All TVs' : activeDevice?.model}
                </span>
              </div>

              {/* Dock Opacity Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#1d1d1f]">Dock Background Opacity</span>
                  <span className="text-[#0071e3] font-mono text-sm px-2.5 py-0.5 rounded-lg bg-[#0071e3]/10 border border-[#0071e3]/20 font-bold">
                    {dockOpacityValue}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={dockOpacityValue}
                  onChange={(e) => setConfig({ ...config, dock_opacity: parseInt(e.target.value) })}
                  className="w-full h-2 bg-[#e5e5ea] rounded-lg appearance-none cursor-pointer accent-[#0071e3]"
                />
                <div className="flex justify-between text-[11px] text-[#86868b]">
                  <span>0% (Transparent)</span>
                  <span className="text-[#0071e3] font-semibold">50% (Glass Blur)</span>
                  <span>100% (Solid)</span>
                </div>
              </div>

              {/* Wallpaper Dim Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#1d1d1f]">Wallpaper Darken Dim</span>
                  <span className="text-[#1d1d1f] font-mono text-sm px-2.5 py-0.5 rounded-lg bg-[#f0f0f2] border border-[#e5e5ea] font-bold">
                    {config.wallpaper_dim ?? 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={config.wallpaper_dim ?? 0}
                  onChange={(e) => setConfig({ ...config, wallpaper_dim: parseInt(e.target.value) })}
                  className="w-full h-2 bg-[#e5e5ea] rounded-lg appearance-none cursor-pointer accent-[#6e6e73]"
                />
                <div className="flex justify-between text-[11px] text-[#86868b]">
                  <span>0% (Original)</span>
                  <span>30% (Standard)</span>
                  <span>60% (Deep Contrast)</span>
                </div>
              </div>

              {/* Dock Columns / Slots Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#1d1d1f]">Dock Icon Slots</span>
                  <span className="text-[#0071e3] font-mono text-sm px-2.5 py-0.5 rounded-lg bg-[#0071e3]/10 border border-[#0071e3]/20 font-bold">
                    {config.columns ?? 4} Icons
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[4, 5, 6, 7].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setConfig({ ...config, columns: num })}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                        (config.columns ?? 4) === num
                          ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-sm'
                          : 'bg-[#f5f5f7] hover:bg-[#eaeaed] text-[#1d1d1f] border-[#e5e5ea]'
                      }`}
                    >
                      {num} Icons
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-[#86868b]">Lock dock icon slots so layout never changes or resets.</div>
              </div>

              {/* Visual Toggles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Glass Look Toggle */}
                <div
                  onClick={() => setConfig({ ...config, dock_glass: !config.dock_glass })}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    config.dock_glass
                      ? 'bg-[#0071e3]/10 border-[#0071e3]/30 text-[#1d1d1f]'
                      : 'bg-[#f5f5f7] border-[#e5e5ea] text-[#6e6e73] hover:bg-[#eaeaed]'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-[#1d1d1f]">Glass Look (Specular Rim)</div>
                    <div className="text-[11px] text-[#6e6e73] mt-0.5">Pantulan kilauan kaca tvOS</div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                    config.dock_glass ? 'bg-[#0071e3] border-[#0071e3] text-white' : 'border-[#d2d2d7] bg-white'
                  }`}>
                    {config.dock_glass && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Ambient App Glow */}
                <div
                  onClick={() => setConfig({ ...config, ambient_glow: !config.ambient_glow })}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    config.ambient_glow
                      ? 'bg-[#0071e3]/10 border-[#0071e3]/30 text-[#1d1d1f]'
                      : 'bg-[#f5f5f7] border-[#e5e5ea] text-[#6e6e73] hover:bg-[#eaeaed]'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-[#1d1d1f]">Ambient App Glow</div>
                    <div className="text-[11px] text-[#6e6e73] mt-0.5">Subtle ambient color glow behind icons</div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                    config.ambient_glow ? 'bg-[#0071e3] border-[#0071e3] text-white' : 'border-[#d2d2d7] bg-white'
                  }`}>
                    {config.ambient_glow && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Hardware Stats HUD */}
                <div
                  onClick={() => setConfig({ ...config, show_stats: !config.show_stats })}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    config.show_stats
                      ? 'bg-[#0071e3]/10 border-[#0071e3]/30 text-[#1d1d1f]'
                      : 'bg-[#f5f5f7] border-[#e5e5ea] text-[#6e6e73] hover:bg-[#eaeaed]'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-[#1d1d1f]">Hardware Stats HUD</div>
                    <div className="text-[11px] text-[#6e6e73] mt-0.5">Show CPU & RAM usage on TV</div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                    config.show_stats ? 'bg-[#0071e3] border-[#0071e3] text-white' : 'border-[#d2d2d7] bg-white'
                  }`}>
                    {config.show_stats && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Wallpaper Rotation Timer */}
                <div className="p-4 rounded-2xl border bg-[#f5f5f7] border-[#e5e5ea] flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-[#1d1d1f]">Wallpaper Rotation</div>
                    <div className="text-[11px] text-[#6e6e73] mt-0.5">Auto-rotation interval (minutes)</div>
                  </div>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={config.wallpaper_rotation_minutes ?? 30}
                    onChange={(e) => setConfig({ ...config, wallpaper_rotation_minutes: parseInt(e.target.value) || 30 })}
                    className="w-16 px-2.5 py-1.5 rounded-xl bg-white border border-[#d2d2d7] text-xs font-mono text-center text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] font-semibold"
                  />
                </div>
              </div>

              {/* Custom Greeting Name */}
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                  Custom Greeting Name (Top-left of TV screen)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Living Room (displays: GOOD AFTERNOON, LIVING ROOM)"
                  value={config.greeting_name || ''}
                  onChange={(e) => setConfig({ ...config, greeting_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] text-xs font-medium text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] transition"
                />
              </div>

              {/* Apply Changes Button */}
              <button
                onClick={handleSaveConfig}
                className="w-full py-3.5 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.99] text-white font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Apply Changes Live to TV</span>
              </button>
            </div>

            {/* Wallpaper Showcase & Dropzone */}
            <div className="apple-card rounded-3xl p-6 md:p-8 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#e5e5ea]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-pink-500/10 text-pink-600 border border-pink-500/20">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1d1d1f]">Wallpaper Collection</h3>
                    <p className="text-[11px] text-[#6e6e73]">Upload wallpapers over-the-air to TV</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#6e6e73]">{wallpapers.length} on TV</span>
              </div>

              <label className="border-2 border-dashed border-[#d2d2d7] hover:border-[#0071e3] bg-[#fbfbfd] hover:bg-[#f0f4ff] rounded-2xl p-7 flex flex-col items-center justify-center cursor-pointer transition-all group">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <div className="p-3.5 rounded-2xl bg-[#f0f0f2] text-[#1d1d1f] group-hover:scale-110 group-hover:bg-[#0071e3] group-hover:text-white transition-all mb-3 shadow-sm">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#1d1d1f]">
                  {uploading ? 'Uploading wallpaper to TV...' : 'Upload New Wallpaper to TV'}
                </span>
                <span className="text-[11px] text-[#6e6e73] mt-1">Formats: JPG, PNG, WEBP (Supports auto-rotation)</span>
              </label>

              {/* Active TV Wallpaper State Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${activeTvWallpaper === 'auto' ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="text-xs font-semibold text-[#1d1d1f] shrink-0">Active on TV:</span>
                  <span className="text-xs font-mono font-bold text-[#0071e3] px-2.5 py-0.5 rounded-lg bg-[#0071e3]/10 truncate" title={activeTvWallpaper}>
                    {activeTvWallpaper === 'auto' ? '🔄 Auto-Rotation' : `🖼️ ${activeTvWallpaper}`}
                  </span>
                </div>
                {activeTvWallpaper !== 'auto' && (
                  <button
                    type="button"
                    onClick={() => handleSetActiveWallpaper('auto')}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#eaeaed] text-[#1d1d1f] border border-[#e5e5ea] transition shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <span>🔄 Auto-Rotation Mode</span>
                  </button>
                )}
              </div>

              {wallpapers.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-1">
                  {wallpapers.map((wp: any, idx: number) => {
                    const filename = typeof wp === 'string' ? wp : wp.name;
                    const sizeKb = wp.size_bytes ? (wp.size_bytes > 1048576 ? `${(wp.size_bytes / 1048576).toFixed(1)} MB` : `${Math.round(wp.size_bytes / 1024)} KB`) : null;
                    const fileUrl = `/api/devices/${target}/wallpapers/${encodeURIComponent(filename)}/file`;
                    const isTvActive = activeTvWallpaper === filename;

                    return (
                      <div
                        key={idx}
                        className={`rounded-2xl border overflow-hidden bg-white flex flex-col group transition-all shadow-sm ${
                          isTvActive ? 'ring-2 ring-emerald-500 border-transparent shadow-md' : 'border-[#e5e5ea] hover:border-[#b0b0b8]'
                        }`}
                      >
                        {/* 16:9 Thumbnail Image */}
                        <div 
                          className="relative aspect-video w-full bg-[#f0f0f2] overflow-hidden cursor-pointer"
                          onClick={() => {
                            setActiveSimWallpaper(filename);
                            setPreviewModalImg({ name: filename, url: fileUrl });
                          }}
                          title="Click to preview full size & simulate"
                        >
                          <img
                            src={fileUrl}
                            alt={filename}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="p-2 rounded-xl bg-white/95 backdrop-blur-md text-[#1d1d1f] shadow-lg flex items-center gap-1.5 text-xs font-semibold">
                              <Eye className="w-3.5 h-3.5 text-[#0071e3]" />
                              <span>View</span>
                            </span>
                          </div>
                          {isTvActive && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-500 text-[10px] font-bold text-white shadow flex items-center gap-1">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Active on TV</span>
                            </span>
                          )}
                          {sizeKb && (
                            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-mono text-white">
                              {sizeKb}
                            </span>
                          )}
                        </div>

                        {/* Card Info & Actions */}
                        <div className="p-2.5 flex items-center justify-between gap-1.5 border-t border-[#f0f0f2]">
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-mono text-[#1d1d1f] truncate font-medium" title={filename}>{filename}</div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isTvActive ? (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200">
                                In Use
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetActiveWallpaper(filename)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white transition shadow-xs"
                                title="Set as active wallpaper on TV now"
                              >
                                Set Active
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteWallpaper(filename)}
                              className="p-1 rounded-lg text-[#86868b] hover:text-red-600 hover:bg-red-50 transition"
                              title="Delete wallpaper from TV"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Remote & Quick Launch (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* TV Remote Controller */}
            <div className="apple-card rounded-3xl p-8 flex flex-col items-center relative">
              <div className="w-full flex items-center justify-between pb-4 border-b border-[#e5e5ea] mb-6">
                <div>
                  <h3 className="text-sm font-bold text-[#1d1d1f]">TV Remote Controller</h3>
                  <p className="text-[11px] text-[#6e6e73]">D-Pad navigation & instant TV shortcuts</p>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#f0f0f2] text-[#1d1d1f] border border-[#e5e5ea] font-medium">
                  {selectedId === 'all' ? 'Broadcast All' : activeDevice?.model}
                </span>
              </div>

              {/* Brushed Silver Aluminium Chassis */}
              <div className="w-64 silver-remote-chassis rounded-[36px] p-6 flex flex-col items-center relative">
                {/* Microphone / Status Pip */}
                <div className="w-2.5 h-2.5 rounded-full bg-[#1c1c1e] mb-6 shadow-inner" />

                {/* Iconic Black Touch Clickpad Wheel */}
                <div className="relative w-48 h-48 rounded-full clickpad-wheel flex items-center justify-center p-3 select-none">
                  {/* Clickpad Directions */}
                  <button
                    onClick={() => sendKey('up')}
                    className="absolute top-2 w-14 h-10 flex items-center justify-center text-white/70 hover:text-white active:scale-90 transition"
                    title="Up"
                  >
                    <ChevronUp className="w-6 h-6 stroke-[2.5]" />
                  </button>

                  <button
                    onClick={() => sendKey('down')}
                    className="absolute bottom-2 w-14 h-10 flex items-center justify-center text-white/70 hover:text-white active:scale-90 transition"
                    title="Down"
                  >
                    <ChevronDown className="w-6 h-6 stroke-[2.5]" />
                  </button>

                  <button
                    onClick={() => sendKey('left')}
                    className="absolute left-2 w-10 h-14 flex items-center justify-center text-white/70 hover:text-white active:scale-90 transition"
                    title="Left"
                  >
                    <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
                  </button>

                  <button
                    onClick={() => sendKey('right')}
                    className="absolute right-2 w-10 h-14 flex items-center justify-center text-white/70 hover:text-white active:scale-90 transition"
                    title="Right"
                  >
                    <ChevronRight className="w-6 h-6 stroke-[2.5]" />
                  </button>

                  {/* Center Concave OK Button */}
                  <button
                    onClick={() => sendKey('ok')}
                    className="w-20 h-20 rounded-full clickpad-center-btn flex items-center justify-center text-xs font-black tracking-wider text-white select-none transition"
                  >
                    OK
                  </button>
                </div>

                {/* Sub-Keys Matrix (Back & Home) */}
                <div className="grid grid-cols-2 gap-4 w-48 mt-8">
                  {/* Back / Return */}
                  <button
                    onClick={() => sendKey('back')}
                    className="h-14 rounded-full silver-remote-btn flex items-center justify-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white"
                    title="Back"
                  >
                    <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                    <span>Back</span>
                  </button>

                  {/* TV / Home */}
                  <button
                    onClick={() => sendKey('home')}
                    className="h-14 rounded-full silver-remote-btn flex items-center justify-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white"
                    title="Home Launcher"
                  >
                    <Tv className="w-4 h-4 stroke-[2.5] text-[#2997ff]" />
                    <span>Home</span>
                  </button>
                </div>

                {/* Remote Bottom Mark */}
                <div className="mt-8 text-[10px] font-mono tracking-widest uppercase text-[#86868b] font-medium">
                  CLEANYOURTV REMOTE
                </div>
              </div>
            </div>

            {/* Quick App Launcher */}
            {apps.length > 0 && (
              <div className="apple-card rounded-3xl p-6 md:p-8 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#e5e5ea]">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-[#0071e3]" />
                    <h3 className="text-sm font-bold text-[#1d1d1f]">Quick App Launcher</h3>
                  </div>
                  <span className="text-xs font-mono text-[#6e6e73]">{apps.length} apps</span>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                  {apps.map((app, idx) => (
                    <button
                      key={idx}
                      onClick={() => launchApp(app.package, app.label)}
                      className="px-3.5 py-3 rounded-2xl bg-[#f5f5f7] hover:bg-[#eaeaed] border border-[#e5e5ea] text-left transition-all flex items-center justify-between text-xs font-semibold text-[#1d1d1f] group shadow-sm"
                    >
                      <span className="truncate">{app.label}</span>
                      <Play className="w-3.5 h-3.5 text-[#0071e3] opacity-0 group-hover:opacity-100 transition shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        ) : (
          /* Dedicated Widgets Page */
          <div className="space-y-6 animate-fade-in">
            {/* 1. Format & Layout Selector */}
            <div className="apple-card rounded-3xl p-6 md:p-8 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#e5e5ea]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1d1d1f]">Widget Display Format</h3>
                    <p className="text-[11px] text-[#6e6e73]">Choose between full 5-prayer daily schedule or compact capsule</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-600 font-bold">
                  {prayerMode === 'full' ? 'Full Schedule (5 Prayers)' : 'Compact Single Pill'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Schedule */}
                <div
                  onClick={() => setPrayerMode('full')}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    prayerMode === 'full'
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-[#e5e5ea] bg-[#fbfbfd] hover:bg-[#f5f5f7]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-xl ${prayerMode === 'full' ? 'bg-emerald-500 text-white' : 'bg-[#eaeaed] text-[#6e6e73]'}`}>
                        <Calendar className="w-4 h-4" />
                      </div>
                      {prayerMode === 'full' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#1d1d1f]">Full Daily Schedule (5 Prayers)</div>
                      <div className="text-[11px] text-[#6e6e73] mt-1 leading-relaxed">
                        Displays all 5 prayer times simultaneously (Subuh, Dzuhur, Ashar, Maghrib, Isya) in a horizontal strip with upcoming prayer highlighted.
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#e5e5ea] text-[10px] font-mono text-emerald-700 font-medium">
                    Subuh • Dzuhur • Ashar • Maghrib • Isya
                  </div>
                </div>

                {/* Compact Pill */}
                <div
                  onClick={() => setPrayerMode('compact')}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    prayerMode === 'compact'
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-[#e5e5ea] bg-[#fbfbfd] hover:bg-[#f5f5f7]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-xl ${prayerMode === 'compact' ? 'bg-emerald-500 text-white' : 'bg-[#eaeaed] text-[#6e6e73]'}`}>
                        <Moon className="w-4 h-4" />
                      </div>
                      {prayerMode === 'compact' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#1d1d1f]">Compact Pill (Upcoming Only)</div>
                      <div className="text-[11px] text-[#6e6e73] mt-1 leading-relaxed">
                        Minimal single capsule displaying only the next upcoming prayer and countdown.
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#e5e5ea] text-[10px] font-mono text-[#86868b]">
                    🕌 Next Prayer Only
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Placement Selector (When in compact mode) */}
            {prayerMode === 'compact' && (
              <div className="apple-card rounded-3xl p-6 md:p-8 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#e5e5ea]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/20">
                      <PanelTop className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#1d1d1f]">Screen Position</h3>
                      <p className="text-[11px] text-[#6e6e73]">Select where the compact capsule appears on the TV</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-[#0071e3] font-bold">
                    {prayerPosition === 'header_left' ? 'Header Left' : prayerPosition === 'header_right' ? 'Header Right' : 'Above Dock'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Option A: header_left */}
                  <div
                    onClick={() => setPrayerPosition('header_left')}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      prayerPosition === 'header_left'
                        ? 'border-emerald-500 bg-emerald-500/5 shadow-md ring-2 ring-emerald-500/20'
                        : 'border-[#e5e5ea] bg-[#fbfbfd] hover:bg-[#f5f5f7]'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-xl ${prayerPosition === 'header_left' ? 'bg-emerald-500 text-white' : 'bg-[#eaeaed] text-[#6e6e73]'}`}>
                          <AlignLeft className="w-4 h-4" />
                        </div>
                        {prayerPosition === 'header_left' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                            Selected
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#1d1d1f]">Header Left (Under Clock)</div>
                        <div className="text-[11px] text-[#6e6e73] mt-1 leading-relaxed">
                          Cleanly placed directly below clock & memory stats.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Option B: header_right */}
                  <div
                    onClick={() => setPrayerPosition('header_right')}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      prayerPosition === 'header_right'
                        ? 'border-emerald-500 bg-emerald-500/5 shadow-md ring-2 ring-emerald-500/20'
                        : 'border-[#e5e5ea] bg-[#fbfbfd] hover:bg-[#f5f5f7]'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-xl ${prayerPosition === 'header_right' ? 'bg-emerald-500 text-white' : 'bg-[#eaeaed] text-[#6e6e73]'}`}>
                          <AlignRight className="w-4 h-4" />
                        </div>
                        {prayerPosition === 'header_right' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                            Selected
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#1d1d1f]">Header Right (Status Bar)</div>
                        <div className="text-[11px] text-[#6e6e73] mt-1 leading-relaxed">
                          Aligned with Inputs & Wi-Fi pills on the top right.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Option C: above_dock */}
                  <div
                    onClick={() => setPrayerPosition('above_dock')}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      prayerPosition === 'above_dock'
                        ? 'border-emerald-500 bg-emerald-500/5 shadow-md ring-2 ring-emerald-500/20'
                        : 'border-[#e5e5ea] bg-[#fbfbfd] hover:bg-[#f5f5f7]'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-xl ${prayerPosition === 'above_dock' ? 'bg-emerald-500 text-white' : 'bg-[#eaeaed] text-[#6e6e73]'}`}>
                          <AlignCenter className="w-4 h-4" />
                        </div>
                        {prayerPosition === 'above_dock' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                            Selected
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#1d1d1f]">Center (Above Dock)</div>
                        <div className="text-[11px] text-[#6e6e73] mt-1 leading-relaxed">
                          Floating capsule centered above app dock.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Prayer Configuration */}
            <div className="apple-card rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#e5e5ea]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1d1d1f]">Prayer Times Data</h3>
                    <p className="text-[11px] text-[#6e6e73]">Astronomical calculation with live local countdown</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Kemenag RI Calibrated
                </span>
              </div>

              {/* Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div
                  onClick={() => {
                    const nextVal = !prayerEnabled;
                    setPrayerEnabled(nextVal);
                    handleApplyPrayerWidget(nextVal, prayerPosition, prayerMode);
                  }}
                  className={`sm:col-span-5 p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    prayerEnabled
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-[#1d1d1f]'
                      : 'bg-[#f5f5f7] border-[#e5e5ea] text-[#6e6e73] hover:bg-[#eaeaed]'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-[#1d1d1f]">Enable Widget on TV</div>
                    <div className="text-[11px] text-[#6e6e73] mt-0.5">Show prayer times overlay on launcher</div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                    prayerEnabled ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-[#d2d2d7] bg-white'
                  }`}>
                    {prayerEnabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                <div className="sm:col-span-7 p-3.5 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-[#6e6e73] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>Location / City</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoDetect}
                      disabled={prayerLoading}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer transition hover:underline"
                      title="Auto-detect location from IP Geolocation"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-Detect IP</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={prayerCity}
                      onChange={(e) => setPrayerCity(e.target.value)}
                      className="flex-1 bg-white border border-[#d2d2d7] text-xs font-semibold text-[#1d1d1f] rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 transition"
                    >
                      <option value="auto">✨ Auto-Detect (IP Geolocation)</option>
                      {Object.entries(citiesList).length > 0 ? (
                        Object.entries(citiesList).map(([key, val]) => (
                          <option key={key} value={key}>
                            {val.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="jakarta">Jakarta (WIB)</option>
                          <option value="bandung">Bandung (WIB)</option>
                          <option value="surabaya">Surabaya (WIB)</option>
                          <option value="semarang">Semarang (WIB)</option>
                          <option value="yogyakarta">Yogyakarta (WIB)</option>
                          <option value="medan">Medan (WIB)</option>
                          <option value="palembang">Palembang (WIB)</option>
                          <option value="makassar">Makassar (WITA)</option>
                          <option value="denpasar">Denpasar / Bali (WITA)</option>
                          <option value="balikpapan">Balikpapan (WITA)</option>
                          <option value="jayapura">Jayapura (WIT)</option>
                        </>
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={handleBrowserGps}
                      disabled={prayerLoading}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-[#d2d2d7] hover:border-emerald-300 text-emerald-700 text-[10px] font-bold transition flex items-center gap-1 shadow-2xs"
                      title="Use accurate GPS from browser"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>GPS</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Today's Schedule Grid */}
              {prayerPreview && (
                <div className="p-4 rounded-2xl bg-[#1c1c1e] text-white space-y-3 border border-white/10 shadow-inner">
                  <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-white/50">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      Today's Prayer Times Schedule
                    </span>
                    <span>{prayerPreview.cityName}</span>
                  </div>

                  {/* 5 Daily Prayers Schedule Grid */}
                  <div className="grid grid-cols-5 gap-2 pt-1">
                    {[
                      { key: 'fajr', name: 'Subuh', time: prayerPreview.fajr },
                      { key: 'dhuhr', name: 'Dzuhur', time: prayerPreview.dhuhr },
                      { key: 'asr', name: 'Ashar', time: prayerPreview.asr },
                      { key: 'maghrib', name: 'Maghrib', time: prayerPreview.maghrib },
                      { key: 'isha', name: 'Isya', time: prayerPreview.isha },
                    ].map((p) => {
                      const isNext = prayerPreview.nextPrayer === p.key;
                      return (
                        <div
                          key={p.key}
                          className={`p-3 rounded-xl text-center border transition-all ${
                            isNext
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold scale-[1.02]'
                              : 'bg-white/5 border-white/5 text-white/70 font-medium'
                          }`}
                        >
                          <div className="text-[10px] uppercase tracking-wider">{p.name}</div>
                          <div className="text-sm font-mono mt-0.5">{p.time}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Button: Apply Prayer Widget */}
              <button
                type="button"
                onClick={() => handleApplyPrayerWidget()}
                disabled={prayerLoading}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
              >
                {prayerLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>
                  {selectedId === 'all'
                    ? `Broadcast ${prayerMode === 'full' ? 'Full Schedule' : 'Compact Pill'} to All TVs`
                    : `Apply ${prayerMode === 'full' ? 'Full Schedule' : 'Compact Pill'} to TV`}
                </span>
              </button>
            </div>

            {/* 3. Future Widgets & Module Card Extensibility */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Weather Widget Teaser */}
              <div className="apple-card rounded-3xl p-6 space-y-3 opacity-90 border border-[#e5e5ea]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-[#1d1d1f]">Weather Widget</h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                    Coming Soon
                  </span>
                </div>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed">
                  Real-time weather, temperature, and Air Quality Index (AQI) displayed directly on your TV header.
                </p>
              </div>

              {/* 3rd-Party Module Card Spec 1 */}
              <div className="apple-card rounded-3xl p-6 space-y-3 border border-[#e5e5ea]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/20">
                      <Layers className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-[#1d1d1f]">Custom Module Card Support (Spec 1)</h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                    Native APK
                  </span>
                </div>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed">
                  Third-party Android TV applications can embed native interactive cards into the CleanYourTV dock via category{' '}
                  <code className="text-[10px] font-mono text-[#0071e3] bg-[#0071e3]/10 px-1 py-0.5 rounded">com.gathin.tvhome.category.DOCK_CARD</code>.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Lightbox Image Preview Modal */}
      {previewModalImg && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setPreviewModalImg(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-[#1c1c1e] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 text-white">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-pink-400" />
                <span className="text-sm font-mono truncate font-medium">{previewModalImg.name}</span>
              </div>
              <button 
                onClick={() => setPreviewModalImg(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-black flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img 
                src={previewModalImg.url} 
                alt={previewModalImg.name} 
                className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
