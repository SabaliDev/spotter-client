export async function POST(request) {
    try {
      const body = await request.json();
      const { username, password } = body;
      
      // Send request to Django backend
      const response = await fetch(`${process.env.DJANGO_API_URL}/api/auth/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: data.detail || "Authentication failed" }),
          { status: response.status, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Set HTTP-only cookies with the tokens
      const cookieOptions = "HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax";
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Set-Cookie": `authToken=${data.access_token}; ${cookieOptions}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }