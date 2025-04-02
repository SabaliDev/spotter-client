"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import MapView from "@/components/map/mapview"
import { useAuth } from "@/contexts/AuthContext"
import { fetchWithAuth } from "@/lib/apiService"

export default function Page() {
  // Get route ID from URL params
  const params = useParams()
  const id = params.id
  
  const { getAccessToken } = useAuth()
  const [routeData, setRouteData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    async function fetchData() {
      if (id) {
        setIsLoading(true);
        try {
          const rawResponse = await fetchWithAuth(`/api/routing/${id}`, getAccessToken);
          console.log("raw res",rawResponse)
          setRouteData(rawResponse);
        } catch (err) {
         
          setError(err.toString()
          );
        } finally {
          setIsLoading(false);
        }
      }
    }
    
    fetchData();
  }, [id]);
  
  
  if (isLoading) {
    return <div className="p-8 flex justify-center">Loading route information...</div>
  }
  
  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>
  }
  
  if (!routeData) {
    return <div className="p-8">No route data available</div>
  }
  
  // Ensure polyline data is in the correct format
  let polylineData;
  try {
    if (typeof routeData.route_polyline === 'string') {
      // If the string starts with [ and ends with ], it's likely a JSON string
      if (routeData.route_polyline.trim().startsWith('[') && routeData.route_polyline.trim().endsWith(']')) {
        polylineData = JSON.parse(routeData.route_polyline);
      } else {
        // Handle other formats if needed (like encoded polylines)
        console.warn("Polyline format not recognized");
        polylineData = [];
      }
    } else {
      // If it's already an array, use it directly
      polylineData = routeData.route_polyline;
    }
  } catch (err) {
    console.error("Failed to parse polyline:", err);
    polylineData = [];
  }
  
  // Process stops data to match the expected format for MapView
  let startLocation = null;
  let endLocation = null;
  let waypoints = [];
  
  // Function to normalize stops data
  const processStops = () => {
    // Case 1: If we have well-formed stops array
    if (routeData.stops && Array.isArray(routeData.stops) && routeData.stops.length >= 2) {
      // Create startLocation from first stop
      const firstStop = routeData.stops[0];
      startLocation = {
        lat: firstStop.coordinates?.[1],
        lng: firstStop.coordinates?.[0],
        address: typeof firstStop.location === 'string' ? firstStop.location : "Starting Point"
      };
      
      // Create endLocation from last stop
      const lastStop = routeData.stops[routeData.stops.length - 1];
      endLocation = {
        lat: lastStop.coordinates?.[1],
        lng: lastStop.coordinates?.[0],
        address: typeof lastStop.location === 'string' ? lastStop.location : "Destination"
      };
      
      // Create waypoints from middle stops
      waypoints = routeData.stops.slice(1, -1).map((stop, index) => ({
        id: stop.id || `wp-${index}`,
        lat: stop.coordinates?.[1],
        lng: stop.coordinates?.[0],
        name: typeof stop.location === 'string' ? stop.location : `Waypoint ${index + 1}`,
        type: stop.reason?.toLowerCase() || "custom"
      }));
    }
    // Case 2: If we have polyline but no valid stops
    else if (polylineData && polylineData.length >= 2) {
      // Use first and last points of polyline
      startLocation = {
        lat: polylineData[0][1],
        lng: polylineData[0][0],
        address: "Starting Point"
      };
      
      endLocation = {
        lat: polylineData[polylineData.length - 1][1],
        lng: polylineData[polylineData.length - 1][0],
        address: "Destination"
      };
    }
  };
  
  // Process the stops
  processStops();
  
  // Ensure we have the minimum required data
  if (!startLocation || !endLocation) {
    return <div className="p-8 text-red-500">Error: Invalid route data structure</div>
  }
  
  // Calculate duration in hours and minutes
  const hours = Math.floor(routeData.duration / 60);
  const minutes = Math.round(routeData.duration % 60);
  const durationText = hours > 0 
    ? `${hours}h ${minutes}m` 
    : `${minutes} min`;
  
  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Route Details: {routeData.trip_title || id}</h1>
      
      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-2">
         
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