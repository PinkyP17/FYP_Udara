import { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Device {
  id: string;
  name: string;
  deviceId: string;
  status: string;
  location: string;
  description: string;
  lat: number;
  lng: number;
}

interface ConfigureModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device;
  onUpdate?: () => void;
}

export default function ConfigureModal({ isOpen, onClose, device, onUpdate }: ConfigureModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    status: '',
    notes: '',
    latitude: 0,
    longitude: 0,
  });

  // Initialize form data when device changes or modal opens
  useEffect(() => {
    if (device) {
      setFormData({
        name: device.name || '',
        address: device.location || '',
        status: device.status === 'online' ? 'active' : device.status,
        notes: device.description || '',
        latitude: device.lat || 0,
        longitude: device.lng || 0,
      });
    }
    setError(null);
    setSuccess(null);
  }, [device, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const API_BASE_URL = 'http://localhost:4000/api';

      // Prepare update payload
      const payload = {
        name: formData.name,
        location: {
          address: formData.address,
          coordinates: {
            latitude: parseFloat(formData.latitude.toString()),
            longitude: parseFloat(formData.longitude.toString()),
          },
        },
        status: formData.status === 'online' ? 'active' : formData.status,
        notes: formData.notes,
      };

      const response = await fetch(`${API_BASE_URL}/devices/${device.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update device');
      }

      setSuccess('Device updated successfully!');
      if (onUpdate) onUpdate();

      // Close after a short delay to show success message
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error('Error updating device:', err);
      setError(err.message || 'An error occurred while updating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Edit Device</h3>
            <p className="text-sm text-gray-500">Update configuration for {device.deviceId}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-700 p-3 rounded-md flex items-center gap-2 text-sm">
              <Save className="w-4 h-4" />
              {success}
            </div>
          )}

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General Info</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Device Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Entrance Monitor"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Online)</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Description / Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Enter device description or maintenance notes..."
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="location" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address / Location Name</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g., FSKTM, University of Malaya"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: parseFloat(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                <p>Note: Updating coordinates will move the device pin on the map.</p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
