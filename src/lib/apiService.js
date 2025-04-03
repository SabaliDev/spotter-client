/**
 * Makes an authenticated API request with automatic token refresh and retry.
 * @param {string} endpoint - The API endpoint (relative or absolute).
 * @param {function} getToken - Async function that returns the current access token.
 * @param {function} refreshTokenFn - Async function to attempt token refresh. Should return the new token or null/throw on failure.
 * @param {function} logoutFn - Function to call to log the user out on unrecoverable auth failure.
 * @param {object} options - Optional fetch options (method, body, etc.).
 * @param {boolean} isRetry - Internal flag to prevent infinite retry loops.
 */
export async function fetchWithAuth(
  endpoint,
  getToken,
  refreshTokenFn, 
  logoutFn,       
  options = {},
  isRetry = false 
) {
  const baseUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_DJANGO_API_URL is not defined in your environment.");
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint}`;

  let token;
  try {
    
    token = await getToken();
  } catch (error) {
    console.error("Error getting access token:", error);
    token = null; 
  }

  if (!token && !isRetry) {
      console.warn(`Auth request to ${endpoint} without a token.`);
  }

  const headers = {
  
    ...(!(options.body instanceof FormData) && options.body && { "Content-Type": "application/json" }),
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    console.log(`Making ${options.method || 'GET'} request to ${url} with auth token: ${token ? 'present' : 'missing'}`);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // --- Start: 401 Handling ---
    if (!response.ok && response.status === 401 && !isRetry) {
      console.log("Received 401 Unauthorized. Attempting token refresh...");
      try {
        const newToken = await refreshTokenFn();
        if (newToken) {
         
          return await fetchWithAuth(endpoint, getToken, refreshTokenFn, logoutFn, options, true);
        } else {
          logoutFn();
          throw new Error("Session expired. Please log in again.");
        }
      } catch (refreshError) {
        logoutFn(); 
        throw new Error("Session expired. Please log in again.");
      }
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        const textError = await response.text();
        errorData = { detail: textError || `HTTP error! status: ${response.status}` };
      }
       const error = new Error(errorData.detail || `Request failed with status ${response.status}`);
       error.status = response.status;
       error.data = errorData;
       throw error;
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      return await response.text();
    }

  } catch (error) {
     if (error.message !== "Session expired. Please log in again.") {
     }
    throw error;
  }
}


export async function fetchApi(endpoint, options = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_DJANGO_API_URL is not defined in your environment.");
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        const textError = await response.text();
        errorData = { detail: textError || `HTTP error! status: ${response.status}` };
      }
       const error = new Error(errorData.detail || `Request failed with status ${response.status}`);
       error.status = response.status;
       error.data = errorData;
       throw error;
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error(`API Error for ${endpoint}:`, error);
    throw error;
  }
}