exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "OPENAI_API_KEY is not configured." })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
        instructions:
          "You are Habit Harbor's personal growth coach. Give concise, practical, kind guidance for habits, physical wellbeing, mental wellbeing, sleep, stress, and consistency. Do not diagnose, prescribe medication, or claim to replace a professional. If the user mentions self-harm, crisis, severe symptoms, or danger, urge immediate local emergency or professional support. Keep answers under 170 words and end with one small next action.",
        input: JSON.stringify({
          message: String(body.message || ""),
          mood: String(body.mood || "steady"),
          energy: String(body.energy || "3"),
          habits: Array.isArray(body.habits) ? body.habits.slice(0, 12) : [],
          progress: body.progress || {}
        }),
        max_output_tokens: 450
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: data.error?.message || "The AI coach could not answer right now."
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: data.output_text || "I am here with you. Choose one small healthy action you can do next."
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "The AI coach had trouble responding." })
    };
  }
};
