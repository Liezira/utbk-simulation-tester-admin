import React from 'react';
import { Bold, Italic, Underline, Strikethrough, Superscript, Subscript } from 'lucide-react';
import { applyFormat } from '../../utils/helpers';

const RichTextToolbar = ({ textareaRef, value, onChange }) => {
  const handleFormat = (format) => {
    const el = textareaRef?.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const result = applyFormat(value, s, e, format);
    onChange(result.text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.cursor - (result.cursor - e), result.cursor);
    });
  };

  const tools = [
    { icon: <Bold size={14}/>,         fmt: 'bold',        title: 'Bold (Ctrl+B)' },
    { icon: <Italic size={14}/>,       fmt: 'italic',      title: 'Italic (Ctrl+I)' },
    { icon: <Underline size={14}/>,    fmt: 'underline',   title: 'Underline' },
    { icon: <Strikethrough size={14}/>, fmt: 'strike',     title: 'Strikethrough' },
    { icon: <Superscript size={14}/>,  fmt: 'superscript', title: 'Superscript' },
    { icon: <Subscript size={14}/>,    fmt: 'subscript',   title: 'Subscript' },
  ];

  return (
    <div className="flex items-center gap-1 bg-gray-50 border border-b-0 border-gray-200 rounded-t-lg px-2 py-1.5 flex-wrap">
      {tools.map(({ icon, fmt, title }) => (
        <button
          key={fmt}
          type="button"
          title={title}
          onMouseDown={(e) => { e.preventDefault(); handleFormat(fmt); }}
          className="p-1.5 rounded hover:bg-indigo-100 hover:text-indigo-700 text-gray-500 transition"
        >
          {icon}
        </button>
      ))}
      <div className="w-px h-4 bg-gray-300 mx-1" />
      <span className="text-[10px] text-gray-400 italic">Pilih teks lalu klik format</span>
    </div>
  );
};

export default RichTextToolbar;
