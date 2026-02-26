mport express from "express";

const app = express();
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
  const from = req.body.From; // e.g. "whatsapp:+447..."
  const body = req.body.Body || "";

  console.log("✅ Incoming WhatsApp");
  console.log("From:", from);
  console.log("Body:", body);

  const msg = norm(body);

  // Candidate asks for a human
  if (msg === "human" || msg === "agent" || msg.includes("speak to a human")) {
    humanMode.set(from, true);
    const reply = `
      <Response>
        <Message>No problem — I’ll hand you to a person now. Please hold on.</Message>
      </Response>
    `;
    return res.type("text/xml").send(reply);
  }

  // You can turn bot back on (you may want to restrict this later)
  if (msg === "bot on" || msg === "ai on" || msg === "resume") {
    humanMode.set(from, false);
    const reply = `
      <Response>
        <Message>Bot is back on ✅ Ask me anything.</Message>
      </Response>
    `;
    return res.type("text/xml").send(reply);
  }

  // Optional: force bot off
  if (msg === "bot off" || msg === "ai off" || msg === "pause") {
    humanMode.set(from, true);
    const reply = `
      <Response>
        <Message>Bot paused. A human will take over. Type BOT ON to resume.</Message>
      </Response>
    `;
    return res.type("text/xml").send(reply);
  }

  // If this number is in human mode, stay quiet (no auto-reply)
  if (humanMode.get(from) === true) {
    return res.type("text/xml").send("<Response></Response>");
  }

  // Normal (bot-on) reply for now
  const reply = `
    <Response>
      <Message>👋 I got your WhatsApp message! (Type HUMAN any time to speak to a person.)</Message>
    </Response>
  `;
  return res.type("text/xml").send(reply);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
