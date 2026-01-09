'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
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
      const response = await fetch(`http://localhost:4000/api/user/${user?.id}/subscriptions`);
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
      const response = await fetch('http://localhost:4000/api/devices');
      const data = await response.json();
      // Added safety check for the .devices key based on your Postman result
      setAvailableDevices(data.devices || []);
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  const fetchThresholds = async (deviceId: string) => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/user/${user?.id}/thresholds/${deviceId}`
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
        `http://localhost:4000/api/user/${user?.id}/notification-settings/${deviceId}`
      );
      const data = await response.json();
      if (data.success) setNotificationSettings(data.notificationSettings);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/user/${user?.id}/notifications?limit=10`
      );
      const data = await response.json();
      if (data.success) setRecentNotifications(data.notifications);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubscribe = async (device: Device) => {
    if (!user) return;
    setSubscribing(true);
    try {
      const response = await fetch(`http://localhost:4000/api/user/${user.id}/subscribe`, {
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
        `http://localhost:4000/api/user/${user?.id}/thresholds/${selectedDevice}`,
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

  const getNotificationIcon = (severity: string) => (
    <AlertCircle
      className={`h-4 w-4 ${severity === 'critical' ? 'text-red-500' : 'text-yellow-500'}`}
    />
  );

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
                        onClick={() => {
                          /* Add reset logic if needed */
                        }}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" /> Reset
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Updated mapping to include ALL pollutants and environmental metrics */}
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

              {/* Recent Notifications Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Notifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentNotifications.length > 0 ? (
                      recentNotifications.map((notif) => (
                        <div
                          key={notif.notificationId}
                          className={`p-4 rounded-lg border ${notif.read ? 'bg-white' : 'bg-blue-50 border-blue-100'}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              variant={notif.severity === 'critical' ? 'destructive' : 'secondary'}
                            >
                              {notif.metric}
                            </Badge>
                            <span className="text-[10px] text-gray-400 uppercase font-bold">
                              {new Date(notif.sentAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 leading-snug">{notif.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>No recent alerts</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
