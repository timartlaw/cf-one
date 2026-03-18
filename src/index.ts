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
               || { count: 0, lastDateMillis: 0, lastClicked: "Never", monthStatus: 0 };
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

      const day = now.getDate(); // 1 to 31
      // 1. Reset status if it's the first of the month
      if (day === 1) {
          data.monthStatus = 0;
      }
      // 2. Update status (Set the bit corresponding to today)
      // We shift '1' left by (day - 1) positions to target the correct bit
      data.monthStatus |= (1 << (day - 1));

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
        renderCalendar(newData.monthStatus)
      });

      function renderCalendar(monthStatus) {
        const container = document.getElementById('calendar-container');
        if (!container) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const today = now.getDate();

        // Calendar Math
        const firstDay = new Date(year, month, 1).getDay(); // 0 (Sunday)
        const totalDays = new Date(year, month + 1, 0).getDate(); // 31 days
        const monthName = now.toLocaleString('default', { month: 'long' });

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.textAlign = 'center';

        const caption = table.createCaption();
        caption.textContent = monthName + " " + year;
        caption.style.fontWeight = 'bold';
        caption.style.padding = '10px';

        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
          const th = document.createElement('th');
          th.textContent = day;
          th.style.background = '#f4f4f4';
          th.style.border = '1px solid #ddd';
          headerRow.appendChild(th);
        });

        const tbody = table.createTBody();
        let date = 1;

        for (let i = 0; i < 6; i++) {
          const row = tbody.insertRow();
          for (let j = 0; j < 7; j++) {
            const cell = row.insertCell();
            cell.style.border = '1px solid #ddd';
            cell.style.padding = '12px';

            if ((i === 0 && j < firstDay) || date > totalDays) {
              cell.textContent = '';
            } else {
              cell.textContent = date.toString();
              
              // Color by bit: Even = Light Blue, Odd = White
              cell.style.backgroundColor = ((monthStatus & (1 << (day - 1))) !== 0) ? '#e3f2fd' : '#ffffff';

              // Highlight Today
              if (date === today) {
                cell.style.outline = '2px solid #2196f3';
                cell.style.fontWeight = 'bold';
              }
              date++;
            }
          }
          if (date > totalDays) break;
        }

        container.innerHTML = '';
        container.appendChild(table);
      }
    </script>
    <div id="calendar-container"></div>
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
