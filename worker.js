export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "ZIDA AI VIDEO - Worker actif"
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    try {
      const body = await request.json();
      const prompt = body?.prompt;

      if (!prompt || typeof prompt !== "string") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Le prompt est obligatoire."
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          }
        );
      }

      if (!env.AI) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "La liaison Workers AI (AI) est introuvable."
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          }
        );
      }

      const result = await env.AI.run(
        "lightricks/ltx-2-5-fast",
        {
          prompt: prompt.trim(),
          duration: 8,
          resolution: "1280x720",
          fps: 24,
          generate_audio: false
        }
      );

      const video =
        result?.result?.video ||
        result?.video ||
        null;

      if (!video) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Le moteur AI n'a retourné aucune vidéo.",
            details: result
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Vidéo générée avec succès.",
          video: video
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error?.message || String(error)
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
  }
};
