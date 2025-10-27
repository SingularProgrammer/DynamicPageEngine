const fs = require('fs');

class DynamicPageEngine {
    constructor() {
        this.cachedTemplate = { "": "" };
        this.cachedPage = { "": {} };
        this.Visits = { "": 0 };
        this.rules = { "rendercacheLimit": 0, "cacheTemplates": true, "templateURL": "/" };
        this.watchers = {};
        this.cache = new Map();
    }
    /*
        Set rules for the DynamicPageEngine
        Rules_ is an object that can contain:
        - rendercacheLimit: Number of visits before caching the rendered page (default is 0, meaning no caching)
        - cacheTemplates: Boolean indicating whether to cache templates after first load (default is true)
        - templateURL: Base URL for templates (default is "/", meaning current directory)
    */
    setRules(Rules_ = { "rendercacheLimit": 0, "cacheTemplates": true, "templateURL": "/" }) {
        this.rules = { ...Rules_ };
    }
    renderTemplate(template, replacements, contentJsonString = null) {
        let result = template.replace(/\{(.*?)\}/g, (match, key) => {
            return key in replacements ? replacements[key] : match;
        });
        if (contentJsonString !== null) {
            result = result.replace('{DynamicPageEngine_ContentScript}', contentJsonString);
        }
        return result;
    }
    async listenTemplateAndChange(eventType) {
        if (eventType === 'change') {
            var data = await fs.promises.readFile(pageURL, 'utf8');
            this.cachedTemplate[pageurl] = data;
        }
    }
    startTemplateWatch(pageurl, targetlang = "en") {
        const pageURL = this.rules["templateURL"] + "/languages/" + targetlang + "/" + pageurl;
        if (this.watchers[pageURL]) return;

        this.watchers[pageURL] = fs.watch(pageURL, async (eventType) => {
            if (eventType === 'change') {
                try {
                    const data = await fs.promises.readFile(pageURL, 'utf8');
                    this.cachedTemplate[pageurl] = data;
                    if (this.cachedPage[pageurl]) {
                        this.cachedPage[pageurl] = {};
                    }
                } catch (err) {
                }
            }
        });
    }
    /*
        Main Render Function
        pageurl: The URL of the page template to render (relative to templateURL) Example: "product.html"
        targetlang: The language code for the template (default is "en") Example: "en", "fr"
        specialURL: A unique identifier for the page instance (default is "/") Example: "/product/123"
        content: An object containing key-value pairs for template replacements Example: { title: "My Product", description: "This is a great product." }
        contentAccessableInScript: If true, makes the content object accessible in the rendered page as a JSON string (default is false)
    */
    async Render(pageurl = "/", targetlang = "en", specialURL = "/", content = {}, contentAccessableInScript = false) {
        const pageURL = this.rules["templateURL"] + "/languages/" + targetlang + "/" + pageurl;
        const contentKey = JSON.stringify(content);
        const cacheKey = `${pageURL}|${targetlang}|${contentKey}`;
        this.Visits[cacheKey] = (this.Visits[cacheKey] || 0) + 1;
        let finalPage = "";

        if (this.cachedPage[pageurl] && this.cachedPage[pageurl][specialURL] && this.cachedPage[pageurl][specialURL].ContentData == content) {
            finalPage = this.cachedPage[pageurl][specialURL].pageContent;
        } else {
            if (this.cachedTemplate[pageurl]) {
                finalPage = this.renderTemplate(this.cachedTemplate[pageurl], content, contentAccessableInScript ? contentKey : null);
            } else {
                var data = await fs.promises.readFile(pageURL, 'utf8');
                finalPage = this.renderTemplate(data, content, contentAccessableInScript ? contentKey : null);

                if (this.rules["cacheTemplates"]) {
                    this.startTemplateWatch(pageurl, targetlang);
                }
            }
        }
        if (this.Visits[cacheKey] >= this.rules["rendercacheLimit"] && this.rules["rendercacheLimit"] > 0) {
            if (!this.cachedPage[pageurl]) {
                this.cachedPage[pageurl] = {};
            }
            this.cachedPage[pageurl][specialURL] = {
                ContentData: content,
                pageContent: finalPage
            };
        }
        return finalPage;
    }

    /*
        Render With Layout
        baseTemplatePath: Layout path.
        pageTemplatePath: The URL of the page template to render (relative to templateURL) Example: "product.html"
        targetlang: The language code for the template (default is "en") Example: "en", "fr"
        specialURL: A unique identifier for the page instance (default is "/") Example: "/product/123"
        data: An object containing key-value pairs for template replacements Example: { title: "My Product", description: "This is a great product." }
    */
    async RenderWithLayout(baseTemplatePath, pageTemplatePath, targetlang, data = {}) {
        const basePath = this.rules["templateURL"] + "/languages/" + targetlang + "/" + baseTemplatePath;
        const pagePath = this.rules["templateURL"] + "/languages/" + targetlang + "/" + pageTemplatePath;

        const cacheKey = `${basePath}|${pagePath}|${targetlang}|${data}`;

        const [baseStat, pageStat] = [fs.statSync(basePath), fs.statSync(pagePath)];
        const timestamps = `${baseStat.mtimeMs}-${pageStat.mtimeMs}`;

        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (cached.timestamps === timestamps) {
                return this.replaceKeys(cached.html, data);
            }
        }

        const baseTemplate = fs.readFileSync(basePath, 'utf8');
        const pageTemplate = fs.readFileSync(pagePath, 'utf8');

        const baseHead = this.extractSection(baseTemplate, 'head');
        const baseBody = this.extractSection(baseTemplate, 'body');
        const pageHead = this.extractSection(pageTemplate, 'head');
        const pageBody = this.extractSection(pageTemplate, 'body');

        const mergedHead = this.mergeHead(baseHead, pageHead);

        const mergedBody = baseBody.replace(
            '{DynamicPageEngine_SiteContent}',
            pageBody
        );

        const finalHtml = baseTemplate
            .replace(baseHead, mergedHead)
            .replace(baseBody, mergedBody);

        this.cache.set(cacheKey, { html: finalHtml, timestamps });

        return this.replaceKeys(finalHtml, data);
    }
    extractSection(html, tag) {
        const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(html);
        return match ? match[0] : '';
    }
    mergeHead(baseHead, pageHead) {
        const baseContent = baseHead.replace(/<\/?head>/gi, '');
        const pageContent = pageHead.replace(/<\/?head>/gi, '');
        return `<head>${baseContent}\n${pageContent}</head>`;
    }
    replaceKeys(html, data) {
        html = html.replace(/{DynamicPageEngine_ContentScript}/g, data);
        for (const key in data) {
            const re = new RegExp(`{${key}}`, 'g');
            html = html.replace(re, data[key]);
        }
        return html;
    }
}

module.exports = DynamicPageEngine;