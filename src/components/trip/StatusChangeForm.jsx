"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/apiService';
import MapLocationPicker from '@/components/map/maplocation'; 

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, MapPin, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const SimpleSelect = ({ label, value, onChange, options, placeholder, disabled, id }) => (
    <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <select
            id={id}
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

const DUTY_STATUS_OPTIONS = [
    { value: 'off_duty', label: 'Off Duty' },
    { value: 'sleeper_berth', label: 'Sleeper Berth' },
    { value: 'driving', label: 'Driving' },
    { value: 'on_duty_not_driving', label: 'On Duty (Not Driving)' },
];

export default function StatusChangeForm({ tripId, onSubmitSuccess }) {
    const { getAccessToken, refreshAccessToken, logout } = useAuth();
    const [newStatus, setNewStatus] = useState('');
    const [location, setLocation] = useState('');
    const [coordinates, setCoordinates] = useState({ lat: null, lng: null });
    const [remarks, setRemarks] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [isMapOpen, setIsMapOpen] = useState(false);

    useEffect(() => {
        setError(null);
        setSuccessMessage(null);
    }, [newStatus, location, remarks]);

    const handleMapLocationSelect = (mapSelectedLocation) => {
        if (mapSelectedLocation) {
            setLocation(mapSelectedLocation.address || `${mapSelectedLocation.lat.toFixed(6)}, ${mapSelectedLocation.lng.toFixed(6)}`);
            setCoordinates({ lat: mapSelectedLocation.lat, lng: mapSelectedLocation.lng });
        }
        setIsMapOpen(false); 
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        if (!newStatus || !location) {
            setError("New Status and Location are required.");
            setIsLoading(false);
            return;
        }

        const formattedCoordinates = (coordinates.lat !== null && coordinates.lng !== null)
            ? `${coordinates.lat},${coordinates.lng}`
            : null; 

        const payload = {
            new_status: newStatus,
            location: location,
            coordinates: formattedCoordinates, 
            remarks: remarks,
        };

        try {
            const endpoint = `/api/tracking/trip/${tripId}/change-status/`;
            await fetchWithAuth(
                endpoint,
                getAccessToken,
                refreshAccessToken,
                logout,
                {
                    method: "POST",
                    body: JSON.stringify(payload),
                   
                }
            );

            setSuccessMessage(`Status successfully updated to ${DUTY_STATUS_OPTIONS.find(opt => opt.value === newStatus)?.label || newStatus}.`);
            setNewStatus('');
            setLocation('');
            setCoordinates({ lat: null, lng: null });
            setRemarks('');

            if (onSubmitSuccess) {
                onSubmitSuccess();
            }

        } catch (err) {
            setError(err.message || "Failed to update status. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Card className="w-full max-w-lg mx-auto">
                <CardHeader>
                    <CardTitle>Change Duty Status (Trip ID: {tripId})</CardTitle>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <SimpleSelect
                            id="newStatus"
                            label="New Status"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            options={DUTY_STATUS_OPTIONS}
                            placeholder="Select new duty status"
                            disabled={isLoading}
                        />

                        <div className="space-y-1">
                            <Label htmlFor="location">Location</Label>
                            <div className="flex">
                                <Input
                                    id="location"
                                    type="text"
                                    placeholder="Enter location manually or use map"
                                    value={location}
                                    onChange={(e) => {
                                        setLocation(e.target.value);
                                        if (coordinates.lat || coordinates.lng) {
                                             setCoordinates({ lat: null, lng: null });
                                        }
                                    }}
                                    disabled={isLoading}
                                    className="rounded-r-none"
                                />
                                <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="rounded-l-none border-l-0"
                                            disabled={isLoading}
                                            onClick={() => setIsMapOpen(true)}
                                        >
                                            <MapPin className="h-4 w-4" />
                                        </Button>
                                    </DialogTrigger>
                                    {isMapOpen && (
                                        <DialogContent className="max-w-3xl h-[70vh] flex flex-col">
                                            <DialogHeader>
                                                <DialogTitle>Select Location on Map</DialogTitle>
                                            </DialogHeader>
                                            <div className="flex-grow min-h-0">
                                                <MapLocationPicker
                                                    onLocationUpdate={handleMapLocationSelect}
                                                    startLocation={coordinates.lat ? coordinates : null}
                                                    locationType="current"
                                                />
                                            </div>
                                        </DialogContent>
                                    )}
                                </Dialog>
                            </div>
                             {coordinates.lat && coordinates.lng && (
                                 <p className="text-xs text-muted-foreground mt-1">
                                     Coords: {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)} (From Map)
                                 </p>
                             )}
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="remarks">Remarks (Optional)</Label>
                            <Textarea
                                id="remarks"
                                placeholder="Add any relevant notes..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                disabled={isLoading}
                                rows={3}
                            />
                        </div>

                        {error && (
                            <Alert variant="destructive">
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

                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full mt-5" disabled={isLoading} style={{ backgroundColor: "#084152" }}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Status"
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </>
    );
}