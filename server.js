import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import OpenAI from "openai";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const {
  PORT = 3000,
  OPENAI_API_KEY,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM, // לדוגמה: whatsapp:+14155238886 (Twilio Sandbox)
} = process.env;

if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
if (!TWILIO_ACCOUNT_SID) throw new Error("Missing TWILIO_ACCOUNT_SID");
if (!TWILIO_AUTH_TOKEN) throw new Error("Missing TWILIO_AUTH_TOKEN");
if (!TWILIO_WHATSAPP_FROM) throw new Error("Missing TWILIO_WHATSAPP_FROM");

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const SYSTEM_PROMPT = `
את/ה סוכן/ת WhatsApp בעברית של FORROY (forroy.com).
קצר, ברור, מנומס.
אם חסר מידע—שאל/י שאלה אחת בלבד.
אם מבקשים נציג/ה—בקש/י שם + טלפון + מה מחפשים + תקציב והפנה ל-054-4515223 ול-sales@forroy.com.
אל תמציא/י מחירים/מלאי אם לא בטוח.
`.trim();

app.get("/", (req, res) => res.send("OK"));

app.post("/whatsapp", async (req, res) => {
  try {
    const from = req.body.From; // whatsapp:+972...
    const body = (req.body.Body || "").trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: body },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "לא הצלחתי לענות כרגע—אפשר לנסח שוב?";

    await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: from,
      body: reply,
    });

    return res.status(200).send("OK");
  } catch (e) {
    console.error(e);
    return res.status(200).send("OK"); // חשוב ל-Twilio לקבל 2xx
  }
});

app.listen(PORT, () => console.log("Listening on", PORT));
