"use client";

import React, { useState } from 'react';
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    CalendarIcon,
    MapPinIcon,
    ClipboardListIcon,
    FileTextIcon,
    PenToolIcon,
    TruckIcon,
    Clock,
    PlayIcon,        
    CheckCircle2Icon,
    XCircleIcon      
} from "lucide-react";

const DEFAULT_TRIP = {
  id: '',
  title: 'Trip Title',
  status: 'planned',
  description: '',
  startLocation: 'Location not specified',
  endLocation: 'Location not specified',
  startDate: new Date(),
  estimatedEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
  distance: null,
  route: null
};

const DetailRow = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center text-xs"> 
    <Icon className="h-3 w-3 mr-1 flex-shrink-0" style={{ color: color || "currentColor" }} /> 
    <span className="font-medium mr-1">{label}</span>
    <span className="text-gray-500 truncate flex-1 min-w-0">{value || 'N/A'}</span> 
  </div>
);

const ActionButton = ({ href, icon: Icon, label, variant, size = "sm" }) => (
  <Button
    asChild
    variant={variant || 'outline'}
    size={size}
    className="flex-1" 
    style={variant === "default" ? {
      backgroundColor: "#084152", 
      borderColor: "#084152"
    } : {}}
  >
    <Link href={href || '#'}>
      <Icon className="h-4 w-4 mr-1" />
      {label}
    </Link>
  </Button>
);


export default function TripCard({
    trip = DEFAULT_TRIP,
    routeData, 
    onStartTrip, 
    onUpdateStatus 
}) {
    const [isActionLoading, setIsActionLoading] = useState(false);


    const statusColors = {
        planned: "bg-blue-100 text-blue-800 border-blue-200",
        'in_progress': "bg-amber-100 text-amber-800 border-amber-200",
        completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
        cancelled: "bg-red-100 text-red-800 border-red-200",
        default: "bg-gray-100 text-gray-800 border-gray-200"
    };

    const getStatusText = (status) => {
        if (!status) return "Not Specified";
        if (status === 'in_progress') return 'In Progress';
        return status.toString().replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const getBorderColor = () => {
        switch(trip?.status) {
          case 'planned': return '#3b82f6';
          case 'in_progress': return '#f59e0b'; 
          case 'completed': return '#10b981'; 
          case 'cancelled': return '#ef4444'; 
          default: return '#e5e7eb'; 
        }
    };

    const formatDate = (date) => {
        try {
            const dateObj = date instanceof Date ? date : new Date(date || Date.now());
            if (isNaN(dateObj.getTime())) { 
                 return "Invalid Date";
             }
            return format(dateObj, "MMM d, yyyy");
        } catch {
            return "Date Error";
        }
    };

    const safeEndDate = trip?.estimatedEndDate ? new Date(trip.estimatedEndDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.max(0, Math.ceil(
        (safeEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    ));


    const handleMapNavigation = () => {
        console.log("Navigate to map for trip:", trip.id);
        if (routeData) {
            try {
                 sessionStorage.setItem(`route_${trip.id}`, JSON.stringify(routeData));
             } catch (e) {
                 console.error("Failed to save route data to sessionStorage:", e);
             }
        }
        if (trip.id) {
           window.location.href = `/dashboard/map/${trip.id}`;
        } else {
             console.warn("Trip ID is missing, cannot navigate to map.");
         }
    };

    const handleStart = async () => {
        if (onStartTrip && trip.id) {
            setIsActionLoading(true);
            try {
                await onStartTrip(trip.id);
            } catch (error) {
                console.error("Error starting trip from card:", error);
            } finally {
                 setIsActionLoading(false);
            }
        } else {
             console.warn("onStartTrip handler or trip.id missing.");
         }
    };

    const handleComplete = async () => {
        if (onUpdateStatus && trip.id) {
            setIsActionLoading(true);
             try {
                 await onUpdateStatus(trip.id, 'completed');
             } catch (error) {
                 console.error("Error completing trip from card:", error);
             } finally {
                 setIsActionLoading(false);
             }
        } else {
             console.warn("onUpdateStatus handler or trip.id missing.");
         }
    };

    const handleCancel = async () => {

        if (onUpdateStatus && trip.id) {
            setIsActionLoading(true);
             try {
                 await onUpdateStatus(trip.id, 'cancelled');
             } catch (error) {
                 console.error("Error cancelling trip from card:", error);
             } finally {
                 setIsActionLoading(false);
             }
        } else {
             console.warn("onUpdateStatus handler or trip.id missing.");
         }
    };

    return (
        <Card className="overflow-hidden transition-all hover:shadow-md border-l-4 flex flex-col"
              style={{ borderLeftColor: getBorderColor() }}>

            <CardHeader className="pb-3 pt-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center min-w-0 mr-2"> 
                        <TruckIcon className="w-5 h-5 mr-2 flex-shrink-0" style={{ color: "#084152" }} />
                        <CardTitle className="text-lg font-bold truncate" style={{ color: "#084152" }}>
                            {trip?.title || 'Unnamed Trip'}
                        </CardTitle>
                    </div>
                     <Badge className={`${statusColors[trip?.status] || statusColors.default} px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap`}>
                        {getStatusText(trip?.status)}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="pb-4 space-y-4 flex-grow">
                 <p className="text-sm text-gray-500 line-clamp-2">
                    {trip?.description || "No description provided."}
                 </p>
                 <div className="grid grid-cols-1 gap-y-1.5 border rounded-lg p-3 bg-gray-50/80"> 
                    <DetailRow icon={MapPinIcon} label="From:" value={trip?.startLocation} color="#084152" />
                    <DetailRow icon={MapPinIcon} label="To:" value={trip?.endLocation} color="#084152" />
                    <DetailRow icon={CalendarIcon} label="Date:" value={`${formatDate(trip?.startDate)} - ${formatDate(trip?.estimatedEndDate)}`} color="#084152" />
                    {trip?.distance && <DetailRow icon={TruckIcon} label="Dist:" value={trip.distance} color="#084152" />}
                    {(trip?.status === "in_progress" || trip?.status === 'planned') && (
                        <div className="flex items-center mt-1 text-xs">
                            <Clock className="h-3 w-3 text-amber-600 mr-1" />
                            <span className="font-medium">ETA:</span>
                            <span className="ml-1 text-gray-500">
                                {daysLeft > 0 ? `${daysLeft} days` : "Due today"}
                            </span>
                        </div>
                     )}
                 </div>
            </CardContent>

            <CardFooter className="pt-3 pb-2 gap-2 border-t bg-gray-50/50">
                <Button onClick={handleMapNavigation} variant="default" size="sm" className="flex-1">
                    <PenToolIcon className="h-4 w-4 mr-1" />Map Route
                </Button>
            </CardFooter>

            {(trip.status === 'planned' || trip.status === 'in_progress') && (
                <CardFooter className="pt-2 pb-3 gap-2 border-t">
                    {trip.status === 'planned' && (
                        <Button onClick={handleStart} variant="default" size="sm" className="flex-1 bg-green-600 hover:bg-green-700" disabled={isActionLoading}>
                           <PlayIcon className="h-4 w-4 mr-1" /> Start Trip
                        </Button>
                    )}
                     {( trip.status === 'in_progress') && (
                         <Button onClick={handleComplete} variant="default" size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={isActionLoading}>
                             <CheckCircle2Icon className="h-4 w-4 mr-1" /> Complete
                         </Button>
                     )}
                     {(trip.status === 'in_progress') && (
                         <Button onClick={handleCancel} variant="default" size="sm" className="flex-1" disabled={isActionLoading} style={{ backgroundColor: "#F94961", borderColor: "#F94961" }}>
                             <XCircleIcon className="h-4 w-4 mr-1" /> Cancel
                         </Button>
                    )}
                </CardFooter>
            )}

        </Card>
    );
}