'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const pollutantColors = {
  pm25: '#ef4444', // red
  pm10: '#06b6d4', // cyan
  co: '#6b7280', // gray (changed from co2)
  no2: '#f59e0b', // amber
  so2: '#10b981', // emerald
  o3: '#8b5cf6', // purple (added)
};

const chartConfig = {
  pm25: { label: 'PM2.5', color: '#ef4444' },
  pm10: { label: 'PM10', color: '#06b6d4' },
  co: { label: 'CO', color: '#6b7280' },
  no2: { label: 'NO2', color: '#f59e0b' },
  so2: { label: 'SO2', color: '#10b981' },
  o3: { label: 'O3', color: '#8b5cf6' },
};

const pollutants = [
  { id: 'pm25', label: 'PM2.5 (μg/m³)' },
  { id: 'pm10', label: 'PM10 (μg/m³)' },
  { id: 'co', label: 'CO (ppm)' },
  { id: 'no2', label: 'NO2 (ppb)' },
  { id: 'o3', label: 'O3 (ppb)' },
  { id: 'so2', label: 'SO2 (ppb)' },
];

// Helper to safely get status string from mixed device schemas
const getDeviceStatus = (device) => {
  if (!device || !device.status) return 'unknown';

  // Handle new scheme where status is an object
  if (typeof device.status === 'object') {
    // Prefer connection status (online/offline) if available, otherwise operational status
    return device.status.connection || device.status.operational || 'unknown';
  }

  // Handle old scheme where status is a string
  return String(device.status);
};

// Helper to determine if device is considered "online/active"
const isDeviceOnline = (device) => {
  const status = getDeviceStatus(device).toLowerCase();
  return status === 'active' || status === 'online' || status === 'connected';
};

export default function PollutantAnalysisPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('graph');
  const [selectedPollutants, setSelectedPollutants] = useState(['pm25', 'pm10', 'co']);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [selectAllDevices, setSelectAllDevices] = useState(false);
  const [pollutantSearch, setPollutantSearch] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [viewMode, setViewMode] = useState('auto'); // auto, detailed, aggregated
  const { user } = useUser();

  // API data states
  const [devices, setDevices] = useState([]);
  const [analysisData, setAnalysisData] = useState([]);
  const [rawPollutantData, setRawPollutantData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [error, setError] = useState(null);

  // API base URL
  const API_BASE_URL = 'http://localhost:4000/api';

  // Fetch devices on component mount
  useEffect(() => {
    fetchDevices();
  }, []);

  // Auto-select active devices when devices are loaded
  useEffect(() => {
    if (devices.length > 0) {
      const activeDevices = devices
        .filter((device) => isDeviceOnline(device))
        .map((device) => device.deviceId);
      setSelectedDevices(activeDevices);
    }
  }, [devices]);

  // Clear period selection when custom dates are set
  useEffect(() => {
    if (startDate || endDate) {
      setSelectedPeriod('');
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
      console.log('Fetched devices:', devicesData);

      // Handle different response formats
      const deviceList = Array.isArray(devicesData)
        ? devicesData
        : devicesData.devices || devicesData.data || [];

      setDevices(deviceList);
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError('Failed to load devices. Please try again.');
    } finally {
      setDevicesLoading(false);
    }
  };

  // UPDATED: Fetch sensor history data
  const fetchPollutantData = async () => {
    // Validation
    if (selectedDevices.length === 0) {
      setError('Please select at least one device');
      return;
    }

    if (selectedPollutants.length === 0) {
      setError('Please select at least one pollutant');
      return;
    }

    // Validate date range if using custom dates
    if (!selectedPeriod && (startDate || endDate)) {
      if (!startDate || !endDate) {
        setError('Please select both start and end dates for custom range');
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        setError('Start date must be before end date');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      let calculatedStartDate = startDate;
      let calculatedEndDate = endDate;

      if (selectedPeriod) {
        const now = new Date();
        calculatedEndDate = now.toISOString().split('T')[0];

        switch (selectedPeriod) {
          case '7days':
            calculatedStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0];
            break;
          case '30days':
            calculatedStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0];
            break;
          case '3months':
            calculatedStartDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0];
            break;
          default:
            calculatedStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0];
        }
      }

      // Fetch data for each selected device
      const allData = [];

      for (const deviceId of selectedDevices) {
        const params = new URLSearchParams({
          deviceId: deviceId,
          startDate: calculatedStartDate,
          endDate: calculatedEndDate,
          viewMode: activeTab === 'graph' ? 'aggregated' : 'detailed',
        });

        const url = `${API_BASE_URL}/sensor/history?${params}`;
        console.log('Fetching from URL:', url);

        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Failed to fetch data for device ${deviceId}`);
          continue;
        }

        const result = await response.json();
        console.log(`Data for ${deviceId}:`, result);

        // Extract data array from response
        const deviceData = result.data || [];
        allData.push(...deviceData);
      }

      if (allData.length === 0) {
        setError('No data found for the selected criteria');
        setAnalysisData([]);
        setRawPollutantData([]);
        return;
      }

      console.log(`Total data points fetched: ${allData.length}`);

      if (activeTab === 'graph') {
        // Process for graph view
        const processedData = processDataForChart(allData);
        setAnalysisData(processedData);
      } else {
        // For table view, use raw data
        setRawPollutantData(allData);
      }
    } catch (err) {
      console.error('Error fetching pollutant data:', err);
      setError(`Failed to load pollutant data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const processDataForChart = (data) => {
    if (!data || data.length === 0) return [];

    console.log('Processing data for chart:', data.length, 'records');
    console.log('Sample record:', data[0]);

    // Group data by time period
    const groupedData = {};

    data.forEach((record) => {
      const timestamp = record.timestamp;
      if (!timestamp) {
        console.warn('Record missing timestamp:', record);
        return;
      }

      // Create time key (for grouping)
      const date = new Date(timestamp);
      const timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;

      if (!groupedData[timeKey]) {
        groupedData[timeKey] = {
          time: timeKey,
          pm25: [],
          pm10: [],
          co: [],
          no2: [],
          o3: [],
          so2: [],
        };
      }

      // Add values if they exist
      if (typeof record.pm2_5 === 'number') groupedData[timeKey].pm25.push(record.pm2_5);
      if (typeof record.pm10 === 'number') groupedData[timeKey].pm10.push(record.pm10);
      if (typeof record.CO_ppm === 'number') groupedData[timeKey].co.push(record.CO_ppm);
      if (typeof record.NO2_ppb === 'number') groupedData[timeKey].no2.push(record.NO2_ppb);
      if (typeof record.O3_ppb === 'number') groupedData[timeKey].o3.push(record.O3_ppb);
      if (typeof record.SO2_ppb === 'number') groupedData[timeKey].so2.push(record.SO2_ppb);
    });

    // Calculate averages and format for chart
    const chartData = Object.values(groupedData)
      .map((group) => ({
        time: group.time,
        pm25:
          group.pm25.length > 0
            ? Math.round((group.pm25.reduce((a, b) => a + b, 0) / group.pm25.length) * 10) / 10
            : null,
        pm10:
          group.pm10.length > 0
            ? Math.round((group.pm10.reduce((a, b) => a + b, 0) / group.pm10.length) * 10) / 10
            : null,
        co:
          group.co.length > 0
            ? Math.round((group.co.reduce((a, b) => a + b, 0) / group.co.length) * 10) / 10
            : null,
        no2:
          group.no2.length > 0
            ? Math.round((group.no2.reduce((a, b) => a + b, 0) / group.no2.length) * 10) / 10
            : null,
        o3:
          group.o3.length > 0
            ? Math.round((group.o3.reduce((a, b) => a + b, 0) / group.o3.length) * 10) / 10
            : null,
        so2:
          group.so2.length > 0
            ? Math.round((group.so2.reduce((a, b) => a + b, 0) / group.so2.length) * 10) / 10
            : null,
      }))
      .filter((item) => {
        // Only include items that have at least one non-null value
        return (
          item.pm25 !== null ||
          item.pm10 !== null ||
          item.co !== null ||
          item.no2 !== null ||
          item.o3 !== null ||
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
      setSelectedPollutants(selectedPollutants.filter((id) => id !== pollutantId));
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
    setStartDate('');
    setEndDate('');
  };

  const clearSelections = () => {
    setSelectedPollutants([]);
    setSelectedDevices([]);
    setSelectAllDevices(false);
    setStartDate('');
    setEndDate('');
    setSelectedPeriod('7days');
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

  // Export function
  const handleExport = () => {
    const dataToExport = activeTab === 'graph' ? analysisData : rawPollutantData;

    if (dataToExport.length === 0) {
      alert('No data to export');
      return;
    }

    // Convert to CSV
    const headers = Object.keys(dataToExport[0]).join(',');
    const rows = dataToExport.map((row) =>
      Object.values(row)
        .map((val) => (typeof val === 'object' ? JSON.stringify(val) : val))
        .join(',')
    );
    const csv = [headers, ...rows].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pollutant-data-${new Date().toISOString()}.csv`;
    a.click();
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
                <p className="text-sm text-gray-500">Welcome back, {user?.firstName || 'User'}!</p>
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
                  avatarBox: 'w-8 h-8',
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
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
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
              <Button variant="ghost" className="w-full justify-start bg-blue-50 text-blue-700">
                <TrendingUp className="mr-3 h-5 w-5" />
                Pollutant Data Analysis
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
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/dashboard/notification">
                  <Bell className="mr-3 h-5 w-5" />
                  Threshold & Notifications
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
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Pollutant Data Analysis</h1>
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
                    <div key={pollutant.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={pollutant.id}
                        checked={selectedPollutants.includes(pollutant.id)}
                        onCheckedChange={(checked) => handlePollutantChange(pollutant.id, checked)}
                      />
                      <Label htmlFor={pollutant.id} className="text-sm cursor-pointer">
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
                    <span className="ml-2 text-sm text-gray-500">Loading devices...</span>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={selectAllDevices}
                        onCheckedChange={(checked) => handleSelectAllDevices(checked)}
                      />
                      <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                        Select All Devices
                      </Label>
                    </div>
                    {filteredDevices.map((device) => {
                      const statusLabel = getDeviceStatus(device);
                      const isOnline = isDeviceOnline(device);

                      return (
                        <div key={device.deviceId} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={device.deviceId}
                              checked={selectedDevices.includes(device.deviceId)}
                              onCheckedChange={(checked) =>
                                handleDeviceChange(device.deviceId, checked)
                              }
                            />
                            <div>
                              <Label htmlFor={device.deviceId} className="text-sm cursor-pointer">
                                {device.name}
                              </Label>
                              <p className="text-xs text-gray-500">
                                {device.location?.address || device.location}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={isOnline ? 'default' : 'secondary'}
                            className={
                              isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }
                          >
                            {statusLabel}
                          </Badge>
                        </div>
                      );
                    })}
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
                      variant={selectedPeriod === '7days' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePeriodSelection('7days')}
                      className="flex-1"
                    >
                      Last 7 days
                    </Button>
                    <Button
                      variant={selectedPeriod === '30days' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePeriodSelection('30days')}
                      className="flex-1"
                    >
                      Last 30 days
                    </Button>
                  </div>
                  <Button
                    variant={selectedPeriod === '3months' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePeriodSelection('3months')}
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
                  {selectedPollutants.length} pollutants and {selectedDevices.length} devices
                  selected for the period:{' '}
                  {selectedPeriod === '7days'
                    ? 'Last 7 days'
                    : selectedPeriod === '30days'
                      ? 'Last 30 days'
                      : selectedPeriod === '3months'
                        ? 'Last 3 months'
                        : startDate && endDate
                          ? `${startDate} to ${endDate}`
                          : 'No period selected'}
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
                      'Proceed to Analysis'
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
                  disabled={
                    (activeTab === 'graph' && analysisData.length === 0) ||
                    (activeTab === 'table' && rawPollutantData.length === 0)
                  }
                  onClick={handleExport}
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
                  variant={activeTab === 'graph' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('graph')}
                  className={activeTab === 'graph' ? 'bg-white shadow-sm text-gray-900' : ''}
                >
                  Graph View
                </Button>
                <Button
                  variant={activeTab === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('table')}
                  className={activeTab === 'table' ? 'bg-white shadow-sm text-gray-900' : ''}
                >
                  Table View
                </Button>
                <Button
                  variant={activeTab === 'summary' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('summary')}
                  className={activeTab === 'summary' ? 'bg-white shadow-sm text-gray-900' : ''}
                >
                  Summary
                </Button>
              </div>

              {/* Chart Content */}
              {activeTab === 'graph' && (
                <div className="h-96">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2 text-gray-500">Loading chart data...</span>
                    </div>
                  ) : analysisData.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">
                        No data available. Please select devices and click "Proceed to Analysis".
                      </p>
                    </div>
                  ) : (
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
                            tick={{ fontSize: 12, fill: '#666' }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#666' }}
                            domain={[0, 'auto']}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
                          {selectedPollutants.includes('pm25') && (
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
                          {selectedPollutants.includes('pm10') && (
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
                          {selectedPollutants.includes('co') && (
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
                          )}
                          {selectedPollutants.includes('no2') && (
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
                          {selectedPollutants.includes('o3') && (
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
                          )}
                          {selectedPollutants.includes('so2') && (
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

              {activeTab === 'table' && (
                <div>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2 text-gray-500">Loading table data...</span>
                    </div>
                  ) : rawPollutantData.length === 0 ? (
                    <div className="text-center p-12 text-gray-500">
                      <p>
                        No data available. Please select devices and click "Proceed to Analysis".
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Timestamp</th>
                            <th className="px-4 py-2 text-left">Device ID</th>
                            <th className="px-4 py-2 text-left">Location</th>
                            {selectedPollutants.includes('pm25') && (
                              <th className="px-4 py-2 text-right">PM2.5 (μg/m³)</th>
                            )}
                            {selectedPollutants.includes('pm10') && (
                              <th className="px-4 py-2 text-right">PM10 (μg/m³)</th>
                            )}
                            {selectedPollutants.includes('co') && (
                              <th className="px-4 py-2 text-right">CO (ppm)</th>
                            )}
                            {selectedPollutants.includes('no2') && (
                              <th className="px-4 py-2 text-right">NO2 (ppb)</th>
                            )}
                            {selectedPollutants.includes('o3') && (
                              <th className="px-4 py-2 text-right">O3 (ppb)</th>
                            )}
                            {selectedPollutants.includes('so2') && (
                              <th className="px-4 py-2 text-right">SO2 (ppb)</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {rawPollutantData.map((row, index) => (
                            <tr key={row._id || index} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-2">
                                {new Date(row.timestamp).toLocaleString()}
                              </td>
                              <td className="px-4 py-2">{row.device_id}</td>
                              <td className="px-4 py-2">{row.location || 'N/A'}</td>
                              {selectedPollutants.includes('pm25') && (
                                <td className="px-4 py-2 text-right">
                                  {row.pm2_5?.toFixed(2) || 'N/A'}
                                </td>
                              )}
                              {selectedPollutants.includes('pm10') && (
                                <td className="px-4 py-2 text-right">
                                  {row.pm10?.toFixed(2) || 'N/A'}
                                </td>
                              )}
                              {selectedPollutants.includes('co') && (
                                <td className="px-4 py-2 text-right">
                                  {row.CO_ppm?.toFixed(2) || 'N/A'}
                                </td>
                              )}
                              {selectedPollutants.includes('no2') && (
                                <td className="px-4 py-2 text-right">
                                  {row.NO2_ppb?.toFixed(2) || 'N/A'}
                                </td>
                              )}
                              {selectedPollutants.includes('o3') && (
                                <td className="px-4 py-2 text-right">
                                  {row.O3_ppb?.toFixed(2) || 'N/A'}
                                </td>
                              )}
                              {selectedPollutants.includes('so2') && (
                                <td className="px-4 py-2 text-right">
                                  {row.SO2_ppb?.toFixed(2) || 'N/A'}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-4 text-sm text-gray-600">
                        Showing {rawPollutantData.length} raw data points
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'summary' && (
                <div className="text-center p-12 text-gray-500">
                  <p>Summary view will show statistical analysis and insights</p>
                  {analysisData.length > 0 && (
                    <p className="mt-2">Analysis ready for {analysisData.length} time periods</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500">
            Last updated: {new Date().toLocaleString()}
            {(rawPollutantData.length > 0 || analysisData.length > 0) && (
              <span className="ml-4">
                Showing data from{' '}
                {activeTab === 'graph' ? analysisData.length : rawPollutantData.length} records
                across {selectedDevices.length} devices
              </span>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
