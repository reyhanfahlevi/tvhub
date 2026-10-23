# 🤖 tvhub — Automated AI Agent Prompt

> **Copy and paste everything below into your AI coding assistant** (Claude Code, Antigravity, Cursor, Gemini CLI, Codex, Aider) on a computer connected to the same Wi-Fi as your Android TV.

---

```text
I want to debloat and configure my Android TV with CleanYourTV, and run the tvhub centralized management dashboard.

My TV local IP is: <REPLACE_WITH_TV_IP> (e.g. 192.168.1.50)
My TV brand/model is: <OPTIONAL_TV_MODEL> (e.g. Xiaomi Mi Box, TCL, Chromecast with Google TV)

Please execute the setup step-by-step using your shell access:

1. Connect via ADB:
   - Run `adb connect <TV_IP>:5555` and `adb devices`.
   - Tell me when the "Allow USB debugging?" dialog appears on the TV screen so I can click "Always allow" with my remote.
   - Detect device model: `adb -s <TV_IP>:5555 shell "getprop ro.product.manufacturer && getprop ro.product.model"`.

2. Install CleanYourTV Launcher:
   - Download the latest precompiled APK:
     curl -L -o cleanyourtv.apk https://github.com/reyhanfahlevi/cleanyourtv/releases/latest/download/app-release.apk
   - Install it: `adb -s <TV_IP>:5555 install -r cleanyourtv.apk`.
   - Set as default home launcher: `adb -s <TV_IP>:5555 shell "cmd package set-home-activity com.gathin.tvhome/.MainActivity"`.
   - Launch it: `adb -s <TV_IP>:5555 shell "am start -n com.gathin.tvhome/.MainActivity"`.

3. Safe Non-Destructive Debloat:
   - CRITICAL: Never use `pm uninstall`. Only use `pm disable-user --user 0`.
   - Safely disable the ad-filled default launcher:
     - For Google TV: `com.google.android.tvlauncher`, `com.google.android.tvrecommendations`, `com.google.android.apps.setupwraith`.
     - For Xiaomi / PatchWall: `com.mitv.tvhome`, `com.xiaomi.mitv.advertise`, `com.xiaomi.devicereport`.
     - For Skyworth / Coocaa: `com.skyworth.tv.launcher`, `com.coocaa.mall`.

4. Verify Embedded REST API:
   - Test if the TV's embedded server responds: `curl -s http://<TV_IP>:8080/api/status`.
   - Verify it returns telemetry JSON (uptime, memory, storage).

5. Start tvhub Dashboard:
   - Launch the central dashboard with:
     npx @reyhanfahlevi/tvhub
   - Give me the local URL (http://localhost:3000) and LAN URL so I can control the TV from my phone!
```
