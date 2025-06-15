"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// You'll need to get this from mapbox.com
mapboxgl.accessToken =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "your-mapbox-token-here";

interface Location {
  id: number;
  name: string;
  lat: number;
  lng: number;
  aqi: number;
  status: string;
}

interface AirQualityMapProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationSelect: (location: Location | null) => void;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "good":
      return "#10b981"; // green
    case "moderate":
      return "#f59e0b"; // yellow
    case "unhealthy":
      return "#f97316"; // orange
    case "very unhealthy":
      return "#ef4444"; // red
    case "hazardous":
      return "#8b5cf6"; // purple
    default:
      return "#6b7280"; // gray
  }
};

export default function AirQualityMap({
  locations,
  selectedLocation,
  onLocationSelect,
}: AirQualityMapProps) {
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

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map centered on University Malaya area
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [101.6569, 3.1319], // University Malaya coordinates
      zoom: 11, // Closer zoom to focus on the area
      projection: "mercator",
    });

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add click event to map background to deselect markers
    map.current.on("click", (e) => {
      // Check if click was on the map background (not on a marker)
      const features = map.current!.queryRenderedFeatures(e.point);
      if (features.length === 0) {
        closeAllPopups();
        onLocationSelect(null);
        // Return to overview
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
    if (!map.current || !mapLoaded) return;

    // Clear existing markers and popups
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];
    closeAllPopups();

    // Add markers for each location
    locations.forEach((location) => {
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
               background-color: ${getStatusColor(location.status)}; 
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
          ${location.aqi}
        </div>
        <div class="marker-pin" 
             style="
               width: 0; 
               height: 0; 
               border-left: 6px solid transparent; 
               border-right: 6px solid transparent; 
               border-top: 8px solid ${getStatusColor(location.status)}; 
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
        e.stopPropagation(); // Prevent map click event

        // Close all popups first
        closeAllPopups();

        // If clicking the same marker, deselect it
        if (selectedLocation?.id === location.id) {
          onLocationSelect(null);
          // Return to overview
          map.current?.flyTo({
            center: [101.6569, 3.1319],
            zoom: 11,
            duration: 1000,
          });
        } else {
          // Select new location
          onLocationSelect(location);
          // Fly to location
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
        // Close any existing popups first
        closeAllPopups();

        popup
          .setHTML(
            `
          <div style="padding: 8px; text-align: center;">
            <strong>${location.name}</strong><br>
            <span style="color: ${getStatusColor(location.status)};">AQI: ${
              location.aqi
            }</span><br>
            <small>${location.status}</small>
          </div>
        `
          )
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

      {/* Simplified instructions overlay */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 text-xs max-w-40">
        <p className="text-gray-600">
          <strong>Click</strong> any marker to view location details
        </p>
      </div>
    </div>
  );
}
