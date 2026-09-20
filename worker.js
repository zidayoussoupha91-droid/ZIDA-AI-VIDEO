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

    // Test GET
    if (request.method === "GET") {
      return json({
        success: true,
        message: "ZIDA AI VIDEO - Worker connecté à fal.ai",
        model: MODEL
      });
    }

    // Seulement POST pour générer
    if (request.method !== "POST") {
      return json({
        success: false,
        error: "POST requis"
      }, 405);
    }

    try {
      // Vérification de la clé
      if (!env.ZIDA_AI_KEY) {
        return json({
          success: false,
          error: "ZIDA_AI_KEY est manquante dans Cloudflare."
        }, 500);
      }

      const body = await request.json();

      const prompt =
        body.prompt ||
        "Une scène réaliste et naturelle, mouvement doux de la caméra, animation fluide.";

      const imageUrl =
        body.image_url ||
        body.imageUrl ||
        body.image;

      if (!imageUrl) {
        return json({
          success: false,
          error: "image_url est obligatoire."
        }, 400);
      }

      /*
       * 1. ENVOI À LA FILE FAL.AI
       */
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

      let submitResult = {};
      try {
        submitResult = submitText ? JSON.parse(submitText) : {};
      } catch {
        submitResult = {
          raw: submitText
        };
      }

      if (!submitResponse.ok) {
        return json({
          success: false,
          error: "fal.ai a refusé la demande.",
          status: submitResponse.status,
          details: submitResult
        }, submitResponse.status);
      }

      const requestId = submitResult.request_id;

      if (!requestId) {
        return json({
          success: false,
          error: "fal.ai n'a pas renvoyé de request_id.",
          details: submitResult
        }, 502);
      }

      /*
       * 2. VÉRIFICATION DE LA FILE
       *
       * On vérifie pendant environ 25 secondes.
       */
      const statusUrl =
        `https://queue.fal.run/${MODEL}/requests/${requestId}/status`;

      const resultUrl =
        `https://queue.fal.run/${MODEL}/requests/${requestId}`;

      for (let i = 0; i < 10; i++) {

        await sleep(2500);

        const statusResponse = await fetch(statusUrl, {
          method: "GET",
          headers: {
            "Authorization": `Key ${env.ZIDA_AI_KEY}`
          }
        });

        const statusText = await statusResponse.text();

        let statusResult = {};
        try {
          statusResult = statusText
            ? JSON.parse(statusText)
            : {};
        } catch {
          statusResult = {
            raw: statusText
          };
        }

        if (!statusResponse.ok) {
          return json({
            success: false,
            error: "Impossible de vérifier le statut fal.ai.",
            status: statusResponse.status,
            details: statusResult,
            request_id: requestId
          }, statusResponse.status);
        }

        const status = statusResult.status;

        /*
         * Génération terminée
         */
        if (status === "COMPLETED") {

          const resultResponse = await fetch(resultUrl, {
            method: "GET",
            headers: {
              "Authorization": `Key ${env.ZIDA_AI_KEY}`
            }
          });

          const resultText = await resultResponse.text();

          let result = {};
          try {
            result = resultText
              ? JSON.parse(resultText)
              : {};
          } catch {
            result = {
              raw: resultText
            };
          }

          if (!resultResponse.ok) {
            return json({
              success: false,
              error: "La génération est terminée mais le résultat n'a pas pu être récupéré.",
              request_id: requestId,
              details: result
            }, resultResponse.status);
          }

          const videoUrl =
            result?.video?.url ||
            result?.data?.video?.url ||
            result?.response?.video?.url;

          if (!videoUrl) {
            return json({
              success: false,
              error: "La génération est terminée mais aucune URL vidéo n'a été trouvée.",
              request_id: requestId,
              details: result
            }, 502);
          }

          return json({
            success: true,
            message: "🎉 Vidéo générée avec succès !",
            model: MODEL,
            request_id: requestId,
            video_url: videoUrl
          });
        }

        /*
         * Erreur de génération
         */
        if (
          status === "FAILED" ||
          status === "ERROR"
        ) {
          return json({
            success: false,
            error: "fal.ai a échoué pendant la génération.",
            request_id: requestId,
            status: status,
            details: statusResult
          }, 502);
        }
      }

      /*
       * Si la vidéo prend plus de temps,
       * on renvoie le request_id au site.
       */
      return json({
        success: false,
        processing: true,
        message: "⏳ La vidéo est encore en cours de génération.",
        request_id: requestId,
        status_url: statusUrl,
        result_url: resultUrl
      }, 202);

    } catch (error) {

      return json({
        success: false,
        error: error?.message || "Erreur inconnue du Worker."
      }, 500);
    }
  }
};
