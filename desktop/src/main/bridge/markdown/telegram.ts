function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(text: string) {
  return escapeHtml(text).replace(/"/g, "&quot;");
}

function replaceCodeBlocks(text: string) {
  return text.replace(/```([\s\S]*?)```/g, (_match, code: string) => {
    return `<pre><code>${escapeHtml(String(code).trim())}</code></pre>`;
  });
}

function replaceInlineCode(text: string) {
  return text.replace(/`([^`]+)`/g, (_match, code: string) => {
    return `<code>${escapeHtml(code)}</code>`;
  });
}

function replaceLinks(text: string) {
  return text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_match, label: string, href: string) => {
    return `<a href="${escapeAttr(href)}">${escapeHtml(label)}</a>`;
  });
}

function replaceStyles(text: string) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/__([^_]+)__/g, "<b>$1</b>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/\*([^*\n]+)\*/g, "<i>$1</i>")
    .replace(/_([^_\n]+)_/g, "<i>$1</i>");
}

function replaceBlockquotes(text: string) {
  return text
    .split("\n")
    .map((line) => (line.startsWith("&gt; ") ? `<blockquote>${line.slice(5)}</blockquote>` : line))
    .join("\n");
}

export function renderTelegramHtml(markdown: string) {
  let html = escapeHtml(markdown);
  html = replaceCodeBlocks(html);
  html = replaceInlineCode(html);
  html = replaceLinks(html);
  html = replaceStyles(html);
  html = replaceBlockquotes(html);
  return html;
}
