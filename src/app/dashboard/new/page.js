"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"; 
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, MapPin, X } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import MapView from "@/components/map/maplocation";
import { fetchWithAuth } from "@/lib/apiService"
import { useAuth } from "@/contexts/AuthContext";

export default function TripForm({ initialData }) {
  const {
    getAccessToken,
    refreshAccessToken,
    logout,
    loading: authLoading,
  } = useAuth();

  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [startDate, setStartDate] = useState(initialData?.startDate || new Date())
  const [endDate, setEndDate] = useState(initialData?.estimatedEndDate || new Date())
  const [tempSelectedLocation, setTempSelectedLocation] = useState(null);

  const parseCoordinates = (coordString) => {
    if (!coordString) return { lat: 0, lng: 0 };
    const [lat, lng] = coordString.split(',').map(Number);
    return { lat: lat || 0, lng: lng || 0 };
  };

  const [currentLocation, setCurrentLocation] = useState(initialData?.current_location || "");
  const [currentCoordinates, setCurrentCoordinates] = useState(
    initialData?.current_coordinates ? parseCoordinates(initialData.current_coordinates) : { lat: 0, lng: 0 }
  );
  const [pickupLocation, setPickupLocation] = useState(initialData?.pickup_location || "");
  const [pickupCoordinates, setPickupCoordinates] = useState(
    initialData?.pickup_coordinates ? parseCoordinates(initialData.pickup_coordinates) : { lat: 0, lng: 0 }
  );
  const [dropoffLocation, setDropoffLocation] = useState(initialData?.dropoff_location || "");
  const [dropoffCoordinates, setDropoffCoordinates] = useState(
    initialData?.dropoff_coordinates ? parseCoordinates(initialData.dropoff_coordinates) : { lat: 0, lng: 0 }
  );
  const [currentCycleUsed, setCurrentCycleUsed] = useState(initialData?.current_cycle_used || 0);
  const [mapDialogOpen, setMapDialogOpen] = useState(false)
  const [activeLocationField, setActiveLocationField] = useState(null)
  const isEditing = !!initialData?.id;

  const handleLocationSelect = (location) => {
    if (activeLocationField === 'current') {
      setCurrentLocation(location.address || "Selected location")
      setCurrentCoordinates({ lat: location.lat, lng: location.lng })
    } else if (activeLocationField === 'pickup') {
      setPickupLocation(location.address || "Selected location")
      setPickupCoordinates({ lat: location.lat, lng: location.lng })
    } else if (activeLocationField === 'dropoff') {
      setDropoffLocation(location.address || "Selected location")
      setDropoffCoordinates({ lat: location.lat, lng: location.lng })
    }
    setMapDialogOpen(false)
  }

  const openLocationMap = (fieldType) => {
    setActiveLocationField(fieldType)
    setMapDialogOpen(true)
    setTempSelectedLocation(null)
  }

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`)
            const data = await response.json()
            if (data && data.display_name) {
              setCurrentLocation(data.display_name)
            } else {
              setCurrentLocation(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`)
            }
            setCurrentCoordinates(coords)
          } catch (error) {
            setCurrentLocation(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`)
            setCurrentCoordinates(coords)
          }
        },
        (error) => {
          setError(`Geolocation error: ${error.message}`)
        }
      )
    } else {
      setError("Geolocation is not supported by this browser")
    }
  }

  async function onSubmit(event) {
    event.preventDefault()
    setIsLoading(true)
    setError("")
  
    // Use document.getElementById to get the form element
    const form = document.getElementById("tripForm");
    const formData = new FormData(form);
    
    const title = formData.get("title")
    const description = formData.get("description")
  
    const tripData = {
      driver: 1,
      current_location: currentLocation,
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      pickup_coordinates: `${pickupCoordinates.lat},${pickupCoordinates.lng}`,
      dropoff_coordinates: `${dropoffCoordinates.lat},${dropoffCoordinates.lng}`,
      current_coordinates: `${currentCoordinates.lat},${currentCoordinates.lng}`,
      current_cycle_used: parseFloat(currentCycleUsed),
      title,
      description,
      startDate,
      estimatedEndDate: endDate,
    }
  
    try {
      const token = await getAccessToken()

       
      const apiEndpoint = `${process.env.NEXT_PUBLIC_DJANGO_API_URL}/api/tracking/create/`
  
      const response = await fetchWithAuth(
        apiEndpoint,
        getAccessToken,
        async () => {
          const newToken = await refreshAccessToken() 
        },
        logout,
        {
        method:"POST",
        body: JSON.stringify(tripData),
      });

      router.push("/dashboard/trips")
  
      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? "update" : "create"} trip.`);
      }
      router.push("/dashboard/trips")
  
    
   
      
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Trip" : "Create New Trip"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form id="tripForm" onSubmit={onSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Trip Title</Label>
                <Input id="title" name="title" placeholder="Enter trip title" defaultValue={initialData?.title || ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Enter trip description" defaultValue={initialData?.description || ""} rows={3} />
              </div>
             
              <div className="space-y-2">
                <Label htmlFor="currentLocation">Current Location</Label>
                <div className="flex">
                  <Input
                    id="currentLocation"
                    value={currentLocation}
                    onChange={(e) => setCurrentLocation(e.target.value)}
                    placeholder="Enter current location"
                    className="rounded-l-md rounded-r-none"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-l-none rounded-r-none border-l-0"
                    onClick={getUserLocation}
                  >
                    <MapPin className="h-5 w-5 text-blue-500" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-l-none rounded-r-md border-l-0"
                    onClick={() => openLocationMap('current')}
                  >
                    <MapPin className="h-5 w-5 text-gray-500" />
                  </Button>
                </div>
                <div className="text-xs text-gray-500">
                  Coordinates: {currentCoordinates.lat.toFixed(6)}, {currentCoordinates.lng.toFixed(6)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
                <div className="space-y-2">
                  <Label htmlFor="pickupLocation">Pickup Location</Label>
                  <div className="flex">
                    <Input
                      id="pickupLocation"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      placeholder="Enter pickup location"
                      className="rounded-l-md rounded-r-none"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-l-none rounded-r-md border-l-0"
                      onClick={() => openLocationMap('pickup')}
                    >
                      <MapPin className="h-5 w-5 text-primary" />
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500">
                    Coordinates: {pickupCoordinates.lat.toFixed(6)}, {pickupCoordinates.lng.toFixed(6)}
                  </div>
                </div>

                
                <div className="space-y-2">
                  <Label htmlFor="dropoffLocation">Drop-off Location</Label>
                  <div className="flex">
                    <Input
                      id="dropoffLocation"
                      value={dropoffLocation}
                      onChange={(e) => setDropoffLocation(e.target.value)}
                      placeholder="Enter drop-off location"
                      className="rounded-l-md rounded-r-none"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-l-none rounded-r-md border-l-0"
                      onClick={() => openLocationMap('dropoff')}
                    >
                      <MapPin className="h-5 w-5 text-secondary" />
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500">
                    Coordinates: {dropoffCoordinates.lat.toFixed(6)}, {dropoffCoordinates.lng.toFixed(6)}
                  </div>
                </div>
              </div>

              
              <div className="space-y-2">
                <Label htmlFor="currentCycleUsed">Current Cycle Used (Hours)</Label>
                <Input
                  id="currentCycleUsed"
                  type="number"
                  step="0.1"
                  min="0"
                  value={currentCycleUsed}
                  onChange={(e) => setCurrentCycleUsed(e.target.value)}
                  placeholder="Enter hours used in current cycle"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>{startDate ? format(startDate, "PPP") : "Select start date"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Estimated End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>{endDate ? format(endDate, "PPP") : "Select end date"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus disabled={(date) => startDate ? date < startDate : false} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" form="tripForm" className="bg-primary hover:bg-primary/90" disabled={isLoading}>{isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditing ? "Updating..." : "Creating..."}</>) : (isEditing ? "Update Trip" : "Create Trip")}</Button>
        </CardFooter>
      </Card>

   
      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>
                {activeLocationField === 'current' && 'Select Current Location'}
                {activeLocationField === 'pickup' && 'Select Pickup Location'}
                {activeLocationField === 'dropoff' && 'Select Drop-off Location'}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setMapDialogOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="h-[500px] mb-30">
            <MapView
              startLocation={
                activeLocationField === 'current' ? currentCoordinates :
                  activeLocationField === 'pickup' ? pickupCoordinates :
                    activeLocationField === 'dropoff' ? dropoffCoordinates : null
              }
              onLocationUpdate={(location) => {
                setTempSelectedLocation(location);
              }}
            />
          </div>

          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setMapDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-primary"
              onClick={() => {
                if (tempSelectedLocation) {
                  handleLocationSelect(tempSelectedLocation);
                } else {
                  let coords;
                  let addressText;

                  switch (activeLocationField) {
                    case 'current':
                      coords = currentCoordinates;
                      addressText = currentLocation || "Selected Location";
                      break;
                    case 'pickup':
                      coords = pickupCoordinates;
                      addressText = pickupLocation || "Selected Location";
                      break;
                    case 'dropoff':
                      coords = dropoffCoordinates;
                      addressText = dropoffLocation || "Selected Location";
                      break;
                    default:
                      coords = { lat: 0, lng: 0 };
                      addressText = "Selected Location";
                  }

                  handleLocationSelect({
                    lat: coords.lat,
                    lng: coords.lng,
                    address: addressText
                  });
                }
                setTempSelectedLocation(null);
              }}
            >
              Confirm Location
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}