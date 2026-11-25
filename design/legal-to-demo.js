// Įdeda teisinius tekstus iš docs/teisine/*.md į demo/platforma.html (tarp LEGAL:START ir LEGAL:END).
// Vienintelis tekstų šaltinis yra .md failai. Paleisti: node design/legal-to-demo.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// Lietuviška versija pagrindinė; angliška yra vertimas (docs/teisine/en)
const DOCS = {
  lt: { terms: 'naudojimosi-taisykles.md', privacy: 'privatumo-politika.md', safety: 'saugumas-ir-draudziamas-elgesys.md' },
  en: { terms: 'en/terms-of-use.md', privacy: 'en/privacy-policy.md', safety: 'en/safety-and-prohibited-conduct.md' }
};
const HTML = path.join(ROOT, 'demo', 'platforma.html');

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toHtml(lines) {
  const out = [];
  let list = null, table = null;
  const flush = () => {
    if (list) { out.push(`<${list.tag}>${list.items.map(i => `<li>${esc(i)}</li>`).join('')}</${list.tag}>`); list = null; }
    if (table) {
      const [head, ...rows] = table;
      out.push(`<table><thead><tr>${head.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      table = null;
    }
  };
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) { flush(); continue; }
    if (l.startsWith('|')) {
      if (/^\|[\s|:-]+\|$/.test(l)) continue;
      if (list) flush();
      (table ||= []).push(l.slice(1, -1).split('|').map(c => c.trim()));
      continue;
    }
    const ul = l.match(/^- (.*)/), ol = l.match(/^\d+\. (.*)/);
    if (ul || ol) {
      const tag = ul ? 'ul' : 'ol';
      if (!list || list.tag !== tag) { flush(); list = { tag, items: [] }; }
      list.items.push((ul || ol)[1]);
      continue;
    }
    flush();
    out.push(`<p>${esc(l)}</p>`);
  }
  flush();
  return out.join('');
}

function parse(file) {
  const md = fs.readFileSync(path.join(ROOT, 'docs', 'teisine', file), 'utf8').split('\n');
  const doc = { t: '', v: '', sections: [] };
  let cur = null, intro = [];
  for (const line of md) {
    if (line.startsWith('# ')) { doc.t = line.slice(2).trim(); continue; }
    if (line.startsWith('## ')) { cur = { h: line.slice(3).trim(), lines: [] }; doc.sections.push(cur); continue; }
    (cur ? cur.lines : intro).push(line);
  }
  // Įžangoje paliekame tik versiją; pastaba apie teisininko peržiūrą naudotojams nerodoma
  const ver = intro.join(' ').match(/(?:Versija|Version) (\d{4}-\d{2}-\d{2})/);
  doc.v = ver ? ver[1] : '';
  doc.sections = doc.sections.map(s => ({ h: s.h, html: toHtml(s.lines) }));
  return doc;
}

const data = Object.fromEntries(Object.entries(DOCS).map(([lang, files]) => [lang, Object.fromEntries(Object.entries(files).map(([k, f]) => [k, parse(f)]))]));
const block = `/* LEGAL:START – generuojama iš docs/teisine/*.md (node design/legal-to-demo.js), ranka nekeisti */\nconst LEGAL = ${JSON.stringify(data)};\n/* LEGAL:END */`;
const html = fs.readFileSync(HTML, 'utf8');
const re = /\/\* LEGAL:START[\s\S]*?\/\* LEGAL:END \*\//;
if (!re.test(html)) { console.error('Nerasta LEGAL:START/LEGAL:END žymų demo/platforma.html'); process.exit(1); }
fs.writeFileSync(HTML, html.replace(re, () => block));
for (const [lang, docs] of Object.entries(data)) console.log(lang + ':', Object.values(docs).map(d => `${d.t} (${d.sections.length} sk.)`).join(', '));
