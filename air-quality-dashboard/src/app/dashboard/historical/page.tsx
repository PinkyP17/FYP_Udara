'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wind,
  Calendar,
  TrendingUp,
  MapPin,
  Settings,
  Bell,
  Menu,
  Download,
  Share,
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
  Bar,
  BarChart,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import PdfReportDialog from '@/components/PdfReportDialog';
import CSVUploadDialog from '@/components/CSVUploadDialog';

// ✅ COMPLETE CONFIG: PM2.5, PM10, and 4 gas pollutants
const pollutantColors = {
  pm25: '#ef4444', // red - PM2.5
  pm10: '#f97316', // orange - PM10
  co: '#06b6d4', // cyan - CO
  no2: '#6b7280', // gray - NO2
  o3: '#f59e0b', // amber - O3
  so2: '#10b981', // emerald - SO2
};

const chartConfig = {
  pm25: { label: 'PM2.5 (µg/m³)', color: '#ef4444' },
  pm10: { label: 'PM10 (µg/m³)', color: '#f97316' },
  co: { label: 'CO (ppm)', color: '#06b6d4' },
  no2: { label: 'NO2 (ppb)', color: '#6b7280' },
  o3: { label: 'O3 (ppb)', color: '#f59e0b' },
  so2: { label: 'SO2 (ppb)', color: '#10b981' },
};

export default function HistoricalDataPage() {
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('line');

  // --- FILTER STATES ---
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [selectedLocation, setSelectedLocation] = useState('all');

  // --- VIEW MODE STATE ---
  const [viewMode, setViewMode] = useState<'auto' | 'detailed' | 'aggregated'>('auto');

  // --- DATA STATES ---
  const [chartData, setChartData] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataMetadata, setDataMetadata] = useState<any>(null);

  // --- TOGGLE STATE ---
  // ✅ All 6 pollutants visible by default (PM2.5, PM10, CO, NO2, O3, SO2)
  const [visiblePollutants, setVisiblePollutants] = useState<string[]>([
    'pm25',
    'pm10',
    'co',
    'no2',
    'o3',
    'so2',
  ]);

  // 1. Fetch available devices for Dropdown
  //##Todo: Change API endpoint as needed
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/devices');
        if (res.ok) {
          const data = await res.json();
          setDevices(data.devices || []);
        }
      } catch (error) {
        console.error('Failed to fetch devices', error);
        setDevices([]);
      }
    };
    fetchDevices();
  }, []);

  // 2. ✅ UPDATED: Fetch History Data with VIEW MODE support
  const fetchHistoricalData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        deviceId: selectedLocation,
        viewMode: viewMode, // ✅ Pass view mode
      });

      const res = await fetch(`http://localhost:4000/api/sensor/history?${params}`);

      if (res.ok) {
        const response = await res.json();
        const rawData = response.data || response; // Handle both formats
        const metadata = response.metadata;

        setDataMetadata(metadata); // ✅ Store metadata

        // Console log for debugging
        if (metadata) {
          console.log(
            `📊 Loaded: ${metadata.returned}/${metadata.total} points (${metadata.aggregated ? metadata.aggregationType : 'raw'})`
          );
        }

        // ✅ Map backend response with GAS CONCENTRATIONS
        const formattedData = rawData.map((item: any) => ({
          // X-axis label with time
          date: new Date(item.timestamp).toLocaleDateString('en-MY', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          timestamp: item.timestamp,

          // Device info
          location: item.deviceDetails?.name || item.device_id,

          // ✅ PARTICULATE MATTER (2 metrics)
          pm25: item.pm2_5 || 0,
          pm10: item.pm10 || 0,

          // ✅ GAS POLLUTANTS (4 metrics)
          co: item.CO_ppm || 0,
          no2: item.NO2_ppb || 0,
          o3: item.O3_ppb || 0,
          so2: item.SO2_ppb || 0,

          // Environmental (for reference)
          temperature: item.temperature_c || 0,
          humidity: item.humidity_pct || 0,

          // Calculated AQI
          aqi: item.aqi || 0,
          aqi_status: item.aqi_status || 'good',

          // Metadata
          count: item.count || 1,
          isRaw: item.isRaw || false,
          isAggregated: item.isAggregated || false,
        }));

        setChartData(formattedData);
      } else {
        console.error('Failed to fetch history');
        setChartData([]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  // Run fetch on initial load
  useEffect(() => {
    fetchHistoricalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when view mode changes
  useEffect(() => {
    fetchHistoricalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // --- HELPER FUNCTIONS ---

  const handleApplyFilters = () => {
    fetchHistoricalData();
  };

  const handleClearFilters = () => {
    setEndDate(new Date().toISOString().split('T')[0]);
    setStartDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setSelectedLocation('all');
    setViewMode('auto');
    setTimeout(fetchHistoricalData, 100);
  };

  // Handle Legend Click to Toggle Pollutants
  const handleLegendClick = (e: any) => {
    const pollutantKey = e.dataKey;
    if (!pollutantKey) return;

    setVisiblePollutants((prev) =>
      prev.includes(pollutantKey)
        ? prev.filter((key) => key !== pollutantKey)
        : [...prev, pollutantKey]
    );
  };

  // ✅ EXPORT CSV FUNCTION (always raw data)
  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        deviceId: selectedLocation,
        format: 'csv',
      });

      const res = await fetch(`http://localhost:4000/api/sensor/history/export?${params}`);

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `air-quality-${startDate}-${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export data');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    }
  };

  const calculateSummaryStats = () => {
    if (chartData.length === 0) {
      return {
        averageAqi: 0,
        peakAqi: 0,
        lowestAqi: 0,
        mostCommonLevel: 'No Data',
      };
    }

    const aqiValues = chartData.map((item: any) => item.aqi);
    const sum = aqiValues.reduce((a, b) => a + b, 0);
    const averageAqi = (sum / aqiValues.length).toFixed(1);
    const peakAqi = Math.max(...aqiValues).toFixed(1);
    const lowestAqi = Math.min(...aqiValues).toFixed(1);

    const getQualityLevel = (aqi: number) => {
      if (aqi <= 50) return 'Good';
      if (aqi <= 100) return 'Moderate';
      if (aqi <= 200) return 'Unhealthy';
      if (aqi <= 300) return 'Very Unhealthy';
      return 'Hazardous';
    };

    const qualityLevels = aqiValues.map(getQualityLevel);
    const levelCounts = qualityLevels.reduce((acc: any, level: string) => {
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
            <UserButton afterSignOutUrl="/" />
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
              <Button variant="ghost" className="w-full justify-start bg-blue-50 text-blue-700">
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Historical Air Quality Data</h1>
            <p className="text-sm text-gray-600">
              Showing PM2.5, PM10, and gas pollutants (CO, NO2, O3, SO2) converted from Alphasense
              sensors
            </p>

            {/* ✅ DATA INFO BADGES */}
            {dataMetadata && (
              <div className="flex items-center gap-3 mt-3">
                <Badge variant="outline" className="text-sm">
                  {dataMetadata.returned} of {dataMetadata.total} points
                </Badge>
                {dataMetadata.aggregated && (
                  <Badge variant="secondary" className="text-sm">
                    {dataMetadata.aggregationType} averages
                  </Badge>
                )}
                {!dataMetadata.aggregated && dataMetadata.total === dataMetadata.returned && (
                  <Badge className="text-sm bg-green-500 hover:bg-green-600">All raw data</Badge>
                )}
              </div>
            )}
          </div>

          {/* ✅ INFO BOX - View Mode Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <strong>💡 View Mode Guide:</strong>
            <ul className="mt-2 space-y-1 ml-4 list-disc">
              <li>
                <strong>Auto:</strong> Shows all points for small datasets, aggregates for large
                ones
              </li>
              <li>
                <strong>Detailed:</strong> Always shows every raw data point (may be slow for large
                ranges)
              </li>
              <li>
                <strong>Simplified:</strong> Always aggregates by hour/day for cleaner charts
              </li>
              <li>
                <strong>CSV Export:</strong> Always exports raw data regardless of view mode
              </li>
            </ul>
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
                  <Label htmlFor="location">Select Device</Label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a device" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Devices</SelectItem>
                      {devices.map((dev: any) => (
                        <SelectItem key={dev.deviceId} value={dev.deviceId}>
                          {dev.name} ({dev.deviceId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ✅ VIEW MODE SELECTOR */}
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="view-mode">View Mode</Label>
                  <Select
                    value={viewMode}
                    onValueChange={(value: 'auto' | 'detailed' | 'aggregated') =>
                      setViewMode(value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select view mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Auto (Recommended)</span>
                          <span className="text-xs text-gray-500">Smart optimization</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="detailed">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Detailed</span>
                          <span className="text-xs text-gray-500">All raw points</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="aggregated">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Simplified</span>
                          <span className="text-xs text-gray-500">Hourly/daily avg</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                    onClick={handleApplyFilters}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Apply Filters'}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-50"
                    onClick={handleClearFilters}
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
              <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
                {['line', 'bar', 'table'].map((tab) => (
                  <Button
                    key={tab}
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab(tab)}
                    className={`${
                      activeTab === tab
                        ? 'bg-white shadow-sm text-gray-900 hover:bg-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    } capitalize`}
                  >
                    {tab === 'line' ? 'Line Graph' : tab === 'bar' ? 'Bar Chart' : 'Data Table'}
                  </Button>
                ))}
              </div>

              {loading ? (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  Loading data...
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  No data found for this range.
                </div>
              ) : (
                <>
                  {activeTab === 'line' && (
                    <div className="h-96">
                      <ChartContainer config={chartConfig} className="h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                              dataKey="date"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 12, fill: '#666' }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 12, fill: '#666' }}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />

                            <Legend
                              wrapperStyle={{ paddingTop: '20px', cursor: 'pointer' }}
                              iconType="line"
                              onClick={handleLegendClick}
                            />

                            {/* ✅ ALL 6 POLLUTANTS (PM2.5, PM10, CO, NO2, O3, SO2) */}
                            {Object.keys(pollutantColors).map((key) => (
                              <Line
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stroke={(pollutantColors as any)[key]}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                name={chartConfig[key as keyof typeof chartConfig].label}
                                hide={!visiblePollutants.includes(key)}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  )}

                  {activeTab === 'bar' && (
                    <div className="h-96">
                      <ChartContainer config={chartConfig} className="h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                              dataKey="date"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 12, fill: '#666' }}
                            />
                            <YAxis axisLine={false} tickLine={false} />
                            <ChartTooltip content={<ChartTooltipContent />} />

                            <Legend
                              wrapperStyle={{ paddingTop: '20px', cursor: 'pointer' }}
                              onClick={handleLegendClick}
                            />

                            {/* ✅ ALL 6 POLLUTANTS (PM2.5, PM10, CO, NO2, O3, SO2) */}
                            {Object.keys(pollutantColors).map((key) => (
                              <Bar
                                key={key}
                                dataKey={key}
                                fill={(pollutantColors as any)[key]}
                                name={chartConfig[key as keyof typeof chartConfig].label}
                                hide={!visiblePollutants.includes(key)}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  )}

                  {activeTab === 'table' && (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-white shadow-sm">
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              Location
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">PM2.5</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">PM10</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              CO (ppm)
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              NO2 (ppb)
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              O3 (ppb)
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              SO2 (ppb)
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">AQI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chartData.map((row: any, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-900">{row.date}</td>
                              <td className="py-3 px-4 text-gray-600">{row.location}</td>
                              <td className="py-3 px-4 text-gray-900">{row.pm25.toFixed(1)}</td>
                              <td className="py-3 px-4 text-gray-900">{row.pm10.toFixed(1)}</td>
                              <td className="py-3 px-4 text-gray-900">{row.co.toFixed(3)}</td>
                              <td className="py-3 px-4 text-gray-900">{row.no2.toFixed(2)}</td>
                              <td className="py-3 px-4 text-gray-900">{row.o3.toFixed(2)}</td>
                              <td className="py-3 px-4 text-gray-900">{row.so2.toFixed(2)}</td>
                              <td className="py-3 px-4 font-medium text-gray-900">{row.aqi}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">Average AQI</div>
                <div className="text-3xl font-bold text-gray-900">{summaryStats.averageAqi}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">Peak AQI</div>
                <div className="text-3xl font-bold text-gray-900">{summaryStats.peakAqi}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">Lowest AQI</div>
                <div className="text-3xl font-bold text-gray-900">{summaryStats.lowestAqi}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">Most Common Level</div>
                <div className="text-lg font-bold text-gray-900">
                  {summaryStats.mostCommonLevel}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons - ADD CSV UPLOAD HERE */}
          <div className="flex flex-wrap gap-3">
            {/* ✅ CSV EXPORT - Always raw data */}
            <Button variant="outline" className="flex items-center gap-2" onClick={handleExportCSV}>
              <Download className="h-4 w-4" />
              Download CSV (Raw Data)
            </Button>
            
            {/* 🆕 CSV UPLOAD - NEW BUTTON */}
            <CSVUploadDialog />
            
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
