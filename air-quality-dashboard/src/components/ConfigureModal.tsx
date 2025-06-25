import { useState } from "react";
import { X } from "lucide-react";

interface Device {
  id: string;
  name: string;
  deviceId: string;
}

interface ConfigureModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device;
}

export default function ConfigureModal({
  isOpen,
  onClose,
  device,
}: ConfigureModalProps) {
  console.log(
    "ConfigureModal rendered with isOpen:",
    isOpen,
    "device:",
    device
  );
  const [config, setConfig] = useState({
    samplingRate: 60,
    alertThreshold: 100,
    enableAlerts: true,
    dataRetention: 30,
  });

  if (!isOpen) return null;

  const handleSave = () => {
    // Simulate saving configuration
    alert(`Configuration saved for ${device.name}!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Configure Device</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">{device.name}</h4>
            <p className="text-sm text-gray-600">
              Device ID: {device.deviceId}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sampling Rate (seconds)
            </label>
            <input
              type="number"
              value={config.samplingRate}
              onChange={(e) =>
                setConfig({ ...config, samplingRate: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AQI Alert Threshold
            </label>
            <input
              type="number"
              value={config.alertThreshold}
              onChange={(e) =>
                setConfig({
                  ...config,
                  alertThreshold: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Retention (days)
            </label>
            <input
              type="number"
              value={config.dataRetention}
              onChange={(e) =>
                setConfig({
                  ...config,
                  dataRetention: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableAlerts"
              checked={config.enableAlerts}
              onChange={(e) =>
                setConfig({ ...config, enableAlerts: e.target.checked })
              }
              className="mr-2"
            />
            <label
              htmlFor="enableAlerts"
              className="text-sm font-medium text-gray-700"
            >
              Enable Alerts
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Configuration
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
