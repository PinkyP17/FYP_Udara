# 🌬️ Udara - Air Quality Monitoring System (FYP)

**Udara** is a comprehensive full-stack solution designed to monitor, analyze, and visualize air quality data. Built as a Final Year Project (FYP), this system integrates real-time IoT data streams, historical analysis, and interactive mapping to provide actionable insights into environmental conditions.

## 🚀 Features

*   **Real-time Dashboard:** Live monitoring of key air quality indices and sensor readings.
*   **IoT Integration:** Seamless connection with IoT devices for continuous data collection.
*   **Pollutant Analysis:** Detailed breakdown of specific pollutants (PM2.5, PM10, CO2, etc.).
*   **Historical Data:** Long-term data storage and visualization for trend analysis.
*   **Interactive Maps:** Geographic visualization of sensor locations and air quality hotspots using Mapbox.
*   **Data Management:** CSV upload capabilities for manual data entry and verification.
*   **Reporting:** Generate downloadable PDF reports of air quality status.
*   **User Management:** Secure authentication and user management powered by Clerk.

## 🛠️ Tech Stack

### Frontend (`/air-quality-dashboard`)
*   **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
*   **UI Library:** [React 19](https://react.dev/), [Radix UI](https://www.radix-ui.com/)
*   **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
*   **Charts:** [Recharts](https://recharts.org/)
*   **Maps:** [Mapbox GL JS](https://www.mapbox.com/)
*   **Auth:** [Clerk](https://clerk.com/)

### Backend (`/backend`)
*   **Runtime:** [Node.js](https://nodejs.org/)
*   **Framework:** [Express.js 5](https://expressjs.com/)
*   **Database:** [MongoDB](https://www.mongodb.com/) (via Mongoose)
*   **File Handling:** Multer & CSV Parser

## 📂 Project Structure

```bash
FYP_Udara/
├── air-quality-dashboard/  # Next.js Frontend Application
│   ├── src/app/            # App Router pages (Dashboard, Maps, Logs)
│   ├── src/components/     # Reusable UI components
│   └── ...
├── backend/                # Express.js API Server
│   ├── model/              # Mongoose Data Models
│   ├── routes/             # API Endpoints
│   └── ...
└── README.md               # Project Documentation
```

## 🏁 Getting Started

To run this project locally, you will need **Node.js** and a **MongoDB** instance (local or Atlas) installed.

### 1. Backend Setup

Navigate to the backend directory, install dependencies, and start the server:

```bash
cd backend
npm install
npm run dev
```
*The backend server typically runs on port `4000` (check `api/index.js` or env).*

### 2. Frontend Setup

Open a new terminal, navigate to the frontend directory, and start the Next.js app:

```bash
cd air-quality-dashboard
npm install
npm run dev
```
*The frontend will be available at `http://localhost:3000`.*

## 🔑 Environment Variables

You will need to configure environment variables for both applications. Create a `.env` file in each directory.

**Frontend (`air-quality-dashboard/.env.local`):**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

**Backend (`backend/.env`):**
```env
PORT=4000
MONGODB_URI=your_mongodb_connection_string
CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
```

## 📄 License

This project is created for educational purposes as part of a Final Year Project.
