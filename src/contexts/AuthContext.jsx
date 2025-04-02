"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

// Helper to safely access localStorage (only in browser)
const getStoredToken = (key) => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(key);
  }
  return null;
};

// Base API fetch function
const apiFetch = async (url, options = {}) => {
  const baseUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_DJANGO_API_URL is not defined in your environment.");
  }

  const fullUrl = `${baseUrl}${url}`;
  const response = await fetch(fullUrl, options);
  
  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch(e) {
      errorData = {detail: `HTTP error! status: ${response.status}`};
    }
    throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
  }
  
  return response;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(getStoredToken('accessToken'));
  const [refreshToken, setRefreshToken] = useState(getStoredToken('refreshToken'));
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  // Function to refresh the access token using refresh token
  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) return null;
    
    try {
      console.log("Attempting to refresh token");
      const response = await apiFetch("/api/auth/refresh/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      
      const data = await response.json();
      if (data.access) {
        console.log("Token refreshed successfully");
        setAccessToken(data.access);
        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", data.access);
          // Update cookie as well
          document.cookie = `authToken=${data.access}; path=/; max-age=3600; SameSite=Strict`;
        }
        return data.access;
      }
      return null;
    } catch (error) {
      console.error("Token refresh failed:", error);
      // If refresh fails, log the user out
      handleLogout();
      return null;
    }
  }, [refreshToken]);

  // Fetch user profile with the given token
  const fetchUserProfile = useCallback(async (token) => {
    if (!token) {
      setUser(null);
      return;
    }
    
    try {
      console.log("Fetching user profile with token");
      const response = await apiFetch("/api/auth/me/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const userData = await response.json();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUser(null);
      return null;
    }
  }, []);

// Update your handleLogout function
const handleLogout = useCallback(() => {
  setUser(null);
  setAccessToken(null);
  setRefreshToken(null);
  
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    
    // Clear cookie - try multiple approaches
    document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
    // Also try with domain
    const domain = window.location.hostname;
    document.cookie = `authToken=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    
    // Also try with different combinations of flags
    // In your logout handler
document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
    
    console.log("All cookies after multiple clearing attempts:", document.cookie);
  }
}, []);

  // Initialize auth state on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      
      const storedAccessToken = getStoredToken('accessToken');
      const storedRefreshToken = getStoredToken('refreshToken');
      
      console.log("Initializing auth:", !!storedAccessToken, !!storedRefreshToken);
      
      if (storedAccessToken && storedRefreshToken) {
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        
        try {
          // Try to fetch user profile with stored token
          const userData = await fetchUserProfile(storedAccessToken);
          if (!userData) {
            // If that fails, try refreshing the token
            const newToken = await refreshAccessToken();
            if (newToken) {
              await fetchUserProfile(newToken);
            }
          }
        } catch (error) {
          console.error("Error during auth initialization:", error);
          handleLogout();
        }
      } else {
        // Clear any partial state if no valid tokens
        handleLogout();
      }
      
      setLoading(false);
      setInitialized(true);
    };
    
    initializeAuth();
  }, [fetchUserProfile, refreshAccessToken, handleLogout]);

  const login = async (username, password) => {
    try {
        console.log("Attempting login");
        const response = await apiFetch("/api/auth/login/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const tokens = await response.json();

        if (tokens.access && tokens.refresh) {
            console.log("Login successful, setting tokens");
            setAccessToken(tokens.access);
            setRefreshToken(tokens.refresh);

            if (typeof window !== "undefined") {
                localStorage.setItem("accessToken", tokens.access);
                localStorage.setItem("refreshToken", tokens.refresh);

                // Set the cookie *before* redirection
                document.cookie = `authToken=${tokens.access}; path=/; max-age=3600; SameSite=Strict`;

                // Get callbackUrl if available
                const params = new URLSearchParams(window.location.search);
                const callbackUrl = params.get("callbackUrl") || "/dashboard";

                // *Then* redirect
                router.push(callbackUrl);
            }

            await fetchUserProfile(tokens.access);

            return true;
        } else {
            throw new Error("Login response did not contain expected tokens.");
        }
    } catch (error) {
        console.error("Login error:", error);
        throw error;
    }
};
  


  const register = async (name, username, password,confirm_password) => {
    try {
      const response = await apiFetch("/api/auth/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password,confirm_password }),
      });
      
      return await response.json();
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logout = useCallback(() => {
    handleLogout();
    router.push("/");
  }, [router, handleLogout]);

  // Function to get the current access token with potential refresh
  const getAccessToken = useCallback(async () => {
    // If not initialized yet, wait a bit
    if (!initialized && loading) {
      console.log("Auth not initialized yet, waiting...");
      // Wait for initialization to complete with a small timeout
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // If we don't have an access token or refresh token, return null
    if (!accessToken && !refreshToken) {
      console.log("No tokens available");
      return null;
    }
    
    // If we have an access token, return it
    if (accessToken) {
      console.log("Returning existing access token");
      return accessToken;
    }
    
    // If we only have a refresh token, try to refresh
    console.log("No access token, attempting refresh");
    return await refreshAccessToken();
  }, [accessToken, refreshToken, refreshAccessToken, initialized, loading]);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!accessToken,
    getAccessToken,
    // Expose these for debugging if needed
    accessToken,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);