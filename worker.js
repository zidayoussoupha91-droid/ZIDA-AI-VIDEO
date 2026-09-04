export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          message: "ZIDA AI VIDEO - Worker actif"
        }),
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    try {
      const body = await request.json();
      const prompt = body.prompt;

      if (!prompt) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Le champ prompt est obligatoire."
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }

      const result = await env.AI.run(
        "lightricks/ltx-2-5-fast",
        {
          prompt: prompt,
          duration: 8,
          resolution: "1280x720",
          fps: 24,
          generate_audio: false
        }
      );

      return new Response(
        JSON.stringify({
          success: true,
          video: result.video
        }),
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
};
