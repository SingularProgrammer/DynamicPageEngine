const http = require("http");
const DynamicPageEngine = require("dynamic-page-engine");

const engine = new DynamicPageEngine();
var test = {
    title: "Welcome",
    username: "Foo",
    description: "This is a dynamic page rendered with DynamicPageEngine.",
    dynamic_HTML: "<h2>This is dynamic HTML content</h2>",
    newcolor: "blue",
};

engine.setRules({ "rendercacheLimit": 5, "cacheTemplates": true, "templateURL": "Template" });

const server = http.createServer(async (req, res) => {
    if (req.url === "/") {
        const page = await engine.Render("/index.html", "en", "/", test, true);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(page);
    } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Sayfa bulunamadı.");
    }
});

// Sunucu başlat
server.listen(3000, () => {
    console.log("Server çalışıyor: http://localhost:3000");
});