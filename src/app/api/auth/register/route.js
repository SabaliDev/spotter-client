export async function POST(request) {
    try {
      const body = await request.json();
      const { name, email, password } = body;
      
      // Send request to Django backend
      const response = await fetch(`${process.env.DJANGO_API_URL}/api/auth/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: data.detail || "Registration failed" }),
          { status: response.status, headers: { "Content-Type": "application/json" } }
        );
      }
      
      return new Response(JSON.stringify({ success: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }