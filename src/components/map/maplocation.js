"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, MapPin, Navigation, LocateFixed, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import 'leaflet/dist/leaflet.css'

export default function MapLocationPicker({
  startLocation = null,
  onLocationUpdate,
  locationType = "default", // current, pickup, or dropoff
}) {
  const mapRef = useRef(null)
  const leafletMapRef = useRef(null)
  const markerRef = useRef(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedLocation, setSelectedLocation] = useState(startLocation || null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  // Color mapping based on location type
  const colorMap = {
    current: "#3b82f6", // blue
    pickup: "#10b981",  // green
    dropoff: "#ef4444", // red
    default: "#8b5cf6"  // purple
  }
  
  const locationColor = colorMap[locationType] || colorMap.default

  // Initialize map
  useEffect(() => {
    if (typeof window !== 'undefined' && mapRef.current && !leafletMapRef.current) {
      // Import Leaflet dynamically
      import('leaflet').then((L) => {
        // Initialize CSS
        const linkElement = document.createElement('link')
        linkElement.rel = 'stylesheet'
        linkElement.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
        document.head.appendChild(linkElement)

        // Create map with default center
        const mapCenter = startLocation && startLocation.lat !== 0 ? 
          [startLocation.lat, startLocation.lng] : [40.7128, -74.006]
        const map = L.map(mapRef.current).setView(mapCenter, 10)
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map)
        
        leafletMapRef.current = map
        
        // Add click handler to the map
        map.on('click', async (e) => {
          const { lat, lng } = e.latlng
          await handleLocationSelection({ lat, lng })
        })
        
        // Add marker if initial location exists and is not (0,0)
        if (startLocation && (startLocation.lat !== 0 || startLocation.lng !== 0)) {
          addMarker(L, startLocation)
        }
        
        setIsLoading(false)
      }).catch(err => {
        setError("Failed to load map library")
        setIsLoading(false)
      })
    }
    
    return () => {
      // Clean up map on unmount
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [])
  
  // Add marker to the map
  const addMarker = (L, location) => {
    const map = leafletMapRef.current
    if (!map) return
    
    // Remove existing marker if any
    if (markerRef.current) {
      map.removeLayer(markerRef.current)
    }
    
    // Create custom icon
    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${locationColor}; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36]
    })
    
    // Add marker to map
    markerRef.current = L.marker([location.lat, location.lng], { icon: customIcon, draggable: true })
      .addTo(map)
      .on('dragend', async function(event) {
        const marker = event.target
        const position = marker.getLatLng()
        await handleLocationSelection({ lat: position.lat, lng: position.lng })
      })
  }
  
  // Get current location
  const getCurrentLocation = () => {
    setIsLoading(true)
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          
          // Update map and marker
          if (leafletMapRef.current) {
            leafletMapRef.current.setView([location.lat, location.lng], 14)
            
            if (typeof window !== 'undefined') {
              const L = await import('leaflet')
              addMarker(L, location)
            }
          }
          
          await handleLocationSelection(location)
          setIsLoading(false)
        },
        (err) => {
          setError(`Error getting location: ${err.message}`)
          setIsLoading(false)
        }
      )
    } else {
      setError("Geolocation is not supported by your browser")
      setIsLoading(false)
    }
  }
  
  const handleLocationSelection = async (location) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&addressdetails=1`);
      const data = await response.json();
      
      const address = data?.display_name || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
      const enrichedLocation = { ...location, address };
      
      setSelectedLocation(enrichedLocation);
      
      // Important: Always call onLocationUpdate to pass data back to parent
      if (onLocationUpdate) {
        onLocationUpdate(enrichedLocation);
      }
    } catch (error) {
      const basicLocation = {
        ...location,
        address: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
      };
      setSelectedLocation(basicLocation);
      
      // Still update even on error, just with basic coordinates
      if (onLocationUpdate) {
        onLocationUpdate(basicLocation);
      }
    }
  };
  
  // Search location by name
  const searchLocation = async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    setError("")
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      
      if (data && data.length > 0) {
        setSearchResults(data.slice(0, 5)) // Limit to 5 results for UI simplicity
      } else {
        setSearchResults([])
        setError("No locations found for your search")
      }
    } catch (error) {
      setError("Error searching for location")
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }
  
  // Handle search result selection
  const selectSearchResult = async (result) => {
    const location = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    }
    
    // Update map view
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([location.lat, location.lng], 14)
      
      // Add marker
      if (typeof window !== 'undefined') {
        const L = await import('leaflet')
        addMarker(L, location)
      }
    }
    
    // Set full information
    const enrichedLocation = {
      ...location,
      address: result.display_name
    }
    
    setSelectedLocation(enrichedLocation)
    setSearchResults([])
    setSearchQuery("")
    
    // Notify parent component
    if (onLocationUpdate) {
      onLocationUpdate(enrichedLocation)
    }
  }
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Select Location</CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={getCurrentLocation}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4 mr-1" />
            )}
            Current Location
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Box */}
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search for location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
            />
          </div>
          <Button onClick={searchLocation} disabled={isSearching} variant="secondary">
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div className="z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="p-2 hover:bg-gray-100 cursor-pointer border-b text-sm"
                onClick={() => selectSearchResult(result)}
              >
                {result.display_name}
              </div>
            ))}
          </div>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Map Container */}
        <div className="relative w-full h-[350px] rounded-md overflow-hidden border">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-70 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />
        </div>
        
        {/* Selected Location Information */}
        {selectedLocation && (
          <div className="p-3 bg-muted rounded-md text-sm">
            <div className="font-medium">Selected Location:</div>
            <div className="mt-1">{selectedLocation.address}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </div>
          </div>
        )}
        
        <div className="text-xs text-gray-500">
          Click on the map to select a location, or drag the marker to adjust position.
        </div>
      </CardContent>
    </Card>
  )
}