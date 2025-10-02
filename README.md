# Dynamic Page Engine

A simple and easy solution for creating server-side rendered pages.

You can add it to your project with `npm install dynamic-page-engine`.

## How It Works

It detects keys you add to your static HTML pages and replaces them with the corresponding data. The generated HTML code can be served via a Node.js server. To add a key, you write the name of the desired data inside "{}" brackets; if a matching key is found, the brackets and the key are replaced with that data. Instead of plain text, HTML, CSS, and JavaScript code can also be added, but you must ensure the syntax is correct, otherwise your page may not function properly due to syntax errors.

## Example Code

index.html:

```html
<head>
    <title>{dynamic_title}</title>
    <script>
        var data = {DynamicPageEngine_ContentScript};
        console.log(data.dynamic_name);
    </script>
</head>

<body>
    <p>Your Name: {dynamic_name}</p>
    <p>{the mismatched part appears unformatted.}</p>
</body>
```

server.js:

```javascript
const DynamicPageEngine = require("./DTE.js");
const express = require("express");
const app = express();

const engine = new DynamicPageEngine();
var test = {
        dynamic_name: "Foo",
        dynamic_title: "Bar"
    };


engine.setRules({ "rendercacheLimit": 5, "cacheTemplates": true, "templateURL": "TemplateURLS" }); // Engine Rules

app.get("/welcomepage", async (req, res) => {
    const page = await engine.Render("/index.html", "en", "/welcomepage", test, true); // Prepare Page
    res.send(page); // Send Page
});
app.listen(3000, () => console.log("Server running: http://localhost:3000"));
```

Rendered index.html:

```html
<head>
    <title>Bar</title>
    <script>
        var data = {
            dynamic_name: "Foo",
            dynamic_title: "Bar"
        }; // You can get page data with "{DynamicPageEngine_ContentScript}" 
        console.log(data.dynamic_name);
    </script>
</head>

<body>
    <p>Your Name: Foo</p>
    <p>{the mismatched part appears unformatted.}</p>
</body>

```
