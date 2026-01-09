'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  CheckCircle,
  Trash2,
  Info,
  AlertOctagon,
  FileText,
  Clock,
  Server,
} from 'lucide-react';
import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Updated LogEntry interface matching new backend schema
interface LogEntry {
  _id: string;
  log_type: string;
  category: string;
  title: string;
  message: string;
  timestamp_detected: string;
  status: 'active' | 'resolved' | 'investigating' | 'closed';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  device_id: string;
  location?: string;
  details?: Record<string, any>;
  auto_generated: boolean;
  timestamp_server: string;
  acknowledged: boolean;
  notes: Array<{
    note: string;
    user?: string;
    timestamp: string;
  }>;
  timestamp_resolved?: string;
}

export default function LogMonitoringPage() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  // activeTab now maps to 'severity group' or 'all'
  const [activeTab, setActiveTab] = React.useState<string>('all');
  // statusFilter maps to 'status'
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const [selectedLog, setSelectedLog] = React.useState<LogEntry | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const { user } = useUser();
  const [showResolveModal, setShowResolveModal] = React.useState(false);
  const [pendingResolveId, setPendingResolveId] = React.useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);

  const [isResolving, setIsResolving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const API_BASE_URL = 'http://localhost:4000/api';

  const fetchLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      // Construct query params
      const params = new URLSearchParams();

      // Map tabs to severity
      if (activeTab === 'info') {
        params.append('severity', 'info');
      } else if (activeTab === 'warning') {
        params.append('severity', 'low,medium');
      } else if (activeTab === 'error') {
        params.append('severity', 'high,critical');
      }

      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`${API_BASE_URL}/logs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch logs');

      const data = await res.json();
      // data.logs contains the array if using pagination structure
      const logList = data.logs || data;
      setLogs(logList);

      // Select first log if none selected or selection no longer exists
      if (!selectedLog && logList.length > 0) {
        setSelectedLog(logList[0]);
      }
    } catch (err) {
      console.error('Error loading logs:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, searchQuery]); // Re-fetch when filters change

  // Initial fetch and when filters change
  React.useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [fetchLogs]);

  // Handle manual selection to avoid it being reset by re-fetches
  const handleLogSelect = (log: LogEntry) => {
    setSelectedLog(log);
  };

  const markAsResolved = async (logId: string) => {
    setIsResolving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved',
          acknowledged: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedLog = await response.json();

      setLogs((prevLogs) => prevLogs.map((log) => (log._id === logId ? updatedLog : log)));

      if (selectedLog && selectedLog._id === logId) {
        setSelectedLog(updatedLog);
      }
    } catch (error) {
      console.error('Error resolving log:', error);
      alert('Failed to resolve log. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  const deleteLog = async (logId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/logs/${logId}`, {
        method: 'DELETE',
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
      console.error('Error deleting log:', error);
      alert('Failed to delete log. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ... (Modal handlers remain mostly the same)
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

  // Helper for Severity Color
  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <AlertOctagon className="h-5 w-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
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
                <p className="text-sm text-gray-500">Welcome back, {user?.firstName || 'User'}!</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right text-sm text-gray-500">
              <div>{new Date().toLocaleDateString()}</div>
              <div>{new Date().toLocaleTimeString()}</div>
            </div>
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
              <Button variant="ghost" className="w-full justify-start bg-blue-50 text-blue-700">
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
                  <h1 className="text-2xl font-bold text-gray-900">Log Monitoring</h1>
                  <div className="relative w-full mt-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search logs by title, message or device..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                </div>

                {/* Tabs - Severity Categories */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mt-4 w-full justify-center">
                  <Button
                    variant={activeTab === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('all')}
                    className={`flex-1 ${
                      activeTab === 'all' ? 'bg-white shadow-sm text-gray-900' : ''
                    }`}
                  >
                    All
                  </Button>
                  <Button
                    variant={activeTab === 'info' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 ${
                      activeTab === 'info' ? 'bg-white shadow-sm text-gray-900' : ''
                    }`}
                  >
                    Info
                  </Button>
                  <Button
                    variant={activeTab === 'warning' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('warning')}
                    className={`flex-1 ${
                      activeTab === 'warning' ? 'bg-white shadow-sm text-gray-900' : ''
                    }`}
                  >
                    Warning
                  </Button>
                  <Button
                    variant={activeTab === 'error' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('error')}
                    className={`flex-1 ${
                      activeTab === 'error' ? 'bg-white shadow-sm text-gray-900' : ''
                    }`}
                  >
                    Error
                  </Button>
                </div>
                {/* Divider */}
                <div className="my-3 border-t w-full" />
                {/* Status Filter */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mt-2 w-full">
                  <Button
                    variant={statusFilter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                    className={`flex-1 ${
                      statusFilter === 'all' ? 'bg-white shadow-sm text-gray-900' : ''
                    }`}
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === 'active' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter('active')}
                    className={`flex-1 ${
                      statusFilter === 'active' ? 'bg-white shadow-sm text-gray-900' : ''
                    }`}
                  >
                    Active
                  </Button>
                  <Button
                    variant={statusFilter === 'resolved' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter('resolved')}
                    className={`flex-1 ${
                      statusFilter === 'resolved' ? 'bg-white shadow-sm text-gray-900' : ''
                    }`}
                  >
                    Resolved
                  </Button>
                </div>
              </div>

              {/* Log List */}
              <div className="flex-1 overflow-y-auto">
                {logs.length === 0 && !loading && (
                  <div className="p-8 text-center text-gray-500">
                    No logs found matching your criteria.
                  </div>
                )}
                {logs.map((log) => (
                  <div
                    key={log._id}
                    onClick={() => handleLogSelect(log)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedLog && selectedLog._id === log._id
                        ? 'bg-blue-50 border-l-4 border-l-blue-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-medium text-gray-900 truncate">{log.title}</h3>
                        <div className="flex items-center text-xs text-gray-500 mt-1 space-x-2">
                          <span className="font-mono bg-gray-100 px-1 rounded">
                            {log.device_id}
                          </span>
                          <span>•</span>
                          <span>{new Date(log.timestamp_detected).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${getSeverityColor(log.severity)} whitespace-nowrap`}
                      >
                        {log.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 border-transparent ${
                          log.status === 'active'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </Badge>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400">
                          {new Date(log.timestamp_detected).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(log._id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Log Details */}
            <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
              {selectedLog ? (
                <>
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div
                          className={`p-2 rounded-lg ${getSeverityColor(selectedLog.severity)} bg-opacity-20`}
                        >
                          {getSeverityIcon(selectedLog.severity)}
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900 leading-tight">
                            {selectedLog.title}
                          </h2>
                          <div className="flex items-center text-sm text-gray-500 mt-1 space-x-3">
                            <div className="flex items-center">
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              {new Date(selectedLog.timestamp_detected).toLocaleString()}
                            </div>
                            <div className="flex items-center">
                              <Server className="w-3.5 h-3.5 mr-1" />
                              {selectedLog.device_id}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge
                          variant="outline"
                          className={`text-sm px-3 py-1 border-transparent ${
                            selectedLog.status === 'active'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {selectedLog.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Message Box */}
                    <div
                      className={`p-4 rounded-lg border ${getSeverityColor(selectedLog.severity)} bg-opacity-10`}
                    >
                      <h3 className="text-sm font-semibold mb-1 opacity-90">Message</h3>
                      <p className="text-gray-900">{selectedLog.message}</p>
                    </div>

                    {/* Technical Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Context Info */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 border-b pb-2 flex items-center">
                          <FileText className="w-4 h-4 mr-2" /> Context
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Log Type</span>
                            <span className="font-medium">{selectedLog.log_type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Category</span>
                            <span className="font-medium">{selectedLog.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Location</span>
                            <span className="font-medium">{selectedLog.location || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Server Timestamp</span>
                            <span className="font-medium">
                              {new Date(selectedLog.timestamp_server).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Extended Details */}
                      {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium text-gray-900 border-b pb-2 flex items-center">
                            <Info className="w-4 h-4 mr-2" /> Extended Details
                          </h3>
                          <div className="bg-gray-50 rounded-md p-3 text-xs font-mono overflow-auto max-h-48 border">
                            <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes Section */}
                    {selectedLog.notes && selectedLog.notes.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">
                          Notes
                        </h3>
                        <div className="space-y-4">
                          {selectedLog.notes.map((note, idx) => (
                            <div
                              key={idx}
                              className="bg-yellow-50 p-3 rounded-lg border border-yellow-100"
                            >
                              <p className="text-sm text-gray-800">{note.note}</p>
                              <div className="mt-2 text-xs text-gray-500 flex justify-between">
                                <span>{note.user || 'System'}</span>
                                <span>{new Date(note.timestamp).toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-end space-x-3">
                      {selectedLog.status === 'active' && (
                        <Button
                          onClick={() => handleResolveClick(selectedLog._id)}
                          disabled={isResolving || isDeleting}
                          className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm"
                        >
                          {isResolving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Resolving...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Mark as Resolved
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDeleteClick(selectedLog._id)}
                        disabled={isResolving || isDeleting}
                        variant="destructive"
                        className="shadow-sm"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <FileText className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">No log selected</p>
                  <p className="text-sm">Select a log from the list to view details</p>
                </div>
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
          <div className="py-4">
            <p className="text-gray-600">Are you sure you want to mark this log as resolved?</p>
            <p className="text-sm text-gray-500 mt-2">
              This will update the status to <strong>Resolved</strong> and timestamp the resolution
              action.
            </p>
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
          <div className="py-4">
            <p className="text-gray-600">Are you sure you want to delete this log?</p>
            <p className="text-sm text-red-500 mt-2 font-medium">This action cannot be undone.</p>
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

// Simple loader component
function Loader2({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
