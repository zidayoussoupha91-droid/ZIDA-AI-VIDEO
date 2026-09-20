export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    // Autoriser les requêtes OPTIONS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Test simple du Worker
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "ZIDA AI VIDEO - Worker connecté avec fal.ai",
          model: "fal-ai/wan/v2.2-5b/image-to-video"
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    // Nous acceptons uniquement POST pour générer
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "POST requis"
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    try {
      // Vérifier la clé fal.ai
      if (!env.ZIDA_AI_KEY) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "ZIDA_AI_KEY est manquante dans Cloudflare."
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }

      const body = await request.json();

      const prompt =
        body.prompt ||
        "A cinematic realistic video with natural movement.";

      const imageUrl = body.image_url || body.imageUrl;

      if (!imageUrl) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "image_url est obligatoire."
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }

      // Modèle vidéo peu coûteux pour notre premier test
      const model = "fal-ai/wan/v2.2-5b/image-to-video";

      // Envoyer la génération à la file fal.ai
      const falResponse = await fetch(
        `https://queue.fal.run/${model}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Key ${env.ZIDA_AI_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            image_url: imageUrl,
            prompt: prompt
          })
        }
      );

      const result = await falResponse.json();

      if (!falResponse.ok) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Erreur fal.ai",
            details: result
          }),
          {
            status: falResponse.status,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }

      // fal.ai renvoie normalement un request_id
      return new Response(
        JSON.stringify({
          success: true,
          message: "Génération vidéo lancée",
          model: model,
          request_id: result.request_id,
          status_url: result.status_url,
          response_url: result.response_url
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error?.message || "Erreur inconnue"
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
};
