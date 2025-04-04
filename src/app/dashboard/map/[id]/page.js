"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MapView from "@/components/map/mapview";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/apiService";

export default function Page() {
  const params = useParams();
  const id = params.id;

  const {
    getAccessToken,
    refreshAccessToken,
    logout,
    loading: authLoading,
  } = useAuth();
  const [routeData, setRouteData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(false);
      return;
    }

    async function fetchData() {
      if (!id) {
        setError("No Trip ID provided.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const rawResponse = await fetchWithAuth(
          `/api/tracking/${id}`,
          getAccessToken,
          refreshAccessToken,
          logout
        );
        setRouteData(rawResponse.route);
      } catch (err) {
        console.error(`Failed to fetch route for ID ${id}:`, err);

        if (err.status === 404) {
          setError(`No route data found for Trip ID ${id}.`);
          setRouteData(null);
        } else if (err.message === "Session expired. Please log in again.") {
          setError("Your session has expired. Please log in again.");
        } else {
          setError(err.toString());
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [id, authLoading, getAccessToken, refreshAccessToken, logout]);

  if (isLoading || authLoading) {
    return (
      <div className="p-8 flex justify-center">
        Loading route information...
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  if (!routeData) {
    return <div className="p-8">No route data available for this trip.</div>;
  }

  let polylineData;
  try {
    if (typeof routeData.route_polyline === "string") {
      if (
        routeData.route_polyline.trim().startsWith("[") &&
        routeData.route_polyline.trim().endsWith("]")
      ) {
        polylineData = JSON.parse(routeData.route_polyline);
      } else {
        console.warn("Polyline format not recognized");
        polylineData = [];
      }
    } else if (Array.isArray(routeData.route_polyline)) {
      polylineData = routeData.route_polyline;
    } else {
      console.warn(
        "route_polyline is neither a parseable string nor an array."
      );
      polylineData = [];
    }
  } catch (err) {
    console.error("Failed to parse polyline:", err);
    polylineData = [];
  }

  let startLocation = null;
  let endLocation = null;
  let waypoints = [];

  const processStops = () => {
    if (
      routeData &&
      Array.isArray(routeData.stops) &&
      routeData.stops.length >= 2
    ) {
      const firstStop = routeData.stops[0];
      if (
        firstStop &&
        firstStop.coordinates &&
        Array.isArray(firstStop.coordinates) &&
        firstStop.coordinates.length === 2
      ) {
        startLocation = {
          lat: firstStop.coordinates[1],
          lng: firstStop.coordinates[0],
          address:
            typeof firstStop.location === "string"
              ? firstStop.location
              : "Starting Point",
        };
      }

      const lastStop = routeData.stops[routeData.stops.length - 1];
      if (
        lastStop &&
        lastStop.coordinates &&
        Array.isArray(lastStop.coordinates) &&
        lastStop.coordinates.length === 2
      ) {
        endLocation = {
          lat: lastStop.coordinates[1],
          lng: lastStop.coordinates[0],
          address:
            typeof lastStop.location === "string"
              ? lastStop.location
              : "Destination",
        };
      }

      waypoints = routeData.stops
        .slice(1, -1)
        .filter(
          (stop) =>
            stop &&
            stop.coordinates &&
            Array.isArray(stop.coordinates) &&
            stop.coordinates.length === 2
        )
        .map((stop, index) => ({
          id: stop.id || `wp-${index}`,
          lat: stop.coordinates[1],
          lng: stop.coordinates[0],
          name:
            typeof stop.location === "string"
              ? stop.location
              : `Waypoint ${index + 1}`,
          type: stop.reason?.toLowerCase() || "custom",
        }));
    } else if (Array.isArray(polylineData) && polylineData.length >= 2) {
      startLocation = {
        lat: polylineData[0][1],
        lng: polylineData[0][0],
        address: "Starting Point (from polyline)",
      };
      endLocation = {
        lat: polylineData[polylineData.length - 1][1],
        lng: polylineData[polylineData.length - 1][0],
        address: "Destination (from polyline)",
      };
      waypoints = [];
    }
  };

  processStops();

  if (!startLocation || !endLocation) {
    console.error(
      "Failed to determine start/end location from route data:",
      routeData
    );
    return (
      <div className="p-8 text-red-500">
        Error: Invalid route data structure (Could not determine start/end
        points).
      </div>
    );
  }

  let durationText = "N/A";
  if (typeof routeData.duration === "number" && !isNaN(routeData.duration)) {
    const hours = Math.floor(routeData.duration / 60);
    const minutes = Math.round(routeData.duration % 60);
    durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Route Details: {routeData.trip_title || `Trip ${id}`}
      </h1>

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Distance:{" "}
          {typeof routeData.distance === "number"
            ? `${routeData.distance.toFixed(1)} miles`
            : "N/A"}
        </p>
    
      </div>

      <MapView
        tripId={id}
        startLocation={startLocation}
        endLocation={endLocation}
        waypoints={waypoints}
        routePolyline={polylineData}
        onLocationUpdate={(location) =>
          console.log("MapView: Current location updated:", location)
        }
      />
    </div>
  );
}
