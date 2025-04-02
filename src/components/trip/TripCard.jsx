import Link from "next/link"
import { format } from "date-fns"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  CalendarIcon, 
  MapPinIcon, 
  ClipboardListIcon,
  FileTextIcon,
  PenToolIcon,
  TruckIcon,
  Clock
} from "lucide-react"

// Default trip data to ensure UI always renders
const DEFAULT_TRIP = {
  id: '',
  title: 'Trip Title',
  status: 'planned',
  description: '',
  startLocation: 'Location not specified',
  endLocation: 'Location not specified',
  startDate: new Date(),
  estimatedEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  distance: null
}

export default function TripCard({ trip = DEFAULT_TRIP,routeData }) {
  // Safe status colors with fallback
  const statusColors = {
    planned: "bg-blue-100 text-blue-800 border-blue-200",
    "in-progress": "bg-amber-100 text-amber-800 border-amber-200",
    completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    default: "bg-gray-100 text-gray-800 border-gray-200"
  }

  // Safe date calculation
  const safeEndDate = trip?.estimatedEndDate 
    ? new Date(trip.estimatedEndDate) 
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  
  const daysLeft = Math.max(0, Math.ceil(
    (safeEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  ))

  // Safe date formatting
  const formatDate = (date) => {
    try {
      return format(new Date(date || new Date()), "MMM d, yyyy")
    } catch {
      return "Date not specified"
    }
  }

  // Safe status display text
  const getStatusText = (status) => {
    if (!status) return "Not Specified"
    return status
      .toString()
      .replace("-", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  // Safe border color
  const getBorderColor = () => {
    switch(trip?.status) {
      case 'planned': return '#3b82f6'
      case 'in-progress': return '#f59e0b'
      case 'completed': return '#10b981'
      default: return '#e5e7eb'
    }
  }

  const handleMapNavigation = () => {
    console.log("Clicked")
    if (routeData) {
      sessionStorage.setItem(`route_${trip.id}`, JSON.stringify(routeData));
    }
    window.location.href = `/dashboard/map/${trip.id}`;
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md border-l-4" 
          style={{ borderLeftColor: getBorderColor() }}>
      <CardHeader className="pb-3 pt-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <TruckIcon className="w-5 h-5 mr-2" style={{ color: "#084152" }} />
            <CardTitle className="text-lg font-bold" style={{ color: "#084152" }}>
              {trip?.title || 'Unnamed Trip'}
            </CardTitle>
          </div>
          <Badge className={`${statusColors[trip?.status] || statusColors.default} px-3 py-1 rounded-full text-xs font-medium`}>
            {getStatusText(trip?.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-1 space-y-4">
        <p className="text-sm text-gray-500 line-clamp-2">
          {trip?.description || "No description provided"}
        </p>

        <div className="grid grid-cols-1 gap-y-2 border rounded-lg p-3 bg-gray-50">
          <DetailRow 
            icon={MapPinIcon} 
            label="From:" 
            value={trip?.startLocation || 'Not specified'} 
            color="#084152" 
          />
          <DetailRow 
            icon={MapPinIcon} 
            label="To:" 
            value={trip?.endLocation || 'Not specified'} 
            color="#084152" 
          />
          <DetailRow
            icon={CalendarIcon}
            label="Date:"
            value={`${formatDate(trip?.startDate)} - ${formatDate(trip?.estimatedEndDate)}`}
            color="#084152"
          />
          
          {trip?.distance && (
            <DetailRow 
              icon={TruckIcon} 
              label="Distance:" 
              value={trip.distance} 
              color="#084152"
            />
          )}
          
          {(trip?.status === "in-progress" || !trip?.status) && (
            <div className="flex items-center mt-1 text-sm">
              <Clock className="h-4 w-4 text-amber-600 mr-2" />
              <span className="font-medium">ETA:</span>
              <span className="ml-1 text-gray-500">
                {daysLeft > 0 ? `${daysLeft} days remaining` : "Due today"}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-3 pb-4 gap-2">
        <ActionButton 
          href={`/trips/${trip?.id || '#'}`} 
          icon={ClipboardListIcon} 
          label="Details" 
          variant="outline" 
        />
        <ActionButton 
          href={`/logs/new?tripId=${trip?.id || ''}`} 
          icon={FileTextIcon} 
          label="Logs" 
          variant="outline" 
        />
      <Button 
  onClick={handleMapNavigation} 
  variant="default" 
  size="sm" 
  className="flex-1"
  style={{ backgroundColor: "#F94961", borderColor: "#F94961" }}
>
  <PenToolIcon className="h-4 w-4 mr-1" />
  Map Route
</Button>
      </CardFooter>
    </Card>
  )
}

const DetailRow = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center text-sm">
    <Icon className="h-4 w-4 mr-2" style={{ color: color || "currentColor" }} />
    <span className="font-medium">{label}</span>
    <span className="ml-1 text-gray-500 truncate">{value || 'Not specified'}</span>
  </div>
)

const ActionButton = ({ href, icon: Icon, label, variant, primaryColor }) => (
  <Button 
    asChild 
    variant={variant || 'outline'} 
    size="sm" 
    className="flex-1"
    style={variant === "default" ? { 
      backgroundColor: primaryColor || "#084152", 
      borderColor: primaryColor || "#084152" 
    } : {}}
  >
    <Link href={href || '#'}>
      <Icon className="h-4 w-4 mr-1" />
      {label}
    </Link>
  </Button>
)