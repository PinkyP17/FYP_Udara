'use client';
import { Button } from '@/components/ui/button';
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
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

interface DataReading {
  id: string;
  timestamp: string;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  flagged?: boolean;
}

interface DataBatch {
  id: string;
  batchId: string;
  date: string;
  deviceId: string;
  readingsCount: number;
  status: 'unverified' | 'verified' | 'rejected';
  readings: DataReading[];
}

const dataBatches: DataBatch[] = [
  {
    id: '1',
    batchId: 'BATCH-001',
    date: '2024-02-15',
    deviceId: 'DEV-A123',
    readingsCount: 48,
    status: 'unverified',
    readings: [
      {
        id: '1',
        timestamp: '15:00:00',
        pm25: 12.5,
        pm10: 25.3,
        temperature: 23.1,
        humidity: 45,
      },
      {
        id: '2',
        timestamp: '14:45:00',
        pm25: 35.8,
        pm10: 68.2,
        temperature: 24.2,
        humidity: 48,
        flagged: true,
      },
      {
        id: '3',
        timestamp: '14:30:00',
        pm25: 15.2,
        pm10: 28.7,
        temperature: 23.8,
        humidity: 46,
      },
      {
        id: '4',
        timestamp: '14:15:00',
        pm25: 13.9,
        pm10: 26.4,
        temperature: 23.5,
        humidity: 47,
      },
    ],
  },
  {
    id: '2',
    batchId: 'BATCH-002',
    date: '2024-02-15',
    deviceId: 'DEV-B456',
    readingsCount: 36,
    status: 'unverified',
    readings: [],
  },
  {
    id: '3',
    batchId: 'BATCH-003',
    date: '2024-02-14',
    deviceId: 'DEV-C789',
    readingsCount: 24,
    status: 'unverified',
    readings: [],
  },
];

export default function DataVerificationPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<DataBatch>(dataBatches[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useUser();

  const handleVerifyBatch = () => {
    // Handle batch verification
    console.log('Verifying batch:', selectedBatch.batchId);
  };

  const handleRejectBatch = () => {
    // Handle batch rejection
    console.log('Rejecting batch:', selectedBatch.batchId);
  };

  const handleEditReading = (readingId: string) => {
    // Handle edit reading
    console.log('Editing reading:', readingId);
  };

  const handleDeleteReading = (readingId: string) => {
    // Handle delete reading
    console.log('Deleting reading:', readingId);
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
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/dashboard/pollutant-analysis">
                  <TrendingUp className="mr-3 h-5 w-5" />
                  Pollutant Data Analysis
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start bg-blue-50 text-blue-700">
                <AlertTriangle className="mr-3 h-5 w-5" />
                Air Quality Data Verification
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
        <main className="flex-1 bg-white">
          <div className="flex h-screen">
            {/* Batch List Sidebar */}
            <div className="w-80 border-r border-gray-200 flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">
                  Air Quality Data Verification
                </h1>
                <h2 className="text-lg font-medium text-gray-900">Unverified Batches</h2>
              </div>

              {/* Batch List */}
              <div className="flex-1 overflow-y-auto">
                {dataBatches.map((batch) => (
                  <div
                    key={batch.id}
                    onClick={() => setSelectedBatch(batch)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedBatch.id === batch.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{batch.batchId}</h3>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                        {batch.status}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Date: {batch.date}</p>
                      <p>Device ID: {batch.deviceId}</p>
                      <p>{batch.readingsCount} readings</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Batch Details */}
            <div className="flex-1 flex flex-col">
              {selectedBatch && (
                <>
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          Batch Details: {selectedBatch.batchId}
                        </h2>
                        <p className="text-sm text-gray-600">
                          Device: {selectedBatch.deviceId} • Date: {selectedBatch.date}
                        </p>
                      </div>
                      <div className="flex space-x-3">
                        <Button
                          onClick={handleVerifyBatch}
                          className="bg-gray-900 hover:bg-gray-800 text-white"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Verify Batch
                        </Button>
                        <Button onClick={handleRejectBatch} variant="destructive">
                          <X className="h-4 w-4 mr-2" />
                          Reject Batch
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-6">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4 font-medium text-gray-600">
                                Timestamp
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600">
                                PM2.5 (μg/m³)
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600">
                                PM10 (μg/m³)
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600">
                                Temperature (°C)
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600">
                                Humidity (%)
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedBatch.readings.map((reading) => (
                              <tr
                                key={reading.id}
                                className={`border-b border-gray-100 hover:bg-gray-50 ${
                                  reading.flagged ? 'bg-red-50' : ''
                                }`}
                              >
                                <td className="py-3 px-4 text-gray-900">{reading.timestamp}</td>
                                <td className="py-3 px-4 text-gray-900">{reading.pm25}</td>
                                <td className="py-3 px-4 text-gray-900">{reading.pm10}</td>
                                <td className="py-3 px-4 text-gray-900">{reading.temperature}</td>
                                <td className="py-3 px-4 text-gray-900">{reading.humidity}</td>
                                <td className="py-3 px-4">
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditReading(reading.id)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteReading(reading.id)}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-6">
                        <p className="text-sm text-gray-600">
                          Showing {selectedBatch.readings.length} of {selectedBatch.readingsCount}{' '}
                          readings
                        </p>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="px-3 py-1 text-sm bg-gray-100 rounded">
                            {currentPage}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={selectedBatch.readings.length < 10}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
