const express = require("express");
const { exec } = require("child_process");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({ status: "OK", author: "Saif", api: "/alldl?url=YOUR_URL" });
});

app.get("/alldl", (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  const opts = { timeout: 30000 };

  // TikTok এর জন্য extra flags
  const cmd = `yt-dlp \
    --no-check-certificate \
    --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
    -f "best[ext=mp4]/best" \
    --get-url "${url}"`;

  exec(cmd, opts, (err, stdout, stderr) => {
    const lines = (stdout || "").trim().split("\n").filter(l => l.startsWith("http"));

    if (!lines.length) {
      return res.json({ error: "Failed", details: stderr || stdout });
    }

    const resultUrl = lines[0];

    exec(`yt-dlp --get-title "${url}"`, opts, (e2, title) => {
      return res.json({
        result: resultUrl,
        cp: title?.trim() || "Downloaded ✅"
      });
    });
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
