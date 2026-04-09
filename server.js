const express = require("express");
const { exec } = require("child_process");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({ status: "OK", author: "Saif", api: "/alldl?url=YOUR_URL" });
});

app.get("/alldl", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    // TikTok
    if (url.includes("tiktok.com") || url.includes("vt.tiktok") || url.includes("vm.tiktok")) {
      const tiktok = require("@tobyg74/tiktok-api-dl");
      const data = await tiktok.Downloader(url, { version: 3 });

      if (data.status !== "success") {
        return res.json({ error: "TikTok failed", details: data });
      }

      const r = data.result;

      // Video — pipe করে পাঠাও
      if (r.type === "video" && r.video) {
        const videoUrl = r.video[0];
        const response = await axios.get(videoUrl, {
          responseType: "stream",
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://www.tiktok.com/"
          }
        });
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("X-Title", encodeURIComponent(r.desc || "TikTok Video"));
        return response.data.pipe(res);
      }

      // Photo
      if (r.type === "image" && r.images) {
        const imgUrl = r.images[0];
        const response = await axios.get(imgUrl, {
          responseType: "stream",
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("X-Title", encodeURIComponent(r.desc || "TikTok Photo"));
        return response.data.pipe(res);
      }
    }

    // Facebook, YouTube, Instagram — yt-dlp
    const opts = { timeout: 30000 };
    const cmd = `yt-dlp -f "best[ext=mp4]/best" --get-url "${url}"`;

    exec(cmd, opts, async (err, stdout, stderr) => {
      const lines = (stdout || "").trim().split("\n").filter(l => l.startsWith("http"));

      if (!lines.length) {
        return res.json({ error: "Failed", details: stderr || stdout });
      }

      const videoUrl = lines[0];

      exec(`yt-dlp --get-title "${url}"`, opts, async (e2, title) => {
        try {
          const response = await axios.get(videoUrl, { responseType: "stream" });
          res.setHeader("Content-Type", "video/mp4");
          res.setHeader("X-Title", encodeURIComponent(title?.trim() || "Video"));
          response.data.pipe(res);
        } catch (e) {
          res.json({ error: e.message });
        }
      });
    });

  } catch (err) {
    res.json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
