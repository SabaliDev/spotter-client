export async function POST() {
    try {
      // Clear the auth token cookie
      const cookieOptions = "HttpOnly; Path=/; Max-Age=0; SameSite=Lax";
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Set-Cookie": `authToken=; ${cookieOptions}`,
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