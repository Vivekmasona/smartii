import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing ?url parameter");

  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Rewrite relative links to absolute
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (href && !href.startsWith("http")) $(el).attr("href", new URL(href, url).href);
    });
    $("img").each((_, el) => {
      const src = $(el).attr("src");
      if (src && !src.startsWith("http")) $(el).attr("src", new URL(src, url).href);
    });

    // Extract mp3/mp4 links
    const mediaLinks = [];
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (href && (href.endsWith(".mp3") || href.endsWith(".mp4"))) mediaLinks.push(href);
    });

    // Return modified HTML + overlay script
    res.setHeader("Content-Type", "text/html; charset=UTF-8");
    res.status(200).send(`
      ${$.html()}
      <script>
        const overlayLinks = ${JSON.stringify(mediaLinks)};
        if(overlayLinks.length>0){
          const overlay = document.createElement('div');
          overlay.style.position='fixed';
          overlay.style.bottom='20px';
          overlay.style.right='20px';
          overlay.style.background='rgba(0,0,0,0.7)';
          overlay.style.padding='10px';
          overlay.style.borderRadius='8px';
          overlay.style.zIndex='10000';
          overlay.innerHTML='<strong>Downloads Found:</strong><div></div>';
          document.body.appendChild(overlay);
          const list = overlay.querySelector('div');
          overlayLinks.forEach(l=>{
            const btn=document.createElement('button');
            btn.textContent=l.split('/').pop();
            btn.style.display='block';
            btn.style.marginTop='5px';
            btn.style.cursor='pointer';
            btn.onclick=()=>window.open(l,'_blank');
            list.appendChild(btn);
          });
        }
      </script>
    `);
  } catch (e) {
    res.status(500).send("Error fetching URL: " + e.message);
  }
}
