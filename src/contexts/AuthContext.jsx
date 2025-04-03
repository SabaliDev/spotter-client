"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext();
const getStoredToken = (key) => {
  
  if (typeof window !== "undefined") {
    return localStorage.getItem(key);
  }
  return null;
};

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
      const textError = await response.text();
      errorData = {detail: textError || `HTTP error! status: ${response.status}`};
    }
     const error = new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
     error.status = response.status; 
     error.data = errorData; 
     throw error;
  }

  const contentType = response.headers.get("content-type");
  if (response.status !== 204 && contentType && contentType.includes("application/json")) {
      return response.json(); 
  } else if (response.status === 204) {
      return null;
  } else {
      return response;
  }
};


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => getStoredToken('accessToken')); 
  const [refreshToken, setRefreshToken] = useState(() => getStoredToken('refreshToken')); 
  const [loading, setLoading] = useState(true); 
  const [initialized, setInitialized] = useState(false); 
  const router = useRouter();

  const handleLogout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);

    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");

      document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

    }
  }, [/* router */]);


  const refreshAccessTokenInternal = useCallback(async () => {
    const currentRefreshToken = refreshToken;
    if (!currentRefreshToken) {
        return null; 
    }

    try {
      const data = await apiFetch("/api/auth/refresh/", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: currentRefreshToken }),
      });

      if (data && data.access) {
        const newAccessToken = data.access;
        setAccessToken(newAccessToken); 

        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", newAccessToken);
        }
        return newAccessToken; 
      } else {
         handleLogout();
         throw new Error("Failed to refresh token: Invalid response data.");
      }
    } catch (error) {
       handleLogout();
       throw new Error(`Token refresh failed: ${error.message || 'Unknown error'}`);
    }
  }, [refreshToken, handleLogout]);


  const fetchUserProfile = useCallback(async (tokenToUse) => {
    if (!tokenToUse) {
      setUser(null); 
      return null;
    }

    try {
       const userData = await apiFetch("/api/auth/me/", { 
         headers: {
           Authorization: `Bearer ${tokenToUse}`,
         },
       });

      setUser(userData); 
      return userData;
    } catch (error) {
      setUser(null);
      throw error; 
    }
  }, []);


  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true); 


      if (accessToken) {
        try {
          await fetchUserProfile(accessToken);
        } catch (error) {
          if (error.status === 401 && refreshToken) { 
            try {
              const newToken = await refreshAccessTokenInternal();
              if (newToken) {
                await fetchUserProfile(newToken); 
              } else {
              }
            } catch (refreshError) {
            }
          } else if (!refreshToken) {
             handleLogout();
          } else {
             handleLogout(); 
          }
        }
      } else if (refreshToken) {
        try {
          const newToken = await refreshAccessTokenInternal();
          if (newToken) {
            await fetchUserProfile(newToken);
          } else {
          }
        } catch (refreshError) {
        }
      } else {
        handleLogout(); 
      }

      setLoading(false); 
      setInitialized(true); 
    };

    if (!initialized) {
        initializeAuth();
    } else {
        setLoading(false); 
    }
  }, [initialized]); 


  const login = async (username, password) => {
    setLoading(true); 
    try {
      console.log("Attempting login via AuthContext");
       const tokens = await apiFetch("/api/auth/login/", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ username, password }),
       });


      if (tokens && tokens.access && tokens.refresh) {
        const newAccessToken = tokens.access;
        const newRefreshToken = tokens.refresh;

        setAccessToken(newAccessToken);
        setRefreshToken(newRefreshToken);

        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", newAccessToken);
          localStorage.setItem("refreshToken", newRefreshToken);
        }

        await fetchUserProfile(newAccessToken);

        setLoading(false);
        return true; 
      } else {
        throw new Error("Login response did not contain expected tokens.");
      }
    } catch (error) {
      handleLogout(); 
      setLoading(false); 
      throw error; 
    }
  };


  const register = async (name, username, password, confirm_password) => {
    const email = username;
    try {
       console.log("Attempting registration via AuthContext");
       const response = await apiFetch("/api/auth/register/", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ name, username, email, password, password2: confirm_password }),
       });
      return response; 
    } catch (error) {
      throw error;
    }
  };


  const logout = useCallback(() => {
    handleLogout(); 
    router.push("/");
  }, [handleLogout, router]);


  const getAccessToken = useCallback(async () => {
    let waitCount = 0;
    while (!initialized && loading && waitCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
    }

    if (!initialized && loading) {
        throw new Error("Authentication context did not initialize in time.");
    }
    if (accessToken) {
      return accessToken;
    }


    if (refreshToken) {
      try {
        const newToken = await refreshAccessTokenInternal();
        if (newToken) {
           return newToken;
        } else {
           return null; 
        }
      } catch (error) {
         return null; 
      }
    }

    return null;
  }, [initialized, loading, accessToken, refreshToken, refreshAccessTokenInternal]); 



  const value = {
    user,
    loading: loading || !initialized, // 
    isAuthenticated: !!user && !!accessToken,
    login,
    register,
    logout,
    getAccessToken,
    refreshAccessToken: refreshAccessTokenInternal,
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}


export const useAuth = () => useContext(AuthContext);