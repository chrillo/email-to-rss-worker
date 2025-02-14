/**
 * Strips inline styles from an HTML string using regex
 * @param html The HTML string to process
 * @returns The HTML string with inline styles removed
 */
export function stripInlineStyles(html: string): string {
  if (!html) return "";

  // Remove style attributes
  return html.replace(/\s*style=["'][^"']*["']/gi, "");
}

/**
 * Sanitizes HTML by removing specified attributes using regex
 * @param html The HTML string to sanitize
 * @param attributes Array of attributes to remove (defaults to common unwanted attributes)
 * @returns The sanitized HTML string
 */
export function sanitizeHtml(
  html: string,
  attributes: string[] = ["style", "class", "id", "onclick"]
): string {
  if (!html) return "";

  // Create a regex pattern that matches any of the specified attributes
  const attributePattern = attributes
    .map((attr) => `\\s*${attr}=["'][^"']*["']`)
    .join("|");

  const regex = new RegExp(attributePattern, "gi");
  return html.replace(regex, "");
}

/**
 * Strips all HTML tags from a string
 * @param html The HTML string to process
 * @returns Plain text without HTML tags
 */
export function stripHtml(html: string): string {
  if (!html) return "";

  return html
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&nbsp;/g, " ") // Replace &nbsp; with spaces
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}
