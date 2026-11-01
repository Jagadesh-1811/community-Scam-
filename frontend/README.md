# ScamRadar Frontend — Citizen Defense Web & PWA Portal

[![Next.js 16.4.3](https://img.shields.io/badge/Next.js-16.4.3-0A0A0A?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Turbopack](https://img.shields.io/badge/Bundler-Turbopack-blueviolet?style=for-the-badge)](https://nextjs.org/docs/architecture/turbopack)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-23E000?style=for-the-badge&logo=pwa&logoColor=black)](public/manifest.json)
[![Accessibility](https://img.shields.io/badge/i18n-Multilingual%20Intake-blue?style=for-the-badge)](src/components/ReportModal.js)

The citizen-facing frontend for **ScamRadar India** — a lightweight, privacy-preserving Progressive Web App (PWA) designed to report, verify, and track scam campaigns in under 60 seconds.

---

## 1. Key Features & User Experience

### 1. 60-Second Scam Intake (`ReportModal.js`)
* Multi-modal intake supporting typed text, quick one-tap scam categories, or continuous voice recording.
* Auto-transliteration for Indian languages (Hindi, Telugu, Tamil, Kannada, English) via Google Input Tools API route (`/api/transliterate`).
* **Strict Privacy Guard**: Captures only the locality (e.g., `HSR Layout`) and pincode (`560102`). Never asks for or stores exact GPS coordinates, names, or contact numbers.
* Automatically generates a local device hash to prevent accidental rate-limit collision across shared Wi-Fi networks.

### 2. Instant Threat Lookup Modal (`LookupModal.js`)
* Sub-0.5s search for telephone numbers, UPI IDs, URLs, and SMS headers.
* Real-time verification badge:
  * `KNOWN_SCAM` (Red badge with corroborated community evidence)
  * `SUSPICIOUS` (Yellow badge with caution warnings)
  * `VERIFIED_BUSINESS` (Green badge for official banks and 1930/1909 helplines)
  * `NO_REPORTS` (Neutral badge with proactive prevention checklist)
* **Pre-Trial Privacy Masking**: Unconfirmed numbers show as `98XXXXX210` until 3 distinct people report them.

### 3. Interactive Geospatial Radar Map (`ScamMap.js` & `/map`)
* Rendered using high-performance vector tiles.
* Visualizes 25 pre-calibrated Indian metropolitan security zones.
* Dynamic clustering by area radius ($2\text{ km}$ window).
* Strict 7-day cutoff window to keep threat data actionable and fresh.

### 4. Grievance Officer Portal (`/admin`)
* Dedicated portal for grievance officers to review merchant challenges and disputed numbers.
* GSTIN certificate confirmation and one-click dispute resolution.

### 5. Progressive Web App (PWA) & Offline Resilience
* Service worker caching in `public/sw.js`.
* Offline emergency protocol: Citizen reports submitted while disconnected are queued locally in `localStorage` and automatically synced to the server once connection is restored.
* Web App Manifest configured for installability on Android and iOS home screens.

---

## 2. Directory Structure

```text
frontend/
├── public/
│   ├── icons/                  # PWA and favicon icons
│   ├── manifest.json           # Web App Manifest
│   └── sw.js                   # Service Worker (offline caching & queue)
├── src/
│   ├── app/
│   │   ├── admin/page.js       # Grievance Officer dispute dashboard
│   │   ├── api/transliterate/  # Indian language transliteration endpoint
│   │   ├── layout.js           # Root layout with PWA manager & headers
│   │   ├── globals.css         # Cyber-defense dark theme CSS variables
│   │   └── page.js             # Main landing portal and live radar view
│   ├── components/
│   │   ├── LookupModal.js      # Sub-0.5s identifier search dialog
│   │   ├── ReportModal.js      # Multilingual 60-second scam intake
│   │   ├── ScamMap.js          # Vector cluster map visualization
│   │   ├── DisputeModal.js     # Merchant dispute form
│   │   └── AdminQueueModal.js  # Officer challenge review interface
│   └── data/
│       └── knownAreas.js       # 25 Appendix B metropolitan area centers
├── next.config.ts              # Next.js configuration
├── package.json                # Dependencies and build scripts
└── tailwind.config.js          # Tailwind CSS styling configuration
```

---

## 3. Getting Started

### Prerequisites
* Node.js 18.0.0 or higher
* npm 9.0.0 or higher

### Environment Configuration
Create a `.env.local` file in the `frontend/` directory (or use default fallback):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build & Verification
```bash
npm run build
npm run start
```
* Compiles static assets in under 3 seconds with Turbopack.
* Zero build warnings or runtime bundle errors.

---

## 4. Brand Color Palette

| Token | Hex Value | Purpose |
|---|---|---|
| **Background / Canvas** | `#0A0A0A` | Deep contrast cyber-defense dark background |
| **Foreground / Text** | `#F7F7F2` | Ivory off-white for crisp readability |
| **Radar Accent (Safe)** | `#23E000` | Radar green for verified businesses and operational health |
| **Alert Accent (Threat)** | `#E5201B` | High-visibility red for active scam spikes and critical threats |
| **Border / Surface** | `#262626` | Subtle separator for cards, modals, and input fields |
