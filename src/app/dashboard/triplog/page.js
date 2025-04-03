"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import DailyLogDisplay from "@/components/logs/DailyLogDisplay"; 
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/apiService';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const SimpleSelect = ({ label, value, onChange, options, placeholder, disabled }) => (
    <div className="space-y-1">
        <Label>{label}</Label>
        <select
            value={value || ""}
            onChange={onChange}
            disabled={disabled || options.length === 0}
            className={cn(
                "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                !value && "text-muted-foreground" 
            )}
        >
            <option value="" disabled hidden>{placeholder || `Select ${label}`}</option>
            {options.map(option => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    </div>
);


export default function TripLogPage() {
    const { getAccessToken, refreshAccessToken, logout, loading: authLoading } = useAuth();
    const [tripsList, setTripsList] = useState([]);
    const [selectedTripId, setSelectedTripId] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null); 

    const [loadingTrips, setLoadingTrips] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    useEffect(() => {
        if (authLoading) return; 

        const fetchTrips = async () => {
            setLoadingTrips(true);
            setFetchError(null);
            try {
                const data = await fetchWithAuth(
                    "/api/tracking/list/",
                    getAccessToken,
                    refreshAccessToken,
                    logout
                );
                setTripsList(Array.isArray(data) ? data : []);
            } catch (err) {
                setFetchError(err.message || "Could not load trips list.");
                setTripsList([]);
            } finally {
                setLoadingTrips(false);
            }
        };

        fetchTrips();
    }, [authLoading, getAccessToken, refreshAccessToken, logout]);

    const handleTripChange = (event) => {
        setSelectedTripId(event.target.value ? parseInt(event.target.value, 10) : null);
    };

    const tripOptions = tripsList.map(trip => ({
        value: trip.id,
        label: trip.title || `Trip ${trip.id}`
    }));

    return (
        <div className="space-y-6 p-4 md:p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Select Trip and Date</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SimpleSelect
                        label="Trip"
                        value={selectedTripId}
                        onChange={handleTripChange}
                        options={tripOptions}
                        placeholder={loadingTrips ? "Loading trips..." : "Select a Trip"}
                        disabled={loadingTrips || tripsList.length === 0}
                    />

                    <div className="space-y-1">
                        <Label>Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                    disabled={loadingTrips} 
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                     {loadingTrips && (
                         <div className="md:col-span-2 flex items-center text-sm text-muted-foreground">
                             <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading trips...
                         </div>
                    )}
                     {fetchError && (
                         <div className="md:col-span-2">
                            <Alert variant="destructive">
                                <AlertDescription>{fetchError}</AlertDescription>
                            </Alert>
                         </div>
                    )}
                     {!loadingTrips && tripsList.length === 0 && !fetchError && (
                         <div className="md:col-span-2 text-sm text-muted-foreground">
                            No trips found. Please create a trip first.
                        </div>
                    )}

                </CardContent>
            </Card>

            {selectedTripId && selectedDate ? (
                <DailyLogDisplay
                    key={`${selectedTripId}-${format(selectedDate, 'yyyy-MM-dd')}`} // Add key to force re-render on change
                    tripId={selectedTripId}
                    date={format(selectedDate, 'yyyy-MM-dd')} // Pass date in YYYY-MM-DD format
                />
            ) : (
                 <Card className="mt-6">
                     <CardContent className="flex justify-center items-center h-40 text-muted-foreground">
                         <p>Please select a trip and a date to view the log.</p>
                     </CardContent>
                 </Card>
            )}
        </div>
    );
}