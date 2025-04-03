"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/apiService';
import StatusChangeForm from '@/components/trip/StatusChangeForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, PlayCircle } from "lucide-react";
import { Button } from '@/components/ui/button';

const findActiveTrip = (trips) => {
    if (!Array.isArray(trips)) return null;
    let active = trips.find(trip => trip.status === 'in_progress');
    if (active) return active;
     return null;
};

export default function Dashboard() {
    const { getAccessToken, refreshAccessToken, logout, loading: authLoading, user } = useAuth();
    const [trips, setTrips] = useState([]);
    const [activeTrip, setActiveTrip] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (authLoading) return; 

        const fetchTripsData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await fetchWithAuth(
                    "/api/tracking/list", 
                    getAccessToken,
                    refreshAccessToken,
                    logout
                );
                const tripList = Array.isArray(data) ? data : [];
                setTrips(tripList);
                setActiveTrip(findActiveTrip(tripList));
            } catch (err) {
                console.error("Failed to fetch trips for dashboard:", err);
                setError(err.message || "Could not load trip data.");
                setTrips([]);
                setActiveTrip(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTripsData();
    }, [authLoading, getAccessToken, refreshAccessToken, logout]);

    const handleStatusUpdateSuccess = async () => {
        console.log("Status updated from dashboard! Refreshing active trip data...");
        setError(null); 
         setIsLoading(true);
         try {
             const data = await fetchWithAuth(
                 "/api/tracking/list",
                 getAccessToken,
                 refreshAccessToken,
                 logout
             );
              const tripList = Array.isArray(data) ? data : [];
              setTrips(tripList);
              setActiveTrip(findActiveTrip(tripList));
         } catch (err) {
             console.error("Failed to refresh trips after status update:", err);
              setError(err.message || "Could not refresh trip data.");
         } finally {
             setIsLoading(false);
         }
    };



    if (isLoading || authLoading) {
        return (
            <div className="flex justify-center items-center p-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive" className="mb-6">
                 <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold" style={{ color: "#084152" }}>Dashboard</h1>
            <p className="text-lg text-muted-foreground">Welcome back, {user?.name || 'Driver'}!</p>

            {/* Active Trip Status Update Section */}
            {activeTrip ? (
                <Card className="border-l-4 border-amber-500"> {/* Highlight active trip card */}
                    <CardHeader>
                        <CardTitle>Active Trip: {activeTrip.title || `Trip ${activeTrip.id}`}</CardTitle>
                        <CardDescription>
                            Status: <span className="font-medium capitalize">{activeTrip.status.replace('-', ' ')}</span>. Update your duty status below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <StatusChangeForm
                            tripId={activeTrip.id}
                            onSubmitSuccess={handleStatusUpdateSuccess} 
                        />
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>No Active Trip</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center text-center p-8">
                        <PlayCircle className="h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-muted-foreground mb-4">You do not currently have a trip marked as "in-progress".</p>
                        <Link href="/dashboard/trips">
                            <Button variant="outline">Go to My Trips</Button>
                        </Link>
                         <span className="text-sm text-muted-foreground mx-2">or</span>
                         <Link href="/dashboard/new">
                             <Button style={{ backgroundColor: "#F94961" }}>Start a New Trip</Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                 <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link href="/dashboard/trips"><Button variant="secondary" className="w-full">My Trips</Button></Link>
                     <Link href="/dashboard/new"><Button variant="secondary" className="w-full">New Trip</Button></Link>
                     <Link href="/logs"><Button variant="secondary" className="w-full">View Logs</Button></Link>
                 </CardContent>
            </Card>

        </div>
    );
}