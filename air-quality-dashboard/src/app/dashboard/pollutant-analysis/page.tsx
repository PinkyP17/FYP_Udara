"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  Download,
  ChevronRight,
  Home,
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
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Mock data for the analysis
const analysisData = [
  { time: "00:00", pm25: 35, pm10: 45, co2: 420, no2: 25, so2: 15 },
  { time: "04:00", pm25: 32, pm10: 42, co2: 425, no2: 22, so2: 12 },
  { time: "08:00", pm25: 48, pm10: 58, co2: 450, no2: 35, so2: 20 },
  { time: "12:00", pm25: 42, pm10: 52, co2: 440, no2: 30, so2: 18 },
  { time: "16:00", pm25: 38, pm10: 48, co2: 435, no2: 28, so2: 16 },
  { time: "20:00", pm25: 40, pm10: 50, co2: 430, no2: 26, so2: 14 },
];

const pollutantColors = {
  pm25: "#ef4444", // red
  pm10: "#06b6d4", // cyan
  co2: "#6b7280", // gray
  no2: "#f59e0b", // amber
  so2: "#10b981", // emerald
};

const chartConfig = {
  pm25: { label: "PM2.5", color: "#ef4444" },
  pm10: { label: "PM10", color: "#06b6d4" },
  co2: { label: "CO2", color: "#6b7280" },
  no2: { label: "NO2", color: "#f59e0b" },
  so2: { label: "SO2", color: "#10b981" },
};

const devices = [
  {
    id: "AQM-001",
    name: "Device AQM-001",
    location: "North Station",
    status: "active",
  },
  {
    id: "AQM-002",
    name: "Device AQM-002",
    location: "South Station",
    status: "active",
  },
  {
    id: "AQM-003",
    name: "Device AQM-003",
    location: "East Station",
    status: "inactive",
  },
  {
    id: "AQM-004",
    name: "Device AQM-004",
    location: "West Station",
    status: "active",
  },
  {
    id: "AQM-005",
    name: "Device AQM-005",
    location: "Central Station",
    status: "active",
  },
];

const pollutants = [
  { id: "pm25", label: "PM2.5 (μg/m³)" },
  { id: "pm10", label: "PM10 (μg/m³)" },
  { id: "co2", label: "CO2 (ppm)" },
  { id: "no2", label: "NO2 (ppb)" },
  { id: "so2", label: "SO2 (ppb)" },
];

export default function PollutantAnalysisPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("graph");
  const [selectedPollutants, setSelectedPollutants] = useState([
    "pm25",
    "pm10",
    "co2",
  ]);
  const [selectedDevices, setSelectedDevices] = useState([
    "AQM-001",
    "AQM-002",
    "AQM-004",
    "AQM-005",
  ]);
  const [selectAllDevices, setSelectAllDevices] = useState(false);
  const [pollutantSearch, setPollutantSearch] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("7days");
  const { user } = useUser();

  const handlePollutantChange = (pollutantId: string, checked: boolean) => {
    if (checked) {
      setSelectedPollutants([...selectedPollutants, pollutantId]);
    } else {
      setSelectedPollutants(
        selectedPollutants.filter((id) => id !== pollutantId)
      );
    }
  };

  const handleDeviceChange = (deviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedDevices([...selectedDevices, deviceId]);
    } else {
      setSelectedDevices(selectedDevices.filter((id) => id !== deviceId));
    }
  };

  const handleSelectAllDevices = (checked: boolean) => {
    setSelectAllDevices(checked);
    if (checked) {
      setSelectedDevices(devices.map((device) => device.id));
    } else {
      setSelectedDevices([]);
    }
  };

  const clearSelections = () => {
    setSelectedPollutants([]);
    setSelectedDevices([]);
    setSelectAllDevices(false);
    setStartDate("");
    setEndDate("");
    setSelectedPeriod("");
  };

  const filteredPollutants = pollutants.filter((pollutant) =>
    pollutant.label.toLowerCase().includes(pollutantSearch.toLowerCase())
  );

  const filteredDevices = devices.filter((device) =>
    device.name.toLowerCase().includes(deviceSearch.toLowerCase())
  );

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
              <Button
                variant="ghost"
                className="w-full justify-start bg-blue-50 text-blue-700"
              >
                <TrendingUp className="mr-3 h-5 w-5" />
                Pollutant Data Analysis
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/dashboard/data-verification">
                  <AlertTriangle className="mr-3 h-5 w-5" />
                  Air Quality Data Verification
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/dashboard/iot-monitoring">
                  <MapPin className="mr-3 h-5 w-5" />
                  IoT Device Monitoring
                </Link>
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
        <main className="flex-1 p-6 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Home className="h-4 w-4" />
            <ChevronRight className="h-4 w-4" />
            <Link href="/dashboard" className="hover:text-gray-900">
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900">Pollutant Analysis</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Pollutant Data Analysis
            </h1>
          </div>

          {/* Filter Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Select Pollutants */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Pollutants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search pollutants"
                    value={pollutantSearch}
                    onChange={(e) => setPollutantSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {filteredPollutants.map((pollutant) => (
                    <div
                      key={pollutant.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={pollutant.id}
                        checked={selectedPollutants.includes(pollutant.id)}
                        onCheckedChange={(checked) =>
                          handlePollutantChange(
                            pollutant.id,
                            checked as boolean
                          )
                        }
                      />
                      <Label
                        htmlFor={pollutant.id}
                        className="text-sm cursor-pointer"
                      >
                        {pollutant.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Select Devices */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Devices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search devices"
                    value={deviceSearch}
                    onChange={(e) => setDeviceSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectAllDevices}
                      onCheckedChange={(checked) =>
                        handleSelectAllDevices(checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="select-all"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Select All Devices
                    </Label>
                  </div>
                  {filteredDevices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={device.id}
                          checked={selectedDevices.includes(device.id)}
                          onCheckedChange={(checked) =>
                            handleDeviceChange(device.id, checked as boolean)
                          }
                        />
                        <div>
                          <Label
                            htmlFor={device.id}
                            className="text-sm cursor-pointer"
                          >
                            {device.name}
                          </Label>
                          <p className="text-xs text-gray-500">
                            {device.location}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          device.status === "active" ? "default" : "secondary"
                        }
                        className={
                          device.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }
                      >
                        {device.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Select Date Range */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Date Range</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="start-date" className="text-sm font-medium">
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                    placeholder="Select date"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date" className="text-sm font-medium">
                    End Date
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1"
                    placeholder="Select date"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Button
                      variant={
                        selectedPeriod === "7days" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedPeriod("7days")}
                      className="flex-1"
                    >
                      Last 7 days
                    </Button>
                    <Button
                      variant={
                        selectedPeriod === "30days" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedPeriod("30days")}
                      className="flex-1"
                    >
                      Last 30 days
                    </Button>
                  </div>
                  <Button
                    variant={
                      selectedPeriod === "3months" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedPeriod("3months")}
                    className="w-full"
                  >
                    Last 3 months
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selection Summary and Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {selectedPollutants.length} pollutants and{" "}
                  {selectedDevices.length} devices selected for the period:{" "}
                  {selectedPeriod === "7days"
                    ? "Last 7 days"
                    : selectedPeriod === "30days"
                    ? "Last 30 days"
                    : selectedPeriod === "3months"
                    ? "Last 3 months"
                    : "Custom range"}
                </p>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={clearSelections}>
                    Clear Selections
                  </Button>
                  <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                    Proceed to Analysis
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Analysis Results</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Data
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Tab Navigation */}
              <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
                <Button
                  variant={activeTab === "graph" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("graph")}
                  className={activeTab === "graph" ? "bg-white shadow-sm" : ""}
                >
                  Graph View
                </Button>
                <Button
                  variant={activeTab === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("table")}
                  className={activeTab === "table" ? "bg-white shadow-sm" : ""}
                >
                  Table View
                </Button>
                <Button
                  variant={activeTab === "summary" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("summary")}
                  className={
                    activeTab === "summary" ? "bg-white shadow-sm" : ""
                  }
                >
                  Summary
                </Button>
              </div>

              {/* Chart Content */}
              {activeTab === "graph" && (
                <div className="h-96">
                  <ChartContainer config={chartConfig} className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={analysisData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
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
                          domain={[0, 600]}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend
                          wrapperStyle={{ paddingTop: "20px" }}
                          iconType="line"
                        />
                        {selectedPollutants.includes("pm25") && (
                          <Line
                            type="monotone"
                            dataKey="pm25"
                            stroke={pollutantColors.pm25}
                            strokeWidth={2}
                            dot={{
                              fill: pollutantColors.pm25,
                              strokeWidth: 2,
                              r: 4,
                            }}
                            name="PM2.5"
                          />
                        )}
                        {selectedPollutants.includes("pm10") && (
                          <Line
                            type="monotone"
                            dataKey="pm10"
                            stroke={pollutantColors.pm10}
                            strokeWidth={2}
                            dot={{
                              fill: pollutantColors.pm10,
                              strokeWidth: 2,
                              r: 4,
                            }}
                            name="PM10"
                          />
                        )}
                        {selectedPollutants.includes("co2") && (
                          <Line
                            type="monotone"
                            dataKey="co2"
                            stroke={pollutantColors.co2}
                            strokeWidth={2}
                            dot={{
                              fill: pollutantColors.co2,
                              strokeWidth: 2,
                              r: 4,
                            }}
                            name="CO2"
                          />
                        )}
                        {selectedPollutants.includes("no2") && (
                          <Line
                            type="monotone"
                            dataKey="no2"
                            stroke={pollutantColors.no2}
                            strokeWidth={2}
                            dot={{
                              fill: pollutantColors.no2,
                              strokeWidth: 2,
                              r: 4,
                            }}
                            name="NO2"
                          />
                        )}
                        {selectedPollutants.includes("so2") && (
                          <Line
                            type="monotone"
                            dataKey="so2"
                            stroke={pollutantColors.so2}
                            strokeWidth={2}
                            dot={{
                              fill: pollutantColors.so2,
                              strokeWidth: 2,
                              r: 4,
                            }}
                            name="SO2"
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              )}

              {activeTab === "table" && (
                <div className="text-center p-12 text-gray-500">
                  <p>Table view will display detailed data in tabular format</p>
                </div>
              )}

              {activeTab === "summary" && (
                <div className="text-center p-12 text-gray-500">
                  <p>
                    Summary view will show statistical analysis and insights
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500">
            Last updated: {new Date().toLocaleString()}
          </div>
        </main>
      </div>
    </div>
  );
}
