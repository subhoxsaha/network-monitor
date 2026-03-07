# Network Monitor 🌐

A modern, high-performance React application for monitoring and analyzing your network connection, geolocation, browser capabilities, and device telemetry in real-time.

## Features ✨

- **High-Precision Geolocation & ISP Data:** Instantly detects IP, ISP, ASN, and triangulates exact physical location down to the street level using Carto Voyager High-Res maps and the native GeoLocation hardware API.
- **Latency & Ping Probing:** Real-time visual latency chart against major backbone servers (Google, Cloudflare, AWS, etc.).
- **Advanced HTTP Request Tester:** Built-in Postman-style interface to craft custom GET/POST/PUT/DELETE requests with headers and payload injection. Fully supports JSON syntax highlighting for responses.
- **Device & WebRTC Leak Detection:** Actively scans for exposed local IPs, tracks device hardware specs, and displays capabilities.
- **Port Directory Reference:** A sleek, searchable table of well-known networking ports.
- **Browser Capabilities Matrix:** Probes and verifies 15+ HTML5/Browser APIs instantly (WebBluetooth, Notifs, ServiceWorkers, etc.).
- **Live Network Speed:** Visualizes estimated active download throughput. 
- **Dark Mode Aesthetic:** Built with a stunning, Apple-inspired dark mode aesthetic using Tailwind CSS and dynamic Canvas particles.

## Tech Stack 🛠

- **React 18** (Vite)
- **Tailwind CSS** (for styling & responsiveness)
- **Zustand** (for global state management)
- **React Leaflet** (Mapping)
- **Lucide React** (SVG Iconography)
- **Recharts** (Latency Graphs)

## Setup & Installation 🚀

```bash
# Clone the repository
git clone <your-repo-url>
cd network-monitor-react

# Install dependencies
npm install

# Start the development server
npm run dev
```

For mobile device testing (to allow precise GPS API prompts), start the server with the secure SSL flag to bypass browser HTTP restrictions:
```bash
npm run dev -- --host
```

## License 📄
MIT License
