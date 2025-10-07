import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing ?url parameter" });

  try {
    // Direct file link
    if (url.endsWith(".mp3") || url.endsWith(".mp4")) {
      return res.status(200).json({ success: true, links: [url] });
    }

    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const links = [];
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (href && (href.endsWith(".mp3") || href.endsWith(".mp4"))) {
        links.push(href.startsWith("http") ? href : new URL(href, url).href);
      }
    });

    const regexMatches = [...html.matchAll(/https?:\/\/[^\s'"]+\.(mp3|mp4)/gi)].map(m => m[0]);
    const all = [...new Set([...links, ...regexMatches])];

    return res.status(200).json({ success: true, links: all });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
