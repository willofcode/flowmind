import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ---- Google FreeBusy Proxy ----
app.post("/freebusy", async (req, res) => {
  const { accessToken, timeMin, timeMax } = req.body;
  const r = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ timeMin, timeMax, items: [{ id: "primary" }] })
  });
  res.json(await r.json());
});

// ---- NeuralSeek Integration ----
app.post("/plan-week", async (req, res) => {
  const { userProfile, weekStartISO, weekEndISO } = req.body;
  const ns = await fetch("https://api.neuralseek.com/maistro_stream", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.NS_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      agent: "optimize-neuro-agent",
      input: { userProfile, weekStartISO, weekEndISO }
    })
  });
  const data = await ns.json();
  res.json(data);
});

// ---- Create Calendar Events ----
app.post("/create-events", async (req, res) => {
  const { accessToken, events } = req.body;
  const out = [];
  for (const e of events) {
    const g = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        summary: e.summary,
        description: e.description,
        start: { dateTime: e.startISO },
        end: { dateTime: e.endISO },
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }] }
      })
    });
    out.push(await g.json());
  }
  res.json(out);
});

app.listen(process.env.PORT, () =>
  console.log(`Server running on http://localhost:${process.env.PORT}`)
);
