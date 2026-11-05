#!/usr/bin/env node
/*
  Refresh the shared blocks (navigation, footer) in every page from partials/.

    node build.js           update the pages after editing a partial
    node build.js --check   exit 1 if any page is out of date

  A page marks a shared block like this; everything between the two markers is
  regenerated, so the page itself always stays complete, valid HTML:

    <!-- include: partials/nav.html home="index.html" toggle -->
    ...
    <!-- /include -->

  In a partial, {{name}} is replaced by the marker's value and
  {{#flag}} ... {{/flag}} is kept only when the marker lists that flag.
  No dependencies: plain Node.
*/
const fs = require('fs');
const path = require('path');

const root = __dirname;
const check = process.argv.includes('--check');
const MARKER = /^([ \t]*)<!-- include: (\S+)((?:\s+[\w-]+(?:="[^"]*")?)*) -->\r?\n[\s\S]*?^[ \t]*<!-- \/include -->/gm;

function render(template, params) {
  return template
    .replace(/[ \t]*\{\{#([\w-]+)\}\}\r?\n?([\s\S]*?)[ \t]*\{\{\/\1\}\}\r?\n?/g, (m, flag, inner) => (flag in params ? inner : ''))
    .replace(/\{\{([\w-]+)\}\}/g, (m, key) => params[key] || '');
}

let stale = 0;
for (const file of fs.readdirSync(root).filter(f => f.endsWith('.html'))) {
  const page = path.join(root, file);
  const text = fs.readFileSync(page, 'utf8');
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const out = text.replace(MARKER, (m, indent, partial, args) => {
    const params = {};
    for (const a of args.trim().split(/\s+(?=[\w-]+(?:=|\s|$))/).filter(Boolean)) {
      const [k, v] = a.split('=');
      params[k] = v === undefined ? '' : v.replace(/^"|"$/g, '');
    }
    const body = render(fs.readFileSync(path.join(root, partial), 'utf8').replace(/^<!--[\s\S]*?-->\r?\n/, ''), params)
      .replace(/\s+$/, '')
      .split(/\r?\n/)
      .map(line => (line ? indent + line : line))
      .join(nl);
    return `${indent}<!-- include: ${partial}${args} -->${nl}${body}${nl}${indent}<!-- /include -->`;
  });
  if (out !== text) {
    stale++;
    if (check) console.log(`out of date: ${file}`);
    else { fs.writeFileSync(page, out); console.log(`updated ${file}`); }
  }
}
if (check && stale) process.exit(1);
if (!stale) console.log('all pages up to date');
