const résultat = await env.AI.run(
  "lightricks/ltx-2-5-fast",
  {
    prompt: rapide,
    duration: 8,
    resolution: "1280x720",
    fps: 24,
    generate_audio: false
  }
);
