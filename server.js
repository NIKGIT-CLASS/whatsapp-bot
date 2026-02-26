import express from "express";

const app = express();

// IMPORTANT: Twilio sends webhooks as x-www-form-urlencoded (form data)
app.use(express.urlencoded({ extended: false }));

// In-memory handover state (resets if Render restarts)
const humanMode = new Map(); // key: From number, value: true/false

function norm(text) {
  return (text || "").trim().toLowerCase();
}

app.get("/", (req, res) => {
  res.send("Bot is running 👍");
});

app.post("/whatsapp", (req, res) => {
  // 1) Debug: show EXACTLY what Twilio sent us
  console.log("✅ /whatsapp webhook hit");
  console.log("RAW req.body =", JSON.stringify(req.body, null, 2));

  // 2) Read values robustly (belt & braces)
  const from = req.body.From ?? req.body.from ?? "unknown";
  const body = req.body.Body ?? req.body.body ?? "";
  const msg = norm(body);

  console.log("From:", from);
  console.log("Body:", body);
  console.log("Msg:", msg);

  // 3) HUMAN handover triggers (candidate)
  if (msg.includes("human") || msg.includes("agent")) {
    humanMode.set(from, true);
    return res.type("text/xml").send(`
      <Response>
        <Message>No problem — I’ll hand you to a person now. Please hold on.</Message>
      </Response>
    `);
  }

  // 4) BOT OFF (force human mode)
  if (msg === "bot off" || msg === "ai off" || msg === "pause") {
    humanMode.set(from, true);
    return res.type("text/xml").send(`
      <Response>
        <Message>Bot paused. A human will take over. Type BOT ON to resume.</Message>
      </Response>
    `);
  }

  // 5) BOT ON (resume bot)
  if (msg === "bot on" || msg === "ai on" || msg === "resume") {
    humanMode.set(from, false);
    return res.type("text/xml").send(`
      <Response>
        <Message>Bot is back on ✅ Ask me anything.</Message>
      </Response>
    `);
  }

  // 6) If in human mode, stay quiet (no auto-reply)
  if (humanMode.get(from) === true) {
    console.log("Human mode active for:", from, "— staying quiet.");
    return res.type("text/xml").send("<Response></Response>");
  }

  // 7) Default reply (bot mode)
  return res.type("text/xml").send(`
    <Response>
      <Message>👋 I got your WhatsApp message! (Type HUMAN any time to speak to a person.)</Message>
    </Response>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
