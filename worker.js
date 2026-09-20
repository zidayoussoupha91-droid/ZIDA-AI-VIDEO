export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors,
      });
    }

    // Test simple du Worker
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "ZIDA AI VIDEO - Worker connecté",
          model: "MiniMax H3",
        }),
        {
          status: 200,
          headers: {
            ...cors,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "POST requis",
        }),
        {
          status: 405,
          headers: {
            ...cors,
            "Content-Type": "application/json",
          },
        }
      );
    }

    try {
      const body = await request.json();

      const prompt =
        body.prompt ||
        "Une scène cinématographique réaliste, mouvement de caméra doux et naturel.";

      const duration = Number(body.duration || 5);
      const ratio = body.ratio || "16:9";
      const resolution = body.resolution || "768P";

      /*
       * Appel Cloudflare AI Gateway / AI REST API.
       *
       * Les informations sensibles doivent être placées
       * dans les variables/secrets Cloudflare, jamais dans GitHub.
       */
      if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "Configuration manquante : CLOUDFLARE_ACCOUNT_ID ou CLOUDFLARE_API_TOKEN.",
          }),
          {
            status: 500,
            headers: {
              ...cors,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const url =
        `https://api.cloudflare.com/client/v4/accounts/` +
        `${env.CLOUDFLARE_ACCOUNT_ID}/ai/run`;

      const aiResponse = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          "cf-aig-gateway-id": "default",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "minimax/h3",
          input: {
            content: [
              {
                type: "text",
                text: prompt,
              },
            ],
            duration,
            ratio,
            resolution,
          },
        }),
      });

      const result = await aiResponse.json();

      if (!aiResponse.ok) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Erreur du moteur vidéo Cloudflare",
            details: result,
          }),
          {
            status: aiResponse.status,
            headers: {
              ...cors,
              "Content-Type": "application/json",
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Génération vidéo lancée avec succès",
          result,
        }),
        {
          status: 200,
          headers: {
            ...cors,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error?.message || "Erreur inconnue du Worker",
        }),
        {
          status: 500,
          headers: {
            ...cors,
            "Content-Type": "application/json",
          },
        }
      );
    }
  },
};
