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
  MapPin,
  Settings,
  Bell,
  Menu,
  Search,
  Wifi,
  Download,
  Home,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
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
  status: "online" | "offline" | "maintenance";
  location: string;
  building: string;
  floor: string;
  lastUpdated: string;
  lat: number;
  lng: number;
  installationDate: string;
  lastMaintenance: string;
  firmwareVersion: string;
  model: string;
  description: string;
  lastCalibration: string;
  measurementInterval: string;
  readings: {
    aqi: number;
    pm25: number;
    temperature: number;
    humidity: number;
  };
}

const chartConfig = {
  pm1_0: { label: "PM1.0", color: "#3b82f6" },
  aqi: { label: "AQI", color: "#ef4444" },
  pm25: { label: "PM2.5", color: "#06b6d4" },
  pm10: { label: "PM10", color: "#0ea5e9" },
  temperature: { label: "Temperature", color: "#f59e0b" },
  humidity: { label: "Humidity", color: "#10b981" },
  co: { label: "CO", color: "#6b7280" },
  no2: { label: "NO2", color: "#f97316" },
  o3: { label: "O3", color: "#8b5cf6" },
  so2: { label: "SO2", color: "#0d9488" },
};

export default function IoTMonitoringPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deviceMetrics, setDeviceMetrics] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [showConfigureModal, setShowConfigureModal] = useState(false);
  
  const { user } = useUser();
  const API_BASE_URL = "http://localhost:4000/api";

  const fetchDevices = async () => {
    try {
      setLoading(true);
      // Parallel fetch: Dashboard (live status/AQI) AND Devices (metadata)
      const [dashboardRes, devicesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/sensor/dashboard`),
        fetch(`${API_BASE_URL}/devices`)
      ]);

      if (!dashboardRes.ok || !devicesRes.ok) throw new Error("Failed to fetch device data");
      
      const dashboardData = await dashboardRes.json();
      const devicesData = await devicesRes.json();
      const deviceList = Array.isArray(devicesData) ? devicesData : devicesData.devices || [];

      // Create a map of dashboard data for quick lookup
      const dashboardMap = {};
      dashboardData.forEach(d => {
        dashboardMap[d.deviceId] = d;
      });
      
      // Transform API data to match UI component needs
      const formattedDevices = deviceList.map((d: any) => {
        const liveInfo = dashboardMap[d.deviceId] || {};

        // 1. Status Mapping (Normalize to online/offline/maintenance for UI)
        let statusStr: "online" | "offline" | "maintenance" = "offline";
        // Prefer live dashboard status
        const rawStatus = liveInfo.status || d.status;
        
        if (typeof rawStatus === 'string') {
          const lowerStatus = rawStatus.toLowerCase();
          if (lowerStatus === 'active' || lowerStatus === 'online') statusStr = 'online';
          else if (lowerStatus === 'maintenance') statusStr = 'maintenance';
        } else if (typeof rawStatus === 'object' && rawStatus !== null) {
          if (rawStatus.connection === 'online' || rawStatus.operational === 'active') statusStr = 'online';
          else if (rawStatus.operational === 'maintenance') statusStr = 'maintenance';
        }

        // 2. Metadata Fallbacks (Old vs New Schema)
        const installationDate = d.hardware?.installationDate || d.deviceInfo?.installationDate || d.createdAt;
        const lastMaintenance = d.hardware?.lastMaintenance || d.deviceInfo?.lastMaintenance || d.updatedAt;
        const firmwareVersion = d.system?.firmware?.version || d.deviceInfo?.firmware || "v1.0";
        const model = d.hardware?.model || d.deviceInfo?.model || "Unknown Model";
        const description = d.description || d.deviceInfo?.notes || d.metadata?.notes || d.notes || "No description available";
        const lastCalibration = d.deviceInfo?.calibrationDate || d.sensors?.environmental?.lastCalibration || d.sensors?.particulate?.lastCalibration || null;
        const measurementInterval = d.settings?.measurementInterval ? `${d.settings.measurementInterval}s` : "N/A";
        
        // 3. Last Updated Time (Prefer live info)
        const lastActiveDate = liveInfo.lastUpdate || d.lastActive || d.status?.lastDataReceived || d.status?.lastSeen || d.updatedAt;

        return {
          id: d._id,
          name: d.name,
          deviceId: d.deviceId,
          status: statusStr,
          location: d.location?.address || "Unknown Location",
          lat: liveInfo.lat || d.location?.coordinates?.latitude || 0,
          lng: liveInfo.lng || d.location?.coordinates?.longitude || 0,
          lastUpdated: lastActiveDate ? new Date(lastActiveDate).toLocaleString() : "Never",
          installationDate: installationDate ? new Date(installationDate).toLocaleDateString() : "N/A",
          lastMaintenance: lastMaintenance ? new Date(lastMaintenance).toLocaleDateString() : "N/A",
          firmwareVersion: firmwareVersion,
          model: model,
          description: description,
          lastCalibration: lastCalibration ? new Date(lastCalibration).toLocaleDateString() : "N/A",
          measurementInterval: measurementInterval,
          readings: { 
            // Use live AQI from dashboard endpoint
            aqi: liveInfo.aqi?.value || 0,
            pm25: liveInfo.pm2_5 || 0,
            temperature: liveInfo.temperature || 0,
            humidity: liveInfo.humidity || 0
          }
        };
      });

      setDevices(formattedDevices);
      // Preserve selection if possible, otherwise default to first
      if (selectedDevice) {
        const updatedSelected = formattedDevices.find(d => d.id === selectedDevice.id);
        if (updatedSelected) setSelectedDevice(updatedSelected);
      } else if (formattedDevices.length > 0) {
        setSelectedDevice(formattedDevices[0]);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch devices on mount
  useEffect(() => {
    fetchDevices();
  }, []);

  // Fetch metrics and trends when selected device changes
  useEffect(() => {
    if (!selectedDevice) return;

    const fetchDeviceData = async () => {
      try {
        setMetricsLoading(true);
        // Reset old data so user doesn't see stale readings
        setDeviceMetrics(null);
        setTrendData([]);
        
        // Parallel fetch for metrics and trends
        const [metricsRes, trendsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/sensor/${selectedDevice.deviceId}/current-metrics`),
          fetch(`${API_BASE_URL}/sensor/${selectedDevice.deviceId}/trends?hours=24`)
        ]);

        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setDeviceMetrics(metricsData.metrics);
        } else {
          // If no data found, set to an empty state instead of null to stop spinner
          setDeviceMetrics({});
        }

        if (trendsRes.ok) {
          const trendsData = await trendsRes.json();
          // Transform trend data for chart
          const formattedTrends = (trendsData.data || []).map((point: any) => ({
            time: new Date(point.timestamp).getHours() + ":00",
            pm1_0: point.pm1_0 || 0,
            pm25: point.pm2_5 || 0,
            pm10: point.pm10 || 0,
            temperature: point.temperature_c || 0,
            humidity: point.humidity_pct || 0,
            co: point.co || 0,
            no2: point.no2 || 0,
            o3: point.o3 || 0,
            so2: point.so2 || 0
          }));
          setTrendData(formattedTrends);
        }

      } catch (error) {
        console.error("Error fetching device details:", error);
        setDeviceMetrics({}); // Stop spinner on error
      } finally {
        setMetricsLoading(false);
      }
    };

    fetchDeviceData();
  }, [selectedDevice?.deviceId]);

  const filteredDevices = devices.filter(
    (device) =>
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.deviceId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Map locations based on real data
  const mapLocations = devices.map((device) => ({
    id: device.id,
    name: device.location,
    lat: device.lat,
    lng: device.lng,
    aqi: 0, // We could fetch this for all, but for now 0 is safe
    status: device.status === "active" ? "good" : "offline",
  }));

  const selectedMapLocation = selectedDevice ? {
    id: selectedDevice.id,
    name: selectedDevice.location,
    lat: selectedDevice.lat,
    lng: selectedDevice.lng,
    aqi: deviceMetrics?.aqi?.value || 0,
    status: selectedDevice.status === "online" ? "good" : "offline",
  } : null;

  const handleDownloadReport = () => {
    if (!selectedDevice || !deviceMetrics) return;

    // Create CSV report with real data
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
      ["PM1.0:", `${deviceMetrics.pm1_0?.value} ${deviceMetrics.pm1_0?.unit}`],
      ["PM2.5:", `${deviceMetrics.pm25?.value} ${deviceMetrics.pm25?.unit}`],
      ["PM10:", `${deviceMetrics.pm10?.value} ${deviceMetrics.pm10?.unit}`],
      ["Temperature:", `${deviceMetrics.temperature?.value} ${deviceMetrics.temperature?.unit}`],
      ["Humidity:", `${deviceMetrics.humidity?.value} ${deviceMetrics.humidity?.unit}`],
      ["Pressure:", `${deviceMetrics.pressure?.value} ${deviceMetrics.pressure?.unit}`],
      ["CO:", `${deviceMetrics.co?.value} ${deviceMetrics.co?.unit}`],
      ["NO2:", `${deviceMetrics.no2?.value} ${deviceMetrics.no2?.unit}`],
      ["O3:", `${deviceMetrics.o3?.value} ${deviceMetrics.o3?.unit}`],
      ["SO2:", `${deviceMetrics.so2?.value} ${deviceMetrics.so2?.unit}`],
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
                {loading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : filteredDevices.length === 0 ? (
                   <div className="p-6 text-center text-gray-500">No devices found.</div>
                ) : (
                  filteredDevices.map((device) => (
                    <div
                      key={device.id}
                      onClick={() => setSelectedDevice(device)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedDevice?.id === device.id
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
                            device.status === "online" 
                              ? "default" 
                              : device.status === "maintenance" 
                                ? "outline" // Use outline or specific class for maintenance
                                : "secondary"
                          }
                          className={
                            device.status === "online"
                              ? "bg-green-100 text-green-800 border-transparent"
                              : device.status === "maintenance"
                                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                : "bg-gray-100 text-gray-600 border-transparent"
                          }
                        >
                          {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
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
                  ))
                )}
              </div>
            </div>

            {/* Device Details */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedDevice ? (
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
                        {selectedDevice.description && (
                          <p className="text-xs text-gray-500 mt-1 max-w-md">
                            {selectedDevice.description}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          selectedDevice.status === "online"
                            ? "default"
                            : selectedDevice.status === "maintenance"
                              ? "outline"
                              : "secondary"
                        }
                        className={
                          selectedDevice.status === "online"
                            ? "bg-green-100 text-green-800 border-transparent"
                            : selectedDevice.status === "maintenance"
                              ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                              : "bg-gray-100 text-gray-600 border-transparent"
                        }
                      >
                        {selectedDevice.status.charAt(0).toUpperCase() + selectedDevice.status.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto">
                    {metricsLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
                        <span className="ml-3 text-gray-500">Loading device data...</span>
                      </div>
                    ) : (
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
                                <span className="text-gray-600">Model</span>
                                <span className="font-medium">{selectedDevice.model}</span>
                              </div>
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
                                  Last Calibration
                                </span>
                                <span className="font-medium">
                                  {selectedDevice.lastCalibration}
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
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Measurement Interval
                                </span>
                                <span className="font-medium">
                                  {selectedDevice.measurementInterval}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Latitude
                                </span>
                                <span className="font-medium">
                                  {selectedDevice.lat?.toFixed(6) || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Longitude
                                </span>
                                <span className="font-medium">
                                  {selectedDevice.lng?.toFixed(6) || "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Current Readings */}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-3">
                            Current Readings
                          </h3>
                          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            {/* PM1.0 */}
                            <Card>
                              <CardContent className="pt-4 px-3">
                                <div className="text-xs text-gray-500 mb-1">PM1.0</div>
                                <div className="text-xl font-bold">{deviceMetrics?.pm1_0?.value?.toFixed(1) || 0}</div>
                                <div className="text-[10px] text-gray-400">{deviceMetrics?.pm1_0?.unit}</div>
                              </CardContent>
                            </Card>
                            {/* PM2.5 */}
                            <Card>
                              <CardContent className="pt-4 px-3">
                                <div className="text-xs text-gray-500 mb-1">PM2.5</div>
                                <div className="text-xl font-bold">{deviceMetrics?.pm25?.value?.toFixed(1) || 0}</div>
                                <div className="text-[10px] text-gray-400">{deviceMetrics?.pm25?.unit}</div>
                              </CardContent>
                            </Card>
                            {/* PM10 */}
                            <Card>
                              <CardContent className="pt-4 px-3">
                                <div className="text-xs text-gray-500 mb-1">PM10</div>
                                <div className="text-xl font-bold">{deviceMetrics?.pm10?.value?.toFixed(1) || 0}</div>
                                <div className="text-[10px] text-gray-400">{deviceMetrics?.pm10?.unit}</div>
                              </CardContent>
                            </Card>
                            {/* Temp */}
                            <Card>
                              <CardContent className="pt-4 px-3">
                                <div className="text-xs text-gray-500 mb-1">Temp</div>
                                <div className="text-xl font-bold">{deviceMetrics?.temperature?.value?.toFixed(1) || 0}°C</div>
                              </CardContent>
                            </Card>
                            {/* Humidity */}
                            <Card>
                              <CardContent className="pt-4 px-3">
                                <div className="text-xs text-gray-500 mb-1">Humidity</div>
                                <div className="text-xl font-bold">{deviceMetrics?.humidity?.value?.toFixed(1) || 0}%</div>
                              </CardContent>
                            </Card>
                            
                            {/* CO */}
                            <Card>
                              <CardContent className="pt-4 px-3">
                                <div className="text-xs text-gray-500 mb-1">CO</div>
                                <div className="text-xl font-bold">{deviceMetrics?.co?.value?.toFixed(2) || 0}</div>
                                <div className="text-[10px] text-gray-400">{deviceMetrics?.co?.unit}</div>
                              </CardContent>
                            </Card>
                            {/* NO2 */}
                            <Card>
                              <CardContent className="pt-4 px-3">
                                <div className="text-xs text-gray-500 mb-1">NO2</div>
                                <div className="text-xl font-bold">{deviceMetrics?.no2?.value?.toFixed(1) || 0}</div>
                                <div className="text-[10px] text-gray-400">{deviceMetrics?.no2?.unit}</div>
                              </CardContent>
                            </Card>
                            {/* O3 */}
                            <Card>
                              <CardContent className="pt-4 px-3">
                                <div className="text-xs text-gray-500 mb-1">O3</div>
                                <div className="text-xl font-bold">{deviceMetrics?.o3?.value?.toFixed(1) || 0}</div>
                                <div className="text-[10px] text-gray-400">{deviceMetrics?.o3?.unit}</div>
                              </CardContent>
                            </Card>
                            {/* SO2 */}
                            <Card>
                              <CardContent className="pt-4 px-3">
                                <div className="text-xs text-gray-500 mb-1">SO2</div>
                                <div className="text-xl font-bold">{deviceMetrics?.so2?.value?.toFixed(1) || 0}</div>
                                <div className="text-[10px] text-gray-400">{deviceMetrics?.so2?.unit}</div>
                              </CardContent>
                            </Card>
                            {/* Pressure */}
                            <Card>
                              <CardContent className="pt-4 px-3">
                                <div className="text-xs text-gray-500 mb-1">Pressure</div>
                                <div className="text-xl font-bold">{deviceMetrics?.pressure?.value?.toFixed(0) || 0}</div>
                                <div className="text-[10px] text-gray-400">{deviceMetrics?.pressure?.unit}</div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-3">
                          <Button
                            variant="outline"
                            className="flex items-center space-x-2"
                            onClick={() => setShowConfigureModal(true)}
                          >
                            <Settings className="h-4 w-4" />
                            <span>Settings</span>
                          </Button>
                          <Button
                            variant="outline"
                            className="flex items-center space-x-2"
                            onClick={handleDownloadReport}
                          >
                            <Download className="h-4 w-4" />
                            <span>Download Report</span>
                          </Button>
                        </div>

                        {/* 24 Hour Trends */}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4">
                            24 Hour Trends
                          </h3>
                          <div className="h-80">
                            {trendData.length > 0 ? (
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
                                      domain={[0, 'auto']}
                                    />
                                    <ChartTooltip
                                      content={<ChartTooltipContent />}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="pm1_0" stroke={chartConfig.pm1_0.color} name="PM1.0" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="pm25" stroke={chartConfig.pm25.color} name="PM2.5" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="pm10" stroke={chartConfig.pm10.color} name="PM10" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="temperature" stroke={chartConfig.temperature.color} name="Temp" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="humidity" stroke={chartConfig.humidity.color} name="Humidity" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="co" stroke={chartConfig.co.color} name="CO" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="no2" stroke={chartConfig.no2.color} name="NO2" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="o3" stroke={chartConfig.o3.color} name="O3" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="so2" stroke={chartConfig.so2.color} name="SO2" strokeWidth={2} dot={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </ChartContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                                    No trend data available for the last 24 hours
                                </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                    Select a device to view details
                </div>
              )}
            </div>
            
            {/* Configure Modal */}
            {selectedDevice && (
              <ConfigureModal
                isOpen={showConfigureModal}
                onClose={() => setShowConfigureModal(false)}
                device={selectedDevice}
                onUpdate={fetchDevices}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
