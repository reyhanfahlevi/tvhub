import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  RefreshCw, 
  Sliders, 
  Image as ImageIcon, 
  Radio, 
  Play, 
  Cpu, 
  HardDrive, 
  Check, 
  Layers, 
  Sparkles,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Home,
  ArrowLeft,
  Send
} from 'lucide-react';

interface TVDevice {
  id: string;
  ip: string;
  port: number;
  model: string;
  device: string;
  manufacturer: string;
  androidVersion: string;
  sdk: number;
  wallpapersCount: number;
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
    show_stats: false,
  });
  const [apps, setApps] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

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

  // Fetch config and apps when selected device changes
  useEffect(() => {
    const target = selectedId === 'all' ? (devices[0]?.id || '') : selectedId;
    if (!target) return;
    const loadDeviceDetails = async () => {
      try {
        const cfgRes = await fetch(`/api/devices/${target}/config`);
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          setConfig(prev => ({ ...prev, ...cfg }));
        }
        const appRes = await fetch(`/api/devices/${target}/apps`);
        if (appRes.ok) {
          const appData = await appRes.json();
          setApps(appData.apps || []);
        }
      } catch (err) {
        console.error('Failed to load device details', err);
      }
    };
    loadDeviceDetails();
  }, [selectedId, devices.length]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      const data = await res.json();
      setDevices(data.devices || []);
      showToast(`Scan complete: Found ${data.devices?.length || 0} TV(s)`);
    } catch {
      showToast('Scan failed to complete');
    } finally {
      setScanning(false);
    }
  };

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleSaveConfig = async () => {
    try {
      if (selectedId === 'all') {
        await fetch('/api/broadcast/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });
        showToast('Settings broadcasted to ALL TVs!');
      } else {
        await fetch(`/api/devices/${selectedId}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });
        showToast('Settings saved & applied live on TV!');
      }
      // Re-fetch config to ensure state matches device disk
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
        showToast(`Wallpaper pushed to ALL TVs!`);
      } else {
        await fetch(`/api/devices/${selectedId}/wallpaper`, {
          method: 'POST',
          body: formData,
        });
        showToast(`Wallpaper updated on ${activeDevice?.model || 'TV'}!`);
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
      showToast(`Launching ${label || pkg}...`);
    } catch (err: any) {
      showToast(`Failed to launch: ${err.message}`);
    }
  };

  const activeDevice = devices.find(d => d.id === selectedId);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100 p-6 md:p-10 font-sans">
      {/* Toast */}
      {statusMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-blue-600/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between pb-8 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Tv className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">tvhub</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">
              v1.0
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">Apple TV Experience & Fleet Management for Android TV</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-medium transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin text-blue-400' : ''}`} />
            <span>{scanning ? 'Scanning Network...' : 'Scan Network'}</span>
          </button>
        </div>
      </header>

      {/* Device Selector Tabs */}
      <main className="max-w-6xl mx-auto mt-8">
        <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
          <button
            onClick={() => setSelectedId('all')}
            className={`px-5 py-3 rounded-2xl font-medium text-sm transition flex items-center gap-2.5 border ${
              selectedId === 'all'
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                : 'glass-panel text-zinc-400 hover:text-white border-white/10'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All TVs ({devices.length})</span>
          </button>

          {devices.map((dev) => (
            <button
              key={dev.id}
              onClick={() => setSelectedId(dev.id)}
              className={`px-5 py-3 rounded-2xl font-medium text-sm transition flex items-center gap-3 border ${
                selectedId === dev.id
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                  : 'glass-panel text-zinc-400 hover:text-white border-white/10'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{dev.model === 'SWTV' ? 'Coocaa TV' : dev.model}</span>
              <span className="text-xs opacity-60">({dev.ip})</span>
            </button>
          ))}
        </div>

        {/* Selected TV Hardware Summary */}
        {activeDevice && (
          <div className="glass-panel rounded-3xl p-6 mt-6 grid grid-cols-2 md:grid-cols-4 gap-6 border border-white/10">
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Device Model</div>
              <div className="text-lg font-medium text-white mt-1">{activeDevice.model} ({activeDevice.device})</div>
              <div className="text-xs text-zinc-500">Android {activeDevice.androidVersion} • SDK {activeDevice.sdk}</div>
            </div>

            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Network & IP</div>
              <div className="text-lg font-medium text-white mt-1">{activeDevice.ip}:8080</div>
              <div className="text-xs text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Online (mDNS Active)</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>RAM Usage</span>
              </div>
              <div className="text-lg font-medium text-white mt-1">
                {activeDevice.memory ? `${activeDevice.memory.available_mb} MB Free` : 'Normal'}
              </div>
              <div className="text-xs text-zinc-500">
                Total {activeDevice.memory?.total_mb || 0} MB
              </div>
            </div>

            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Storage</span>
              </div>
              <div className="text-lg font-medium text-white mt-1">
                {activeDevice.storage ? `${Math.round(activeDevice.storage.free_mb / 1024 * 10) / 10} GB Free` : 'Normal'}
              </div>
              <div className="text-xs text-zinc-500">
                {activeDevice.wallpapersCount} Wallpapers installed
              </div>
            </div>
          </div>
        )}

        {/* Configuration & Controls Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Column 1 & 2: Visual Styling & Wallpaper */}
          <div className="lg:col-span-2 space-y-6">
            {/* Visual Tuning Box */}
            <div className="glass-panel rounded-3xl p-7 border border-white/10">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-5 h-5 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">Appearance & Dock</h2>
                </div>
                {selectedId === 'all' && (
                  <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Broadcasting to all TVs
                  </span>
                )}
              </div>

              <div className="space-y-6 mt-6">
                {/* Dock Opacity Slider */}
                <div>
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-zinc-200">Dock Background Opacity</span>
                    <span className="text-blue-400 font-semibold">{config.dock_opacity ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.dock_opacity ?? 50}
                    onChange={(e) => setConfig({ ...config, dock_opacity: parseInt(e.target.value) })}
                    className="w-full mt-3 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    <span>0% (Fully Transparent)</span>
                    <span>50% (Apple TV Glass)</span>
                    <span>100% (Solid Black)</span>
                  </div>
                </div>

                {/* Toggles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Glass Look Toggle */}
                  <div 
                    onClick={() => setConfig({ ...config, dock_glass: !config.dock_glass })}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      config.dock_glass ? 'bg-blue-600/20 border-blue-500/40 text-white' : 'bg-white/5 border-white/10 text-zinc-400'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-white">Glass Look (Specular Rim)</div>
                      <div className="text-xs text-zinc-400 mt-0.5">Pantulan kilauan kaca tvOS</div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                      config.dock_glass ? 'bg-blue-600 border-blue-400 text-white' : 'border-white/20'
                    }`}>
                      {config.dock_glass && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Ambient Glow Toggle */}
                  <div 
                    onClick={() => setConfig({ ...config, ambient_glow: !config.ambient_glow })}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      config.ambient_glow ? 'bg-blue-600/20 border-blue-500/40 text-white' : 'bg-white/5 border-white/10 text-zinc-400'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-white">Ambient App Glow</div>
                      <div className="text-xs text-zinc-400 mt-0.5">Pendaran warna icon di atas dock</div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                      config.ambient_glow ? 'bg-blue-600 border-blue-400 text-white' : 'border-white/20'
                    }`}>
                      {config.ambient_glow && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Hardware Stats Toggle */}
                  <div 
                    onClick={() => setConfig({ ...config, show_stats: !config.show_stats })}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      config.show_stats ? 'bg-blue-600/20 border-blue-500/40 text-white' : 'bg-white/5 border-white/10 text-zinc-400'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-white">Hardware Stats Monitor</div>
                      <div className="text-xs text-zinc-400 mt-0.5">Tampilkan CPU & RAM di layar</div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                      config.show_stats ? 'bg-blue-600 border-blue-400 text-white' : 'border-white/20'
                    }`}>
                      {config.show_stats && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Wallpaper Dim Slider */}
                  <div className="p-4 rounded-2xl border bg-white/5 border-white/10">
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                      <span>Wallpaper Darken Dim</span>
                      <span className="text-blue-400">{config.wallpaper_dim ?? 0}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      value={config.wallpaper_dim ?? 0}
                      onChange={(e) => setConfig({ ...config, wallpaper_dim: parseInt(e.target.value) })}
                      className="w-full mt-2.5 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>

                {/* Greeting Name Input */}
                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold block mb-2">
                    Custom Greeting Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Reyhan (tampil: GOOD MORNING, REYHAN)"
                    value={config.greeting_name || ''}
                    onChange={(e) => setConfig({ ...config, greeting_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition text-sm"
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveConfig}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/30 transition active:scale-98 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Apply Changes Live to TV</span>
                </button>
              </div>
            </div>

            {/* Wallpaper Uploader Box */}
            <div className="glass-panel rounded-3xl p-7 border border-white/10">
              <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
                <ImageIcon className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-semibold text-white">Wallpaper Manager</h2>
              </div>

              <div className="mt-6 flex flex-col md:flex-row items-center gap-6">
                <label className="w-full md:w-1/2 border-2 border-dashed border-white/20 hover:border-blue-500/60 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-white/5 hover:bg-blue-500/5">
                  <ImageIcon className="w-10 h-10 text-zinc-400 mb-3" />
                  <span className="text-sm font-semibold text-white">Upload New Wallpaper</span>
                  <span className="text-xs text-zinc-400 mt-1">PNG or JPEG (Center crop 1080p)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                    disabled={uploading} 
                    className="hidden" 
                  />
                </label>

                <div className="w-full md:w-1/2 space-y-3">
                  <div className="text-sm font-semibold text-zinc-200">Rotation & Rotation Interval</div>
                  <div className="text-xs text-zinc-400">
                    Wallpaper berganti otomatis di antara koleksi gambar yang terupload di TV.
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={config.wallpaper_rotation_minutes ?? 30}
                      onChange={(e) => setConfig({ ...config, wallpaper_rotation_minutes: parseInt(e.target.value) || 30 })}
                      className="w-24 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm text-center"
                    />
                    <span className="text-xs text-zinc-400">Menit per pergantian wallpaper</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Apple TV Virtual Remote */}
          <div className="space-y-6">
            <div className="glass-panel rounded-3xl p-7 border border-white/10 flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-white text-sm">Virtual Remote</span>
                </div>
                <span className="text-xs text-zinc-500">
                  {selectedId === 'all' ? 'All TVs (Broadcast)' : activeDevice?.model || 'TV'}
                </span>
              </div>

              {/* D-Pad Controller */}
              <div className="relative w-52 h-52 rounded-full bg-zinc-900 border border-white/15 shadow-2xl flex items-center justify-center p-2">
                {/* UP */}
                <button
                  onClick={() => sendKey('up')}
                  className="absolute top-2 w-14 h-12 flex items-center justify-center text-zinc-400 hover:text-white active:scale-95 transition"
                >
                  <ChevronUp className="w-6 h-6" />
                </button>
                {/* DOWN */}
                <button
                  onClick={() => sendKey('down')}
                  className="absolute bottom-2 w-14 h-12 flex items-center justify-center text-zinc-400 hover:text-white active:scale-95 transition"
                >
                  <ChevronDown className="w-6 h-6" />
                </button>
                {/* LEFT */}
                <button
                  onClick={() => sendKey('left')}
                  className="absolute left-2 w-12 h-14 flex items-center justify-center text-zinc-400 hover:text-white active:scale-95 transition"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                {/* RIGHT */}
                <button
                  onClick={() => sendKey('right')}
                  className="absolute right-2 w-12 h-14 flex items-center justify-center text-zinc-400 hover:text-white active:scale-95 transition"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                {/* OK / CENTER */}
                <button
                  onClick={() => sendKey('ok')}
                  className="w-20 h-20 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 border border-white/20 text-white font-semibold text-xs tracking-wider transition shadow-lg flex items-center justify-center"
                >
                  OK
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 w-52 mt-6">
                <button
                  onClick={() => sendKey('back')}
                  className="py-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/15 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-200 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={() => sendKey('home')}
                  className="py-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/15 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-200 transition"
                >
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </button>
              </div>
            </div>

            {/* Quick App Launcher */}
            {apps.length > 0 && (
              <div className="glass-panel rounded-3xl p-6 border border-white/10">
                <div className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-blue-400" />
                  <span>Quick Launch Apps</span>
                  {selectedId === 'all' && <span className="text-[10px] text-zinc-500 font-normal">(Broadcast)</span>}
                </div>
                <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto no-scrollbar pr-1">
                  {apps.map((app, idx) => (
                    <button
                      key={idx}
                      onClick={() => launchApp(app.package, app.label)}
                      className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-blue-600/30 border border-white/10 hover:border-blue-500/40 text-left transition flex items-center justify-between text-xs font-medium text-zinc-200 group"
                    >
                      <span className="truncate">{app.label}</span>
                      <Play className="w-3 h-3 text-zinc-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition" />
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
