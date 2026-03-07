# Network Monitor (Production Ready) 🌐

A high-performance, privacy-focused network monitoring dashboard built with React and the Apple-inspired "Dark Mode" aesthetic. Monitor your connection, geolocation, browser capabilities, and device telemetry in real-time with stunning visual feedback.

![Network Monitor Preview](https://github.com/user-attachments/assets/preview-placeholder)

## ✨ Key Features

- **📍 Advanced Geolocation & Mapping**: High-resolution mapping using **React Leaflet** and **CARTO Basemaps**. Supports both IP-based and hardware-level GPS triangulation with real-time address reverse-coding.
- **🛰️ Persistent Trail Tracking**: Daily movement tracking with automated cloud synchronization via **MongoDB**. View your daily distance, waypoints, and labeled locations with zero data loss.

## 🌐 Network Monitor Pro

**Network Monitor Pro** is a high-performance, real-time network intelligence dashboard designed for developers and power users. It provides deep insights into your connection, geolocation, and device capabilities, combined with advanced features like live GPS trail tracking and security auditing.

![Network Monitor Demo](file:///home/subhoxsaha/.gemini/antigravity/brain/70c65d82-ba8b-46c3-a786-10d7f9a1a2e4/visual_audit_main_pages_1772889220500.webp)

## ✨ Key Features

- **📍 Advanced Geolocation**: Multi-API IP intelligence with precise GPS fallback. Includes full address reverse-geocoding.
- **🧭 Live Direction (Compass)**: Real-time orientation tracking using device sensors (Magnetometer/Gyroscope). Matches your physical direction instantly.
- **🗺️ Daily Trail Tracker**: Persistent logging of your movement throughout the day, visualized with glowing "neon" map polylines.
- **🛠️ Developer Mode**: Interactive map tools for manual waypoint placement (Right-click to drop, Left-click to confirm) and movement simulation.
- **🔒 Security Pass**: WebRTC leak detection, local IP exposure scans, and DNT status monitoring.
- **⚡ Pro Diagnostics**: High-frequency latency probing, global server pinging, and a Postman-style HTTP request builder.
- **🎭 Premium UI**: Glassmorphic design system with smooth entry animations, consistent dark mode, and a responsive layout for mobile/desktop.

## 🚀 Tech Stack

- **Frontend**: React 18, Tailwind CSS, Lucide Icons
- **Mapping**: React Leaflet, OpenStreetMap, CARTO Basemaps
- **Auth**: Google OAuth 2.0
- **Backend/DB**: MongoDB (with Mongoose), Serverless API Routes
- **State**: Zustand (Store), React Context (Auth/Network)

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB Atlas (or local instance)
- Google Cloud Console account (for Google Auth)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/network-monitor-pro.git
   cd network-monitor-pro
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file based on `.env.example`:
   ```bash
   VITE_GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
   MONGODB_URI=mongodb+srv://...
   NODE_ENV=production
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 📦 Deployment

### Vercel (Recommended)
1. Push your code to GitHub.
2. Import the project in Vercel.
3. Add your environment variables in the Vercel Dashboard.
4. Deploy!

### Build for Production
```bash
npm run build
```
The optimized bundle will be in the `dist/` folder.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
MIT License - see [LICENSE](LICENSE) for details.
Built with ❤️ for the open-source community.
