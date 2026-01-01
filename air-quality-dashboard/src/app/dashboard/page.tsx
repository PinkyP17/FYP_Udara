"use client";

//TODO - Fix resizing issues, when data dont have loks okay, when data has it shrinks for whatreve ereason


import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Wind,
  Thermometer,
  Droplets,
  Eye,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  MapPin,
  Calendar,
  Bell,
  Settings,
  Menu,
  X,
  RefreshCw,
  Settings2,
  Clock,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
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
import { UserButton, useUser } from "@clerk/nextjs";
import AirQualityMap from "@/components/air-quality-map";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Import API functions
import { 
  getDashboardData, 
  getDeviceLatest, 
  getDeviceTrends, 
  getCurrentMetrics,
  DashboardDevice,
  CurrentMetrics
} from "@/lib/api";

const WEATHER_API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
const WEATHER_API_BASE = "https://api.weatherapi.com/v1";

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
  condition?: string;
  icon?: string;
  feelsLike?: number;
  uvIndex?: number;
}

const pollutantColors = {
  pm25: "#ef4444",      // Red
  pm10: "#3b82f6",      // Blue
  co: "#06b6d4",        // Cyan
  no2: "#6b7280",       // Gray
  o3: "#f59e0b",        // Amber
  so2: "#10b981",       // Emerald
  temperature: "#10b981",
  humidity: "#8b5cf6",
};

const getStatusBadgeColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "good":
      return "bg-green-100 text-green-800";
    case "moderate":
      return "bg-yellow-100 text-yellow-800";
    case "unhealthy":
      return "bg-orange-100 text-orange-800";
    case "very unhealthy":
      return "bg-red-100 text-red-800";
    case "hazardous":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    case "down":
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    default:
      return <div className="h-4 w-4" />;
  }
};

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<DashboardDevice | null>(null);
  
  // Real data state
  const [devices, setDevices] = useState<DashboardDevice[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<CurrentMetrics | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [visiblePollutants, setVisiblePollutants] = useState({
  pm25: true,
  pm10: true,
  co: true,
  no2: true,
  o3: true,
  so2: true,
  temperature: true,
  humidity: true,
});

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useUser();
  const mapRef = useRef<{ closeAllPopups: () => void } | null>(null);

  // Fetch dashboard data on mount
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getDashboardData();
        setDevices(data);
        console.log('Dashboard data loaded:', data);
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Auto-select first device when devices are loaded
  useEffect(() => {
    if (devices.length > 0 && !selectedLocation) {
      setSelectedLocation(devices[0]);
      console.log('Auto-selected first device:', devices[0].name);
    }
  }, [devices, selectedLocation]);

  // Fetch device details when selected
  useEffect(() => {
    if (selectedLocation) {
      const fetchDeviceData = async () => {
        try {
          console.log('Fetching data for device:', selectedLocation.deviceId);
          
          // Get current metrics
          const metrics = await getCurrentMetrics(selectedLocation.deviceId);
          setCurrentMetrics(metrics);
          console.log('Metrics loaded:', metrics);
          
          // Get trend data
          const trends = await getDeviceTrends(selectedLocation.deviceId, 24);
          setTrendData(trends.data);
          console.log('Trends loaded:', trends);
          
          // Fetch weather for this location
          fetchWeatherData(
            selectedLocation.lat,
            selectedLocation.lng,
            selectedLocation.name
          );
        } catch (error) {
          console.error('Error loading device data:', error);
        }
      };

      fetchDeviceData();
    } else {
      // When no device selected, show default location weather
      fetchWeatherData(3.1319, 101.6569, "University Malaya");
      setCurrentMetrics(null);
      setTrendData([]);
    }
  }, [selectedLocation]);

  // Weather fetch function
  const fetchWeatherData = async (lat: number, lng: number, locationName: string) => {
    if (!WEATHER_API_KEY) {
      setWeatherError("API key not configured");
      return;
    }

    setWeatherLoading(true);
    setWeatherError(null);

    try {
      const response = await fetch(
        `${WEATHER_API_BASE}/current.json?key=${WEATHER_API_KEY}&q=${lat},${lng}&aqi=yes`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();

      const transformedWeather: WeatherData = {
        temperature: Math.round(data.current.temp_c),
        humidity: data.current.humidity,
        windSpeed: Math.round(data.current.wind_kph),
        visibility: data.current.vis_km,
        condition: data.current.condition.text,
        icon: data.current.condition.icon,
        feelsLike: Math.round(data.current.feelslike_c),
        uvIndex: data.current.uv,
      };

      setWeatherData(transformedWeather);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching weather data:", error);
      setWeatherError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setWeatherLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefreshInterval) {
      intervalRef.current = setInterval(() => {
        if (selectedLocation) {
          fetchWeatherData(
            selectedLocation.lat,
            selectedLocation.lng,
            selectedLocation.name
          );
        } else {
          fetchWeatherData(3.1319, 101.6569, "University Malaya");
        }
      }, autoRefreshInterval * 60 * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefreshInterval, selectedLocation]);

  const handleManualRefresh = async () => {
    // Refresh dashboard data
    try {
      const data = await getDashboardData();
      setDevices(data);
      
      // Refresh selected device data if any
      if (selectedLocation) {
        const metrics = await getCurrentMetrics(selectedLocation.deviceId);
        setCurrentMetrics(metrics);
        
        const trends = await getDeviceTrends(selectedLocation.deviceId, 24);
        setTrendData(trends.data);
      }
      
      // Refresh weather
      if (selectedLocation) {
        fetchWeatherData(
          selectedLocation.lat,
          selectedLocation.lng,
          selectedLocation.name
        );
      } else {
        fetchWeatherData(3.1319, 101.6569, "University Malaya");
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes === 1) return "1 minute ago";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours === 1) return "1 hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Calculate average AQI
  const averageAQI = useMemo(() => {
    if (selectedLocation && selectedLocation.aqi) {
      return selectedLocation.aqi.value;
    }
    
    if (devices.length === 0) return 0;
    
    const validAQIs = devices.filter(d => d.aqi).map(d => d.aqi!.value);
    if (validAQIs.length === 0) return 0;
    
    return Math.round(
      validAQIs.reduce((sum, aqi) => sum + aqi, 0) / validAQIs.length
    );
  }, [selectedLocation, devices]);

  const aqiStatus = useMemo(() => {
    if (selectedLocation && selectedLocation.aqi) {
      return selectedLocation.aqi.status;
    }
    
    const aqi = averageAQI;
    if (aqi <= 50) return "good";
    if (aqi <= 100) return "moderate";
    if (aqi <= 150) return "unhealthy";
    if (aqi <= 200) return "very unhealthy";
    return "hazardous";
  }, [selectedLocation, averageAQI]);

  const togglePollutant = (pollutant: string) => {
    setVisiblePollutants((prev) => ({
      ...prev,
      [pollutant]: !prev[pollutant as keyof typeof prev],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

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
            <Button variant="ghost" size="sm" onClick={handleManualRefresh}>
              <RefreshCw className="h-5 w-5" />
            </Button>
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
              <Button
                variant="ghost"
                className="w-full justify-start bg-blue-50 text-blue-700"
              >
                <Wind className="mr-3 h-5 w-5" />
                Dashboard
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
          {/* Show message if no devices */}
          {devices.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Devices Found</h3>
                  <p className="text-gray-600 mb-4">
                    No active devices are currently sending data. Make sure your devices are online and the subscriber is running.
                  </p>
                  <Button onClick={handleManualRefresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {devices.length > 0 && (
            <>
              {/* Top Row: Map and AQI/Weather */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Map Section */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Air Quality Map</CardTitle>
                    <CardDescription>
                      Real-time air quality monitoring devices
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AirQualityMap
                      ref={mapRef}
                      locations={devices}
                      selectedLocation={selectedLocation}
                      onLocationSelect={setSelectedLocation}
                    />

                    {/* Selected location info */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {selectedLocation
                              ? selectedLocation.name
                              : "Overview - All Devices"}
                          </h4>
                          <p className="text-sm text-gray-600">
                            AQI: {averageAQI}
                            {!selectedLocation && devices.length > 1 && " (average)"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {selectedLocation
                              ? `Last updated: ${selectedLocation.lastUpdate ? new Date(selectedLocation.lastUpdate).toLocaleTimeString() : 'N/A'}`
                              : "Click any marker to view specific device data"}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <Badge
                              className={`${getStatusBadgeColor(
                                aqiStatus
                              )} text-sm px-3 py-1`}
                            >
                              {aqiStatus}
                            </Badge>
                          </div>
                          {selectedLocation && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedLocation(null);
                                if (mapRef.current?.closeAllPopups) {
                                  mapRef.current.closeAllPopups();
                                }
                              }}
                              className="h-8 w-8 p-0 hover:bg-gray-200 rounded-full"
                              title="Close location details"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AQI and Weather */}
                <div className="space-y-6">
                  {/* AQI Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Air Quality Index</CardTitle>
                      <CardDescription>
                        {selectedLocation
                          ? selectedLocation.name
                          : devices.length > 1 ? "Average across all devices" : devices[0]?.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center space-y-4">
                        <div className="text-4xl font-bold text-gray-900">
                          {averageAQI}
                        </div>
                        <Badge
                          className={getStatusBadgeColor(aqiStatus)}
                          variant="secondary"
                        >
                          {aqiStatus}
                        </Badge>
                        <div className="space-y-2">
                          <Progress
                            value={(averageAQI / 300) * 100}
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Good</span>
                            <span>Hazardous</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Weather Conditions */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <span>Weather</span>
                            {weatherLoading && (
                              <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                            )}
                          </CardTitle>
                          {weatherData?.condition && (
                            <CardDescription className="flex items-center space-x-2">
                              <img
                                src={weatherData.icon}
                                alt={weatherData.condition}
                                className="w-6 h-6"
                              />
                              <span>{weatherData.condition}</span>
                            </CardDescription>
                          )}
                          {lastUpdated && (
                            <div className="text-xs text-gray-500 mt-1">
                              <Clock className="h-3 w-3 inline mr-1" />
                              Updated {formatLastUpdated(lastUpdated)}
                            </div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleManualRefresh}
                          disabled={weatherLoading}
                          className="h-8 w-8 p-0"
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${
                              weatherLoading ? "animate-spin" : ""
                            }`}
                          />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {weatherData ? (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Thermometer className="h-4 w-4 text-orange-500" />
                              <span className="text-sm">Temperature</span>
                            </div>
                            <span className="font-semibold">
                              {weatherData.temperature}°C
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Droplets className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">Humidity</span>
                            </div>
                            <span className="font-semibold">
                              {weatherData.humidity}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Wind className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">Wind Speed</span>
                            </div>
                            <span className="font-semibold">
                              {weatherData.windSpeed} km/h
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Eye className="h-4 w-4 text-purple-500" />
                              <span className="text-sm">Visibility</span>
                            </div>
                            <span className="font-semibold">
                              {weatherData.visibility} km
                            </span>
                          </div>
                        </>
                      ) : weatherLoading ? (
                        <div className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                          <p className="text-sm text-gray-500 mt-2">
                            Loading weather...
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">
                            Weather data unavailable
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Middle Row: Pollutant Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Readings</CardTitle>
                  <CardDescription>
                    {selectedLocation 
                      ? `Latest sensor data from ${selectedLocation.name}`
                      : 'Select a device to view sensor readings'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentMetrics ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      {Object.entries(currentMetrics.metrics).map(([key, data]) => (
                        <div
                          key={key}
                          className="text-center p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium uppercase tracking-wide">
                              {key.replace(/(\d+)/, "$1.")}
                            </h4>
                            {getTrendIcon(data.trend)}
                          </div>
                          <div className="space-y-2">
                            <div className="text-2xl font-bold">
                              {data.value !== null && data.value !== undefined 
                                ? typeof data.value === 'number' 
                                  ? data.value.toFixed(1) 
                                  : data.value
                                : 'N/A'}
                            </div>
                            <div className="text-xs text-gray-600">{data.unit}</div>
                            <Badge
                              className={`${getStatusBadgeColor(data.status)} text-xs`}
                              variant="secondary"
                            >
                              {data.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Empty state when no device selected
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['PM2.5', 'PM10', 'CO', 'NO2', 'O3', 'SO2', 'Temperature', 'Humidity'].map((metric) => (
                      <div
                        key={metric}
                        className="text-center p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium uppercase tracking-wide text-gray-400">
                            {metric}
                          </h4>
                        </div>
                        <div className="space-y-2">
                          <div className="text-2xl font-bold text-gray-300">--</div>
                          <div className="text-xs text-gray-400">
                            {/* Logic to determine unit based on metric name */}
                            {metric.includes('PM') ? 'µg/m³' : 
                             metric === 'Temperature' ? '°C' :
                             metric === 'Humidity' ? '%' : 'ppm'}
                          </div>
                          <Badge
                            className="bg-gray-100 text-gray-400 text-xs"
                            variant="secondary"
                          >
                            No data
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </CardContent>
              </Card>

              {/* Bottom Row: Trend Graph */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>24-Hour Trends</CardTitle>
                      <CardDescription>
                        {selectedLocation 
                          ? `Hourly averages for ${selectedLocation.name}`
                          : 'Select a device to view trend data'}
                      </CardDescription>
                    </div>
                    {trendData.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(pollutantColors).map(([pollutant, color]) => (
                          <div key={pollutant} className="flex items-center space-x-2">
                            <Checkbox
                              id={pollutant}
                              checked={visiblePollutants[pollutant as keyof typeof visiblePollutants]}
                              onCheckedChange={() => togglePollutant(pollutant)}
                            />
                            <label
                              htmlFor={pollutant}
                              className="text-sm font-medium cursor-pointer flex items-center space-x-1"
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <span>{pollutant.toUpperCase()}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {trendData.length > 0 ? (
                    <ChartContainer
                      config={Object.fromEntries(
                        Object.entries(pollutantColors).map(([key, color]) => [
                          key,
                          { label: key.toUpperCase(), color },
                        ])
                      )}
                      className="h-80"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={trendData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          {Object.entries(pollutantColors).map(
                            ([pollutant, color]) =>
                              visiblePollutants[pollutant as keyof typeof visiblePollutants] && (
                                <Line
                                  key={pollutant}
                                  type="monotone"
                                  dataKey={pollutant}
                                  stroke={color}
                                  strokeWidth={2}
                                  name={pollutant.toUpperCase()}
                                />
                              )
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    // Empty state when no device selected
                    <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-400 mb-2">
                          No Trend Data
                        </h3>
                        <p className="text-sm text-gray-400">
                          Click a device marker on the map to view 24-hour trends
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
}