export async function getAuthToken() {
    if (typeof document === "undefined") return null;
    
    const cookies = document.cookie.split(";").reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    }, {});
    
    return cookies.authToken || null;
  }
  
  export async function isAuthenticated() {
    const token = await getAuthToken();
    return !!token;
  }