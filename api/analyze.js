// =====================================================================
// SERVER FUNCTION: /api/analyze
// This runs on Vercel, NOT in the browser. That's why the API key is safe:
// it lives in Vercel's settings (environment variables) and never reaches
// the phone or the web page.
//
// What it does:
//   1. Checks the password sent by the app
//   2. Takes the meal photo from the app
//   3. Sends photo + prompt to Claude Haiku 5.5
//   4. Returns Claude's JSON answer + token usage to the app
// =====================================================================

const crypto = require("crypto");

// ---- The prompt (same one we perfected in the Playground) ----
const SYSTEM_PROMPT =
  "You are a nutrition assistant. You estimate calories and macronutrients from meal photos. Always answer only with JSON.";

const USER_PROMPT = `Look at the meal in the photo.
1. List every food you can see.
2. Estimate the portion of each in grams, as served (cooked), and use nutrition values for cooked food. Include likely cooking oil as its own item.
3. Estimate calories, protein, carbs and fat for each item and for the total.
4. Rate your confidence as low, medium or high, and name anything you cannot see (oil, sauce, hidden ingredients).
If the photo shows no food, return an empty "items" list, zeros in "total", and explain in "notes".

Answer ONLY with JSON in this exact format, no other text:
{
  "items": [{"name": "", "grams": 0, "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}],
  "total": {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0},
  "confidence": "medium",
  "notes": ""
}`;

// Compare passwords safely (prevents timing tricks).
// Spaces before/after are ignored, so a stray space in Vercel doesn't lock you out.
function passwordOk(given) {
  const expected = (process.env.APP_PASSWORD || "").trim();
  const a = crypto.createHash("sha256").update(String(given || "").trim()).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

// Pull the JSON object out of Claude's text, even if it adds stray words
function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in answer");
  return JSON.parse(text.slice(start, end + 1));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  // ---- Step 1: password check ----
  if (!(process.env.APP_PASSWORD || "").trim()) {
    return res.status(500).json({ error: "APP_PASSWORD is not set in Vercel. Add it under Settings → Environment Variables, then Redeploy." });
  }
  if (!passwordOk(req.headers["x-app-password"])) {
    return res.status(401).json({ error: "Wrong password" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key is not set in Vercel settings" });
  }

  // ---- Step 2: get the photo ----
  const { image, mediaType } = req.body || {};
  if (!image || !mediaType) {
    return res.status(400).json({ error: "No photo received" });
  }

  // ---- Step 3: ask Claude ----
  let apiRes;
  try {
    apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-5-5",
        max_tokens: 2048,
        // Low effort + no thinking = fast and cheap; plenty for this task
        output_config: { effort: "low" },
        thinking: { type: "disabled" },
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
              { type: "text", text: USER_PROMPT },
            ],
          },
        ],
      }),
    });
  } catch (e) {
    return res.status(502).json({ error: "Could not reach Claude" });
  }

  const data = await apiRes.json();
  if (!apiRes.ok) {
    const msg = (data && data.error && data.error.message) || "Claude returned an error";
    return res.status(apiRes.status).json({ error: msg });
  }

  if (data.stop_reason === "refusal") {
    return res.status(422).json({ error: "Claude declined to analyze this photo" });
  }

  // ---- Step 4: read the answer and send it back ----
  const textBlock = (data.content || []).filter((b) => b.type === "text").pop();
  if (!textBlock) {
    return res.status(502).json({ error: "Empty answer, please try again" });
  }

  let result;
  try {
    result = extractJson(textBlock.text);
  } catch (e) {
    return res.status(502).json({ error: "Could not read the answer, please try again" });
  }

  return res.status(200).json({
    result,
    usage: {
      input_tokens: data.usage.input_tokens,
      output_tokens: data.usage.output_tokens,
    },
    model: data.model,
  });
};
