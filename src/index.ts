const CSS = "body { color: red; }";

export default {
  async fetch(req, env): Promise<Response> {
    const url = new URL(req.url);
    // Helper to get current Date object forced to UTC+8 start-of-day
    const getBeijingDate = (date) => {
      const d = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(date);
      return new Date(`${d[4].value}-${d[2].value}-${d[0].value}T00:00:00Z`);
    };

    let data = await env.COUNTER_KV.get("stats", { type: "json" }) 
               || { count: 0, lastDateMillis: 0, lastClicked: "Never" };
    if (req.method === "POST" && url.pathname === "/increment") {
      const now = new Date();
      const today = getBeijingDate(now);
      

      const lastDate = new Date(data.lastDateMillis || 0);
      const diffDays = (today - lastDate) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        // SCENARIO 1: Success! Clicked the very next day.
        data.count++;
      } else if (diffDays > 1 || data.count === 0) {
        // SCENARIO 2: Missed a day or first time user. Reset.
        data.count = 1;
      } else {
        // SCENARIO 3: Already clicked today (diffDays === 0). Do nothing.
        return new Response(JSON.stringify({ ...data, message: "Already checked in today!" }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // Update metadata
      data.lastDateMillis = today.getTime();
      data.lastClicked = now.toLocaleString('en-GB', { timeZone: 'Asia/Shanghai' });

      await env.COUNTER_KV.put("stats", JSON.stringify(data));

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" }
      });
    }

const HTML = `
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Arrêter de boire</title>
    <link rel="stylesheet" href="/test.css">
</head>
<body>
    <h1 id="dan">Daniel开始戒酒, Day: ${data.count}</h1>
    <div style="font-family: sans-serif; padding: 20px;">
      <button id="counter-btn" style="padding: 10px 20px; cursor: pointer;">
        お酒を止める
      </button>
      <p id="msg" style="color: gray; font-size: 0.8em;">Last: ${data.lastClicked}</p>
    </div>
    <script>
      const dan = document.getElementById('dan');
      const btn = document.getElementById('counter-btn');
      const msg = document.getElementById('msg');
      
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const res = await fetch('/increment', { method: 'POST' });
        const newData = await res.json();
        
        dan.innerText = 'Daniel开始戒酒, Day: ' + newData.count;
        msg.innerText = 'Last: ' + newData.lastClicked + (newData.message ? ' (' + newData.message + ')' : '');
        btn.disabled = false;
      });
    </script>
    <img src="https://cdn.jsdelivr.net/gh/timartlaw/edge-one/friend.webp" alt="Friends">
</body>
</html>
`;
    // If request is for test.css, serve the raw CSS
    if (/test\.css$/.test(req.url)) {
      return new Response(CSS, {
        headers: {
          "content-type": "text/css",
        },
      });
    } else {
      // Serve raw HTML using Early Hints for the CSS file
      return new Response(HTML, {
        headers: {
          "content-type": "text/html",
          link: "</test.css>; rel=preload; as=style",
        },
      });
    }
  },
} satisfies ExportedHandler;
