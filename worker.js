export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Test du Worker
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "ZIDA AI VIDEO - Wan 3.0 opérationnel"
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            ...corsHeaders
          }
        }
      );
    }

    // Seulement POST pour générer
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Méthode non autorisée."
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            ...corsHeaders
          }
        }
      );
    }

    try {
      // Vérification Workers AI
      if (!env.AI) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Workers AI n'est pas connecté à ce Worker.",
            code: "AI_BINDING_MISSING"
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json; charset=UTF-8",
              ...corsHeaders
            }
          }
        );
      }

      // Lecture du JSON
      let body;

      try {
        body = await request.json();
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "La requête reçue n'est pas un JSON valide.",
            code: "INVALID_JSON"
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json; charset=UTF-8",
              ...corsHeaders
            }
          }
        );
      }

      // Prompt
      const prompt =
        typeof body?.prompt === "string"
          ? body.prompt.trim()
          : "";

      if (!prompt) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Le prompt est obligatoire.",
            code: "PROMPT_MISSING"
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json; charset=UTF-8",
              ...corsHeaders
            }
          }
        );
      }

      // Ratio
      const allowedRatios = [
        "adaptive",
        "16:9",
        "9:16",
        "1:1",
        "4:3",
        "3:4"
      ];

      const ratio = allowedRatios.includes(body?.ratio)
        ? body.ratio
        : "16:9";

      // Résolution
      const allowedResolutions = [
        "480P",
        "720P",
        "1080P"
      ];

      const resolution = allowedResolutions.includes(body?.resolution)
        ? body.resolution
        : "480P";

      // Durée
      let duration = Number(body?.duration);

      if (!Number.isFinite(duration)) {
        duration = 5;
      }

      duration = Math.round(duration);

      if (duration < 1) {
        duration = 1;
      }

      if (duration > 15) {
        duration = 15;
      }

      console.log("ZIDA AI VIDEO - Wan 3.0");
      console.log("Prompt:", prompt);
      console.log("Ratio:", ratio);
      console.log("Resolution:", resolution);
      console.log("Duration:", duration);

      // Appel Wan 3.0
      let result;

      try {
        result = await env.AI.run(
          "alibaba/wan-3.0",
          {
            prompt: prompt,
            resolution: resolution,
            ratio: ratio,
            duration: duration
          }
        );

        console.log("Réponse Wan 3.0:", result);

      } catch (aiError) {
        console.error("Erreur Wan 3.0:", aiError);

        return new Response(
          JSON.stringify({
            success: false,
            error:
              aiError?.message ||
              String(aiError) ||
              "Erreur pendant la génération vidéo.",
            code: "AI_RUN_ERROR"
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json; charset=UTF-8",
              ...corsHeaders
            }
          }
        );
      }

      // Récupération de la vidéo
      const video =
        result?.result?.video ||
        result?.video ||
        null;

      if (!video) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Wan 3.0 a répondu mais aucune vidéo n'a été trouvée.",
            code: "VIDEO_MISSING",
            state: result?.state || null
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json; charset=UTF-8",
              ...corsHeaders
            }
          }
        );
      }

      // Succès
      return new Response(
        JSON.stringify({
          success: true,
          message: "Vidéo générée avec succès.",
          video: video,
          ratio: ratio,
          resolution: resolution,
          duration: duration
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            ...corsHeaders
          }
        }
      );

    } catch (error) {
      console.error("Erreur générale Worker:", error);

      return new Response(
        JSON.stringify({
          success: false,
          error:
            error?.message ||
            String(error) ||
            "Une erreur inconnue est survenue.",
          code: "WORKER_ERROR"
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            ...corsHeaders
          }
        }
      );
    }
  }
};
