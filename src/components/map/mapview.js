"use client"
import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, MapPin, Navigation, LocateFixed, Truck, Fuel, Coffee, Flag } from "lucide-react"
import 'leaflet/dist/leaflet.css';

//deploy-comment

export default function MapView({
  tripId,
  startLocation,
  endLocation,
  waypoints = [],
  routePolyline = null, // Add this prop to accept the polyline data
  onLocationUpdate,
}) {
  const mapRef = useRef(null)
  const leafletMapRef = useRef(null)
  const markersRef = useRef([])
  const routeLayerRef = useRef(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentLocation, setCurrentLocation] = useState(null)
  const [isTracking, setIsTracking] = useState(false)
  const [trackingIntervalId, setTrackingIntervalId] = useState(null)

  // Initialize map
  useEffect(() => {
    if (typeof window !== 'undefined' && mapRef.current && !leafletMapRef.current) {
      // Import Leaflet dynamically
      import('leaflet').then((L) => {
        // Initialize CSS - would normally be in _app.js or a global CSS file
        const linkElement = document.createElement('link');
        linkElement.rel = 'stylesheet';
        linkElement.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
        document.head.appendChild(linkElement);

        // Create map centered at start location or default location
        const mapCenter = startLocation ? [startLocation.lat, startLocation.lng] : [40.7128, -74.006];
        const map = L.map(mapRef.current).setView(mapCenter, 12);
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);
        
        leafletMapRef.current = map;
        
        // Add markers for start, end, and waypoints
        addRouteMarkers(L);
        
        // Draw route line with polyline data if available
        drawRoute(L, routePolyline);
        
        setIsLoading(false);
      }).catch(err => {
        setError("Failed to load map library");
        setIsLoading(false);
      });
    }
    
    return () => {
      // Clean up map and tracking on unmount
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      
      if (trackingIntervalId) {
        clearInterval(trackingIntervalId);
      }
    };
  }, [routePolyline]); // Add routePolyline as a dependency
  
  // Update markers when waypoints change
  useEffect(() => {
    if (leafletMapRef.current && typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
        
        // Add markers again
        addRouteMarkers(L);
      });
    }
  }, [waypoints]);
  
  // Update route when routePolyline changes
  useEffect(() => {
    if (leafletMapRef.current && typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        drawRoute(L, routePolyline);
      });
    }
  }, [routePolyline]);
  
  // Function to add markers for start, end and waypoints
  const addRouteMarkers = (L) => {
    // Your existing addRouteMarkers code
    const map = leafletMapRef.current;
    if (!map) return;
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    // Create custom icon factory
    const createIcon = (color, icon) => {
      return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
              </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
    };
    
    // Add start marker
    if (startLocation) {
      const startIcon = createIcon('#3b82f6', '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/>');
      const startMarker = L.marker([startLocation.lat, startLocation.lng], { icon: startIcon })
        .addTo(map)
        .bindPopup(`<b>Start:</b> ${startLocation.address}`);
      markersRef.current.push(startMarker);
    }
    
    // Add end marker
    if (endLocation) {
      const endIcon = createIcon('#ef4444', '<circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/>');
      const endMarker = L.marker([endLocation.lat, endLocation.lng], { icon: endIcon })
        .addTo(map)
        .bindPopup(`<b>Destination:</b> ${endLocation.address}`);
      markersRef.current.push(endMarker);
    }
    
    // Add waypoint markers
    waypoints.forEach(waypoint => {
      let waypointIcon;
      
      switch(waypoint.type) {
        case 'fuel':
          waypointIcon = createIcon('#f59e0b', '<path d="M3 22h12"/><path d="M12 16H6.5a4.5 4.5 0 0 1 0-9H16"/><path d="M10 7V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1h-5"/>');
          break;
        case 'rest':
          waypointIcon = createIcon('#10b981', '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>');
          break;
        case 'checkpoint':
          waypointIcon = createIcon('#6366f1', '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>');
          break;
        default:
          waypointIcon = createIcon('#8b5cf6', '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>');
      }
      
      const waypointMarker = L.marker([waypoint.lat, waypoint.lng], { icon: waypointIcon })
        .addTo(map)
        .bindPopup(`<b>${waypoint.name}</b>${waypoint.timestamp ? `<br>Time: ${new Date(waypoint.timestamp).toLocaleString()}` : ''}`);
      markersRef.current.push(waypointMarker);
    });
    
    // Add current location marker if available
    if (currentLocation) {
      const currentIcon = createIcon('#F94961', '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>');
      const currentMarker = L.marker([currentLocation.lat, currentLocation.lng], { icon: currentIcon })
        .addTo(map)
        .bindPopup('<b>Current Location</b>');
      markersRef.current.push(currentMarker);
    }
    
    // Fit bounds if we have any markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  };
  
  // Function to draw route between points
  const drawRoute = async (L, polylineData) => {
    const map = leafletMapRef.current;
    if (!map) return;
    
    try {
      // Clear existing route
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
      }
      
      // Use the provided polyline data if available
      let points = [];
      
      if (polylineData && Array.isArray(polylineData)) {
        // The polyline is already an array of coordinate pairs
        points = polylineData.map(coord => [coord[1], coord[0]]); // Swap lat/lng for proper display
      } else if (startLocation && endLocation) {
        // Fallback to connecting start/waypoints/end with straight lines
        points = [
          [startLocation.lat, startLocation.lng],
          ...waypoints.map(wp => [wp.lat, wp.lng]),
          [endLocation.lat, endLocation.lng]
        ];
      } else {
        console.log("change")
        // No route to draw
        return;
      }
      
      // Create polyline
      const routeLine = L.polyline(points, {
        color: '#084152',
        weight: 5,
        opacity: 0.7,
        lineJoin: 'round'
      }).addTo(map);
      
      routeLayerRef.current = routeLine;
      
      // Fit the map to show the entire route if there are no markers
      if (markersRef.current.length === 0) {
        map.fitBounds(routeLine.getBounds().pad(0.1));
      }
      
    } catch (err) {
      setError("Failed to draw route: " + err.message);
    }
  };
  
  // Get current location
  const getCurrentLocation = () => {
    setIsLoading(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(newLocation);
          
          // Pan map to current location
          if (leafletMapRef.current) {
            leafletMapRef.current.panTo(newLocation);
          }
          
          // Update markers
          if (typeof window !== 'undefined') {
            import('leaflet').then(L => {
              addRouteMarkers(L);
            });
          }
          
          if (onLocationUpdate) {
            onLocationUpdate(newLocation);
          }
          
          setIsLoading(false);
        },
        (err) => {
          setError(`Error getting location: ${err.message}`);
          setIsLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser");
      setIsLoading(false);
    }
  };
  
  // Toggle location tracking
  const toggleTracking = () => {
    if (isTracking) {
      // Stop tracking
      if (trackingIntervalId) {
        clearInterval(trackingIntervalId);
        setTrackingIntervalId(null);
      }
      setIsTracking(false);
    } else {
      // Start tracking
      getCurrentLocation();
      const intervalId = setInterval(getCurrentLocation, 30000); // Update every 30 seconds
      setTrackingIntervalId(intervalId);
      setIsTracking(true);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Trip Map</CardTitle>
          <div className="flex space-x-2">
          
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="relative w-full h-[400px] rounded-md overflow-hidden border">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-70 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />
        </div>
        
        {startLocation && endLocation && (
          <div className="mt-4 text-sm">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 text-blue-500 mr-2" />
              <span className="font-medium mr-2">Start:</span>
              <span className="text-gray-500">{startLocation.address}</span>
            </div>
            <div className="flex items-center mt-1">
              <MapPin className="h-4 w-4 text-red-500 mr-2" />
              <span className="font-medium mr-2">Destination:</span>
              <span className="text-gray-500">{endLocation.address}</span>
            </div>
            {waypoints.length > 0 && (
              <div className="mt-2">
                <span className="font-medium">Waypoints:</span>
                <div className="ml-6 mt-1 space-y-1">
                  {waypoints.map((waypoint) => (
                    <div key={waypoint.id} className="flex items-center">
                      {waypoint.type === 'fuel' && <Fuel className="h-3 w-3 text-amber-500 mr-1" />}
                      {waypoint.type === 'rest' && <Coffee className="h-3 w-3 text-emerald-500 mr-1" />}
                      {waypoint.type === 'checkpoint' && <Flag className="h-3 w-3 text-indigo-500 mr-1" />}
                      {waypoint.type === 'custom' && <MapPin className="h-3 w-3 text-purple-500 mr-1" />}
                      <span className="text-gray-500">{waypoint.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}