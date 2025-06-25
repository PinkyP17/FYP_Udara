"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import PingModal from "@/components/PingModal";
import ConfigureModal from "@/components/ConfigureModal";
import {
  Wind,
  Calendar,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Settings,
  Bell,
  Menu,
  Search,
  Wifi,
  Download,
  Home,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import AirQualityMap from "@/components/air-quality-map";

interface Device {
  id: string;
  name: string;
  deviceId: string;
  status: "online" | "offline";
  location: string;
  building: string;
  floor: string;
  lastUpdated: string;
  lat: number;
  lng: number;
  installationDate: string;
  lastMaintenance: string;
  firmwareVersion: string;
  readings: {
    aqi: number;
    pm25: number;
    temperature: number;
    humidity: number;
  };
}

const devices: Device[] = [
  {
    id: "1",
    name: "Air Quality Monitor 1",
    deviceId: "AQM-001",
    status: "online",
    location: "Building A - Floor 1",
    building: "Building A",
    floor: "Floor 1",
    lastUpdated: "2 mins ago",
    lat: 3.1319,
    lng: 101.6569,
    installationDate: "2023-01-15",
    lastMaintenance: "2023-10-20",
    firmwareVersion: "v2.10",
    readings: {
      aqi: 45,
      pm25: 12,
      temperature: 23,
      humidity: 65,
    },
  },
  {
    id: "2",
    name: "Air Quality Monitor 2",
    deviceId: "AQM-002",
    status: "offline",
    location: "Building B - Floor 2",
    building: "Building B",
    floor: "Floor 2",
    lastUpdated: "15 mins ago",
    lat: 3.1073,
    lng: 101.6067,
    installationDate: "2023-02-10",
    lastMaintenance: "2023-09-15",
    firmwareVersion: "v2.08",
    readings: {
      aqi: 0,
      pm25: 0,
      temperature: 0,
      humidity: 0,
    },
  },
  {
    id: "3",
    name: "Air Quality Monitor 3",
    deviceId: "AQM-003",
    status: "online",
    location: "Building A - Floor 3",
    building: "Building A",
    floor: "Floor 3",
    lastUpdated: "just now",
    lat: 3.1478,
    lng: 101.6953,
    installationDate: "2023-03-05",
    lastMaintenance: "2023-11-10",
    firmwareVersion: "v2.10",
    readings: {
      aqi: 38,
      pm25: 15,
      temperature: 24,
      humidity: 62,
    },
  },
];

// 24-hour trend data
const trendData = [
  { time: "00:00", aqi: 42, pm25: 14, temperature: 22, humidity: 68 },
  { time: "04:00", aqi: 38, pm25: 12, temperature: 21, humidity: 70 },
  { time: "08:00", aqi: 52, pm25: 18, temperature: 23, humidity: 65 },
  { time: "12:00", aqi: 48, pm25: 16, temperature: 26, humidity: 58 },
  { time: "16:00", aqi: 45, pm25: 15, temperature: 25, humidity: 60 },
  { time: "20:00", aqi: 40, pm25: 13, temperature: 24, humidity: 63 },
  { time: "24:00", aqi: 38, pm25: 12, temperature: 23, humidity: 65 },
];

const chartConfig = {
  aqi: { label: "AQI", color: "#ef4444" },
  pm25: { label: "PM2.5", color: "#06b6d4" },
  temperature: { label: "Temperature", color: "#f59e0b" },
  humidity: { label: "Humidity", color: "#10b981" },
};

export default function IoTMonitoringPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device>(devices[0]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals State
  const [pingModalOpen, setPingModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const { user } = useUser();

  const filteredDevices = devices.filter(
    (device) =>
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.deviceId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Convert device to location format for map
  const mapLocations = devices.map((device) => ({
    id: Number.parseInt(device.id),
    name: device.location,
    lat: device.lat,
    lng: device.lng,
    aqi: device.readings.aqi,
    status: device.status === "online" ? "good" : "offline",
  }));

  const selectedMapLocation = {
    id: Number.parseInt(selectedDevice.id),
    name: selectedDevice.location,
    lat: selectedDevice.lat,
    lng: selectedDevice.lng,
    aqi: selectedDevice.readings.aqi,
    status: selectedDevice.status === "online" ? "good" : "offline",
  };

  const handlePingDevice = () => {
    console.log("Ping button clicked!");
    console.log("Selected device:", selectedDevice);
    console.log("Current pingModalOpen state:", pingModalOpen);
    setPingModalOpen(true);
    console.log("Setting pingModalOpen to true");
  };

  const handleDownloadReport = () => {
    // Create CSV report
    const reportData = [
      ["Device Report"],
      ["Generated on:", new Date().toLocaleString()],
      [""],
      ["Device Information"],
      ["Name:", selectedDevice.name],
      ["Device ID:", selectedDevice.deviceId],
      ["Status:", selectedDevice.status],
      ["Location:", selectedDevice.location],
      ["Last Updated:", selectedDevice.lastUpdated],
      [""],
      ["Current Readings"],
      ["Air Quality Index:", selectedDevice.readings.aqi],
      ["PM2.5:", selectedDevice.readings.pm25],
      ["Temperature:", selectedDevice.readings.temperature + "°C"],
      ["Humidity:", selectedDevice.readings.humidity + "%"],
      [""],
      ["Device Details"],
      ["Installation Date:", selectedDevice.installationDate],
      ["Last Maintenance:", selectedDevice.lastMaintenance],
      ["Firmware Version:", selectedDevice.firmwareVersion],
    ];

    const csvContent = reportData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDevice.deviceId}_report_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleConfigure = () => {
  console.log("Configure button clicked!");
  console.log("Selected device:", selectedDevice);
  console.log("Current configModalOpen state:", configModalOpen);
  setConfigModalOpen(true);
  console.log("Setting configModalOpen to true");
};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Wind className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Udara</h1>
                <p className="text-sm text-gray-500">
                  Welcome back, {user?.firstName || "User"}!
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right text-sm text-gray-500">
              <div>{new Date().toLocaleDateString()}</div>
              <div>{new Date().toLocaleTimeString()}</div>
            </div>
            <Button variant="ghost" size="sm">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-5 w-5" />
            </Button>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
              afterSignOutUrl="/"
            />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out`}
        >
          <nav className="mt-8 px-4">
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/dashboard">
                  <Wind className="mr-3 h-5 w-5" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/dashboard/historical">
                  <Calendar className="mr-3 h-5 w-5" />
                  Historical Air Quality Data
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/dashboard/pollutant-analysis">
                  <TrendingUp className="mr-3 h-5 w-5" />
                  Pollutant Data Analysis
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/dashboard/data-verification">
                  <AlertTriangle className="mr-3 h-5 w-5" />
                  Air Quality Data Verification
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start bg-blue-50 text-blue-700"
              >
                <MapPin className="mr-3 h-5 w-5" />
                IoT Device Monitoring
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/dashboard/logs">
                  <Settings className="mr-3 h-5 w-5" />
                  Log Monitoring
                </Link>
              </Button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-white">
          <div className="flex h-screen">
            {/* Device List Sidebar */}
            <div className="w-80 border-r border-gray-200 flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                {/* Breadcrumb */}
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                  <Home className="h-4 w-4" />
                  <ChevronRight className="h-4 w-4" />
                  <Link href="/dashboard" className="hover:text-gray-900">
                    Dashboard
                  </Link>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-gray-900">Device Monitoring</span>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  IoT Device Monitoring
                </h1>

                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-3">
                    Devices
                  </h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search devices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Device List */}
              <div className="flex-1 overflow-y-auto">
                {filteredDevices.map((device) => (
                  <div
                    key={device.id}
                    onClick={() => setSelectedDevice(device)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedDevice.id === device.id
                        ? "bg-blue-50 border-l-4 border-l-blue-500"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {device.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {device.deviceId}
                        </p>
                      </div>
                      <Badge
                        variant={
                          device.status === "online" ? "default" : "secondary"
                        }
                        className={
                          device.status === "online"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }
                      >
                        {device.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-gray-500 mb-1">
                      <MapPin className="h-3 w-3" />
                      <span>{device.location}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Last updated: {device.lastUpdated}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Details */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedDevice && (
                <>
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedDevice.name}
                        </h2>
                        <p className="text-sm text-gray-600">
                          Device ID: {selectedDevice.deviceId}
                        </p>
                      </div>
                      <Badge
                        variant={
                          selectedDevice.status === "online"
                            ? "default"
                            : "secondary"
                        }
                        className={
                          selectedDevice.status === "online"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }
                      >
                        {selectedDevice.status === "online"
                          ? "Online"
                          : "Offline"}
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                      {/* Location and Device Info */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Location Map */}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-3">
                            Location
                          </h3>
                          <div className="h-64 rounded-lg overflow-hidden border">
                            <AirQualityMap
                              locations={mapLocations}
                              selectedLocation={selectedMapLocation}
                              onLocationSelect={() => {}}
                            />
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            {selectedDevice.location}
                          </p>
                        </div>

                        {/* Device Information */}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-3">
                            Device Information
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Installation Date
                              </span>
                              <span className="font-medium">
                                {selectedDevice.installationDate}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Last Maintenance
                              </span>
                              <span className="font-medium">
                                {selectedDevice.lastMaintenance}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Firmware Version
                              </span>
                              <span className="font-medium">
                                {selectedDevice.firmwareVersion}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Current Readings */}
                      <div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <Card>
                            <CardContent className="pt-4">
                              <div className="text-sm text-gray-600 mb-1">
                                Air Quality Index
                              </div>
                              <div className="text-2xl font-bold mb-2">
                                {selectedDevice.readings.aqi}
                              </div>
                              <Progress
                                value={
                                  (selectedDevice.readings.aqi / 100) * 100
                                }
                                className="h-2"
                              />
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-4">
                              <div className="text-sm text-gray-600 mb-1">
                                PM2.5
                              </div>
                              <div className="text-2xl font-bold mb-2">
                                {selectedDevice.readings.pm25}
                              </div>
                              <Progress
                                value={
                                  (selectedDevice.readings.pm25 / 50) * 100
                                }
                                className="h-2"
                              />
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-4">
                              <div className="text-sm text-gray-600 mb-1">
                                Temperature
                              </div>
                              <div className="text-2xl font-bold mb-2">
                                {selectedDevice.readings.temperature}°C
                              </div>
                              <Progress
                                value={
                                  (selectedDevice.readings.temperature / 40) *
                                  100
                                }
                                className="h-2"
                              />
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-4">
                              <div className="text-sm text-gray-600 mb-1">
                                Humidity
                              </div>
                              <div className="text-2xl font-bold mb-2">
                                {selectedDevice.readings.humidity}%
                              </div>
                              <Progress
                                value={selectedDevice.readings.humidity}
                                className="h-2"
                              />
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-3">
                        <Button
                          variant="outline"
                          className="flex items-center space-x-2"
                          onClick={handlePingDevice}
                        >
                          <Wifi className="h-4 w-4" />
                          <span>Ping Device</span>
                        </Button>

                        <Button
                          variant="outline"
                          className="flex items-center space-x-2"
                          onClick={handleDownloadReport}
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Report</span>
                        </Button>

                        <Button
                          variant="outline"
                          className="flex items-center space-x-2"
                          onClick={handleConfigure}
                        >
                          <Settings className="h-4 w-4" />
                          <span>Configure</span>
                        </Button>
                      </div>

                      {/* 24 Hour Trends */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          24 Hour Trends
                        </h3>
                        <div className="h-80">
                          <ChartContainer
                            config={chartConfig}
                            className="h-full"
                          >
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={trendData}
                                margin={{
                                  top: 20,
                                  right: 30,
                                  left: 20,
                                  bottom: 20,
                                }}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="#f0f0f0"
                                />
                                <XAxis
                                  dataKey="time"
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fontSize: 12, fill: "#666" }}
                                />
                                <YAxis
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fontSize: 12, fill: "#666" }}
                                  domain={[0, 60]}
                                />
                                <ChartTooltip
                                  content={<ChartTooltipContent />}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="aqi"
                                  stroke="#ef4444"
                                  strokeWidth={2}
                                  dot={{
                                    fill: "#ef4444",
                                    strokeWidth: 2,
                                    r: 4,
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="pm25"
                                  stroke="#06b6d4"
                                  strokeWidth={2}
                                  dot={{
                                    fill: "#06b6d4",
                                    strokeWidth: 2,
                                    r: 4,
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="temperature"
                                  stroke="#f59e0b"
                                  strokeWidth={2}
                                  dot={{
                                    fill: "#f59e0b",
                                    strokeWidth: 2,
                                    r: 4,
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="humidity"
                                  stroke="#10b981"
                                  strokeWidth={2}
                                  dot={{
                                    fill: "#10b981",
                                    strokeWidth: 2,
                                    r: 4,
                                  }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Modals */}
            <PingModal
              isOpen={pingModalOpen}
              onClose={() => setPingModalOpen(false)}
              device={selectedDevice}
            />

            <ConfigureModal
              isOpen={configModalOpen}
              onClose={() => setConfigModalOpen(false)}
              device={selectedDevice}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
