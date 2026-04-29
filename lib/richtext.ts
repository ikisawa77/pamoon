const allowedTags = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h2", "h3", "blockquote", "a"]);

export const sanitizeRichText = (html: string | null | undefined) => {
  if (!html) return "";

  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\sstyle="[^"]*"/gi, "")
    .replace(/\sstyle='[^']*'/gi, "")
    .replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tagName: string, attributes: string) => {
      const tag = tagName.toLowerCase();
      if (!allowedTags.has(tag)) return "";
      if (tag !== "a") return match.startsWith("</") ? `</${tag}>` : `<${tag}>`;

      const hrefMatch = attributes.match(/\shref=(["'])(.*?)\1/i);
      const href = hrefMatch?.[2] ?? "#";
      const safeHref = href.startsWith("http") || href.startsWith("/") ? href : "#";
      return match.startsWith("</") ? "</a>" : `<a href="${safeHref}" target="_blank" rel="noreferrer">`;
    });
};

export const richTextToPlainText = (html: string | null | undefined, limit = 180) => {
  const text = sanitizeRichText(html)
    .replace(/<br>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
};
