import { useState, useEffect } from 'react';
import { Check, AlertTriangle, X } from 'lucide-react';

// Cat SVG component
function CatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2M21 9V7L15 1L13.5 2.5C13.1 2.1 12.6 2 12 2C10.9 2 10 2.9 10 4C10 4.6 10.1 5.1 10.5 5.5L9 7V9C9 10.1 9.9 11 11 11V15.5C11 16.3 11.7 17 12.5 17S14 16.3 14 15.5V11C15.1 11 16 10.1 16 9M4.5 11L6 9.5C6.6 8.9 7.4 8.9 8 9.5S8.9 10.6 8.3 11.2L6.8 12.7C6.4 13.1 5.8 13.1 5.4 12.7S4.9 11.9 5.3 11.5L4.5 11M19.5 11L18 9.5C17.4 8.9 16.6 8.9 16 9.5S15.1 10.6 15.7 11.2L17.2 12.7C17.6 13.1 18.2 13.1 18.6 12.7S19.1 11.9 18.7 11.5L19.5 11Z" />
    </svg>
  );
}

interface Device {
  id: string;
  name: string;
  deviceId: string;
  status: 'online' | 'offline';
}

interface PingModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device;
}

export default function PingModal({ isOpen, onClose, device }: PingModalProps) {
  console.log('PingModal rendered with isOpen:', isOpen, 'device:', device);
  const [pingStatus, setPingStatus] = useState<'pinging' | 'success' | 'failed'>('pinging');

  useEffect(() => {
    if (isOpen) {
      setPingStatus('pinging');

      const timer = setTimeout(() => {
        if (device.status === 'offline') {
          setPingStatus('failed');
        } else {
          setPingStatus('success');
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, device.status]);

  const handleClose = () => {
    setPingStatus('pinging');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Ping Device</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative mb-6">
            {pingStatus === 'pinging' && (
              <div className="relative w-64 h-32 flex items-center justify-center">
                {/* Wavy animated dots with more pronounced wave effect */}
                <div className="flex items-end space-x-3">
                  <div
                    className="w-5 h-5 bg-blue-300 rounded-full"
                    style={{
                      animation: 'wave 1.2s ease-in-out infinite',
                      animationDelay: '0s',
                    }}
                  ></div>
                  <div
                    className="w-5 h-5 bg-blue-400 rounded-full"
                    style={{
                      animation: 'wave 1.2s ease-in-out infinite',
                      animationDelay: '0.15s',
                    }}
                  ></div>
                  <div
                    className="w-6 h-6 bg-blue-500 rounded-full"
                    style={{
                      animation: 'wave 1.2s ease-in-out infinite',
                      animationDelay: '0.3s',
                    }}
                  ></div>

                  {/* Cat icon that bounces with the wave */}
                  <div
                    className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center mx-2"
                    style={{
                      animation: 'wave 1.2s ease-in-out infinite',
                      animationDelay: '0.45s',
                    }}
                  >
                    <CatIcon className="w-7 h-7 text-white" />
                  </div>

                  <div
                    className="w-6 h-6 bg-blue-500 rounded-full"
                    style={{
                      animation: 'wave 1.2s ease-in-out infinite',
                      animationDelay: '0.6s',
                    }}
                  ></div>
                  <div
                    className="w-5 h-5 bg-blue-400 rounded-full"
                    style={{
                      animation: 'wave 1.2s ease-in-out infinite',
                      animationDelay: '0.75s',
                    }}
                  ></div>
                  <div
                    className="w-5 h-5 bg-blue-300 rounded-full"
                    style={{
                      animation: 'wave 1.2s ease-in-out infinite',
                      animationDelay: '0.9s',
                    }}
                  ></div>
                </div>

                {/* Custom CSS animation */}
                <style jsx>{`
                  @keyframes wave {
                    0%,
                    100% {
                      transform: translateY(0px);
                    }
                    50% {
                      transform: translateY(-20px);
                    }
                  }
                `}</style>
              </div>
            )}

            {pingStatus === 'success' && (
              <div className="w-32 h-32 flex items-center justify-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                  <Check className="w-8 h-8 text-white" />
                </div>
              </div>
            )}

            {pingStatus === 'failed' && (
              <div className="w-32 h-32 flex items-center justify-center">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
              </div>
            )}
          </div>

          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">{device.name}</h3>
            <p className="text-sm text-gray-600 mb-4">Device ID: {device.deviceId}</p>

            {pingStatus === 'pinging' && (
              <div>
                <p className="text-blue-600 font-medium">Pinging device...</p>
                <p className="text-sm text-gray-500">Please wait</p>
              </div>
            )}

            {pingStatus === 'success' && (
              <div>
                <p className="text-green-600 font-medium">Device Response</p>
                <p className="text-sm text-gray-500">Connection successful</p>
              </div>
            )}

            {pingStatus === 'failed' && (
              <div>
                <p className="text-red-600 font-medium">No Response</p>
                <p className="text-sm text-gray-500">Device appears to be offline</p>
              </div>
            )}
          </div>

          {pingStatus !== 'pinging' && (
            <button
              onClick={handleClose}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
