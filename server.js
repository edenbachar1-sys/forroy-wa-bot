import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import OpenAI from "openai";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const {
  PORT = 10000, // Render לרוב משתמש ב-10000, אבל גם לוקח מה-ENV אם קיים
  OPENAI_API_KEY,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM, // לדוגמה: whatsapp:+14155238886 (Sandbox)
} = process.env;

if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
if (!TWILIO_ACCOUNT_SID) throw new Error("Missing TWILIO_ACCOUNT_SID");
if (!TWILIO_AUTH_TOKEN) throw new Error("Missing TWILIO_AUTH_TOKEN");
if (!TWILIO_WHATSAPP_FROM) throw new Error("Missing TWILIO_WHATSAPP_FROM");

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const SYSTEM_PROMPT = `
את/ה סוכן/ת WhatsApp בעברית של FORROY (forroy.com).
טון: קצר, ברור, יוקרתי, מנומס.
כללים:
- אל תמציא/י מחירים/מלאי/זמני אספקה אם לא בטוח.
- אם חסר מידע: שאל/י שאלה אחת בלבד.
- אם מבקשים נציג/ה: בקש/י שם + טלפון + מה מחפשים + תקציב, והפנה ל-054-4515223 ול-sales@forroy.com.
- אם השאלה לא קשורה לתכשיטים/Forroy: ענה קצר והחזר למסלול.
`.trim();

app.get("/", (req, res) => res.send("OK"));

app.post("/whatsapp", async (req, res) => {
  // חשוב: Twilio חייב לקבל 2xx מהר
  res.status(200).send("OK");

  try {
    const from = req.body.From; // whatsapp:+972...
    const body = (req.body.Body || "").trim();

    if (!from || !body) return;

    // משתמשים ב-Responses API בפשטות עם input אחד (כולל system prompt)
    const prompt = `${SYSTEM_PROMPT}\n\nהודעת לקוח: ${body}\n\nתשובה:`;

    const aiResp = await openai.responses.create({
      model: "gpt-5-mini",
      input: prompt,
      temperature: 0.4,
      // אפשר גם להוסיף max_output_tokens אם בא לך לקצר
      // max_output_tokens: 120,
    });

    const reply =
      (aiResp.output_text || "").trim() ||
      "היי 💎 ברוכה הבאה ל-Forroy Jewelry. מה תרצי שאעזור לך למצוא?";

    await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: from,
      body: reply,
    });
  } catch (e) {
    console.error("Webhook error:", e?.message || e);
  }
});

app.listen(PORT, () => console.log("Listening on", PORT));

