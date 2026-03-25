// --- ADMIN APP UTILS ---

export const applyFormat = (text, selStart, selEnd, format) => {
  const selected = text.substring(selStart, selEnd);
  if (!selected) return { text, cursor: selStart };

  const formatMap = {
    bold:        { wrap: ['**', '**'] },
    italic:      { wrap: ['_', '_'] },
    underline:   { wrap: ['<u>', '</u>'] },
    strike:      { wrap: ['~~', '~~'] },
    superscript: { wrap: ['^(', ')'] },
    subscript:   { wrap: ['_(', ')'] },
  };

  const fmt = formatMap[format];
  if (!fmt) return { text, cursor: selEnd };

  const [open, close] = fmt.wrap;
  const newText = text.substring(0, selStart) + open + selected + close + text.substring(selEnd);
  return { text: newText, cursor: selEnd + open.length + close.length };
};

export const isExpired = (createdAt) => {
  if (!createdAt) return false;
  return (Date.now() - new Date(createdAt).getTime()) > 24 * 60 * 60 * 1000;
};

export const buildWhatsAppMessage = (name, token, studentAppUrl) =>
  `Halo *${name}*,\n\nBerikut adalah akses ujian kamu:\n🔑 Token: *${token}*\n🔗 Link: ${studentAppUrl}\n\n⚠️ *Penting:* Token ini hanya berlaku 1x24 jam.\n\nSelamat mengerjakan!`;
