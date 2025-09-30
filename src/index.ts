const CSS = "body { color: red; }";
const HTML = `
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Arrêter de boire</title>
    <link rel="stylesheet" href="/test.css">
</head>
<body>
    <h1>Daniel开始戒酒, Day: 1</h1>
</body>
</html>
`;

export default {
  async fetch(req): Promise<Response> {
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
