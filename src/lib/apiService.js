/**
 * Makes an authenticated API request with token refresh capability.
 * @param {string} endpoint - The API endpoint (relative or absolute).
 * @param {function} getToken - Async function that returns the current access token.
 * @param {object} options - Optional fetch options (method, body, etc.).
 */
export async function fetchWithAuth(endpoint, getToken, options = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_DJANGO_API_URL is not defined in your environment.");
  }
  
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint}`;
  
  // Get the token (this should be an async function that can refresh if needed)
  let token;
  try {
    token = await getToken();
  } catch (error) {
    console.error("Error getting access token:", error);
    token = null;
  }
  
  if (!token) {
    console.warn(`Auth request to ${endpoint} without a token.`);
  }
  
  const headers = {
    ...(options.body && { "Content-Type": "application/json" }),
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
    
    // Handle errors
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error(`API Error (${response.status}) for ${url}:`, errorData);
      } catch (e) {
        const textError = await response.text();
        errorData = { detail: textError || `HTTP error! status: ${response.status}` };
        console.error(`API Non-JSON Error (${response.status}) for ${url}:`, textError);
      }
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }
    
    // Handle empty responses
    if (response.status === 204) {
      return null;
    }
    
    // Parse response based on content type
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

/**
 * Simple wrapper for non-authenticated API requests
 */
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
    
    // Handle errors
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        const textError = await response.text();
        errorData = { detail: textError || `HTTP error! status: ${response.status}` };
      }
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }
    
    // Handle empty responses
    if (response.status === 204) {
      return null;
    }
    
    // Parse response based on content type
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