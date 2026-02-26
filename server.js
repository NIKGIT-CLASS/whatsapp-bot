import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running 👍");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
app.post("/whatsapp", (req, res) => {
  const reply = `
    <Response>
      <Message>👋 I got your WhatsApp message!</Message>
    </Response>
  `;
  res.type("text/xml").send(reply);
});
