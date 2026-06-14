// ══════════════════════════════════════════════════════════════
//  MARKDOWN LITE — Renderer mínimo seguro (sin dependencias)
//
//  Soporta:
//    **negrita**          → <strong>
//    *cursiva*            → <em>
//    > cita (línea)       → <blockquote>
//    Salto línea simple   → <br>
//    Línea en blanco      → nuevo <p>
//
//  Escapa HTML antes de transformar → seguro contra XSS.
// ══════════════════════════════════════════════════════════════

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applyInline(s: string): string {
  return s
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
}

export function renderMarkdownLite(src: string): string {
  if (!src) return '';
  const escaped = escapeHtml(src);
  const blocks = escaped.split(/\n{2,}/);

  return blocks.map(block => {
    const lines = block.split('\n');
    const isQuote = lines.length > 0 && lines.every(l => l.trim().startsWith('&gt;'));
    if (isQuote) {
      const inner = lines.map(l => l.replace(/^\s*&gt;\s?/, '')).join('<br>');
      return `<blockquote>${applyInline(inner)}</blockquote>`;
    }
    return `<p>${applyInline(lines.join('<br>'))}</p>`;
  }).join('');
}

/** Texto plano para previews (sin markdown). */
export function stripMarkdownLite(src: string): string {
  if (!src) return '';
  return src
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
