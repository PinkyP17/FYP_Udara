"use client";

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
import UserMenu from "@/components/userMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const WEATHER_API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
const WEATHER_API_BASE = "https://api.weatherapi.com/v1";

// Type definitions for better TypeScript support
interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
  condition?: string;
  icon?: string;
  feelsLike?: number;
  uvIndex?: number;
  airQuality?: {
    pm25: number;
    o3: number;
    no2: number;
    so2: number;
    co: number;
  } | null;
}

// Mock locations around University Malaya area
const locations = [
  {
    id: 1,
    name: "University Malaya",
    lat: 3.1319,
    lng: 101.6569,
    aqi: 78,
    status: "moderate",
  },
  {
    id: 2,
    name: "Petaling Jaya",
    lat: 3.1073,
    lng: 101.6067,
    aqi: 85,
    status: "moderate",
  },
  {
    id: 3,
    name: "Kuala Lumpur City Centre",
    lat: 3.1478,
    lng: 101.6953,
    aqi: 92,
    status: "moderate",
  },
  {
    id: 4,
    name: "Subang Jaya",
    lat: 3.0833,
    lng: 101.5833,
    aqi: 65,
    status: "good",
  },
  {
    id: 5,
    name: "Negeri Sembilan",
    lat: 2.8707,
    lng: 102.2548,
    aqi: 88,
    status: "moderate",
  },
];

// Default overview data when no location is selected
const defaultOverviewData = {
  metrics: {
    pm25: { value: 34.8, unit: "μg/m³", status: "moderate", trend: "stable" },
    o3: { value: 42.1, unit: "μg/m³", status: "good", trend: "stable" },
    no2: { value: 27.6, unit: "μg/m³", status: "good", trend: "stable" },
    so2: { value: 12.8, unit: "μg/m³", status: "good", trend: "stable" },
    co: { value: 0.8, unit: "mg/m³", status: "good", trend: "stable" },
  },
  trendData: [
    { time: "00:00", pm25: 32, o3: 40, no2: 26, so2: 12, co: 0.7 },
    { time: "03:00", pm25: 29, o3: 37, no2: 24, so2: 11, co: 0.6 },
    { time: "06:00", pm25: 35, o3: 42, no2: 28, so2: 13, co: 0.8 },
    { time: "09:00", pm25: 41, o3: 47, no2: 32, so2: 15, co: 1.0 },
    { time: "12:00", pm25: 38, o3: 44, no2: 30, so2: 14, co: 0.9 },
    { time: "15:00", pm25: 35, o3: 42, no2: 28, so2: 13, co: 0.8 },
    { time: "18:00", pm25: 39, o3: 40, no2: 29, so2: 14, co: 0.9 },
    { time: "21:00", pm25: 33, o3: 38, no2: 27, so2: 12, co: 0.7 },
  ],
};

// Mock data for different locations - each location has different air quality patterns
const locationData = {
  1: {
    // University Malaya
    metrics: {
      pm25: { value: 32.1, unit: "μg/m³", status: "moderate", trend: "down" },
      o3: { value: 38.7, unit: "μg/m³", status: "good", trend: "up" },
      no2: { value: 24.2, unit: "μg/m³", status: "good", trend: "down" },
      so2: { value: 11.8, unit: "μg/m³", status: "good", trend: "stable" },
      co: { value: 0.7, unit: "mg/m³", status: "good", trend: "down" },
    },
    trendData: [
      { time: "00:00", pm25: 28, o3: 35, no2: 22, so2: 10, co: 0.6 },
      { time: "03:00", pm25: 25, o3: 32, no2: 20, so2: 9, co: 0.5 },
      { time: "06:00", pm25: 32, o3: 39, no2: 24, so2: 12, co: 0.7 },
      { time: "09:00", pm25: 38, o3: 45, no2: 28, so2: 14, co: 0.9 },
      { time: "12:00", pm25: 35, o3: 42, no2: 26, so2: 13, co: 0.8 },
      { time: "15:00", pm25: 32, o3: 39, no2: 24, so2: 12, co: 0.7 },
      { time: "18:00", pm25: 36, o3: 37, no2: 25, so2: 13, co: 0.8 },
      { time: "21:00", pm25: 30, o3: 35, no2: 23, so2: 11, co: 0.7 },
    ],
  },
  2: {
    // Petaling Jaya
    metrics: {
      pm25: { value: 38.5, unit: "μg/m³", status: "moderate", trend: "up" },
      o3: { value: 45.2, unit: "μg/m³", status: "good", trend: "stable" },
      no2: { value: 29.8, unit: "μg/m³", status: "good", trend: "up" },
      so2: { value: 14.3, unit: "μg/m³", status: "good", trend: "up" },
      co: { value: 0.9, unit: "mg/m³", status: "good", trend: "stable" },
    },
    trendData: [
      { time: "00:00", pm25: 35, o3: 42, no2: 27, so2: 13, co: 0.8 },
      { time: "03:00", pm25: 32, o3: 40, no2: 25, so2: 12, co: 0.7 },
      { time: "06:00", pm25: 39, o3: 45, no2: 30, so2: 14, co: 0.9 },
      { time: "09:00", pm25: 45, o3: 50, no2: 35, so2: 16, co: 1.1 },
      { time: "12:00", pm25: 42, o3: 48, no2: 32, so2: 15, co: 1.0 },
      { time: "15:00", pm25: 39, o3: 45, no2: 30, so2: 14, co: 0.9 },
      { time: "18:00", pm25: 43, o3: 43, no2: 31, so2: 15, co: 1.0 },
      { time: "21:00", pm25: 37, o3: 41, no2: 28, so2: 13, co: 0.8 },
    ],
  },
  3: {
    // KLCC
    metrics: {
      pm25: { value: 42.8, unit: "μg/m³", status: "moderate", trend: "up" },
      o3: { value: 48.1, unit: "μg/m³", status: "good", trend: "stable" },
      no2: { value: 35.7, unit: "μg/m³", status: "good", trend: "up" },
      so2: { value: 16.2, unit: "μg/m³", status: "good", trend: "up" },
      co: { value: 1.1, unit: "mg/m³", status: "good", trend: "up" },
    },
    trendData: [
      { time: "00:00", pm25: 38, o3: 45, no2: 32, so2: 15, co: 1.0 },
      { time: "03:00", pm25: 35, o3: 42, no2: 30, so2: 14, co: 0.9 },
      { time: "06:00", pm25: 43, o3: 48, no2: 36, so2: 16, co: 1.1 },
      { time: "09:00", pm25: 50, o3: 55, no2: 42, so2: 18, co: 1.3 },
      { time: "12:00", pm25: 47, o3: 52, no2: 38, so2: 17, co: 1.2 },
      { time: "15:00", pm25: 43, o3: 48, no2: 36, so2: 16, co: 1.1 },
      { time: "18:00", pm25: 48, o3: 46, no2: 37, so2: 17, co: 1.2 },
      { time: "21:00", pm25: 41, o3: 44, no2: 34, so2: 15, co: 1.0 },
    ],
  },
  4: {
    // Subang Jaya
    metrics: {
      pm25: { value: 26.3, unit: "μg/m³", status: "good", trend: "down" },
      o3: { value: 35.4, unit: "μg/m³", status: "good", trend: "stable" },
      no2: { value: 21.8, unit: "μg/m³", status: "good", trend: "down" },
      so2: { value: 9.5, unit: "μg/m³", status: "good", trend: "down" },
      co: { value: 0.6, unit: "mg/m³", status: "good", trend: "stable" },
    },
    trendData: [
      { time: "00:00", pm25: 24, o3: 32, no2: 20, so2: 8, co: 0.5 },
      { time: "03:00", pm25: 22, o3: 30, no2: 18, so2: 7, co: 0.4 },
      { time: "06:00", pm25: 26, o3: 35, no2: 22, so2: 9, co: 0.6 },
      { time: "09:00", pm25: 30, o3: 40, no2: 25, so2: 11, co: 0.7 },
      { time: "12:00", pm25: 28, o3: 38, no2: 23, so2: 10, co: 0.6 },
      { time: "15:00", pm25: 26, o3: 35, no2: 22, so2: 9, co: 0.6 },
      { time: "18:00", pm25: 29, o3: 33, no2: 24, so2: 10, co: 0.7 },
      { time: "21:00", pm25: 25, o3: 31, no2: 21, so2: 8, co: 0.5 },
    ],
  },
  5: {
    // Bangsar
    metrics: {
      pm25: { value: 36.9, unit: "μg/m³", status: "moderate", trend: "stable" },
      o3: { value: 41.6, unit: "μg/m³", status: "good", trend: "down" },
      no2: { value: 28.4, unit: "μg/m³", status: "good", trend: "stable" },
      so2: { value: 13.1, unit: "μg/m³", status: "good", trend: "up" },
      co: { value: 0.8, unit: "mg/m³", status: "good", trend: "stable" },
    },
    trendData: [
      { time: "00:00", pm25: 33, o3: 38, no2: 26, so2: 12, co: 0.7 },
      { time: "03:00", pm25: 30, o3: 36, no2: 24, so2: 11, co: 0.6 },
      { time: "06:00", pm25: 37, o3: 42, no2: 28, so2: 13, co: 0.8 },
      { time: "09:00", pm25: 42, o3: 47, no2: 32, so2: 15, co: 1.0 },
      { time: "12:00", pm25: 39, o3: 44, no2: 30, so2: 14, co: 0.9 },
      { time: "15:00", pm25: 37, o3: 42, no2: 28, so2: 13, co: 0.8 },
      { time: "18:00", pm25: 40, o3: 40, no2: 29, so2: 14, co: 0.9 },
      { time: "21:00", pm25: 35, o3: 38, no2: 27, so2: 12, co: 0.7 },
    ],
  },
};

const pollutantColors = {
  pm25: "#ef4444", // red
  o3: "#3b82f6", // blue
  no2: "#8b5cf6", // purple
  so2: "#10b981", // green
  co: "#f59e0b", // yellow
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
  const [selectedLocation, setSelectedLocation] = useState<
    (typeof locations)[0] | null
  >(null);

  // Fixed: Include pm10 back in the visiblePollutants state
  const [visiblePollutants, setVisiblePollutants] = useState({
    pm25: true,
    o3: true,
    no2: true,
    so2: true,
    co: true,
  });

  // State for weather data with proper TypeScript types
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number | null>(
    null
  ); // in minutes
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useUser();

  // Function to fetch weather data
  const fetchWeatherData = async (
    lat: number,
    lng: number,
    locationName: string
  ) => {
    if (!WEATHER_API_KEY) {
      console.error(
        "Weather API key not found. Make sure NEXT_PUBLIC_WEATHER_API_KEY is set in your .env.local file"
      );
      setWeatherError("API key not configured");
      return;
    }

    setWeatherLoading(true);
    setWeatherError(null);

    try {
      // Using lat,lng for precise location
      const response = await fetch(
        `${WEATHER_API_BASE}/current.json?key=${WEATHER_API_KEY}&q=${lat},${lng}&aqi=yes`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();

      // Transform the API response to match your current data structure
      const transformedWeather: WeatherData = {
        temperature: Math.round(data.current.temp_c),
        humidity: data.current.humidity,
        windSpeed: Math.round(data.current.wind_kph),
        visibility: data.current.vis_km,
        // Additional data you might want to use
        condition: data.current.condition.text,
        icon: data.current.condition.icon,
        feelsLike: Math.round(data.current.feelslike_c),
        uvIndex: data.current.uv,
        // Air quality data is also available if you want to use it
        airQuality: data.current.air_quality
          ? {
              pm25: data.current.air_quality.pm2_5,
              o3: data.current.air_quality.o3,
              no2: data.current.air_quality.no2,
              so2: data.current.air_quality.so2,
              co: data.current.air_quality.co,
            }
          : null,
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

  // Effect to fetch weather when location changes
  useEffect(() => {
    if (selectedLocation) {
      fetchWeatherData(
        selectedLocation.lat,
        selectedLocation.lng,
        selectedLocation.name
      );
    } else {
      // Fetch weather for University Malaya as default
      fetchWeatherData(3.1319, 101.6569, "University Malaya");
    }
  }, [selectedLocation]);

  // Get current location data based on selected location
  const currentLocationData = useMemo(() => {
    if (!selectedLocation) return defaultOverviewData;
    return (
      locationData[selectedLocation.id as keyof typeof locationData] ||
      defaultOverviewData
    );
  }, [selectedLocation]);

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
      }, autoRefreshInterval * 60 * 1000); // Convert minutes to milliseconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefreshInterval, selectedLocation]);

  const handleManualRefresh = () => {
    if (selectedLocation) {
      fetchWeatherData(
        selectedLocation.lat,
        selectedLocation.lng,
        selectedLocation.name
      );
    } else {
      fetchWeatherData(3.1319, 101.6569, "University Malaya");
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

  // Calculate average AQI when no location is selected
  const averageAQI = useMemo(() => {
    if (selectedLocation) return selectedLocation.aqi;
    return Math.round(
      locations.reduce((sum, loc) => sum + loc.aqi, 0) / locations.length
    );
  }, [selectedLocation]);

  const togglePollutant = (pollutant: string) => {
    setVisiblePollutants((prev) => ({
      ...prev,
      [pollutant]: !prev[pollutant as keyof typeof prev],
    }));
  };

  const mapRef = useRef<{ closeAllPopups: () => void } | null>(null);

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
          {/* Top Row: Map and AQI/Weather */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map Section */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Air Quality Map</CardTitle>
                <CardDescription>
                  Real-time air quality around University Malaya, Malaysia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AirQualityMap
                  ref={mapRef}
                  locations={locations}
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
                          : "Overview - All Locations"}
                      </h4>
                      <p className="text-sm text-gray-600">
                        AQI:{" "}
                        {selectedLocation ? selectedLocation.aqi : averageAQI}
                        {!selectedLocation && " (average)"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedLocation
                          ? "Showing detailed data for this location"
                          : "Click any marker to view specific location data"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <Badge
                          className={`${getStatusBadgeColor(
                            selectedLocation?.status || "moderate"
                          )} text-sm px-3 py-1`}
                        >
                          {selectedLocation?.status || "moderate"}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          Last updated: 2 min ago
                        </p>
                      </div>
                      {selectedLocation && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLocation(null);
                            // Also close any hover popups on the map
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
                      : "Average across all locations"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="text-4xl font-bold text-gray-900">
                      {selectedLocation ? selectedLocation.aqi : averageAQI}
                    </div>
                    <Badge
                      className={getStatusBadgeColor(
                        selectedLocation?.status || "moderate"
                      )}
                      variant="secondary"
                    >
                      {selectedLocation?.status || "moderate"}
                    </Badge>
                    <div className="space-y-2">
                      <Progress
                        value={
                          ((selectedLocation
                            ? selectedLocation.aqi
                            : averageAQI) /
                            300) *
                          100
                        }
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
                          <div className="text-xs text-blue-500 flex items-center space-x-1">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>Loading...</span>
                          </div>
                        )}
                        {weatherError && (
                          <div className="text-xs text-red-500">
                            ⚠️ Failed to load
                          </div>
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

                    {/* Refresh Controls */}
                    <div className="flex items-center space-x-2">
                      {/* Manual Refresh Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleManualRefresh}
                        disabled={weatherLoading}
                        className="h-8 w-8 p-0"
                        title="Refresh weather data"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${
                            weatherLoading ? "animate-spin" : ""
                          }`}
                        />
                      </Button>

                      {/* Auto-refresh Settings */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Auto-refresh settings"
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel className="text-xs">
                            Auto-refresh
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => setAutoRefreshInterval(null)}
                            className={
                              autoRefreshInterval === null ? "bg-blue-50" : ""
                            }
                          >
                            <span className="flex items-center justify-between w-full">
                              Manual only
                              {autoRefreshInterval === null && (
                                <div className="h-2 w-2 bg-blue-500 rounded-full" />
                              )}
                            </span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => setAutoRefreshInterval(5)}
                            className={
                              autoRefreshInterval === 5 ? "bg-blue-50" : ""
                            }
                          >
                            <span className="flex items-center justify-between w-full">
                              Every 5 minutes
                              {autoRefreshInterval === 5 && (
                                <div className="h-2 w-2 bg-blue-500 rounded-full" />
                              )}
                            </span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => setAutoRefreshInterval(10)}
                            className={
                              autoRefreshInterval === 10 ? "bg-blue-50" : ""
                            }
                          >
                            <span className="flex items-center justify-between w-full">
                              Every 10 minutes
                              {autoRefreshInterval === 10 && (
                                <div className="h-2 w-2 bg-blue-500 rounded-full" />
                              )}
                            </span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => setAutoRefreshInterval(15)}
                            className={
                              autoRefreshInterval === 15 ? "bg-blue-50" : ""
                            }
                          >
                            <span className="flex items-center justify-between w-full">
                              Every 15 minutes
                              {autoRefreshInterval === 15 && (
                                <div className="h-2 w-2 bg-blue-500 rounded-full" />
                              )}
                            </span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => setAutoRefreshInterval(30)}
                            className={
                              autoRefreshInterval === 30 ? "bg-blue-50" : ""
                            }
                          >
                            <span className="flex items-center justify-between w-full">
                              Every 30 minutes
                              {autoRefreshInterval === 30 && (
                                <div className="h-2 w-2 bg-blue-500 rounded-full" />
                              )}
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {weatherData ? (
                    // Show real weather data
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Thermometer className="h-4 w-4 text-orange-500" />
                          <span className="text-sm">Temperature</span>
                        </div>
                        <span className="font-semibold">
                          {weatherData.temperature}°C
                          {weatherData.feelsLike && (
                            <span className="text-xs text-gray-500 ml-1">
                              (feels {weatherData.feelsLike}°C)
                            </span>
                          )}
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="h-4 w-4 rounded-full bg-yellow-400 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-yellow-600"></div>
                          </div>
                          <span className="text-sm">UV Index</span>
                        </div>
                        <span className="font-semibold">
                          {weatherData.uvIndex !== undefined
                            ? weatherData.uvIndex
                            : "N/A"}
                        </span>
                      </div>
                    </>
                  ) : weatherLoading ? (
                    // Loading state
                    <div className="text-center py-8">
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto"></div>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Fetching weather data...
                      </p>
                    </div>
                  ) : weatherError ? (
                    // Error state with retry option
                    <div className="text-center py-8">
                      <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-3">
                        Unable to load weather data
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManualRefresh}
                      >
                        Try Again
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Middle Row: Pollutant Details */}
          <Card>
            <CardHeader>
              <CardTitle>Pollutant Levels</CardTitle>
              <CardDescription>
                Current pollutant concentrations for{" "}
                {selectedLocation ? selectedLocation.name : "overview area"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {Object.entries(currentLocationData.metrics).map(
                  ([key, data]) => (
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
                        <div className="text-2xl font-bold">{data.value}</div>
                        <div className="text-xs text-gray-600">{data.unit}</div>
                        <Badge
                          className={`${getStatusBadgeColor(
                            data.status
                          )} text-xs`}
                          variant="secondary"
                        >
                          {data.status}
                        </Badge>
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bottom Row: Trend Graph */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pollutant Trends</CardTitle>
                  <CardDescription>
                    24-hour trend for{" "}
                    {selectedLocation ? selectedLocation.name : "overview area"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(pollutantColors).map(([pollutant, color]) => (
                    <div
                      key={pollutant}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={pollutant}
                        checked={
                          visiblePollutants[
                            pollutant as keyof typeof visiblePollutants
                          ]
                        }
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
                        <span>
                          {pollutant.toUpperCase().replace(/(\d+)/, "$1.")}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={Object.fromEntries(
                  Object.entries(pollutantColors).map(([key, color]) => [
                    key,
                    { label: key.toUpperCase().replace(/(\d+)/, "$1."), color },
                  ])
                )}
                className="h-80"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={currentLocationData.trendData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    {Object.entries(pollutantColors).map(
                      ([pollutant, color]) =>
                        visiblePollutants[
                          pollutant as keyof typeof visiblePollutants
                        ] && (
                          <Line
                            key={pollutant}
                            type="monotone"
                            dataKey={pollutant}
                            stroke={color}
                            strokeWidth={2}
                            name={pollutant
                              .toUpperCase()
                              .replace(/(\d+)/, "$1.")}
                          />
                        )
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
