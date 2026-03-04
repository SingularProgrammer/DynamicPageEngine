# Dynamic Page Engine

A lightweight, fast, and flexible server-side HTML templating engine for Node.js. Dynamic Page Engine lets you define placeholders in your static HTML files and replace them with real data at render time with built-in caching, multi-language support, and layout composition.

---

## Table of Contents

- [Installation](#installation)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
  - [setRules(rules)](#setrulesrules)
  - [Render(pageurl, targetlang, specialURL, content, contentAccessableInScript)](#renderpageurl-targetlang-specialurl-content-contentaccessableinscript)
  - [RenderWithLayout(baseTemplatePath, pageTemplatePath, targetlang, data)](#renderwithlayoutbasetemplatepath-pagetemplatepath-targetlang-data)
- [Template Syntax](#template-syntax)
- [Caching](#caching)
- [Multi-Language Support](#multi-language-support)
- [Layout System](#layout-system)
- [Full Example](#full-example)
- [Notes & Best Practices](#notes--best-practices)

---

## Installation

```bash
npm install dynamic-page-engine
```

---

## How It Works

Dynamic Page Engine scans your HTML template files for `{key}` placeholders and replaces them with values from a data object you provide at render time. The engine is designed to be used with a Node.js server (e.g., Express) to serve dynamically rendered HTML pages without a heavy frontend framework.

**Key features:**
- Simple `{key}` placeholder syntax in HTML templates
- Template-level and page-level caching for performance
- File system watching cached templates auto-update when files change
- Multi-language template support via directory structure
- Layout composition merge a base layout with a page-specific template
- Expose render data directly to client-side JavaScript

---

## Getting Started

### Directory Structure

Dynamic Page Engine expects your templates to be organized by language under a base template directory:

```
project/
├── server.js
└── TemplateURLS/
    └── languages/
        └── en/
            ├── layout.html
            └── index.html
```

### Basic Template (`index.html`)

```html
<head>
    <title>{dynamic_title}</title>
    <script>
        var pageData = {DynamicPageEngine_ContentScript};
        console.log(pageData.dynamic_name);
    </script>
</head>
<body>
    <h1>Welcome, {dynamic_name}!</h1>
    <p>{unmatched_key} will remain as-is in output.</p>
</body>
```

### Server (`server.js`)

```javascript
const DynamicPageEngine = require("dynamic-page-engine");
const express = require("express");
const app = express();

const engine = new DynamicPageEngine();

engine.setRules({
    rendercacheLimit: 5,
    cacheTemplates: true,
    templateURL: "TemplateURLS"
});

const data = {
    dynamic_name: "Alice",
    dynamic_title: "Welcome Page"
};

app.get("/welcome", async (req, res) => {
    const page = await engine.Render("/index.html", "en", "/welcome", data, true);
    res.send(page);
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
```

### Rendered Output

```html
<head>
    <title>Welcome Page</title>
    <script>
        var pageData = {"dynamic_name":"Alice","dynamic_title":"Welcome Page"};
        console.log(pageData.dynamic_name);
    </script>
</head>
<body>
    <h1>Welcome, Alice!</h1>
    <p>{unmatched_key} will remain as-is in output.</p>
</body>
```

---

## API Reference

### `setRules(rules)`

Configures the engine's behavior. Must be called before rendering.

```javascript
engine.setRules({
    rendercacheLimit: 10,
    cacheTemplates: true,
    templateURL: "TemplateURLS"
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `rendercacheLimit` | `number` | `0` | Number of visits to a page before its rendered output is cached. Set to `0` to disable render caching. |
| `cacheTemplates` | `boolean` | `true` | If `true`, template files are read from disk once and cached in memory. A file system watcher automatically invalidates the cache if the file changes. |
| `templateURL` | `string` | `"/"` | Base directory where your templates are stored. |

---

### `Render(pageurl, targetlang, specialURL, content, contentAccessableInScript)`

The primary rendering method. Reads the specified HTML template, replaces `{key}` placeholders with values from `content`, and returns the final HTML string.

```javascript
const html = await engine.Render(
    "/index.html",   // Template file path (relative to templateURL/languages/<lang>/)
    "en",            // Language code
    "/welcome",      // Unique identifier for this page instance (used for render cache)
    { title: "Hi" }, // Data object for replacements
    true             // Expose data to client-side JS via {DynamicPageEngine_ContentScript}
);
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `pageurl` | `string` | `"/"` | Path to the template file relative to `templateURL/languages/<lang>/`. |
| `targetlang` | `string` | `"en"` | Language subdirectory to load the template from. |
| `specialURL` | `string` | `"/"` | A unique key for this rendered page instance (e.g., `/product/42`). Used to scope the render cache. |
| `content` | `object` | `{}` | Key-value pairs used to replace `{key}` placeholders in the template. |
| `contentAccessableInScript` | `boolean` | `false` | If `true`, injects the `content` object as a JSON string in place of the `{DynamicPageEngine_ContentScript}` placeholder. |

**Returns:** `Promise<string>` The fully rendered HTML page.

---

### `RenderWithLayout(baseTemplatePath, pageTemplatePath, targetlang, data)`

Renders a page by merging a **base layout** template with a **page-specific** template. The `<head>` sections from both templates are combined, and the page body is injected into the layout's `{DynamicPageEngine_SiteContent}` placeholder.

```javascript
const html = await engine.RenderWithLayout(
    "/layout.html",   // Base layout template
    "/about.html",    // Page-specific template
    "en",             // Language code
    { title: "About" } // Data object for replacements
);
```

| Parameter | Type | Description |
|---|---|---|
| `baseTemplatePath` | `string` | Path to the layout/shell template (relative to `templateURL/languages/<lang>/`). |
| `pageTemplatePath` | `string` | Path to the page content template (relative to `templateURL/languages/<lang>/`). |
| `targetlang` | `string` | Language subdirectory to load templates from. |
| `data` | `object` | Key-value pairs used to replace `{key}` placeholders in the final merged HTML. |

**How merging works:**
1. Both templates' `<head>` sections are extracted and concatenated the base layout's `<head>` comes first, followed by the page's `<head>`.
2. The page's `<body>` content is injected into the layout's `<body>` where `{DynamicPageEngine_SiteContent}` appears.
3. The merged HTML is cached (keyed by file paths and file modification timestamps) so repeated calls with unchanged files are fast.

**Returns:** `Promise<string>` The fully merged and rendered HTML page.

---

## Template Syntax

### Basic Placeholder

Wrap any key name in curly braces. It will be replaced with the matching value from your data object.

```html
<p>Hello, {username}!</p>
```

```javascript
{ username: "Bob" }
// Output: <p>Hello, Bob!</p>
```

### Unmatched Keys

If a placeholder has no matching key in the data object, it is left in the output **exactly as written** no errors are thrown.

```html
<p>{this_key_doesnt_exist}</p>
<!-- Output: <p>{this_key_doesnt_exist}</p> -->
```

> **Note:** Placeholders with spaces (e.g. `{this has spaces}`) will also be left as-is since they won't match any typical object key.

### Client-Side Data Access

Place the special `{DynamicPageEngine_ContentScript}` token anywhere in your template (typically inside a `<script>` tag). When `contentAccessableInScript` is `true`, it is replaced with a JSON string of your entire data object making the server-side data available to client-side JavaScript without an additional API call.

```html
<script>
    var pageData = {DynamicPageEngine_ContentScript};
    console.log(pageData.username); // "Bob"
</script>
```

### Layout Content Injection

When using `RenderWithLayout`, mark where the page body should be injected in your layout file:

```html
<!-- layout.html -->
<body>
    <nav>My Site Nav</nav>
    <main>
        {DynamicPageEngine_SiteContent}
    </main>
    <footer>My Footer</footer>
</body>
```

---

## Caching

Dynamic Page Engine has two independent caching layers:

### 1. Template Cache (`cacheTemplates: true`)

After a template file is read from disk for the first time, its raw content is stored in memory. Subsequent renders skip the file I/O entirely. A `fs.watch` listener is registered on the file if the file is modified on disk, the in-memory cache is automatically invalidated and the file is re-read on the next request.

### 2. Render Cache (`rendercacheLimit: N`)

After a given page URL (`specialURL`) has been visited **N or more times** with the same content, the fully rendered HTML output is stored in memory. Future requests for that exact combination return the cached HTML instantly, bypassing both file I/O and template processing.

Set `rendercacheLimit` to `0` (the default) to disable render caching entirely useful during development.

---

## Multi-Language Support

Templates are organized by language under the `templateURL` base directory:

```
TemplateURLS/
└── languages/
    ├── en/
    │   └── index.html
    ├── fr/
    │   └── index.html
    └── de/
        └── index.html
```

Pass the appropriate language code as the second argument to `Render` or `RenderWithLayout`:

```javascript
// English version
await engine.Render("/index.html", "en", "/", data);

// French version
await engine.Render("/index.html", "fr", "/", data);
```

The engine constructs the full file path as:
```
<templateURL>/languages/<targetlang>/<pageurl>
```

---

## Layout System

The layout system allows you to define a single **base layout** (with shared navigation, headers, footers, etc.) and inject page-specific content into it keeping your templates DRY.

### Base Layout (`layout.html`)

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="/shared.css">
</head>
<body>
    <nav><a href="/">Home</a> | <a href="/about">About</a></nav>
    <main>
        {DynamicPageEngine_SiteContent}
    </main>
    <footer>© 2025 My Site</footer>
</body>
</html>
```

### Page Template (`about.html`)

```html
<!DOCTYPE html>
<html>
<head>
    <title>{page_title}</title>
</head>
<body>
    <h1>About Us</h1>
    <p>{about_text}</p>
</body>
</html>
```

### Rendering

```javascript
const html = await engine.RenderWithLayout(
    "/layout.html",
    "/about.html",
    "en",
    {
        page_title: "About Us",
        about_text: "We build great things."
    }
);
```

The resulting HTML will have both `<head>` blocks merged and the about page's body content injected into the layout's `<main>` section.

---

## Full Example

```javascript
const DynamicPageEngine = require("dynamic-page-engine");
const express = require("express");
const app = express();

const engine = new DynamicPageEngine();

engine.setRules({
    rendercacheLimit: 10,   // Cache rendered pages after 10 visits
    cacheTemplates: true,   // Cache raw template files in memory
    templateURL: "views"    // Templates live in ./views/languages/<lang>/
});

// Simple page render
app.get("/", async (req, res) => {
    const html = await engine.Render("/home.html", "en", "/", {
        site_title: "My App",
        welcome_message: "Hello, World!"
    }, true);
    res.send(html);
});

// Page with shared layout
app.get("/about", async (req, res) => {
    const html = await engine.RenderWithLayout("/layout.html", "/about.html", "en", {
        page_title: "About Us",
        description: "Learn more about our team."
    });
    res.send(html);
});

// Language-specific render
app.get("/fr/accueil", async (req, res) => {
    const html = await engine.Render("/home.html", "fr", "/fr/accueil", {
        site_title: "Mon Application",
        welcome_message: "Bonjour le monde!"
    });
    res.send(html);
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
```

---

## Notes & Best Practices

- **Placeholder keys are case-sensitive.** `{Title}` and `{title}` are treated as different keys.
- **Values can be any string**, including raw HTML, inline CSS, or JavaScript snippets. Make sure injected HTML is well-formed to avoid rendering issues.
- **Avoid spaces inside placeholders.** `{my key}` will not be matched and will appear as-is in the output.
- **Use `specialURL` carefully** with render caching. If the same template is rendered with different `content` objects but the same `specialURL`, the cache may serve stale content. Use a URL that uniquely identifies the page *and* its data (e.g., `/product/42`).
- **During development**, set `rendercacheLimit: 0` to always get fresh renders and `cacheTemplates: false` to always read files from disk.
- **`RenderWithLayout`** uses synchronous file reads (`readFileSync`) internally for the initial load avoid calling it in hot paths with very high concurrency without warming the cache first.
