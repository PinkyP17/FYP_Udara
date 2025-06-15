"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wind,
  Calendar,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Settings,
  Bell,
  Menu,
  Download,
  Share,
  FileText,
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
  Bar,
  BarChart,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import PdfReportDialog from "@/components/PdfReportDialog";

// Mock historical data - replaced pm10 with co
const allHistoricalData = [
  { date: "2023-01", pm25: 38, co: 2.1, no2: 28, o3: 32, so2: 15 },
  { date: "2023-02", pm25: 42, co: 2.8, no2: 30, o3: 35, so2: 18 },
  { date: "2023-03", pm25: 28, co: 1.9, no2: 18, o3: 25, so2: 12 },
  { date: "2023-04", pm25: 48, co: 3.2, no2: 35, o3: 42, so2: 22 },
  { date: "2023-05", pm25: 38, co: 2.5, no2: 25, o3: 38, so2: 16 },
  { date: "2023-06", pm25: 52, co: 3.5, no2: 38, o3: 45, so2: 25 },
  { date: "2023-07", pm25: 45, co: 2.9, no2: 32, o3: 40, so2: 19 },
  { date: "2023-08", pm25: 41, co: 2.7, no2: 29, o3: 36, so2: 17 },
  { date: "2023-09", pm25: 35, co: 2.2, no2: 22, o3: 31, so2: 14 },
  { date: "2023-10", pm25: 39, co: 2.6, no2: 26, o3: 34, so2: 16 },
  { date: "2023-11", pm25: 44, co: 3.0, no2: 31, o3: 38, so2: 20 },
  { date: "2023-12", pm25: 47, co: 3.1, no2: 33, o3: 41, so2: 21 },
];

const pollutantColors = {
  pm25: "#ef4444", // red
  co: "#06b6d4", // cyan (replaced pm10)
  no2: "#6b7280", // gray
  o3: "#f59e0b", // amber
  so2: "#10b981", // emerald
};

const chartConfig = {
  pm25: { label: "PM2.5", color: "#ef4444" },
  co: { label: "CO", color: "#06b6d4" }, // replaced pm10
  no2: { label: "NO2", color: "#6b7280" },
  o3: { label: "O3", color: "#f59e0b" },
  so2: { label: "SO2", color: "#10b981" },
};

// Mock data table - replaced pm10 with co and updated locations
const allTableData = [
  {
    date: "2023-12-15",
    location: "FSKTM",
    pm25: 47,
    co: 3.1,
    no2: 33,
    o3: 41,
    so2: 21,
    aqi: 85,
  },
  {
    date: "2023-11-28",
    location: "FSSS",
    pm25: 44,
    co: 3.0,
    no2: 31,
    o3: 38,
    so2: 20,
    aqi: 78,
  },
  {
    date: "2023-10-22",
    location: "FAB",
    pm25: 39,
    co: 2.6,
    no2: 26,
    o3: 34,
    so2: 16,
    aqi: 72,
  },
  {
    date: "2023-09-18",
    location: "FSKTM",
    pm25: 35,
    co: 2.2,
    no2: 22,
    o3: 31,
    so2: 14,
    aqi: 65,
  },
  {
    date: "2023-08-14",
    location: "FSSS",
    pm25: 41,
    co: 2.7,
    no2: 29,
    o3: 36,
    so2: 17,
    aqi: 74,
  },
  {
    date: "2023-07-10",
    location: "FAB",
    pm25: 45,
    co: 2.9,
    no2: 32,
    o3: 40,
    so2: 19,
    aqi: 81,
  },
  {
    date: "2023-06-15",
    location: "FSKTM",
    pm25: 52,
    co: 3.5,
    no2: 38,
    o3: 45,
    so2: 25,
    aqi: 92,
  },
  {
    date: "2023-05-20",
    location: "FSSS",
    pm25: 38,
    co: 2.5,
    no2: 25,
    o3: 38,
    so2: 16,
    aqi: 68,
  },
  {
    date: "2023-04-25",
    location: "FAB",
    pm25: 48,
    co: 3.2,
    no2: 35,
    o3: 42,
    so2: 22,
    aqi: 88,
  },
  {
    date: "2023-03-18",
    location: "FSKTM",
    pm25: 28,
    co: 1.9,
    no2: 18,
    o3: 25,
    so2: 12,
    aqi: 58,
  },
  {
    date: "2023-02-14",
    location: "FSSS",
    pm25: 42,
    co: 2.8,
    no2: 30,
    o3: 35,
    so2: 18,
    aqi: 75,
  },
  {
    date: "2023-01-10",
    location: "FAB",
    pm25: 38,
    co: 2.1,
    no2: 28,
    o3: 32,
    so2: 15,
    aqi: 70,
  },
];

export default function HistoricalDataPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("line");
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-12-31");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [filteredHistoricalData, setFilteredHistoricalData] =
    useState(allHistoricalData);
  const [filteredTableData, setFilteredTableData] = useState(allTableData);
  const { user } = useUser();

  // Function to apply filters
  const applyFilters = () => {
    // Filter historical data by date range
    const filteredHistorical = allHistoricalData.filter((item) => {
      const itemDate = new Date(item.date + "-01"); // Convert "2023-01" to "2023-01-01"
      const start = new Date(startDate);
      const end = new Date(endDate);
      return itemDate >= start && itemDate <= end;
    });

    // Filter table data by date range and location
    const filteredTable = allTableData.filter((item) => {
      const itemDate = new Date(item.date);
      const start = new Date(startDate);
      const end = new Date(endDate);

      const dateMatch = itemDate >= start && itemDate <= end;
      const locationMatch =
        selectedLocation === "all" ||
        item.location.toLowerCase() === selectedLocation.toLowerCase();

      return dateMatch && locationMatch;
    });

    setFilteredHistoricalData(filteredHistorical);
    setFilteredTableData(filteredTable);
  };

  // Function to clear all filters
  const clearAllFilters = () => {
    setStartDate("2023-01-01");
    setEndDate("2023-12-31");
    setSelectedLocation("all");
    setFilteredHistoricalData(allHistoricalData);
    setFilteredTableData(allTableData);
  };

  // Calculate summary statistics based on filtered data
  const calculateSummaryStats = () => {
    if (filteredTableData.length === 0) {
      return {
        averageAqi: 0,
        peakAqi: 0,
        lowestAqi: 0,
        mostCommonLevel: "No Data",
      };
    }

    const aqiValues = filteredTableData.map((item) => item.aqi);
    const averageAqi = (
      aqiValues.reduce((sum, aqi) => sum + aqi, 0) / aqiValues.length
    ).toFixed(1);
    const peakAqi = Math.max(...aqiValues).toFixed(1);
    const lowestAqi = Math.min(...aqiValues).toFixed(1);

    // Determine most common quality level based on AQI ranges
    const getQualityLevel = (aqi) => {
      if (aqi <= 50) return "Good";
      if (aqi <= 100) return "Moderate";
      if (aqi <= 150) return "Unhealthy for Sensitive Groups";
      if (aqi <= 200) return "Unhealthy";
      if (aqi <= 300) return "Very Unhealthy";
      return "Hazardous";
    };

    const qualityLevels = aqiValues.map(getQualityLevel);
    const levelCounts = qualityLevels.reduce((acc, level) => {
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});

    const mostCommonLevel = Object.keys(levelCounts).reduce((a, b) =>
      levelCounts[a] > levelCounts[b] ? a : b
    );

    return { averageAqi, peakAqi, lowestAqi, mostCommonLevel };
  };

  const summaryStats = calculateSummaryStats();

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
              <Button
                variant="ghost"
                className="w-full justify-start bg-blue-50 text-blue-700"
              >
                <Calendar className="mr-3 h-5 w-5" />
                Historical Air Quality Data
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Historical Air Quality Data
            </h1>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="location">Select Location</Label>
                  <Select
                    value={selectedLocation}
                    onValueChange={setSelectedLocation}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      <SelectItem value="fsktm">
                        FSKTM (Faculty of Computer Science & IT)
                      </SelectItem>
                      <SelectItem value="fsss">
                        FSSS (Faculty of Sports & Exercise Science)
                      </SelectItem>
                      <SelectItem value="fab">
                        FAB (Faculty of Built Environment)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                    onClick={applyFilters}
                  >
                    Apply Filters
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-50"
                    onClick={clearAllFilters}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart Section */}
          <Card>
            <CardContent className="pt-6">
              {/* Tab Navigation - Fixed button styling */}
              <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("line")}
                  className={`${
                    activeTab === "line"
                      ? "bg-white shadow-sm text-gray-900 hover:bg-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  Line Graph
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("bar")}
                  className={`${
                    activeTab === "bar"
                      ? "bg-white shadow-sm text-gray-900 hover:bg-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  Bar Chart
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("table")}
                  className={`${
                    activeTab === "table"
                      ? "bg-white shadow-sm text-gray-900 hover:bg-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  Data Table
                </Button>
              </div>

              {/* Chart Content */}
              {activeTab === "line" && (
                <div className="h-96">
                  <ChartContainer config={chartConfig} className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={filteredHistoricalData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#666" }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#666" }}
                          domain={[0, 80]}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend
                          wrapperStyle={{ paddingTop: "20px" }}
                          iconType="line"
                        />
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
                        <Line
                          type="monotone"
                          dataKey="co"
                          stroke={pollutantColors.co}
                          strokeWidth={2}
                          dot={{
                            fill: pollutantColors.co,
                            strokeWidth: 2,
                            r: 4,
                          }}
                          name="CO"
                        />
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
                        <Line
                          type="monotone"
                          dataKey="o3"
                          stroke={pollutantColors.o3}
                          strokeWidth={2}
                          dot={{
                            fill: pollutantColors.o3,
                            strokeWidth: 2,
                            r: 4,
                          }}
                          name="O3"
                        />
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
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              )}

              {activeTab === "bar" && (
                <div className="h-96">
                  <ChartContainer config={chartConfig} className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={filteredHistoricalData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#666" }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#666" }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend wrapperStyle={{ paddingTop: "20px" }} />
                        <Bar
                          dataKey="pm25"
                          fill={pollutantColors.pm25}
                          name="PM2.5"
                        />
                        <Bar dataKey="co" fill={pollutantColors.co} name="CO" />
                        <Bar
                          dataKey="no2"
                          fill={pollutantColors.no2}
                          name="NO2"
                        />
                        <Bar dataKey="o3" fill={pollutantColors.o3} name="O3" />
                        <Bar
                          dataKey="so2"
                          fill={pollutantColors.so2}
                          name="SO2"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              )}

              {activeTab === "table" && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          Location
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          PM2.5
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          CO
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          NO2
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          O3
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          SO2
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          AQI
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTableData.map((row, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-4 text-gray-900">
                            {row.date}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {row.location}
                          </td>
                          <td className="py-3 px-4 text-gray-900">
                            {row.pm25}
                          </td>
                          <td className="py-3 px-4 text-gray-900">{row.co}</td>
                          <td className="py-3 px-4 text-gray-900">{row.no2}</td>
                          <td className="py-3 px-4 text-gray-900">{row.o3}</td>
                          <td className="py-3 px-4 text-gray-900">{row.so2}</td>
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {row.aqi}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">Average AQI</div>
                <div className="text-3xl font-bold text-gray-900">
                  {summaryStats.averageAqi}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">Peak AQI</div>
                <div className="text-3xl font-bold text-gray-900">
                  {summaryStats.peakAqi}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">Lowest AQI</div>
                <div className="text-3xl font-bold text-gray-900">
                  {summaryStats.lowestAqi}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">
                  Most Common Quality Level
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {summaryStats.mostCommonLevel}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
            {/* <Button variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Download PDF Report
            </Button> */}
            <PdfReportDialog />
            <Button variant="outline" className="flex items-center gap-2">
              <Share className="h-4 w-4" />
              Share Data
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}
