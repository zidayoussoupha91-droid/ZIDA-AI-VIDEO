export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors
      });
    }

    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "ZIDA AI VIDEO - Wan 3.0 OK"
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        }
      );
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "POST required"
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        }
      );
    }

    try {
      if (!env.AI) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Workers AI binding missing"
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...cors
            }
          }
        );
      }

      const body = await request.json();

      const prompt =
        typeof body.prompt === "string"
          ? body.prompt.trim()
          : "";

      if (!prompt) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Prompt missing"
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...cors
            }
          }
        );
      }

      const resolution = [
        "480P",
        "720P",
        "1080P"
      ].includes(body.resolution)
        ? body.resolution
        : "480P";

      const ratio = [
        "adaptive",
        "16:9",
        "9:16",
        "1:1",
        "4:3",
        "3:4"
      ].includes(body.ratio)
        ? body.ratio
        : "adaptive";

      let duration = Number(body.duration);

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

      const result = await env.AI.run(
        "alibaba/wan-3.0",
        {
          prompt: prompt,
          resolution: resolution,
          ratio: ratio,
          duration: duration
        }
      );

      console.log("WAN 3.0 RESULT:", result);

      const video = result?.result?.video || null;

      if (!video) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "No video returned by Wan 3.0",
            code: "VIDEO_MISSING",
            state: result?.state || null
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...cors
            }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Video generated successfully",
          video: video,
          ratio: ratio,
          resolution: resolution,
          duration: duration
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        }
      );

    } catch (error) {
      console.error("WAN 3.0 ERROR:", error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error?.message || String(error),
          code: "WORKER_ERROR"
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        }
      );
    }
  }
};
