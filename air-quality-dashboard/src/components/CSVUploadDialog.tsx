// components/CSVUploadDialog.tsx
'use client';

import { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Database, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface Device {
  deviceId: string;
  name: string;
  location: any;
}

interface UploadStats {
  total: number;
  inserted: number;
  duplicates: number;
  failed: number;
}

export default function CSVUploadDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [error, setError] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);

  // Fetch devices when dialog opens
  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && devices.length === 0) {
      try {
        const response = await fetch('http://localhost:4000/api/devices');
        const data = await response.json();
        setDevices(data.devices || []);
      } catch (err) {
        console.error('Failed to load devices:', err);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setValidationResult(null);
      setUploadStats(null);

      // Auto-validate file
      await validateFile(selectedFile);
    }
  };

  const validateFile = async (fileToValidate: File) => {
    setValidating(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', fileToValidate);

      const response = await fetch('http://localhost:4000/api/csv-upload/validate', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setValidationResult(data);
        if (!data.valid) {
          setError(`Missing required columns: ${data.missingColumns.join(', ')}`);
        }
      } else {
        setError(data.error || 'Validation failed');
      }
    } catch (err: any) {
      setError('Failed to validate file: ' + err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedDevice) {
      setError('Please select a file and device');
      return;
    }

    if (validationResult && !validationResult.valid) {
      setError('Please fix validation errors before uploading');
      return;
    }

    setUploading(true);
    setError('');
    setUploadStats(null);

    try {
      const deviceInfo = devices.find(d => d.deviceId === selectedDevice);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('deviceId', selectedDevice);
      formData.append('deviceName', deviceInfo?.name || selectedDevice);
      formData.append('location', deviceInfo?.location?.address || 'Unknown');

      const response = await fetch('http://localhost:4000/api/csv-upload/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadStats(data.stats);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err: any) {
      setError('Failed to upload file: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSelectedDevice('');
    setUploadStats(null);
    setError('');
    setValidationResult(null);
  };

  const handleClose = () => {
    handleReset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV Data
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Sensor Data from CSV</DialogTitle>
          <DialogDescription>
            Upload historical sensor data in CSV format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: File Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Step 1: Select CSV File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csv-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">
                      {file ? file.name : 'Click to upload CSV file'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum file size: 10MB
                    </p>
                  </label>
                </div>

                {validating && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Validating file...
                  </div>
                )}

                {validationResult && (
                  <div className={`p-4 rounded-lg ${validationResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start gap-2">
                      {validationResult.valid ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`font-medium ${validationResult.valid ? 'text-green-900' : 'text-red-900'}`}>
                          {validationResult.valid ? 'File is valid' : 'File validation failed'}
                        </p>
                        {validationResult.missingColumns.length > 0 && (
                          <p className="text-sm text-red-700 mt-1">
                            Missing columns: {validationResult.missingColumns.join(', ')}
                          </p>
                        )}
                        {validationResult.valid && (
                          <p className="text-sm text-green-700 mt-1">
                            Found {validationResult.actualColumns.length} columns
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Device Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Step 2: Select Device
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Device</Label>
                <Select value={selectedDevice} onValueChange={setSelectedDevice} disabled={uploading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select device for this data" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        <div className="flex flex-col">
                          <span className="font-medium">{device.name}</span>
                          <span className="text-xs text-gray-500">{device.deviceId}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDevice && (
                  <p className="text-xs text-gray-500">
                    Data will be imported for device: {devices.find(d => d.deviceId === selectedDevice)?.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Upload Progress/Stats */}
          {uploading && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="font-medium text-blue-900">Uploading data...</span>
                  </div>
                  <Progress value={50} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Stats */}
          {uploadStats && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-green-900">
                  <CheckCircle className="h-5 w-5" />
                  Upload Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-green-900">
                      {uploadStats.inserted}
                    </div>
                    <div className="text-sm text-green-700">Records Inserted</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-700">
                      {uploadStats.total}
                    </div>
                    <div className="text-sm text-gray-600">Total Records</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-700">
                      {uploadStats.duplicates}
                    </div>
                    <div className="text-sm text-yellow-600">Duplicates Skipped</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-700">
                      {uploadStats.failed}
                    </div>
                    <div className="text-sm text-red-600">Failed</div>
                  </div>
                </div>
                
                {uploadStats.duplicates > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> {uploadStats.duplicates} duplicate records were skipped. 
                      This data already exists in the database.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {uploadStats ? (
            <>
              <Button variant="outline" onClick={handleReset}>
                Upload Another File
              </Button>
              <Button onClick={handleClose}>
                Done
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={uploading}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || !selectedDevice || uploading || (validationResult && !validationResult.valid)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? 'Uploading...' : 'Upload Data'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}