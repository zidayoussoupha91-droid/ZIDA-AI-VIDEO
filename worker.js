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
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [
            {
              role: "system",
              content:
                "Tu es l'assistant IA de ZIDA AI VIDEO. Aide l'utilisateur à préparer des prompts détaillés pour créer des vidéos."
            },
            {
              role: "user",
              content: prompt
            }
          ]
        }
      );

      return new Response(
        JSON.stringify({
          success: true,
          result
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
