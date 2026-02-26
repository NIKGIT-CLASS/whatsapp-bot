import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.urlencoded({ extended: false }));

const humanMode = new Map(); // key: From number, value: true/false

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function norm(text) {
  return (text || "").trim().toLowerCase();
}

// Simple safety / behaviour rules for a candidate vetting assistant
const SYSTEM_PROMPT = `
You are a WhatsApp assistant answering candidate questions about a UK employee vetting process.

Rules:
- Keep replies short (2–4 sentences).
- Do NOT ask for or accept sensitive personal data in WhatsApp (DOB, NI number, passport scans, bank details, full address).
- If the candidate needs to share documents or personal details, say: "For security, please use the secure portal link from your email or ask me to resend it."
- If unsure, ask ONE clarifying question.
- If user wants a human, remind them they can type HUMAN.
`;

app.get("/", (req, res) => {
  res.send("Bot is running 👍");
});

app.post("/whatsapp", async (req, res) => {
  console.log("✅ /whatsapp webhook hit");
  console.log("RAW req.body =", JSON.stringify(req.body, null, 2));

  const from = req.body.From ?? req.body.from ?? "unknown";
  const body = req.body.Body ?? req.body.body ?? "";
  const msg = norm(body);

  console.log("From:", from);
  console.log("Body:", body);
  console.log("Msg:", msg);

  // HUMAN handover
  if (msg.includes("human") || msg.includes("agent")) {
    humanMode.set(from, true);
    return res.type("text/xml").send(`
      <Response>
        <Message>No problem — I’ll hand you to a person now. Please hold on.</Message>
      </Response>
    `);
  }

  // BOT OFF (force human mode)
  if (msg === "bot off" || msg === "ai off" || msg === "pause") {
    humanMode.set(from, true);
    return res.type("text/xml").send(`
      <Response>
        <Message>Bot paused. A human will take over. Type BOT ON to resume.</Message>
      </Response>
    `);
  }

  // BOT ON (resume bot)
  if (msg === "bot on" || msg === "ai on" || msg === "resume") {
    humanMode.set(from, false);
    return res.type("text/xml").send(`
      <Response>
        <Message>Bot is back on ✅ Ask me anything.</Message>
      </Response>
    `);
  }

  // Quiet in human mode
  if (humanMode.get(from) === true) {
    console.log("Human mode active for:", from, "— staying quiet.");
    return res.type("text/xml").send("<Response></Response>");
  }

  // AI reply
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.type("text/xml").send(`
        <Response>
          <Message>AI isn’t configured yet (missing OPENAI_API_KEY). Type HUMAN for a person.</Message>
        </Response>
      `);
    }

    const ai = await openai.responses.create({
      model: "gpt-5.2",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: body }
      ]
    });

    const replyText =
      (ai.output_text || "").trim() ||
      "Sorry — I couldn’t generate a reply. Type HUMAN to speak to a person.";

    // Twilio/WhatsApp: keep replies short
    const safeReply = replyText.slice(0, 900);

    return res.type("text/xml").send(`
      <Response>
        <Message>${escapeXml(safeReply)}</Message>
      </Response>
    `);
  } catch (err) {
    console.error("OpenAI error:", err?.message || err);
    return res.type("text/xml").send(`
      <Response>
        <Message>Sorry — I’m having trouble right now. Type HUMAN and a person will help.</Message>
      </Response>
    `);
  }
});

// Prevent broken XML if the model returns &, <, >
function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
