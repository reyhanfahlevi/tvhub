# 📺 tvhub — Centralized Android TV Management Dashboard

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**tvhub** is a modern, web-based management dashboard for Android TVs running the custom **[CleanYourTV](https://github.com/reyhanfahlevi/cleanyourtv)** (`tvhome`) lightweight launcher.

It completely eliminates the need for ADB cables or terminal commands after initial setup. Each TV runs a lightweight embedded REST API and mDNS responder (`_tvhub._tcp.`), allowing `tvhub` to discover TVs on your local network automatically, monitor hardware health, push wallpapers over-the-air, control playback with a virtual remote, and customize dock glassmorphism in real-time.

---

## ✨ Features

- 🔍 **Zero-Config Network Auto-Discovery**: Automatically discovers TVs using native mDNS (`_tvhub._tcp.`) with fallback to active subnet scanning.
- 🎨 **Live Dock & Glassmorphism Customization**:
  - Live Dock Opacity slider (0% fully transparent to 100% solid dark).
  - Apple TV / tvOS-style frosted glass effect with specular rim highlights.
  - Ambient App Glow and Hardware Stats Monitor toggles.
  - Custom Greeting Name editor.
- 🕌 **Prayer Times & Adhan Schedule (Indonesian Cities)**:
  - Built-in prayer calculation using `adhan` with automatic IP geolocation or manual city selection.
  - Synchronizes prayer times, countdowns, and Hijri dates to your TV dock.
- 🖼️ **Over-the-Air Wallpaper Manager**:
  - Drag-and-drop wallpaper uploader (`POST /api/wallpaper`).
  - Broadcast wallpapers to all TVs simultaneously or target a specific TV.
  - Wallpaper rotation interval slider and dim level control.
- 📱 **Virtual Remote Control**:
  - Full D-Pad navigation (Up, Down, Left, Right).
  - Center OK button, Back, and Home shortcuts.
  - Controls active TV or broadcasts keys to all TVs.
- ⚡ **One-Click Quick App Launcher**:
  - Queries installed apps on the TV via `GET /api/apps`.
  - Instantly launch YouTube, Netflix, Disney+, Prime Video, etc. from your phone or laptop.
- 📊 **Real-time Hardware Telemetry**:
  - Live RAM usage, free storage space, device model, Android/SDK version, and system uptime.

---

## ⚡ 1-Prompt Setup via AI Assistant (Claude Code, Antigravity, Cursor)

If you use an AI coding assistant with terminal/shell access (e.g. **Claude Code, Antigravity, Cursor, Codex, Gemini CLI**), you don't even need to type terminal commands manually!

1. Enable **USB Debugging** on your TV (*Settings → Device Preferences → About → Tap "Build" 7 times → Developer Options → USB Debugging*).
2. Copy the prompt below, replace `<TV_IP>` with your TV's local IP (e.g., `192.168.1.50`), and paste it into your AI assistant:

> [!TIP]
> 📋 **Copy & Paste into your AI Assistant** (see also **[`PROMPT.md`](./PROMPT.md)**):
> ```text
> I want to debloat and configure my Android TV, install CleanYourTV, and run tvhub.
> TV IP: <TV_IP_HERE>
> 
> Please:
> 1. Connect over ADB (`adb connect <TV_IP>:5555`). Remind me to accept the debugging prompt on my TV screen.
> 2. Download and install CleanYourTV APK from:
>    https://github.com/reyhanfahlevi/cleanyourtv/releases/latest/download/app-release.apk
> 3. Set CleanYourTV as default launcher (`adb shell cmd package set-home-activity com.gathin.tvhome/.MainActivity`).
> 4. Safely disable default ad-filled stock launcher using `pm disable-user --user 0`.
> 5. Verify the embedded API is active (`curl http://<TV_IP>:8080/api/status`).
> 6. Start the tvhub dashboard via `npx @reyhanfahlevi/tvhub`.
> ```

---

## 📋 Prerequisites (Persyaratan Sistem)

Before installing `tvhub`, ensure you have the following requirements ready:

### 1. Host Machine (PC / Mac / Raspberry Pi / Home Server)
- **Node.js**: Version `18.0.0` or higher (Node `v20.x` or `v22.x` recommended). Verify with:
  ```bash
  node -v
  npm -v
  ```
- **Git**: Installed on your system.
- **Android Debug Bridge (`adb`)**: Required for the **one-time** initial TV setup only.
  - **macOS** (Homebrew): `brew install android-platform-tools`
  - **Linux** (Debian/Ubuntu): `sudo apt-get install adb`
  - **Windows**: Download [Android SDK Platform-Tools](https://developer.android.com/tools/releases/platform-tools) and add to PATH.

### 2. Android TV Device
- Any smart TV, TV box, or TV stick running **Android TV / Google TV 7.0+** (SDK 24+).
  *(e.g., Xiaomi Mi Box/TV, Chromecast with Google TV, Coocaa, Realme TV, etc.)*
- **Developer Options** and **Network Debugging / USB Debugging** enabled.

### 3. Local Network Requirements
- The host machine running `tvhub` and all Android TVs **MUST be connected to the same Wi-Fi / Local Area Network (LAN)**.
- **No AP/Client Isolation**: Your Wi-Fi router must allow local communication between devices (mDNS on UDP `5353`, HTTP on port `8080`, and dashboard on port `3000`).

---

## 🚀 Step-by-Step Setup Guide

The installation is divided into two quick phases:
1. **Phase 1: Android TV One-Time Setup** (Install the companion launcher).
2. **Phase 2: tvhub Dashboard Setup** (Run the central dashboard on your computer/server).

---

### Phase 1: Android TV One-Time Setup

Each Android TV requires the custom **CleanYourTV** launcher APK, which hosts the embedded REST API server (Port 8080) and mDNS broadcaster.

#### Step 1.1: Enable USB & Network Debugging on Android TV
1. On your TV, navigate to **Settings** (`⚙️`) → **Device Preferences** → **About**.
2. Scroll down to **Build** (or *Android TV OS build*) and click it **7 times** repeatedly until you see the message: *"You are now a developer!"*.
3. Go back one screen, select **Developer Options**, and enable:
   - **USB Debugging** → Turn **ON**.
   - **Network Debugging** (if present on your TV) → Turn **ON**.
4. Note your TV's IP address from **Settings** → **Network & Internet** → Your Connected Wi-Fi (e.g. `192.168.1.50` or `10.20.50.138`).

#### Step 1.2: Connect your Computer to the TV via ADB
Open a terminal on your computer and run:

```bash
# Connect to your TV (replace with your TV's local IP address)
adb connect <TV_IP>:5555

# Verify connection
adb devices
```
> [!IMPORTANT]
> A prompt will appear on your TV screen: **"Allow USB debugging?"**.
> Check the box **"Always allow from this computer"** and select **OK** using your TV remote.

#### Step 1.3: Download and Install CleanYourTV Launcher APK
Download the latest precompiled APK containing the embedded REST API & glassmorphic dock:

```bash
# Download latest release APK
curl -L -o cleanyourtv.apk https://github.com/reyhanfahlevi/cleanyourtv/releases/latest/download/app-release.apk

# Install the APK to your TV
adb -s <TV_IP>:5555 install -r cleanyourtv.apk
```

#### Step 1.4: Set CleanYourTV as Default Home Launcher
Set the new lightweight launcher as your default home screen:

```bash
# Set CleanYourTV as the default home activity
adb -s <TV_IP>:5555 shell "cmd package set-home-activity com.gathin.tvhome/.MainActivity"

# Launch it immediately
adb -s <TV_IP>:5555 shell "am start -n com.gathin.tvhome/.MainActivity"
```

#### Step 1.5: (Optional) Disable Laggy Stock Launcher & Ads
To make your TV lightning fast, safely disable the default ad-heavy launcher without root (**never use `pm uninstall`**; disabling is 100% reversible with `pm enable`):

```bash
# For standard Google TV / Android TV Home:
adb -s <TV_IP>:5555 shell "pm disable-user --user 0 com.google.android.tvlauncher"
adb -s <TV_IP>:5555 shell "pm disable-user --user 0 com.google.android.tvrecommendations"
adb -s <TV_IP>:5555 shell "pm disable-user --user 0 com.google.android.apps.setupwraith"

# For Xiaomi (PatchWall & bloat):
adb -s <TV_IP>:5555 shell "pm disable-user --user 0 com.mitv.tvhome"
adb -s <TV_IP>:5555 shell "pm disable-user --user 0 com.xiaomi.mitv.advertise"
adb -s <TV_IP>:5555 shell "pm disable-user --user 0 com.xiaomi.devicereport"

# For Coocaa / Skyworth:
adb -s <TV_IP>:5555 shell "pm disable-user --user 0 com.skyworth.tv.launcher"
adb -s <TV_IP>:5555 shell "pm disable-user --user 0 com.coocaa.mall"
```

#### Step 1.6: Verify the TV Embedded API
Check if the TV's embedded server is responding:

```bash
curl http://<TV_IP>:8080/api/status
```
If you get a JSON response with memory, storage, and device model, **TV setup is complete!** You can now disconnect ADB.

---

### Phase 2: Run `tvhub` Dashboard on your Computer / Server

You can run `tvhub` in two ways: **Instant (via npm/npx)** or **Manual (from Source)**.

#### Option A: Quick Run with npm / npx (Recommended — No clone needed!)

Run directly with `npx` (downloads and launches instantly):
```bash
npx @reyhanfahlevi/tvhub
```

Or install it globally to your system so you can launch it anytime by just typing `tvhub`:
```bash
# Install globally
npm install -g @reyhanfahlevi/tvhub

# Launch dashboard
tvhub
```

*(If installing directly from the GitHub repository via npm):*
```bash
npm install -g git+https://github.com/reyhanfahlevi/tvhub.git
tvhub
```

---

#### Option B: Run from Source (Clone Git)

If you prefer cloning the repository or making custom modifications:

```bash
# 1. Clone repository
git clone https://github.com/reyhanfahlevi/tvhub.git
cd tvhub

# 2. Install dependencies
npm install

# 3. Build client & server
npm run build

# 4. Start dashboard
npm start
```

You should see:
```text
======================================================
🚀 tvhub server running at http://localhost:3000
🌐 Network: http://192.168.1.x:3000
======================================================
```

---

### Phase 3: Access & Manage your TVs!

1. Open your web browser and visit (tvhub operates on **default port `3000`**):
   - **Local machine**: `http://localhost:3000`
   - **Mobile phone / Tablet**: `http://<HOST_MACHINE_IP>:3000` *(make sure your phone is connected to the same Wi-Fi)*
2. **Auto-Discovery**: `tvhub` will automatically scan the local network and discover all active TVs running CleanYourTV.
3. If your TV does not appear immediately, click **"Scan Subnet"** at the top right of the dashboard.

---

## 💻 Development Mode

If you are modifying the source code and want live hot-reloading:

```bash
# Terminal 1: Run the backend server with auto-reload
npm run dev

# Terminal 2: Run Vite dev server for frontend HMR (optional, if modifying UI)
npx vite src/client
```

---

## 🔌 Network Ports & Configuration

### Default Ports Used by tvhub Ecosystem

| Port | Protocol | Device / Service | Description | Configurable? |
|---|---|---|---|---|
| **`3000`** | `HTTP / TCP` | Host Computer / Server | **tvhub Web Dashboard UI & Proxy Server** | ✅ Yes (via `PORT` env) |
| **`8080`** | `HTTP / TCP` | Android TV(s) | **Embedded CleanYourTV REST API** | Pre-configured in launcher |
| **`5353`** | `UDP` | Local Network (LAN) | **mDNS Multicast** (zero-config automatic TV discovery) | Standard protocol |
| **`5555`** | `TCP` | Android TV | **ADB Network Debugging** (initial 1-time setup only) | Android standard |

> [!NOTE]
> Make sure port **`3000`** is not blocked by your host computer's firewall if you want to access the dashboard from your smartphone or tablet on the local Wi-Fi.

### Changing the Default Port (`3000`)

If port `3000` is already used by another application, you can specify a custom port using the `PORT` environment variable:

```bash
# When using npx:
PORT=4000 npx @reyhanfahlevi/tvhub

# When using global CLI:
PORT=4000 tvhub

# When running from source:
PORT=4000 npm start

# On Windows PowerShell:
$env:PORT="4000"; tvhub
```

---

## 📡 REST API Reference

### TV Embedded Server (Port 8080 on Android TV)

Each TV runs a high-performance, embedded HTTP server on port 8080:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Hardware telemetry (RAM, storage, model, uptime) |
| `GET` | `/api/config` | Current launcher configuration |
| `POST` | `/api/config` | Update configuration (dock opacity, glass look, greeting, prayer times) |
| `GET` | `/api/wallpapers` | List active wallpapers on TV storage |
| `POST` | `/api/wallpaper` | Upload new wallpaper (multipart form or binary) |
| `DELETE` | `/api/wallpaper` | Remove a wallpaper |
| `GET` | `/api/apps` | List installed launchable Android TV apps |
| `POST` | `/api/action/launch` | Launch app by package name (`{"package": "com.netflix.ninja"}`) |
| `POST` | `/api/action/key` | Send remote key navigation (`{"key": "up\|down\|left\|right\|ok\|back\|home"}`) |

### tvhub Central Server (Port 3000)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/devices` | Returns all discovered TVs on the network |
| `POST` | `/api/scan` | Trigger active subnet scan (`{"subnet": "192.168.1"}`) |
| `POST` | `/api/broadcast/config` | Push launcher configuration to ALL connected TVs |
| `POST` | `/api/broadcast/wallpaper` | Broadcast wallpaper image to ALL connected TVs |
| `GET` | `/api/prayer` | Calculate prayer times for city (`?city=Jakarta`) |

---

## ❓ Troubleshooting & FAQs

### 1. TV is not discovered automatically by tvhub
- **Check Wi-Fi connection**: Ensure your TV and host computer are connected to the exact same Wi-Fi router / SSID.
- **Router "AP Isolation" / "Client Isolation"**: Some guest Wi-Fi networks block devices from talking to each other. Turn off *AP Isolation* in your router admin settings.
- **Manual Subnet Scan**: In the tvhub web dashboard, enter your subnet prefix (e.g. `192.168.1`) and click **Scan Subnet**.
- **Test TV Server directly**: Open `http://<TV_IP>:8080/api/status` in your browser. If it doesn't open, ensure the CleanYourTV launcher is currently open on the TV.

### 2. ADB shows `unauthorized` or `connection refused`
- Make sure **USB Debugging** is toggled ON under Developer Options on the TV.
- Look at the TV screen and accept the prompt **"Always allow from this computer"**.
- Restart the ADB server:
  ```bash
  adb kill-server
  adb start-server
  adb connect <TV_IP>:5555
  ```

### 3. How to revert back to the stock launcher?
If you ever want to revert back to your TV's original launcher:
```bash
# Re-enable the stock launcher
adb -s <TV_IP>:5555 shell "pm enable com.google.android.tvlauncher"
# Set it back as default
adb -s <TV_IP>:5555 shell "cmd package set-home-activity com.google.android.tvlauncher/.MainActivity"
```

---

## 🤖 Automated Installation via AI Coding Agents

If you want an AI coding agent (e.g., Claude Code, Antigravity, Cursor, Aider) to automate TV debloating, launcher installation, and dashboard setup end-to-end, refer to:
👉 **[AGENT_INSTALL.md](./AGENT_INSTALL.md)**

---

## 🔗 Related Projects

- **[CleanYourTV (reyhanfahlevi fork)](https://github.com/reyhanfahlevi/cleanyourtv)** — Android TV debloat scripts & lightweight launcher with embedded REST API, glassmorphic dock, and prayer times integration.
- **[CleanYourTV (Upstream)](https://github.com/Gathin23/cleanyourtv)** — Original minimal Android TV launcher by Gathin23.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
