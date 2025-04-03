// src/app/dashboard/trips/page.js
"use client";
import { useEffect, useState } from "react";
import TripCard from "@/components/trip/TripCard";
import { AlertCircle, CheckCircle } from "lucide-react"; // Added CheckCircle for success
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { fetchWithAuth } from "@/lib/apiService";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react"; // Ensure Loader2 is imported if used elsewhere

export default function TripListView() {
    const { getAccessToken, refreshAccessToken, logout, loading: authLoading } = useAuth();
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null); // State for success messages
    const [actionLoadingId, setActionLoadingId] = useState(null); // Track which trip action is loading


    const fetchTrips = async () => { // Make fetchTrips reusable
        setLoading(true);
        setError(null);
        setSuccessMessage(null); // Clear success message on refresh
        try {
            const rawResponse = await fetchWithAuth(
                "/api/tracking/list",
                getAccessToken,
                refreshAccessToken,
                logout
            );
            const data = Array.isArray(rawResponse) ? rawResponse : [];
            setTrips(data);
        } catch (err) {
             // Keep existing error handling...
            if (err.message === "Session expired. Please log in again.") {
               setError("Your session has expired. Please log in again.");
             } else {
               setError(err.message || "Could not load trips.");
             }
             setTrips([]);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch effect
    useEffect(() => {
        if (authLoading) {
            return;
        }
        fetchTrips();
    }, [authLoading]); // Remove other dependencies if fetchTrips handles them implicitly via useAuth

    // --- Action Handlers ---
    const handleStartTrip = async (tripId) => {
        setActionLoadingId(tripId); // Indicate loading for this specific trip
        setError(null);
        setSuccessMessage(null);
        try {
            await fetchWithAuth(
                `/api/tracking/${tripId}/start/`,
                getAccessToken,
                refreshAccessToken,
                logout,
                { method: "POST" } // Specify POST method
            );
            setSuccessMessage(`Trip ${tripId} started successfully!`);
            await fetchTrips(); // Refresh list after success
        } catch (err) {
            console.error(`Failed to start trip ${tripId}:`, err);
            setError(`Failed to start trip ${tripId}: ${err.message || 'Unknown error'}`);
        } finally {
            setActionLoadingId(null); // Clear loading indicator
        }
    };

    const handleUpdateTripStatus = async (tripId, newStatus) => {
        setActionLoadingId(tripId); // Indicate loading for this specific trip
        setError(null);
        setSuccessMessage(null);
        try {
            await fetchWithAuth(
                `/api/tracking/${tripId}/update/`,
                getAccessToken,
                refreshAccessToken,
                logout,
                {
                    method: "PUT", // Specify PUT method
                    body: JSON.stringify({ status: newStatus }),
                }
            );
             setSuccessMessage(`Trip ${tripId} status updated to ${newStatus}.`);
             await fetchTrips(); // Refresh list after success
        } catch (err) {
             console.error(`Failed to update trip ${tripId} to ${newStatus}:`, err);
             setError(`Failed to update trip ${tripId} status: ${err.message || 'Unknown error'}`);
        } finally {
             setActionLoadingId(null); // Clear loading indicator
        }
    };

    // --- Helper functions (formatTripData, calculateDistance, toRad) ---
    // Keep your existing helper functions here...
    const formatTripData = (apiTrip) => ({ /* ... as before ... */
         id: apiTrip.id,
         title: apiTrip.title,
         status: apiTrip.status,
         description: apiTrip.description,
         startLocation: apiTrip.pickup_location,
         endLocation: apiTrip.dropoff_location,
         startDate: apiTrip.startDate ? new Date(apiTrip.startDate) : null,
         estimatedEndDate: apiTrip.estimatedEndDate ? new Date(apiTrip.estimatedEndDate) : null,
         distance: calculateDistance(apiTrip.pickup_coordinates, apiTrip.dropoff_coordinates),
         route: apiTrip.route,
     });
    const calculateDistance = (pickup, dropoff) => { /* ... as before ... */
        if (!pickup || !dropoff) return null;
         try {
             const parseCoords = (coord) => { /* ... */
                   if (typeof coord === 'string') return coord.split(',').map(c => parseFloat(c.trim()));
                   if (Array.isArray(coord) && coord.length === 2) return coord.map(c => parseFloat(c));
                   throw new Error("Invalid coordinate format");
             }
             const [pickupLat, pickupLng] = parseCoords(pickup);
             const [dropoffLat, dropoffLng] = parseCoords(dropoff);
             if (isNaN(pickupLat) || isNaN(pickupLng) || isNaN(dropoffLat) || isNaN(dropoffLng)) return null;
             const R = 3958.8;
             const dLat = toRad(dropoffLat - pickupLat);
             const dLon = toRad(dropoffLng - pickupLng);
             const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(pickupLat)) * Math.cos(toRad(dropoffLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
             const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
             const distance = R * c;
             return `${Math.round(distance)} miles`;
         } catch (e) { console.error("Error calculating distance:", e); return null; }
     };
    const toRad = (value) => (value * Math.PI) / 180;

    // --- Render Logic ---
    if (authLoading || loading) {
        return (
             <div className="w-full h-64 flex items-center justify-center">
                 <div className="flex flex-col items-center">
                      {/* Assume Loader2 or a similar spinner component exists */}
                     <Loader2 className="w-12 h-12 text-primary animate-spin" />
                     <p className="mt-4 text-gray-600">Loading trips...</p>
                 </div>
             </div>
        );
    }


    return (
        <div className="container mx-auto p-4 space-y-4"> {/* Added space-y-4 */}
            <h1 className="text-2xl font-bold" style={{ color: "#084152" }}>
                Your Trips
            </h1>

            {/* Display Error or Success Messages */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {successMessage && (
                 <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
                     <CheckCircle className="h-4 w-4 !text-green-600" />
                     <AlertTitle>Success</AlertTitle>
                     <AlertDescription>{successMessage}</AlertDescription>
                 </Alert>
            )}


            {/* Trips Grid / No Trips Message */}
            {trips.length === 0 && !loading ? ( // Ensure not loading when showing "no trips"
                <div className="text-center py-12 bg-gray-50 rounded-lg border">
                    <h3 className="text-lg font-medium text-gray-700">No trips found</h3>
                    <p className="text-gray-500 mt-2">Create a new trip to get started.</p>
                    {/* You might want a Button link to the new trip page here */}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trips.map(trip => (
                        <TripCard
                            key={trip.id}
                            trip={formatTripData(trip)}
                            routeData={trip.route}
                            // Pass down the action handlers
                            onStartTrip={handleStartTrip}
                            onUpdateStatus={handleUpdateTripStatus}
                            // Pass loading state specific to this card (optional, handled inside TripCard now)
                            // isActionLoading={actionLoadingId === trip.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}