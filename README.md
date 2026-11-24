<p align="center">
  <a href="https://goblin-inc.github.io/SubGuard/"><img src="https://img.shields.io/badge/🚀_Live_Demo-Launch_SubGuard-10b981?style=for-the-badge&labelColor=090b10" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/Privacy-0_Bytes_Sent-34d399?style=for-the-badge&labelColor=090b10" alt="Zero Upload" />
  <img src="https://img.shields.io/badge/Dependencies-Zero-38bdf8?style=for-the-badge&labelColor=090b10" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/UI-EN_%2F_RU-f59e0b?style=for-the-badge&labelColor=090b10" alt="EN / RU" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-94a3b8?style=for-the-badge&labelColor=090b10" alt="MIT License" /></a>
</p>

<p align="center">
  <b><a href="https://goblin-inc.github.io/SubGuard/">🚀 Try Live Demo</a></b> ·
  <a href="README_Ru.md">🇷🇺 Русская версия</a> ·
  <a href="#-quick-start">Quick Start</a>
</p>

---

# SubGuard

**SubGuard** is a **100% client-side, zero-upload** subscription & money-leak X-ray that runs completely offline inside your browser.

Drop a bank statement (`CSV` / `PDF`), paste copied transactions via `Ctrl + V`, or track subscriptions manually — SubGuard detects recurring billing cycles, stealth price hikes, duplicate charges, trial traps, and habit leaks **without sending a single byte over the network**.

> **Verifiable Privacy:** SubGuard ships with a strict `Content-Security-Policy: connect-src 'none'`. Open DevTools → Network to confirm **0 outbound requests**.

---

## ✨ Key Features

- **🔒 Provable Zero-Upload & Offline PWA** — runs locally in vanilla ES modules with zero third-party CDNs or tracking; works with Wi-Fi turned off.
- **📄 Multi-Bank Client Parser (`CSV` / `PDF` / `Ctrl+V`)** — auto-detects delimiters, UTF-8 & Windows-1251 encodings, currency (`₽ / $ / €`), and columns (with manual column override).
- **🔁 Cycle & Merchant Normalization Engine** — strips bank noise (`POS`, card digits, city names) and identifies weekly, biweekly, monthly, quarterly, and yearly subscriptions.
- **🚨 Anomaly & Trap Radar:**
  - **Stealth Price Hikes** (`+20%` creep alerts comparing first vs latest charge)
  - **Duplicate Charges** (double billing within ≤3 days)
  - **Trial Traps** (micro-verification charges `≤ $2 / 15 ₽` with 1-click `.ics` calendar reminder)
- **🧮 Live Cancellation Simulator & 12-Month Forecast** — check subscriptions to drop and see yearly savings, tangible equivalents, and a 12-month burn chart update live.
- **📖 Built-in Cancel Playbook** — local JSON database of direct cancellation links and dark-pattern warnings for popular services (Adobe, Spotify, Netflix, ChatGPT, Yandex Plus, Apple/iCloud, Discord, etc.).
- **🧾 Shareable Leak Receipt (`PNG` / `SVG`)** — export a clean summary card with an optional **Hide Exact Amounts (`••••`)** privacy toggle.
- **✍️ Manual Mode (`localStorage`)** — add & persist subscriptions manually even without a bank statement.

---

## 🚀 Quick Start

### Option 1 — Live Web App
Open **[goblin-inc.github.io/SubGuard](https://goblin-inc.github.io/SubGuard/)** and click **Try Demo ($)** or **Демо-выписка (₽)** to explore in 5 seconds.

### Option 2 — Run Locally (Zero Build Step)
```bash
git clone https://github.com/Goblin-Inc/SubGuard.git
cd SubGuard
python -m http.server 8080
# Open http://localhost:8080
```

---

## 📄 License
MIT © [Goblin-Inc](https://github.com/Goblin-Inc)
