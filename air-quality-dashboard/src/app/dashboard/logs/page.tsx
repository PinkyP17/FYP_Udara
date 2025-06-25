"use client";

import React from "react";
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
  Trash2,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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

export default function LogMonitoringPage() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"all" | "iot" | "cloud">(
    "all"
  );
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "resolved" | "unresolved"
  >("all");
  const [selectedLog, setSelectedLog] = React.useState<LogEntry | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const { user } = useUser();
  const [showResolveModal, setShowResolveModal] = React.useState(false);
  const [pendingResolveId, setPendingResolveId] = React.useState<string | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(
    null
  );

  //Button for delete and resolve actions state
  const [isResolving, setIsResolving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Fetch logs from API on mount
  React.useEffect(() => {
    fetch("http://localhost:4000/api/logs")
      .then((res) => res.json())
      .then((data) => {
        setLogs(data);
        if (data.length > 0) setSelectedLog(data[0]);
      });
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesTab = activeTab === "all" || log.category === activeTab;
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesSearch = log.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesTab && matchesStatus && matchesSearch;
  });

  const markAsResolved = async (logId: string) => {
    setIsResolving(true);
    try {
      const response = await fetch(`http://localhost:4000/api/logs/${logId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedLog = await response.json();

      setLogs((logs) =>
        logs.map((log) => (log._id === logId ? updatedLog : log))
      );

      if (selectedLog && selectedLog._id === logId) {
        setSelectedLog(updatedLog);
      }
    } catch (error) {
      console.error("Error resolving log:", error);
      // You might want to show an error message to the user here
      alert("Failed to resolve log. Please try again.");
    } finally {
      setIsResolving(false);
    }
  };

  const deleteLog = async (logId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`http://localhost:4000/api/logs/${logId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const remainingLogs = logs.filter((log) => log._id !== logId);
      setLogs(remainingLogs);

      if (selectedLog && selectedLog._id === logId) {
        setSelectedLog(remainingLogs.length > 0 ? remainingLogs[0] : null);
      }
    } catch (error) {
      console.error("Error deleting log:", error);
      // You might want to show an error message to the user here
      alert("Failed to delete log. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmResolve = () => {
    if (pendingResolveId) {
      markAsResolved(pendingResolveId);
    }
    setShowResolveModal(false);
    setPendingResolveId(null);
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteId) {
      deleteLog(pendingDeleteId);
    }
    setShowDeleteModal(false);
    setPendingDeleteId(null);
  };

  const handleCancelResolve = () => {
    setShowResolveModal(false);
    setPendingResolveId(null);
  };

  const handleResolveClick = (logId: string) => {
    setPendingResolveId(logId);
    setShowResolveModal(true);
  };

  const handleDeleteClick = (logId: string) => {
    setPendingDeleteId(logId);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setPendingDeleteId(null);
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
            <div className="w-[28rem] border-r border-gray-200 flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="mb-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Log Monitoring
                  </h1>
                  <div className="relative w-full mt-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search logs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mt-4 w-full justify-center">
                  <Button
                    variant={activeTab === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("all")}
                    className={`flex-1 ${
                      activeTab === "all"
                        ? "bg-white shadow-sm text-gray-900"
                        : ""
                    }`}
                  >
                    All Logs
                  </Button>
                  <Button
                    variant={activeTab === "iot" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("iot")}
                    className={`flex-1 ${
                      activeTab === "iot"
                        ? "bg-white shadow-sm text-gray-900"
                        : ""
                    }`}
                  >
                    IoT Devices
                  </Button>
                  <Button
                    variant={activeTab === "cloud" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("cloud")}
                    className={`flex-1 ${
                      activeTab === "cloud"
                        ? "bg-white shadow-sm text-gray-900"
                        : ""
                    }`}
                  >
                    Cloud
                  </Button>
                </div>
                {/* Divider */}
                <div className="my-3 border-t w-full" />
                {/* Status Filter */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mt-2 w-full">
                  <Button
                    variant={statusFilter === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                    className={`flex-1 ${
                      statusFilter === "all"
                        ? "bg-white shadow-sm text-gray-900"
                        : ""
                    }`}
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === "resolved" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setStatusFilter("resolved")}
                    className={`flex-1 ${
                      statusFilter === "resolved"
                        ? "bg-white shadow-sm text-gray-900"
                        : ""
                    }`}
                  >
                    Resolved
                  </Button>
                  <Button
                    variant={
                      statusFilter === "unresolved" ? "default" : "ghost"
                    }
                    size="sm"
                    onClick={() => setStatusFilter("unresolved")}
                    className={`flex-1 ${
                      statusFilter === "unresolved"
                        ? "bg-white shadow-sm text-gray-900"
                        : ""
                    }`}
                  >
                    Unresolved
                  </Button>
                </div>
              </div>

              {/* Log List */}
              <div className="flex-1 overflow-y-auto">
                {filteredLogs.map((log) => (
                  <div
                    key={log._id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedLog && selectedLog._id === log._id
                        ? "bg-blue-50 border-l-4 border-l-blue-500"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {/* You may want to map icon string to a component here */}
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
                            : "bg-green-100 text-green-800"
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
            <div className="flex-1 flex flex-col h-full">
              {selectedLog && (
                <>
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {/* You may want to map icon string to a component here */}
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
                              : "bg-green-100 text-green-800"
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
                  <div className="p-6 space-y-6 overflow-auto">
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
                  <div className="mt-6 p-6 border-t border-gray-200">
                    <div className="flex justify-end space-x-3">
                      {selectedLog.status === "unresolved" && (
                        <Button
                          onClick={() => handleResolveClick(selectedLog._id)} // FIXED: Use _id instead of id
                          disabled={isResolving || isDeleting}
                          className="bg-gray-900 hover:bg-gray-800 text-white flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isResolving ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Resolving...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              <span>Mark as Resolved</span>
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDeleteClick(selectedLog._id)} // FIXED: Use _id instead of id
                        disabled={isResolving || isDeleting}
                        variant="destructive"
                        className="flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            <span>Delete Log</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Resolve Confirmation Modal */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Resolve</DialogTitle>
          </DialogHeader>
          <div>
            Are you sure you want to mark this log as resolved? This action
            cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelResolve}>
              Cancel
            </Button>
            <Button
              className="bg-gray-900 hover:bg-gray-800 text-white"
              onClick={handleConfirmResolve}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div>
            Are you sure you want to delete this log? This action cannot be
            undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
