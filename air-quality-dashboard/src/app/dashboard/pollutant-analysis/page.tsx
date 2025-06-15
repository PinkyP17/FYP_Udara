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
  Loader2,
  AlertCircle,
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
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [selectAllDevices, setSelectAllDevices] = useState(false);
  const [pollutantSearch, setPollutantSearch] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("7days");
  const { user } = useUser();

  // API data states
  const [devices, setDevices] = useState([]);
  const [analysisData, setAnalysisData] = useState([]);
  const [rawPollutantData, setRawPollutantData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [error, setError] = useState(null);

  // API base URL
  const API_BASE_URL = "http://localhost:4000/api";

  // Fetch devices on component mount
  useEffect(() => {
    fetchDevices();
  }, []);

  // Auto-select active devices when devices are loaded (but don't fetch data yet)
  useEffect(() => {
    if (devices.length > 0) {
      const activeDevices = devices
        .filter((device) => device.status === "active")
        .map((device) => device.deviceId);
      setSelectedDevices(activeDevices);
    }
  }, [devices]);

  // Clear period selection when custom dates are set
  useEffect(() => {
    if (startDate || endDate) {
      setSelectedPeriod("");
    }
  }, [startDate, endDate]);

  const fetchDevices = async () => {
    try {
      setDevicesLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/devices`);
      if (!response.ok) {
        throw new Error(`Failed to fetch devices: ${response.statusText}`);
      }

      const devicesData = await response.json();
      console.log("Fetched devices:", devicesData);

      // Handle different response formats
      const deviceList = Array.isArray(devicesData)
        ? devicesData
        : devicesData.data || [];
      setDevices(deviceList);
    } catch (err) {
      console.error("Error fetching devices:", err);
      setError("Failed to load devices. Please try again.");
    } finally {
      setDevicesLoading(false);
    }
  };

  const fetchPollutantData = async () => {
    // Validation
    if (selectedDevices.length === 0) {
      setError("Please select at least one device");
      return;
    }

    if (selectedPollutants.length === 0) {
      setError("Please select at least one pollutant");
      return;
    }

    // Validate date range if using custom dates
    if (!selectedPeriod && (startDate || endDate)) {
      if (!startDate || !endDate) {
        setError("Please select both start and end dates for custom range");
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        setError("Start date must be before end date");
        return;
      }
    }

    if (!selectedPeriod && !startDate && !endDate) {
      setError("Please select a time period or custom date range");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();

      // Add device IDs
      selectedDevices.forEach((deviceId) =>
        params.append("deviceIds", deviceId)
      );

      // Add time parameters
      if (selectedPeriod) {
        params.append("period", selectedPeriod);
        console.log("Using period:", selectedPeriod);
      } else if (startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
        console.log("Using custom range:", startDate, "to", endDate);
      }

      // Add selected pollutants if your API supports filtering
      selectedPollutants.forEach((pollutant) =>
        params.append("pollutants", pollutant)
      );

      const url = `${API_BASE_URL}/pollutant-data?${params}`;
      console.log("Fetching from URL:", url);

      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch pollutant data: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const pollutantData = await response.json();
      console.log("Raw API response:", pollutantData);

      // Handle different response formats
      const dataArray = Array.isArray(pollutantData)
        ? pollutantData
        : pollutantData.data || pollutantData.records || [];

      if (!Array.isArray(dataArray)) {
        throw new Error("Invalid data format received from API");
      }

      setRawPollutantData(dataArray);

      if (dataArray.length === 0) {
        setError("No data found for the selected criteria");
        setAnalysisData([]);
        return;
      }

      // Process data for chart display
      const processedData = processDataForChart(dataArray);
      setAnalysisData(processedData);

      console.log("Processed data:", processedData);
      console.log(
        `Successfully loaded ${dataArray.length} records, processed into ${processedData.length} chart points`
      );
    } catch (err) {
      console.error("Error fetching pollutant data:", err);
      setError(`Failed to load pollutant data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const processDataForChart = (data) => {
    if (!data || data.length === 0) return [];

    console.log("Processing data for chart:", data.length, "records");
    console.log("Sample record:", data[0]);

    // Group data by time and calculate averages across selected devices
    const groupedData = {};

    data.forEach((record) => {
      // Handle different timestamp formats
      const timeKey = record.time || record.timestamp || record.createdAt;

      if (!timeKey) {
        console.warn("Record missing time field:", record);
        return;
      }

      if (!groupedData[timeKey]) {
        groupedData[timeKey] = {
          time: timeKey,
          pm25: [],
          pm10: [],
          co2: [],
          no2: [],
          so2: [],
        };
      }

      // Handle different data structures
      const pollutantData = record.pollutants || record.data || record;

      if (pollutantData) {
        // Only add values if they exist and are numbers
        if (typeof pollutantData.pm25 === "number")
          groupedData[timeKey].pm25.push(pollutantData.pm25);
        if (typeof pollutantData.pm10 === "number")
          groupedData[timeKey].pm10.push(pollutantData.pm10);
        if (typeof pollutantData.co2 === "number")
          groupedData[timeKey].co2.push(pollutantData.co2);
        if (typeof pollutantData.no2 === "number")
          groupedData[timeKey].no2.push(pollutantData.no2);
        if (typeof pollutantData.so2 === "number")
          groupedData[timeKey].so2.push(pollutantData.so2);
      }
    });

    // Calculate averages and format for chart
    const chartData = Object.values(groupedData)
      .map((group) => ({
        time: group.time,
        pm25:
          group.pm25.length > 0
            ? Math.round(
                group.pm25.reduce((a, b) => a + b, 0) / group.pm25.length
              )
            : null,
        pm10:
          group.pm10.length > 0
            ? Math.round(
                group.pm10.reduce((a, b) => a + b, 0) / group.pm10.length
              )
            : null,
        co2:
          group.co2.length > 0
            ? Math.round(
                group.co2.reduce((a, b) => a + b, 0) / group.co2.length
              )
            : null,
        no2:
          group.no2.length > 0
            ? Math.round(
                group.no2.reduce((a, b) => a + b, 0) / group.no2.length
              )
            : null,
        so2:
          group.so2.length > 0
            ? Math.round(
                group.so2.reduce((a, b) => a + b, 0) / group.so2.length
              )
            : null,
      }))
      .filter((item) => {
        // Only include items that have at least one non-null value
        return (
          item.pm25 !== null ||
          item.pm10 !== null ||
          item.co2 !== null ||
          item.no2 !== null ||
          item.so2 !== null
        );
      });

    // Sort by time
    return chartData.sort((a, b) => new Date(a.time) - new Date(b.time));
  };

  const handlePollutantChange = (pollutantId, checked) => {
    if (checked) {
      setSelectedPollutants([...selectedPollutants, pollutantId]);
    } else {
      setSelectedPollutants(
        selectedPollutants.filter((id) => id !== pollutantId)
      );
    }
  };

  const handleDeviceChange = (deviceId, checked) => {
    if (checked) {
      setSelectedDevices([...selectedDevices, deviceId]);
    } else {
      setSelectedDevices(selectedDevices.filter((id) => id !== deviceId));
      setSelectAllDevices(false);
    }
  };

  const handleSelectAllDevices = (checked) => {
    setSelectAllDevices(checked);
    if (checked) {
      setSelectedDevices(devices.map((device) => device.deviceId));
    } else {
      setSelectedDevices([]);
    }
  };

  const handlePeriodSelection = (period) => {
    setSelectedPeriod(period);
    // Clear custom dates when period is selected
    setStartDate("");
    setEndDate("");
  };

  const clearSelections = () => {
    setSelectedPollutants([]);
    setSelectedDevices([]);
    setSelectAllDevices(false);
    setStartDate("");
    setEndDate("");
    setSelectedPeriod("7days");
    setAnalysisData([]);
    setRawPollutantData([]);
    setError(null);
  };

  const proceedToAnalysis = () => {
    fetchPollutantData();
  };

  const canProceed = () => {
    return (
      selectedDevices.length > 0 &&
      selectedPollutants.length > 0 &&
      (selectedPeriod || (startDate && endDate))
    );
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

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

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
                          handlePollutantChange(pollutant.id, checked)
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
                {devicesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm text-gray-500">
                      Loading devices...
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={selectAllDevices}
                        onCheckedChange={(checked) =>
                          handleSelectAllDevices(checked)
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
                        key={device.deviceId}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={device.deviceId}
                            checked={selectedDevices.includes(device.deviceId)}
                            onCheckedChange={(checked) =>
                              handleDeviceChange(device.deviceId, checked)
                            }
                          />
                          <div>
                            <Label
                              htmlFor={device.deviceId}
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
                )}
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
                      onClick={() => handlePeriodSelection("7days")}
                      className="flex-1"
                    >
                      Last 7 days
                    </Button>
                    <Button
                      variant={
                        selectedPeriod === "30days" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => handlePeriodSelection("30days")}
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
                    onClick={() => handlePeriodSelection("3months")}
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
                    : startDate && endDate
                    ? `${startDate} to ${endDate}`
                    : "No period selected"}
                </p>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={clearSelections}>
                    Clear Selections
                  </Button>
                  <Button
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                    onClick={proceedToAnalysis}
                    disabled={loading || !canProceed()}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Proceed to Analysis"
                    )}
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
                  disabled={analysisData.length === 0}
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
                  className={
                    activeTab === "graph"
                      ? "bg-white shadow-sm text-gray-900"
                      : ""
                  }
                >
                  Graph View
                </Button>
                <Button
                  variant={activeTab === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("table")}
                  className={
                    activeTab === "table"
                      ? "bg-white shadow-sm text-gray-900"
                      : ""
                  }
                >
                  Table View
                </Button>
                <Button
                  variant={activeTab === "summary" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("summary")}
                  className={
                    activeTab === "summary"
                      ? "bg-white shadow-sm text-gray-900"
                      : ""
                  }
                >
                  Summary
                </Button>
              </div>

              {/* Chart Content */}
              {activeTab === "graph" && (
                <div className="h-96">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2 text-gray-500">
                        Loading chart data...
                      </span>
                    </div>
                  ) : analysisData.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">
                        No data available. Please select devices and click
                        "Proceed to Analysis".
                      </p>
                    </div>
                  ) : (
                    <ChartContainer config={chartConfig} className="h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={analysisData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
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
                  )}
                </div>
              )}

              {activeTab === "table" && (
                <div className="text-center p-12 text-gray-500">
                  <p>Table view will display detailed data in tabular format</p>
                  {rawPollutantData.length > 0 && (
                    <p className="mt-2">
                      Found {rawPollutantData.length} data records
                    </p>
                  )}
                </div>
              )}

              {activeTab === "summary" && (
                <div className="text-center p-12 text-gray-500">
                  <p>
                    Summary view will show statistical analysis and insights
                  </p>
                  {analysisData.length > 0 && (
                    <p className="mt-2">
                      Analysis ready for {analysisData.length} time periods
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500">
            Last updated: {new Date().toLocaleString()}
            {rawPollutantData.length > 0 && (
              <span className="ml-4">
                Showing data from {rawPollutantData.length} records across{" "}
                {selectedDevices.length} devices
              </span>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
