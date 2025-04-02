export async function GET(request) {
    try {
      // Get the auth token from cookies
      const cookies = request.cookies;
      const authToken = cookies.get("authToken")?.value;
  
      if (!authToken) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
  
      // Verify the token with the Django backend
      const response = await fetch(`${process.env.DJANGO_API_URL}/api/auth/me/`, {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      });
  
      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
  
      const user = await response.json();
      
      return new Response(
        JSON.stringify(user),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }