"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "your-mapbox-token-here";

interface Location {
  id: string | number;
  deviceId: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  status?: string;
  aqi?: { value: number; status: string } | null;
  pm2_5?: number | null;
  pm10?: number | null;
}

interface AirQualityMapProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationSelect: (location: Location | null) => void;
}

const getStatusColor = (status?: string) => {
  if (!status) return "#6b7280"; // gray for unknown
  
  switch (status.toLowerCase()) {
    case "good":
      return "#10b981"; // green
    case "moderate":
      return "#f59e0b"; // yellow
    case "unhealthy":
    case "unhealthy for sensitive groups":
      return "#f97316"; // orange
    case "very unhealthy":
      return "#ef4444"; // red
    case "hazardous":
      return "#8b5cf6"; // purple
    default:
      return "#6b7280"; // gray
  }
};

const AirQualityMap = forwardRef<
  { closeAllPopups: () => void },
  AirQualityMapProps
>(({ locations, selectedLocation, onLocationSelect }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const activePopups = useRef<mapboxgl.Popup[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Function to close all active popups
  const closeAllPopups = () => {
    activePopups.current.forEach((popup) => popup.remove());
    activePopups.current = [];
  };

  // Expose closeAllPopups to parent component
  useImperativeHandle(ref, () => ({
    closeAllPopups,
  }));

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map centered on University Malaya area
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [101.6569, 3.1319], // University Malaya coordinates
      zoom: 11,
      projection: "mercator",
    });

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add click event to map background to deselect markers
    map.current.on("click", (e) => {
      const features = map.current!.queryRenderedFeatures(e.point);
      if (features.length === 0) {
        closeAllPopups();
        onLocationSelect(null);
        map.current?.flyTo({
          center: [101.6569, 3.1319],
          zoom: 11,
          duration: 1000,
        });
      }
    });

    return () => {
      closeAllPopups();
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onLocationSelect]);

  // Close popups when selection changes
  useEffect(() => {
    closeAllPopups();
  }, [selectedLocation]);

  useEffect(() => {
    if (!map.current || !mapLoaded || !locations || locations.length === 0) return;

    // Clear existing markers and popups
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];
    closeAllPopups();

    // Add markers for each location
    locations.forEach((location) => {
      // Skip if coordinates are invalid
      if (!location.lat || !location.lng) return;

      // Get AQI value and status safely
      const aqiValue = location.aqi?.value ?? 0;
      const aqiStatus = location.aqi?.status || 'good';
      const color = getStatusColor(aqiStatus);

      // Create custom marker element
      const markerElement = document.createElement("div");
      markerElement.className = "air-quality-marker";
      markerElement.innerHTML = `
        <div class="marker-container ${
          selectedLocation?.id === location.id ? "selected" : ""
        }" 
             style="
               width: 48px; 
               height: 48px; 
               background-color: ${color}; 
               border: 3px solid white; 
               border-radius: 50%; 
               display: flex; 
               align-items: center; 
               justify-content: center; 
               font-weight: bold; 
               color: white; 
               font-size: 14px; 
               cursor: pointer; 
               box-shadow: 0 4px 8px rgba(0,0,0,0.3);
               transition: all 0.2s ease;
               ${
                 selectedLocation?.id === location.id
                   ? "transform: scale(1.2); z-index: 1000;"
                   : ""
               }
             ">
          ${aqiValue}
        </div>
        <div class="marker-pin" 
             style="
               width: 0; 
               height: 0; 
               border-left: 6px solid transparent; 
               border-right: 6px solid transparent; 
               border-top: 8px solid ${color}; 
               margin: -2px auto 0; 
               filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
             ">
        </div>
      `;

      // Add hover effects
      markerElement.addEventListener("mouseenter", () => {
        if (selectedLocation?.id !== location.id) {
          const container = markerElement.querySelector(
            ".marker-container"
          ) as HTMLElement;
          if (container) {
            container.style.transform = "scale(1.1)";
          }
        }
      });

      markerElement.addEventListener("mouseleave", () => {
        if (selectedLocation?.id !== location.id) {
          const container = markerElement.querySelector(
            ".marker-container"
          ) as HTMLElement;
          if (container) {
            container.style.transform = "scale(1)";
          }
        }
      });

      // Create marker
      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([location.lng, location.lat])
        .addTo(map.current!);

      // Add click event
      markerElement.addEventListener("click", (e) => {
        e.stopPropagation();
        closeAllPopups();

        if (selectedLocation?.id === location.id) {
          onLocationSelect(null);
          map.current?.flyTo({
            center: [101.6569, 3.1319],
            zoom: 11,
            duration: 1000,
          });
        } else {
          onLocationSelect(location);
          map.current?.flyTo({
            center: [location.lng, location.lat],
            zoom: 13,
            duration: 1000,
          });
        }
      });

      // Add popup on hover
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
      });

      markerElement.addEventListener("mouseenter", () => {
        closeAllPopups();

        // Build popup content with available data
        let popupContent = `
          <div style="padding: 8px; text-align: center;">
            <strong>${location.name}</strong><br>
            <span style="color: ${color};">AQI: ${aqiValue}</span><br>
            <small>${aqiStatus}</small>
        `;
        
        // Add PM2.5 if available
        if (location.pm2_5 !== null && location.pm2_5 !== undefined) {
          popupContent += `<br><small>PM2.5: ${location.pm2_5.toFixed(1)} µg/m³</small>`;
        }
        
        // Add PM10 if available
        if (location.pm10 !== null && location.pm10 !== undefined) {
          popupContent += `<br><small>PM10: ${location.pm10.toFixed(1)} µg/m³</small>`;
        }
        
        popupContent += `</div>`;

        popup
          .setHTML(popupContent)
          .setLngLat([location.lng, location.lat])
          .addTo(map.current!);

        activePopups.current.push(popup);
      });

      markerElement.addEventListener("mouseleave", () => {
        popup.remove();
        activePopups.current = activePopups.current.filter((p) => p !== popup);
      });

      markers.current.push(marker);
    });

    // Fit map to show all markers if there are multiple
    if (locations.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      locations.forEach((loc) => {
        if (loc.lat && loc.lng) {
          bounds.extend([loc.lng, loc.lat]);
        }
      });
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 14,
      });
    }
  }, [locations, selectedLocation, mapLoaded, onLocationSelect]);

  return (
    <div className="relative w-full h-80 rounded-lg overflow-hidden border">
      <div ref={mapContainer} className="w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs">
        <h4 className="font-semibold mb-2">Air Quality Index</h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Good (0-50)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Moderate (51-100)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Unhealthy (101-150)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Very Unhealthy (151-200)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>Hazardous (201+)</span>
          </div>
        </div>
      </div>

      {/* Instructions overlay */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 text-xs max-w-40">
        <p className="text-gray-600">
          <strong>Click</strong> any marker to view location details
        </p>
      </div>
    </div>
  );
});

AirQualityMap.displayName = "AirQualityMap";

export default AirQualityMap;