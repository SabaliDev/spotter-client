"use client";
import MapView from "@/components/map/mapview";

export default function TripPage() {
  const tripData = {
    id: 2,
    distance: 792.8320305218289,
    duration: 13.170416666666666,
    route_polyline: [[-95.369841, 29.760424], [-95.369527, 29.760823], [-95.369633, 29.760886], 
                    [-95.369905, 29.761052], [-95.370214, 29.761172], [-95.370402, 29.76121], 
                    [-95.370688, 29.761237], [-95.371211, 29.761285], [-95.37146, 29.761336], 
                    [-95.371672, 29.761429], [-95.371776, 29.761499], [-95.371865, 29.761597], 
                    [-95.371911, 29.761693], [-95.371933, 29.761796], [-95.371928, 29.761929], 
                    [-95.371882, 29.762059], [-95.371819, 29.762175], [-95.371728, 29.762289], 
                    [-95.371277, 29.762613], [-95.37075, 29.762962], [-95.370635, 29.763013], 
                    [-95.370552, 29.76305], [-95.370262, 29.763181], [-95.369121, 29.763709], 
                    [-95.36841, 29.764083], [-95.36799, 29.764376], [-95.367681, 29.764649], 
                    [-95.367386, 29.764972], [-95.367112, 29.765366], [-95.366802, 29.765951], 
                    [-95.366372, 29.766917], [-95.36599, 29.767435], [-95.365745, 29.767706], 
                    [-95.365603, 29.767816], [-95.365415, 29.767923], [-95.365217, 29.768006], 
                    [-95.364992, 29.768063], [-95.364784, 29.768087], [-95.364571, 29.768087]]
  };

  const startLocation = {
    lat: 29.760424,
    lng: -95.369841,
    address: "Houston City Hall"
  };

  const endLocation = {
    lat: 29.768087,
    lng: -95.364571,
    address: "Buffalo Bayou Park"
  };

  const waypoints = [
    {
      id: 1,
      lat: 29.762289,
      lng: -95.371728,
      type: 'checkpoint',
      name: 'Tranquility Park'
    },
    {
      id: 2,
      lat: 29.765366,
      lng: -95.367112,
      type: 'rest',
      name: 'Sam Houston Park'
    }
  ];

  const handleLocationUpdate = (location) => {
    console.log("Current location updated:", location);
    // Do something with the updated location
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Trip Details</h1>
      
      <MapView
        tripId={tripData.id}
        startLocation={startLocation}
        endLocation={endLocation}
        waypoints={waypoints}
        routePolyline={tripData.route_polyline}
     
      />
      
      <div className="mt-4">
        <p><strong>Distance:</strong> {(tripData.distance / 1000).toFixed(2)} km</p>
        <p><strong>Duration:</strong> {Math.floor(tripData.duration / 60)}h {Math.round(tripData.duration % 60)}m</p>
      </div>
    </div>
  );
}