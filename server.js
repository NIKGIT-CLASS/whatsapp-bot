import express from "express";

const app = express();

// Twilio sends webhooks as form-encoded data
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("Bot is running 👍");
});

app.post("/whatsapp", (req, res) => {
  const reply = `
    <Response>
      <Message>👋 I got your WhatsApp message!</Message>
    </Response>
  `;
  res.type("text/xml").send(reply);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
