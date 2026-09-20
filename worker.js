const MODEL = "fal-ai/wan/v2.2-5b/image-to-video";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  async fetch(request, env) {

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // TEST GET
    if (request.method === "GET") {
      return json({
        success: true,
        message: "ZIDA AI VIDEO - Worker connecté",
        model: MODEL,
        fal_configured: !!env.ZIDA_AI_KEY
      });
    }

    // POST uniquement
    if (request.method !== "POST") {
      return json({
        success: false,
        error: "POST requis"
      }, 405);
    }

    // Vérification de la clé
    if (!env.ZIDA_AI_KEY) {
      return json({
        success: false,
        error: "ZIDA_AI_KEY est manquante dans Cloudflare"
      }, 500);
    }

    try {

      const body = await request.json();

      const prompt =
        body.prompt ||
        "Animation cinématique naturelle, mouvement doux de la caméra, mouvement réaliste du sujet.";

      const imageUrl = body.imageUrl || body.image_url;

      if (!imageUrl) {
        return json({
          success: false,
          error: "imageUrl est obligatoire"
        }, 400);
      }

      // 1. ENVOI À LA FILE FAL.AI
      const submitResponse = await fetch(
        `https://queue.fal.run/${MODEL}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Key ${env.ZIDA_AI_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            input: {
              image_url: imageUrl,
              prompt: prompt
            }
          })
        }
      );

      const submitText = await submitResponse.text();

      let submitData;

      try {
        submitData = JSON.parse(submitText);
      } catch {
        return json({
          success: false,
          error: "Réponse fal.ai invalide lors de l'envoi",
          status: submitResponse.status,
          details: submitText
        }, 502);
      }

      if (!submitResponse.ok) {
        return json({
          success: false,
          error: "fal.ai a refusé la demande",
          status: submitResponse.status,
          details: submitData
        }, submitResponse.status);
      }

      const requestId = submitData.request_id;

      if (!requestId) {
        return json({
          success: false,
          error: "fal.ai n'a pas fourni de request_id",
          details: submitData
        }, 502);
      }

      // 2. ATTENDRE LA FIN DE LA GÉNÉRATION
      let statusData = null;

      for (let i = 0; i < 25; i++) {

        await sleep(2000);

        const statusResponse = await fetch(
          `https://queue.fal.run/${MODEL}/requests/${requestId}/status`,
          {
            method: "GET",
            headers: {
              "Authorization": `Key ${env.ZIDA_AI_KEY}`
            }
          }
        );

        const statusText = await statusResponse.text();

        try {
          statusData = JSON.parse(statusText);
        } catch {
          return json({
            success: false,
            error: "Réponse de statut fal.ai invalide",
            details: statusText
          }, 502);
        }

        if (statusData.status === "COMPLETED") {
          break;
        }

        if (statusData.status === "FAILED") {
          return json({
            success: false,
            error: "La génération fal.ai a échoué",
            request_id: requestId,
            details: statusData
          }, 502);
        }
      }

      if (!statusData || statusData.status !== "COMPLETED") {
        return json({
          success: false,
          error: "La génération prend trop de temps. Réessaie dans quelques instants.",
          request_id: requestId,
          status: statusData
        }, 504);
      }

      // 3. RÉCUPÉRER LE VRAI RÉSULTAT
      const resultResponse = await fetch(
        `https://queue.fal.run/${MODEL}/requests/${requestId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Key ${env.ZIDA_AI_KEY}`
          }
        }
      );

      const resultText = await resultResponse.text();

      let resultData;

      try {
        resultData = JSON.parse(resultText);
      } catch {
        return json({
          success: false,
          error: "Réponse finale fal.ai invalide",
          details: resultText
        }, 502);
      }

      if (!resultResponse.ok) {
        return json({
          success: false,
          error: "Impossible de récupérer le résultat vidéo",
          status: resultResponse.status,
          details: resultData
        }, resultResponse.status);
      }

      // 4. RÉCUPÉRER L'URL DE LA VIDÉO
      const videoUrl =
        resultData.video?.url ||
        resultData.data?.video?.url ||
        resultData.output?.video?.url;

      if (!videoUrl) {
        return json({
          success: false,
          error: "fal.ai a terminé mais aucune URL vidéo n'a été trouvée",
          request_id: requestId,
          result: resultData
        }, 502);
      }

      // 5. SUCCÈS
      return json({
        success: true,
        message: "Vidéo générée avec succès",
        model: MODEL,
        request_id: requestId,
        video_url: videoUrl,
        video: {
          url: videoUrl
        }
      });

    } catch (error) {

      return json({
        success: false,
        error: "Erreur serveur ZIDA AI VIDEO",
        details: error?.message || String(error)
      }, 500);

    }
  }
};
