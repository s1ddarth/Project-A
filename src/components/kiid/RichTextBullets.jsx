import React, { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// One Quill instance per narrative section. Each paragraph (<p>) in the editor
// maps to one bullet in the data model, so the existing <ul><li> preview and the
// LaTeX bullet list are preserved. Rich formatting (colour, weight) is stored
// as inline HTML in each bullet string.

const MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ color: [] }, { background: [] }],
    ['clean'],
  ],
};

function bulletsToHtml(bullets) {
  return (bullets || [])
    .map((b) => `<p>${b === '' ? '<br>' : b}</p>`)
    .join('');
}

function htmlToBullets(html) {
  if (typeof document === 'undefined') return [];
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  const ps = Array.from(tmp.querySelectorAll(':scope > p'));
  if (ps.length === 0) return [];
  return ps.map((n) => (n.innerHTML === '<br>' ? '' : n.innerHTML));
}

export default function RichTextBullets({ value, onChange, placeholder }) {
  const html = useMemo(() => bulletsToHtml(value), [value]);
  return (
    <div className="rich-text-bullets">
      <ReactQuill
        theme="snow"
        value={html}
        onChange={(h) => onChange(htmlToBullets(h))}
        modules={MODULES}
        placeholder={placeholder || 'One bullet per line — press Enter for a new bullet…'}
      />
      <p className="text-[11px] text-muted-foreground/70 mt-1">
        Tip: press Enter for a new bullet. Formatting is preserved in the live preview.
      </p>
    </div>
  );
}