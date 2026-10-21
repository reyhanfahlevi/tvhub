# 📺 tvhub — Centralized Android TV Management Dashboard

**tvhub** is a sleek, web-based management dashboard for Android TVs running the custom **CleanYourTV** (`tvhome`) launcher.

It completely eliminates the need for ADB cables or terminal commands after initial setup. Each TV runs a lightweight embedded REST API and mDNS responder (`_tvhub._tcp.`), allowing `tvhub` to discover TVs on your local network automatically and manage them live.

Built with **TypeScript, Node.js (Express), React 19, Tailwind CSS**, and styled following `@google/design.md`.

---

## ✨ Features

- 🔍 **Zero-Config Network Auto-Discovery**: Automatically discovers TVs using native mDNS (`_tvhub._tcp.`) and an active subnet scanner fallback.
- 🎨 **Live Dock & Glassmorphism Customization**:
  - Live Dock Opacity slider (0% fully transparent to 100% solid dark).
  - Apple TV / tvOS-style frosted glass effect with specular rim highlights.
  - Ambient App Glow and Hardware Stats Monitor toggles.
  - Custom Greeting Name editor.
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

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (tested on Node v20/v26)
- Android TV(s) with the modified CleanYourTV launcher installed (see [AGENT_INSTALL.md](./AGENT_INSTALL.md) or [CleanYourTV fork](https://github.com/reyhanfahlevi/cleanyourtv)).

### Installation
```bash
# Clone the repository
git clone git@github.com:reyhanfahlevi/tvhub.git
cd tvhub

# Install dependencies
npm install

# Build client and server
npm run build

# Start the dashboard
npm start
```

Access the dashboard at `http://localhost:3000` (or `http://<YOUR_LAN_IP>:3000` from any mobile device on the same Wi-Fi).

---

## 🤖 For AI Agents & LLMs

If you want an AI coding agent (Antigravity, Claude Code, Cursor) to automate TV debloating, launcher installation, and dashboard setup, refer to:
👉 **[AGENT_INSTALL.md](./AGENT_INSTALL.md)**

---

## 📡 REST API Reference (TV Embedded Server on Port 8080)

Each TV runs an embedded HTTP server on port 8080:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Hardware telemetry (RAM, storage, model, Android version) |
| `GET` | `/api/config` | Current launcher configuration |
| `POST` | `/api/config` | Update configuration (dock opacity, glass look, greeting, etc.) |
| `GET` | `/api/wallpapers` | List active wallpapers on TV storage |
| `POST` | `/api/wallpaper` | Upload new wallpaper (multipart form or binary) |
| `DELETE` | `/api/wallpaper` | Remove a wallpaper |
| `GET` | `/api/apps` | List installed launchable Android TV apps |
| `POST` | `/api/action/launch` | Launch app by package name (`{"package": "com.netflix.ninja"}`) |
| `POST` | `/api/action/key` | Send remote key navigation (`{"key": "up\|down\|left\|right\|ok\|back\|home"}`) |

---

## 🔗 Related Projects

- **[CleanYourTV (reyhanfahlevi fork)](https://github.com/reyhanfahlevi/cleanyourtv)** — Android TV debloat scripts & lightweight launcher with embedded REST API & glassmorphic dock.
- **[CleanYourTV (Upstream)](https://github.com/Gathin23/cleanyourtv)** — Original minimal Android TV launcher by Gathin23.

---

## 📄 License
MIT License
