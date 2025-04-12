import { Article } from "../types";

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

/**
 * Generate an RSS feed XML string from a list of articles.
 */
export function renderRss(emailHash: string, articles: Article[]): string {
  const itemsXml = articles
    .map(
      (article) => `
    <item>
      <guid>${escapeXml(article.id)}</guid>
      <title>${escapeXml(article.title)}</title>
      <link isPermalink="true">${escapeXml(article.url)}</link>
      <description>${escapeXml(article.description)}</description>
      <pubDate>${new Date(article.createdAt).toUTCString()}</pubDate>
      <author>${escapeXml(article.source || "")}</author>
    </item>`
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Newsletter for ${escapeXml(emailHash)}</title>
    <description>Extracted newsletter articles</description>
    <link>https://example.com</link>
    ${itemsXml}
  </channel>
</rss>`;
}
