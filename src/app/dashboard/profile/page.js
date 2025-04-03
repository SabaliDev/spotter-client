// src/app/dashboard/profile/page.js
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/apiService'; // Import fetchWithAuth in case direct fetch is needed later

// Import UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"; // Use Input for display consistency
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, UserCircle, Mail, Phone, Globe } from "lucide-react"; // Example icons

// Helper component to display profile fields
const ProfileField = ({ label, value, icon: Icon }) => (
    <div className="space-y-1">
        <Label className="text-xs text-muted-foreground flex items-center">
            {Icon && <Icon className="w-3 h-3 mr-1.5" />}
            {label}
        </Label>
        {/* Using Input as read-only for consistent styling, could also be <p> */}
        <Input type="text" value={value || 'N/A'} readOnly className="bg-gray-50 cursor-default" />
    </div>
);

export default function ProfilePage() {
    // Get user data and loading status directly from AuthContext
    const { user, loading: authLoading, getAccessToken, refreshAccessToken, logout } = useAuth();
    const [error, setError] = useState(null);
    // Optional: Add local state if you want to fetch fresh data instead of relying solely on context
    // const [profileData, setProfileData] = useState(null);
    // const [isLoading, setIsLoading] = useState(true);

    // --- Option A: Rely on user data from AuthContext (Recommended) ---
    // No additional fetching needed initially if AuthContext already gets the user data.
    // We just use the `user` object provided by the context.

    // --- Option B: Fetch fresh data on page load (Uncomment if needed) ---
    /*
    useEffect(() => {
        if (authLoading) return; // Wait for auth context

        const fetchProfile = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await fetchWithAuth(
                    '/api/auth/me', // Your endpoint
                    getAccessToken,
                    refreshAccessToken,
                    logout
                );
                setProfileData(data);
            } catch (err) {
                console.error("Failed to fetch profile data:", err);
                setError(err.message || "Could not load profile.");
                setProfileData(null);
            } finally {
                setIsLoading(false);
            }
        };

        // Fetch only if user isn't already available from context, or if you always want fresh data
        if (!user) { // Or just always fetch: fetchProfile();
             fetchProfile();
        } else {
             setProfileData(user); // Use context user if already available
             setIsLoading(false);
        }

    }, [authLoading, user, getAccessToken, refreshAccessToken, logout]); // Dependencies for Option B

    const displayUser = profileData || user; // Use fetched data if available, otherwise context user
    const isLoading = authLoading; // || isLoading; // Combine loading states if using Option B
    */
    // --- End Option B ---


    // --- Render Logic ---

    // Use authLoading state from context
    if (authLoading) {
        return (
            <div className="flex justify-center items-center p-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Display error if fetching failed (only relevant for Option B or if context itself had an error)
    if (error) {
        return (
            <Alert variant="destructive" className="mb-6">
                 <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    // Check if user data is available after loading
    if (!user) {
         return (
             <Alert variant="destructive" className="mb-6">
                 <AlertTitle>Error</AlertTitle>
                 <AlertDescription>Could not load user profile information. Please try logging out and back in.</AlertDescription>
             </Alert>
         );
    }

    // Assuming 'user' object has fields like: id, username, email, name, etc.
    // Adjust the fields based on what your '/api/auth/me' actually returns.
    return (
        <div className="space-y-6">
             <h1 className="text-3xl font-bold" style={{ color: "#084152" }}>Your Profile</h1>

            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-4">
                        {/* Placeholder for Avatar - Replace with actual image if available */}
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserCircle className="w-10 h-10 text-gray-500" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">{user.name || user.username || 'User'}</CardTitle>
                            <CardDescription>Manage your profile details.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Display fetched profile information */}
                    <ProfileField label="Full Name" value={user.name} icon={UserCircle} />
                    <ProfileField label="Username" value={user.username} icon={UserCircle} />
                    <ProfileField label="Email Address" value={user.email} icon={Mail} />
                    <ProfileField label="Phone Number" value={user.phone_number || 'Not Provided'} icon={Phone} />
                    {/* Add other fields returned by your API */}
                    {/* Example: <ProfileField label="Member Since" value={format(new Date(user.date_joined), 'PPP')} /> */}
                     <ProfileField label="User ID" value={user.id} icon={UserCircle}/> {/* Assuming ID is returned */}

                </CardContent>
               
            </Card>

             

        </div>
    );
}