import React, { useState, useEffect } from 'react';
import {
  Tv,
  RefreshCw,
  Upload,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Home,
  Check,
  Layers,
  HardDrive,
  Cpu,
  Clock,
  Sparkles,
  Sliders,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Power
} from 'lucide-react';

interface TVDevice {
  id: string;
  ip: string;
  port: number;
  model: string;
  manufacturer: string;
  device: string;
  android_version: string;
  sdk: number;
  uptime_ms: number;
  memory: {
    total_mb: number;
    available_mb: number;
    low_memory: boolean;
  };
  storage: {
    total_mb: number;
    free_mb: number;
  };
  wallpapers_count: number;
  last_seen: number;
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
  dock_apps?: string[];
  [key: string]: any;
}

export default function App() {
  const [devices, setDevices] = useState<TVDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [config, setConfig] = useState<TVConfig>({
    dock_opacity: 50,
    dock_glass: true,
    ambient_glow: false,
    wallpaper_dim: 0,
    wallpaper_rotation_minutes: 30,
    greeting_name: '',
    show_stats: true,
  });
  const [apps, setApps] = useState<any[]>([]);
  const [wallpapers, setWallpapers] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

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
      const list = data.devices || [];
      setDevices(list);
      setSelectedId(prev => (prev === 'all' && list.length > 0 ? list[0].id : prev));
    } catch (err) {
      console.error('Failed to fetch devices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, []);

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
        }
        if (appRes.ok) {
          const appData = await appRes.json();
          setApps(appData.apps || []);
        }
        if (wpRes.ok) {
          const wpData = await wpRes.json();
          setWallpapers(wpData.wallpapers || []);
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
    try {
      if (selectedId === 'all') {
        await fetch('/api/broadcast/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });
        showToast('Settings broadcasted to all TVs');
      } else {
        await fetch(`/api/devices/${selectedId}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });
        showToast('Settings saved & applied live on TV');
      }
      const target = selectedId === 'all' ? (devices[0]?.id || '') : selectedId;
      if (target) {
        const cfgRes = await fetch(`/api/devices/${target}/config`);
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

    try {
      if (selectedId === 'all') {
        await fetch('/api/broadcast/wallpaper', {
          method: 'POST',
          body: formData,
        });
        showToast('Wallpaper pushed to all TVs');
      } else {
        await fetch(`/api/devices/${selectedId}/wallpaper`, {
          method: 'POST',
          body: formData,
        });
        showToast(`Wallpaper uploaded to ${activeDevice?.model || 'TV'}`);
      }
      fetchDevices();
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const sendKey = async (key: string) => {
    try {
      await fetch(`/api/devices/${selectedId}/key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const launchApp = async (pkg: string, label?: string) => {
    try {
      await fetch(`/api/devices/${selectedId}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: pkg }),
      });
      showToast(`Launched ${label || pkg}`);
    } catch (err: any) {
      showToast(`Launch failed: ${err.message}`);
    }
  };

  const activeDevice = devices.find(d => d.id === selectedId) || devices[0];
  const dockOpacityValue = config.dock_opacity ?? 50;
  const isGlass = config.dock_glass ?? true;

  const androidVer = (activeDevice as any)?.androidVersion || activeDevice?.android_version || '14';
  const uptimeHours = Math.max(1, Math.round(((activeDevice?.uptime_ms || (activeDevice as any)?.uptimeMs || 11200000) / 3600000)));
  const wallpaperTotal = wallpapers.length > 0 ? wallpapers.length : ((activeDevice as any)?.wallpapersCount || activeDevice?.wallpapers_count || 4);

  return (
    <div className="min-h-screen text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-white pb-16">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="fixed bottom-8 right-8 z-50 bg-[#1e212f]/90 backdrop-blur-xl text-white px-5 py-3 rounded-2xl border border-white/15 shadow-2xl flex items-center gap-3 text-xs font-semibold tracking-wide animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/10 bg-[#0d0f18]/60 backdrop-blur-2xl px-6 md:px-12 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Tv className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">tvhub</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-zinc-400">tvOS Control</span>
            </div>
            <div className="text-[11px] text-zinc-400">Headless TV Management Studio</div>
          </div>
        </div>

        {/* TV Device Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <button
              onClick={() => setSelectedId('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                selectedId === 'all'
                  ? 'bg-white text-zinc-900 shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All TVs ({devices.length})</span>
            </button>

            {devices.map((dev) => (
              <button
                key={dev.id}
                onClick={() => setSelectedId(dev.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  selectedId === dev.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{dev.model === 'SWTV' ? 'Coocaa TV' : dev.model}</span>
                <span className="text-[10px] font-mono opacity-60">({dev.ip})</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleScan}
            disabled={scanning}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition disabled:opacity-50"
            title="Scan Subnet for TVs"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 pt-8 space-y-8">
        {/* Live TV Screen Mirror & Telemetry Hero */}
        <div className="apple-glass rounded-3xl p-6 md:p-8 relative overflow-hidden">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Live TV Mockup Canvas (16:9 Bezel) */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <div className="text-xs uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-2 self-start mb-3">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span>Live TV Simulation Preview</span>
              </div>

              {/* 16:9 TV Screen Frame */}
              <div 
                className="w-full aspect-video rounded-2xl tv-bezel border border-white/20 relative overflow-hidden flex flex-col justify-between p-5 select-none"
                style={{
                  background: 'radial-gradient(ellipse at 70% 20%, #29385c 0%, #101524 55%, #080910 100%)',
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
                    <div className="text-2xl font-bold tracking-tight">12:35 <span className="text-xs font-normal text-white/70">PM</span></div>
                    {config.show_stats && (
                      <div className="text-[9px] font-mono text-white/60 mt-0.5">
                        RAM 623 MB free • Storage 22.7 GB free
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-medium border border-white/10">Inputs</span>
                    <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-medium border border-white/10">Wi-Fi</span>
                    <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-medium border border-white/10">Settings</span>
                  </div>
                </div>

                {/* Simulated Dock with REALTIME Opacity & Glass Reflection */}
                <div className="relative z-10 flex flex-col items-center">
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
                      border: isGlass ? '1.5px solid rgba(255, 255, 255, 0.22)' : '1px solid rgba(255, 255, 255, 0.08)',
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
                <span className="text-xs uppercase tracking-wider font-semibold text-blue-400">Connected TV Status</span>
                <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
                  {activeDevice ? activeDevice.model : 'Scanning Network...'}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  {activeDevice ? `${activeDevice.manufacturer} • Android ${androidVer} (API ${activeDevice.sdk})` : 'No device selected'}
                </p>
              </div>

              {activeDevice && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <div className="text-[10px] uppercase font-semibold text-zinc-400 flex items-center gap-1.5 mb-1">
                      <Cpu className="w-3.5 h-3.5 text-blue-400" />
                      <span>Memory Available</span>
                    </div>
                    <div className="text-base font-bold text-white font-mono">
                      {activeDevice.memory.available_mb} <span className="text-xs text-zinc-400 font-normal">MB</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      of {activeDevice.memory.total_mb} MB RAM
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <div className="text-[10px] uppercase font-semibold text-zinc-400 flex items-center gap-1.5 mb-1">
                      <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Free Storage</span>
                    </div>
                    <div className="text-base font-bold text-white font-mono">
                      {(activeDevice.storage.free_mb / 1024).toFixed(1)} <span className="text-xs text-zinc-400 font-normal">GB</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      of {(activeDevice.storage.total_mb / 1024).toFixed(1)} GB Storage
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <div className="text-[10px] uppercase font-semibold text-zinc-400 flex items-center gap-1.5 mb-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Device Uptime</span>
                    </div>
                    <div className="text-base font-bold text-white font-mono">
                      {uptimeHours} <span className="text-xs text-zinc-400 font-normal">Hours</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                      ● ONLINE (Port 8080)
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <div className="text-[10px] uppercase font-semibold text-zinc-400 flex items-center gap-1.5 mb-1">
                      <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                      <span>Wallpapers</span>
                    </div>
                    <div className="text-base font-bold text-white font-mono">
                      {wallpaperTotal} <span className="text-xs text-zinc-400 font-normal">Loaded</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      Rotate every {config.wallpaper_rotation_minutes ?? 30}m
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2-Column Studio Workbench */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Dock & Display Calibration Studio (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Dock Calibration Panel */}
            <div className="apple-glass rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Dock & Glassmorphism Studio</h3>
                    <p className="text-[11px] text-zinc-400">Atur transparansi kaca & visual launcher di TV</p>
                  </div>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-white/10 text-zinc-300 border border-white/10">
                  {selectedId === 'all' ? 'All TVs' : activeDevice?.model}
                </span>
              </div>

              {/* Dock Opacity Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-white">Dock Background Opacity</span>
                  <span className="text-blue-400 font-mono text-sm px-2.5 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    {dockOpacityValue}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={dockOpacityValue}
                  onChange={(e) => setConfig({ ...config, dock_opacity: parseInt(e.target.value) })}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>0% (Bening Transparan)</span>
                  <span className="text-blue-400/80 font-medium">50% (Apple TV Glass)</span>
                  <span>100% (Solid Pekat)</span>
                </div>
              </div>

              {/* Wallpaper Dim Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-white">Wallpaper Darken Dim</span>
                  <span className="text-zinc-300 font-mono text-sm px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/10">
                    {config.wallpaper_dim ?? 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={config.wallpaper_dim ?? 0}
                  onChange={(e) => setConfig({ ...config, wallpaper_dim: parseInt(e.target.value) })}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-zinc-400"
                />
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>0% (Terang Asli)</span>
                  <span>30% (Standard)</span>
                  <span>60% (Deep Contrast)</span>
                </div>
              </div>

              {/* Visual Toggles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Glass Look Toggle */}
                <div
                  onClick={() => setConfig({ ...config, dock_glass: !config.dock_glass })}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    config.dock_glass
                      ? 'bg-blue-600/20 border-blue-500/40 text-white shadow-lg shadow-blue-500/10'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-white">Glass Look (Specular Rim)</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Pantulan kilauan kaca tvOS</div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                    config.dock_glass ? 'bg-blue-600 border-blue-400 text-white' : 'border-white/20'
                  }`}>
                    {config.dock_glass && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </div>
                </div>

                {/* Ambient App Glow */}
                <div
                  onClick={() => setConfig({ ...config, ambient_glow: !config.ambient_glow })}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    config.ambient_glow
                      ? 'bg-blue-600/20 border-blue-500/40 text-white shadow-lg shadow-blue-500/10'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-white">Ambient App Glow</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Pendaran warna icon di dock</div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                    config.ambient_glow ? 'bg-blue-600 border-blue-400 text-white' : 'border-white/20'
                  }`}>
                    {config.ambient_glow && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </div>
                </div>

                {/* Hardware Stats HUD */}
                <div
                  onClick={() => setConfig({ ...config, show_stats: !config.show_stats })}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    config.show_stats
                      ? 'bg-blue-600/20 border-blue-500/40 text-white shadow-lg shadow-blue-500/10'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-white">Hardware Stats HUD</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Tampilkan CPU & RAM di TV</div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                    config.show_stats ? 'bg-blue-600 border-blue-400 text-white' : 'border-white/20'
                  }`}>
                    {config.show_stats && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </div>
                </div>

                {/* Wallpaper Rotation Timer */}
                <div className="p-4 rounded-2xl border bg-white/5 border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-white">Wallpaper Rotation</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Rotasi otomatis (menit)</div>
                  </div>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={config.wallpaper_rotation_minutes ?? 30}
                    onChange={(e) => setConfig({ ...config, wallpaper_rotation_minutes: parseInt(e.target.value) || 30 })}
                    className="w-16 px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-mono text-center text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Custom Greeting Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Custom Greeting Name (Tampil di Kiri Atas Layar TV)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Reyhan (tampil: GOOD AFTERNOON, REYHAN)"
                  value={config.greeting_name || ''}
                  onChange={(e) => setConfig({ ...config, greeting_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Apply Changes Button */}
              <button
                onClick={handleSaveConfig}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold text-xs tracking-wide shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Terapkan Perubahan Langsung ke TV</span>
              </button>
            </div>

            {/* Wallpaper Showcase & Dropzone */}
            <div className="apple-glass rounded-3xl p-6 md:p-8 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Wallpaper Collection</h3>
                    <p className="text-[11px] text-zinc-400">Upload wallpaper resolusi 4K langsung ke TV</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-zinc-400">{wallpapers.length} file di TV</span>
              </div>

              <label className="border-2 border-dashed border-white/15 hover:border-blue-400/60 bg-white/5 hover:bg-blue-600/10 rounded-2xl p-7 flex flex-col items-center justify-center cursor-pointer transition-all group">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <div className="p-3.5 rounded-2xl bg-white/10 text-white group-hover:scale-110 group-hover:bg-blue-600 transition-all mb-3">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white">
                  {uploading ? 'Sedang mengirim wallpaper ke TV...' : 'Upload Wallpaper Baru ke TV'}
                </span>
                <span className="text-[11px] text-zinc-400 mt-1">Format JPG, PNG, WEBP (Otomatis rotasi)</span>
              </label>

              {wallpapers.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {wallpapers.map((name, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-zinc-300 flex items-center justify-between truncate"
                    >
                      <span className="truncate">{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Apple Siri Remote & Quick Launch (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Apple Siri Remote (Iconic Physical Replica) */}
            <div className="apple-glass rounded-3xl p-8 flex flex-col items-center relative">
              <div className="w-full flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div>
                  <h3 className="text-sm font-bold text-white">Apple Siri Remote</h3>
                  <p className="text-[11px] text-zinc-400">Kontrol TV nirkabel via REST API</p>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-white/10 text-zinc-300 border border-white/10">
                  {selectedId === 'all' ? 'Broadcast All' : activeDevice?.model}
                </span>
              </div>

              {/* Siri Remote Physical Chassis */}
              <div className="w-64 siri-remote-chassis rounded-[36px] p-6 flex flex-col items-center shadow-2xl relative">
                {/* TV / Microphone Dot */}
                <div className="w-2.5 h-2.5 rounded-full bg-black/80 border border-white/10 mb-6 shadow-inner" />

                {/* Circular Touch Clickpad */}
                <div className="relative w-48 h-48 rounded-full clickpad-outer flex items-center justify-center p-3 select-none">
                  {/* Outer Clickpad Directions */}
                  <button
                    onClick={() => sendKey('up')}
                    className="absolute top-2 w-14 h-10 flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition"
                    title="Up"
                  >
                    <ChevronUp className="w-6 h-6 stroke-[2.5]" />
                  </button>

                  <button
                    onClick={() => sendKey('down')}
                    className="absolute bottom-2 w-14 h-10 flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition"
                    title="Down"
                  >
                    <ChevronDown className="w-6 h-6 stroke-[2.5]" />
                  </button>

                  <button
                    onClick={() => sendKey('left')}
                    className="absolute left-2 w-10 h-14 flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition"
                    title="Left"
                  >
                    <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
                  </button>

                  <button
                    onClick={() => sendKey('right')}
                    className="absolute right-2 w-10 h-14 flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition"
                    title="Right"
                  >
                    <ChevronRight className="w-6 h-6 stroke-[2.5]" />
                  </button>

                  {/* Center Concave OK Button */}
                  <button
                    onClick={() => sendKey('ok')}
                    className="w-20 h-20 rounded-full clickpad-center flex items-center justify-center text-xs font-black tracking-wider text-white select-none transition"
                  >
                    OK
                  </button>
                </div>

                {/* Sub-Keys Matrix (2x2 Apple Remote Layout) */}
                <div className="grid grid-cols-2 gap-4 w-48 mt-8">
                  {/* Back / Return */}
                  <button
                    onClick={() => sendKey('back')}
                    className="h-14 rounded-full siri-button flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white"
                    title="Back"
                  >
                    <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                    <span>Back</span>
                  </button>

                  {/* TV / Home */}
                  <button
                    onClick={() => sendKey('home')}
                    className="h-14 rounded-full siri-button flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white"
                    title="Home Launcher"
                  >
                    <Tv className="w-4 h-4 stroke-[2.5] text-blue-400" />
                    <span>Home</span>
                  </button>
                </div>

                {/* Remote Bottom Branding */}
                <div className="mt-8 text-[10px] font-mono tracking-widest uppercase text-zinc-600">
                  TVHUB REMOTE
                </div>
              </div>
            </div>

            {/* Quick App Launcher */}
            {apps.length > 0 && (
              <div className="apple-glass rounded-3xl p-6 md:p-8 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">Quick App Launcher</h3>
                  </div>
                  <span className="text-xs font-mono text-zinc-400">{apps.length} apps</span>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                  {apps.map((app, idx) => (
                    <button
                      key={idx}
                      onClick={() => launchApp(app.package, app.label)}
                      className="px-3.5 py-3 rounded-2xl bg-white/5 hover:bg-blue-600/30 border border-white/10 hover:border-blue-500/40 text-left transition-all flex items-center justify-between text-xs font-semibold text-zinc-200 hover:text-white group"
                    >
                      <span className="truncate">{app.label}</span>
                      <Play className="w-3.5 h-3.5 text-zinc-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
