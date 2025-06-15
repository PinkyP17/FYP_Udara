"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  CheckCircle,
  Database,
  Cpu,
  Activity,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

interface LogEntry {
  id: string;
  title: string;
  timestamp: string;
  status: "resolved" | "unresolved";
  category: "all" | "iot" | "cloud";
  icon: React.ReactNode;
  message: string;
  details: {
    deviceId?: string;
    location?: string;
    metric?: string;
    value?: string;
    threshold?: string;
    duration?: string;
    errorCode?: string;
    affectedUsers?: string;
    severity?: string;
  };
}

const logEntries: LogEntry[] = [
  {
    id: "1",
    title: "CPU Usage Spike Detected",
    timestamp: "2024-02-10 14:23:45",
    status: "unresolved",
    category: "iot",
    icon: <Cpu className="h-4 w-4" />,
    message:
      "Device ID: IOT-001 experiencing abnormal CPU usage spike above 90% for more than 5 minutes.",
    details: {
      deviceId: "IOT-001",
      location: "Server Room A",
      metric: "CPU Usage",
      value: "95%",
      threshold: "80%",
      duration: "5 minutes",
    },
  },
  {
    id: "2",
    title: "Database Backup Failed",
    timestamp: "2024-02-10 13:15:30",
    status: "resolved",
    category: "cloud",
    icon: <Database className="h-4 w-4" />,
    message:
      "Scheduled database backup failed due to insufficient storage space.",
    details: {
      errorCode: "DB_BACKUP_001",
      location: "Cloud Storage",
      severity: "Medium",
      duration: "2 minutes",
    },
  },
  {
    id: "3",
    title: "Memory Leak Warning",
    timestamp: "2024-02-10 12:45:22",
    status: "unresolved",
    category: "iot",
    icon: <Activity className="h-4 w-4" />,
    message:
      "Device IOT-003 showing signs of memory leak with continuous memory usage increase.",
    details: {
      deviceId: "IOT-003",
      location: "East Station",
      metric: "Memory Usage",
      value: "87%",
      threshold: "75%",
      duration: "15 minutes",
    },
  },
  {
    id: "4",
    title: "API Rate Limit Exceeded",
    timestamp: "2024-02-10 11:30:15",
    status: "resolved",
    category: "cloud",
    icon: <Zap className="h-4 w-4" />,
    message:
      "API rate limit exceeded for external weather service integration.",
    details: {
      errorCode: "API_LIMIT_001",
      affectedUsers: "12",
      severity: "Low",
      duration: "3 minutes",
    },
  },
];

export default function LogMonitoringPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "iot" | "cloud">("all");
  const [selectedLog, setSelectedLog] = useState<LogEntry>(logEntries[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>(logEntries);
  const { user } = useUser();

  const filteredLogs = logs.filter((log) => {
    const matchesTab = activeTab === "all" || log.category === activeTab;
    const matchesSearch = log.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const markAsResolved = (logId: string) => {
    setLogs((prevLogs) =>
      prevLogs.map((log) =>
        log.id === logId ? { ...log, status: "resolved" as const } : log
      )
    );
    if (selectedLog.id === logId) {
      setSelectedLog({ ...selectedLog, status: "resolved" });
    }
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
              <Button
                variant="ghost"
                className="w-full justify-start bg-blue-50 text-blue-700"
              >
                <Settings className="mr-3 h-5 w-5" />
                Log Monitoring
              </Button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-white">
          <div className="flex h-screen">
            {/* Log List Sidebar */}
            <div className="w-96 border-r border-gray-200 flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Log Monitoring
                  </h1>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search logs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  <Button
                    variant={activeTab === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("all")}
                    className={`flex-1 ${
                      activeTab === "all" ? "bg-white shadow-sm" : ""
                    }`}
                  >
                    All Logs
                  </Button>
                  <Button
                    variant={activeTab === "iot" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("iot")}
                    className={`flex-1 ${
                      activeTab === "iot" ? "bg-white shadow-sm" : ""
                    }`}
                  >
                    IoT Devices
                  </Button>
                  <Button
                    variant={activeTab === "cloud" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("cloud")}
                    className={`flex-1 ${
                      activeTab === "cloud" ? "bg-white shadow-sm" : ""
                    }`}
                  >
                    Cloud
                  </Button>
                </div>
              </div>

              {/* Log List */}
              <div className="flex-1 overflow-y-auto">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedLog.id === log.id
                        ? "bg-blue-50 border-l-4 border-l-blue-500"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {log.icon}
                        <h3 className="font-medium text-gray-900">
                          {log.title}
                        </h3>
                      </div>
                      <Badge
                        variant={
                          log.status === "unresolved"
                            ? "destructive"
                            : "secondary"
                        }
                        className={
                          log.status === "unresolved"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-600"
                        }
                      >
                        {log.status === "unresolved"
                          ? "Unresolved"
                          : "Resolved"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{log.timestamp}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Log Details */}
            <div className="flex-1 flex flex-col">
              {selectedLog && (
                <>
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {selectedLog.icon}
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedLog.title}
                        </h2>
                        <Badge
                          variant={
                            selectedLog.status === "unresolved"
                              ? "destructive"
                              : "secondary"
                          }
                          className={
                            selectedLog.status === "unresolved"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-600"
                          }
                        >
                          {selectedLog.status === "unresolved"
                            ? "Unresolved"
                            : "Resolved"}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      {selectedLog.timestamp}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6 space-y-6">
                    {/* Message */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        Message
                      </h3>
                      <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-800">{selectedLog.message}</p>
                      </div>
                    </div>

                    {/* Details */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Details
                      </h3>
                      <div className="space-y-4">
                        {Object.entries(selectedLog.details).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="flex justify-between items-center py-2"
                            >
                              <span className="text-gray-600 capitalize">
                                {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                              </span>
                              <span className="font-medium text-gray-900">
                                {value}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {selectedLog.status === "unresolved" && (
                    <div className="p-6 border-t border-gray-200">
                      <div className="flex justify-end">
                        <Button
                          onClick={() => markAsResolved(selectedLog.id)}
                          className="bg-gray-900 hover:bg-gray-800 text-white flex items-center space-x-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Mark as Resolved</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
