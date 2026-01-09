'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import { API_BASE_URL } from '@/lib/api';
import {
  Bell,
  Settings,
  Wind,
  Calendar,
  TrendingUp,
  MapPin,
  Menu,
  Home,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Mail,
  Smartphone,
  Save,
  RotateCcw,
  Plus,
  Minus,
  Search,
  RefreshCw,
  X,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// --- Types & Interfaces ---
interface Threshold {
  enabled: boolean;
  warning?: number;
  critical?: number;
  min?: number;
  max?: number;
  unit: string;
}

interface Thresholds {
  pm2_5: Threshold;
  pm10: Threshold;
  o3: Threshold;
  no2: Threshold;
  so2: Threshold;
  co: Threshold;
  temperature_c: Threshold;
  humidity_pct: Threshold;
}

interface NotificationSettings {
  email: {
    enabled: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  inApp: {
    enabled: boolean;
  };
}

interface Subscription {
  deviceId: string;
  deviceName: string;
  isActive: boolean;
  subscribedAt: string;
}

interface Device {
  deviceId: string;
  name: string;
  location: any;
  status: string;
  isActive: boolean;
}

interface Notification {
  notificationId: string;
  deviceId: string;
  type: string;
  severity: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  sentAt: string;
  sentVia?: string[];
  read: boolean;
}

export default function ThresholdSettingsPage() {
  const { user, isLoaded } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data states
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(
    null
  );
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch data
  useEffect(() => {
    if (!user) return;
    fetchSubscriptions();
    fetchAvailableDevices();
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (selectedDevice && user) {
      fetchThresholds(selectedDevice);
      fetchNotificationSettings(selectedDevice);
    }
  }, [selectedDevice, user]);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/${user?.id}/subscriptions`);
      const data = await response.json();
      if (data.success) {
        setSubscriptions(data.subscriptions);
        if (data.subscriptions.length > 0 && !selectedDevice) {
          setSelectedDevice(data.subscriptions[0].deviceId);
        }
      }
    } catch (err) {
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDevices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/devices`);
      const data = await response.json();
      setAvailableDevices(data.devices || []);
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  const fetchThresholds = async (deviceId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/user/${user?.id}/thresholds/${deviceId}`
      );
      const data = await response.json();
      if (data.success) setThresholds(data.customThresholds);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotificationSettings = async (deviceId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/user/${user?.id}/notification-settings/${deviceId}`
      );
      const data = await response.json();
      if (data.success) setNotificationSettings(data.notificationSettings);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    }
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/user/${user?.id}/notifications?limit=10`
      );
      const data = await response.json();
      if (data.success) {
        setRecentNotifications(data.notifications);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (showRefreshIndicator) {
        setRefreshing(false);
      }
    }
  };

  const handleRefreshNotifications = () => {
    fetchNotifications(true);
  };

  const handleSubscribe = async (device: Device) => {
    if (!user) return;
    setSubscribing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user/${user.id}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: device.deviceId, deviceName: device.name }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(`Successfully subscribed to ${device.name}!`);
        await fetchSubscriptions();
        setSelectedDevice(device.deviceId);
        setShowSubscribeDialog(false);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  const handleSaveThresholds = async () => {
    if (!selectedDevice || !thresholds) return;
    setSaving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/user/${user?.id}/thresholds/${selectedDevice}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(thresholds),
        }
      );
      const data = await response.json();
      if (data.success) {
        setSuccess('Thresholds updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to save thresholds');
    } finally {
      setSaving(false);
    }
  };

  const updateThreshold = (metric: keyof Thresholds, field: string, value: any) => {
    if (!thresholds) return;
    setThresholds({ ...thresholds, [metric]: { ...thresholds[metric], [field]: value } });
  };

  const isSubscribed = (deviceId: string) =>
    subscriptions.some((sub) => sub.deviceId === deviceId && sub.isActive);

  const filteredAvailableDevices = availableDevices.filter((device) => {
    const isAlreadySubbed = isSubscribed(device.deviceId);
    const search = searchQuery.toLowerCase();
    const nameMatch = device.name?.toLowerCase().includes(search);
    const locMatch =
      typeof device.location === 'string'
        ? device.location.toLowerCase().includes(search)
        : device.location?.address?.toLowerCase().includes(search);
    return !isAlreadySubbed && (nameMatch || locMatch);
  });

  const handleResetThresholds = async () => {
    if (!selectedDevice) return;

    if (!confirm("Are you sure you want to reset thresholds to default values?")) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/user/${user?.id}/thresholds/${selectedDevice}/reset`,
        { method: "PUT" }
      );

      const data = await response.json();

      if (data.success) {
        setThresholds(data.customThresholds);
        setSuccess("Thresholds reset to default values!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.error || "Failed to reset thresholds");
      }
    } catch (err) {
      console.error("Error resetting thresholds:", err);
      setError("Failed to connect to the server");
    } finally {
      setSaving(false);
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          badge: 'bg-red-500 text-white',
          icon: <AlertCircle className="h-4 w-4 text-red-600" />,
          dot: 'bg-red-500',
          textColor: 'text-red-900'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          badge: 'bg-amber-500 text-white',
          icon: <AlertCircle className="h-4 w-4 text-amber-600" />,
          dot: 'bg-amber-500',
          textColor: 'text-amber-900'
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          badge: 'bg-blue-500 text-white',
          icon: <AlertCircle className="h-4 w-4 text-blue-600" />,
          dot: 'bg-blue-500',
          textColor: 'text-blue-900'
        };
    }
  };

  const formatMetricName = (metric: string) => {
    const names: Record<string, string> = {
      pm2_5: 'PM2.5',
      pm10: 'PM10',
      o3: 'O₃',
      no2: 'NO₂',
      so2: 'SO₂',
      co: 'CO',
      temperature_c: 'Temperature',
      humidity_pct: 'Humidity'
    };
    return names[metric] || metric.toUpperCase();
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* --- HEADER --- */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
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
                <p className="text-sm text-gray-500">Air Quality Monitoring</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <Bell className="h-5 w-5" />
            </Button>
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* --- SIDEBAR --- */}
        <aside
          className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out border-r`}
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
                  Historical Data
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/dashboard/pollutant-analysis">
                  <TrendingUp className="mr-3 h-5 w-5" />
                  Pollutant Analysis
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/dashboard/iot-monitoring">
                  <MapPin className="mr-3 h-5 w-5" />
                  IoT Monitoring
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/dashboard/logs">
                  <Settings className="mr-3 h-5 w-5" />
                  Log Monitoring
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start bg-blue-50 text-blue-700">
                <Bell className="mr-3 h-5 w-5" />
                Threshold & Notifications
              </Button>
            </div>
          </nav>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 p-6 space-y-6">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Home className="h-4 w-4" />
            <ChevronRight className="h-4 w-4" />
            <Link href="/dashboard" className="hover:text-gray-900">
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-medium">Threshold & Notifications</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Configure alert thresholds and device subscriptions</p>
            </div>

            <Dialog open={showSubscribeDialog} onOpenChange={setShowSubscribeDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" /> Subscribe to Device
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Subscription</DialogTitle>
                  <DialogDescription>
                    Choose a device to start receiving air quality alerts
                  </DialogDescription>
                </DialogHeader>
                <div className="relative my-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search devices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {filteredAvailableDevices.map((device) => (
                    <Card
                      key={device.deviceId}
                      className="p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{device.name}</p>
                          <p className="text-xs text-gray-500 uppercase">{device.deviceId}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSubscribe(device)}
                          disabled={subscribing}
                        >
                          {subscribing ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            'Subscribe'
                          )}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> {success}
            </div>
          )}

          {subscriptions.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold">No Subscriptions Yet</h3>
              <p className="text-gray-500 mb-6">
                Subscribe to a device to configure your custom air quality alerts.
              </p>
              <Button onClick={() => setShowSubscribeDialog(true)}>
                Subscribe to Your First Device
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Device Selector */}
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Device</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a device" />
                      </SelectTrigger>
                      <SelectContent>
                        {subscriptions.map((sub) => (
                          <SelectItem key={sub.deviceId} value={sub.deviceId}>
                            {sub.deviceName || sub.deviceId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Threshold Configuration */}
                {thresholds && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Pollutant Thresholds</CardTitle>
                        <CardDescription>
                          Set warning and critical values for this device
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetThresholds}
                        disabled={saving}
                      >
                        {saving ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-2" />
                        )} 
                        Reset
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {(Object.keys(thresholds) as Array<keyof Thresholds>).map((metric) => (
                        <div key={metric} className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <Label className="text-base font-bold uppercase">
                                {metric === 'pm2_5'
                                  ? 'PM2.5'
                                  : metric === 'pm10'
                                    ? 'PM10'
                                    : metric === 'temperature_c'
                                      ? 'Temperature'
                                      : metric === 'humidity_pct'
                                        ? 'Humidity'
                                        : metric.toUpperCase()}
                              </Label>
                              <span className="text-xs text-gray-500">
                                Unit: {thresholds[metric].unit}
                              </span>
                            </div>
                            <Switch
                              checked={thresholds[metric].enabled}
                              onCheckedChange={(val) => updateThreshold(metric, 'enabled', val)}
                            />
                          </div>

                          {thresholds[metric].enabled && (
                            <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-blue-100">
                              <div className="space-y-2">
                                <Label className="text-xs text-gray-500 uppercase">
                                  {metric === 'temperature_c' || metric === 'humidity_pct'
                                    ? 'Min Value'
                                    : 'Warning Level'}
                                </Label>
                                <Input
                                  type="number"
                                  value={
                                    metric === 'temperature_c' || metric === 'humidity_pct'
                                      ? thresholds[metric].min
                                      : thresholds[metric].warning
                                  }
                                  onChange={(e) => {
                                    const field =
                                      metric === 'temperature_c' || metric === 'humidity_pct'
                                        ? 'min'
                                        : 'warning';
                                    updateThreshold(metric, field, parseFloat(e.target.value));
                                  }}
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-gray-500 uppercase">
                                  {metric === 'temperature_c' || metric === 'humidity_pct'
                                    ? 'Max Value'
                                    : 'Critical Level'}
                                </Label>
                                <Input
                                  type="number"
                                  value={
                                    metric === 'temperature_c' || metric === 'humidity_pct'
                                      ? thresholds[metric].max
                                      : thresholds[metric].critical
                                  }
                                  onChange={(e) => {
                                    const field =
                                      metric === 'temperature_c' || metric === 'humidity_pct'
                                        ? 'max'
                                        : 'critical';
                                    updateThreshold(metric, field, parseFloat(e.target.value));
                                  }}
                                  className="h-9"
                                />
                              </div>
                            </div>
                          )}
                          <Separator />
                        </div>
                      ))}
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
                        onClick={handleSaveThresholds}
                        disabled={saving}
                      >
                        {saving ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save All Thresholds
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Recent Notifications Sidebar - IMPROVED */}
              <div className="space-y-6">
                <Card className="shadow-sm">
                  <CardHeader className="pb-4 space-y-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Bell className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Recent Alerts</CardTitle>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefreshNotifications}
                        disabled={refreshing}
                        className="h-8 w-8 p-0 hover:bg-blue-50"
                        title="Refresh notifications"
                      >
                        <RefreshCw 
                          className={`h-4 w-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} 
                        />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3 pt-0">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 pb-2 border-b">
                      <Clock className="h-3 w-3" />
                      <span>Updated {getRelativeTime(lastRefresh.toISOString())}</span>
                    </div>

                    <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                      {recentNotifications.length > 0 ? (
                        recentNotifications.map((notif) => {
                          const style = getSeverityStyle(notif.severity);
                          
                          return (
                            <div
                              key={notif.notificationId}
                              className={`
                                relative rounded-lg border-2 transition-all duration-200
                                hover:shadow-md group
                                ${style.bg} ${style.border}
                                ${notif.read ? 'opacity-75' : ''}
                              `}
                            >
                              {!notif.read && (
                                <div className="absolute -top-1 -right-1 z-10">
                                  <div className={`h-3 w-3 rounded-full ${style.dot} ring-2 ring-white`} />
                                </div>
                              )}
                              
                              <div className="p-3 space-y-2.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {style.icon}
                                    <Badge className={`${style.badge} text-xs font-bold px-2 py-0.5`}>
                                      {formatMetricName(notif.metric)}
                                    </Badge>
                                  </div>
                                  <span className="text-[10px] font-medium text-gray-600 whitespace-nowrap">
                                    {getRelativeTime(notif.sentAt)}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="text-gray-600">From:</span>
                                  <span className="font-semibold text-gray-800 truncate">
                                    {notif.deviceId}
                                  </span>
                                </div>
                                
                                <div className="bg-white/80 backdrop-blur-sm p-2.5 rounded-md border border-gray-200/50">
                                  <div className="flex items-center justify-between text-xs">
                                    <div className="space-y-1">
                                      <div className="flex items-baseline gap-1">
                                        <span className="text-gray-600">Current:</span>
                                        <span className={`font-bold text-base ${style.textColor}`}>
                                          {notif.value}
                                        </span>
                                        <span className="text-gray-500 text-[10px]">
                                          {notif.threshold && typeof notif.value === 'number' ? 
                                            (notif.value.toString().includes('.') ? 
                                              (notif.metric === 'co' ? 'ppm' : 'ppb') : 'µg/m³') : ''}
                                        </span>
                                      </div>
                                      <div className="flex items-baseline gap-1">
                                        <span className="text-gray-600">Limit:</span>
                                        <span className="font-semibold text-gray-900">
                                          {notif.threshold}
                                        </span>
                                        <span className="text-gray-500 text-[10px]">
                                          {notif.threshold && typeof notif.value === 'number' ? 
                                            (notif.value.toString().includes('.') ? 
                                              (notif.metric === 'co' ? 'ppm' : 'ppb') : 'µg/m³') : ''}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div className="text-right">
                                      <div className={`text-lg font-bold ${style.textColor}`}>
                                        +{Math.round(((notif.value - notif.threshold) / notif.threshold) * 100)}%
                                      </div>
                                      <div className="text-[10px] text-gray-500">
                                        over limit
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between pt-1">
                                  <div className="flex items-center gap-1">
                                    {notif.sentVia?.includes('email') && (
                                      <span className="text-[10px] bg-white/70 px-2 py-0.5 rounded text-gray-600">
                                        📧 Email sent
                                      </span>
                                    )}
                                  </div>
                                  {notif.read && (
                                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                      <CheckCircle2 className="h-3 w-3" />
                                      <span>Read</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-12">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 mb-3">
                            <Bell className="h-8 w-8 text-blue-500" />
                          </div>
                          <p className="text-gray-700 font-medium mb-1">All Clear!</p>
                          <p className="text-sm text-gray-500">
                            No alerts at this time
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {recentNotifications.length > 0 && (
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-2xl font-bold text-blue-900">
                            {recentNotifications.filter(n => n.severity === 'critical').length}
                          </div>
                          <div className="text-xs text-blue-700">Critical Alerts</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-amber-900">
                            {recentNotifications.filter(n => n.severity === 'warning').length}
                          </div>
                          <div className="text-xs text-amber-700">Warnings</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}