"use client"
import { useEffect, useState } from "react"
import TripCard from "@/components/trip/TripCard"
import { AlertCircle } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { fetchWithAuth } from "@/lib/apiService"
import { useAuth } from "@/contexts/AuthContext";

export default function TripListView() {
  const { getAccessToken } = useAuth();
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoading(true)
        const rawResponse = await fetchWithAuth("/api/tracking/list", getAccessToken)
        const data = Array.isArray(rawResponse) ? rawResponse : []
      
        setTrips(data)
      } catch (err) {
        console.error("Failed to fetch trips:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
      
    }

    fetchTrips()
  }, [])

  // Transform API data to match TripCard's expected format
  const formatTripData = (apiTrip) => ({
    id: apiTrip.id,
    title: apiTrip.title,
    status: apiTrip.status,
    description: apiTrip.description,
    startLocation: apiTrip.pickup_location,
    endLocation: apiTrip.dropoff_location,
    startDate: new Date(apiTrip.startDate),
    estimatedEndDate: new Date(apiTrip.estimatedEndDate),
    distance: calculateDistance(apiTrip.pickup_coordinates, apiTrip.dropoff_coordinates),
    currentLocation: apiTrip.current_location,
    currentCoordinates: apiTrip.current_coordinates,
    currentCycleUsed: apiTrip.current_cycle_used
  })

  // Calculate approximate distance between coordinates (in miles)
  const calculateDistance = (pickup, dropoff) => {
    if (!pickup || !dropoff) return null
    
    try {
      const [pickupLat, pickupLng] = pickup.split(',').map(coord => parseFloat(coord))
      const [dropoffLat, dropoffLng] = dropoff.split(',').map(coord => parseFloat(coord))
      
      // Simple distance calculation using Haversine formula
      const R = 3958.8 // Earth's radius in miles
      const dLat = toRad(dropoffLat - pickupLat)
      const dLon = toRad(dropoffLng - pickupLng)
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(pickupLat)) * Math.cos(toRad(dropoffLat)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      const distance = R * c
      
      return `${Math.round(distance)} miles`
    } catch {
      return null
    }
  }
  
  // Convert degrees to radians
  const toRad = (value) => value * Math.PI / 180

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-t-primary rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading trips...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}. Please try refreshing the page or check your connection.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "#084152" }}>
        Your Trips
      </h1>
      
      {trips.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700">No trips found</h3>
          <p className="text-gray-500 mt-2">Create a new trip to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map(trip => (
            <TripCard 
              key={trip.id} 
              trip={formatTripData(trip)} 
              routeData={trip.route}
            />
          ))}
        </div>
      )}
    </div>
  )
}