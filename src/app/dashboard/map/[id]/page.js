"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import MapView from "@/components/map/mapview"
import { useAuth } from "@/contexts/AuthContext"

export default function Page() {
  // Properly get params using Next.js hook
  const params = useParams()
  const id = params.id
  
  const { getAccessToken } = useAuth()
  const [routeData, setRouteData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    if (id) {
      // Get route data from sessionStorage
      const storedRoute = sessionStorage.getItem(`route_${id}`);
      if (storedRoute) {
        try {
          setRouteData(JSON.parse(storedRoute));
          sessionStorage.removeItem(`route_${id}`);
        } catch (err) {
          setError("Failed to parse route data");
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
        setError("No route data found in session storage");
      }
    }
  }, [id])
  
  console.log("map data", routeData)
  
  if (isLoading) {
    return <div className="p-8 flex justify-center">Loading route information...</div>
  }
  
  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>
  }
  
  if (!routeData) {
    return <div className="p-8">No route data available</div>
  }
  
  // Parse the route_polyline if it's a string
  let polylineData;
  try {
    polylineData = typeof routeData.route_polyline === 'string' 
      ? JSON.parse(routeData.route_polyline) 
      : routeData.route_polyline;
  } catch (err) {
    console.error("Failed to parse polyline:", err);
    polylineData = [];
  }
  
  // Process the stops data correctly
  const stops = [];

  // Add the pickup/origin point
  if (routeData.stops && Array.isArray(routeData.stops) && routeData.stops.length > 0) {
    // Use the actual stops data if available
    stops.push(...routeData.stops);
  } else if (polylineData && polylineData.length > 0) {
    // If no stops but we have polyline, create stops from first and last points
    stops.push(
      {
        name: "Starting Point",
        location: polylineData[0]
      },
      {
        name: "Destination",
        location: polylineData[polylineData.length - 1]
      }
    );
  } else {
    // Fallback using the route data structure from your example
    if (routeData.stops && routeData.stops[0] && routeData.stops[0].coordinates) {
      stops.push({
        name: routeData.stops[0].location || "Pickup Point",
        location: routeData.stops[0].coordinates
      });
    }
    
    if (routeData.stops && routeData.stops[1] && routeData.stops[1].coordinates) {
      stops.push({
        name: routeData.stops[1].location || "Dropoff Point",
        location: routeData.stops[1].coordinates
      });
    }
  }
  
  // Ensure we have at least 2 stops
  if (stops.length < 2 && polylineData && polylineData.length >= 2) {
    stops.length = 0; // Reset stops if they're invalid
    stops.push(
      { name: "Starting Point", location: polylineData[0] },
      { name: "Destination", location: polylineData[polylineData.length - 1] }
    );
  }
  
  // Prepare waypoints data from middle stops
  const waypoints = stops.slice(1, -1).map((stop, index) => ({
    id: `wp-${index}`,
    lat: stop.location[1], // API returns [lng, lat], but MapView expects lat, lng
    lng: stop.location[0],
    name: stop.name || `Waypoint ${index + 1}`,
    type: stop.type || "custom"
  }));
  
  // Prepare start and end locations
  const startLocation = stops.length > 0 ? {
    lat: stops[0].location[1],
    lng: stops[0].location[0],
    address: stops[0].name || "Starting Point"
  } : null;
  
  const endLocation = stops.length > 1 ? {
    lat: stops[stops.length - 1].location[1],
    lng: stops[stops.length - 1].location[0],
    address: stops[stops.length - 1].name || "Destination"
  } : null;
  
  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Route Details: {routeData.trip_title || id}</h1>
      
      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-2">
          Distance: {(routeData.distance / 1000).toFixed(2)} km •
          Duration: {Math.floor(routeData.duration / 60)} min
        </div>
      </div>
      
      <MapView
        tripId={id}
        startLocation={startLocation}
        endLocation={endLocation}
        waypoints={waypoints}
        routePolyline={polylineData}
        onLocationUpdate={(location) => console.log("Current location updated:", location)}
      />
    </div>
  )
}