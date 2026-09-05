export default {
  async fetch(request, env) {

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    // =========================
    // CORS
    // =========================
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // =========================
    // TEST DU WORKER
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
      // VÉRIFIER LA LIAISON AI
      // =========================
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

      // =========================
      // LIRE LA REQUÊTE
      // =========================
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

      // =========================
      // RÉCUPÉRER LES PARAMÈTRES
      // =========================
      const prompt =
        typeof body?.prompt === "string"
          ? body.prompt.trim()
          : "";

      const format =
        body?.format === "9:16"
          ? "9:16"
          : "16:9";

      let duration = Number(body?.duration);

      // Le modèle accepte une durée définie.
      // On utilise 8 secondes si aucune durée valide
      // n'est envoyée par le site.
      if (!Number.isFinite(duration)) {
        duration = 8;
      }

      if (duration <= 0) {
        duration = 8;
      }

      // =========================
      // VÉRIFIER LE PROMPT
      // =========================
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

      // =========================
      // RÉSOLUTION
      // =========================
      const resolution =
        format === "9:16"
          ? "720x1280"
          : "1280x720";

      // =========================
      // APPEL DU MODÈLE VIDÉO
      // =========================
      let result;

      try {
        result = await env.AI.run(
          "lightricks/ltx-2-5-fast",
          {
            prompt,
            duration,
            resolution,
            fps: 24,
            generate_audio: false
          }
        );
      } catch (aiError) {

        return new Response(
          JSON.stringify({
            success: false,
            error:
              aiError?.message ||
              String(aiError) ||
              "Erreur pendant l'appel du moteur vidéo IA.",
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

      // =========================
      // RÉCUPÉRER LA VIDÉO
      // =========================
      const video =
        result?.result?.video ||
        result?.video ||
        null;

      // =========================
      // SI PAS DE VIDÉO
      // =========================
      if (!video) {

        return new Response(
          JSON.stringify({
            success: false,
            error:
              "Le moteur IA a terminé sa réponse mais aucune URL vidéo n'a été trouvée.",
            code: "VIDEO_URL_MISSING",
            state: result?.state || null,
            result: result || null
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
      // SUCCÈS
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
      // ERREUR GÉNÉRALE
      // =========================
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
