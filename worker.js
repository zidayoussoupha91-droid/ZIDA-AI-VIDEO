export default {
  async fetch(request, env) {

    // =========================
    // CORS
    // =========================
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    // =========================
    // OPTIONS / CORS
    // =========================
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // =========================
    // POST uniquement
    // =========================
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "ZIDA AI VIDEO - Worker opérationnel"
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

    try {

      // =========================
      // Lire la demande
      // =========================
      let body;

      try {
        body = await request.json();
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "La requête reçue n'est pas un JSON valide."
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

      const prompt = body?.prompt;
      const format = body?.format || "16:9";
      const duration = Number(body?.duration) || 8;

      // =========================
      // Vérifier le prompt
      // =========================
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Le prompt est obligatoire."
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

      // =========================
      // Vérifier Workers AI
      // =========================
      if (!env.AI) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "La liaison Workers AI est absente. Vérifie le binding AI dans Cloudflare."
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

      // =========================
      // Résolution selon le format
      // =========================
      let resolution = "1280x720";

      if (format === "9:16") {
        resolution = "720x1280";
      }

      // =========================
      // Génération vidéo IA
      // =========================
      const result = await env.AI.run(
        "lightricks/ltx-2-5-fast",
        {
          prompt: prompt.trim(),
          duration: duration,
          resolution: resolution,
          fps: 24,
          generate_audio: false
        }
      );

      // =========================
      // Récupérer l'URL vidéo
      // =========================
      const video =
        result?.result?.video ||
        result?.video ||
        null;

      // =========================
      // Aucune vidéo reçue
      // =========================
      if (!video) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Le moteur IA a répondu, mais aucune vidéo n'a été retournée.",
            details: result
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

      // =========================
      // Succès
      // =========================
      return new Response(
        JSON.stringify({
          success: true,
          message: "Vidéo générée avec succès.",
          video: video,
          format: format,
          duration: duration,
          resolution: resolution
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

      // =========================
      // Gestion des erreurs
      // =========================
      return new Response(
        JSON.stringify({
          success: false,
          error:
            error?.message ||
            String(error) ||
            "Une erreur inconnue est survenue."
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
