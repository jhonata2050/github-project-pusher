import * as fs from 'fs';
import * as readline from 'readline';

const sqlPath = 'C:\\Users\\jhona\\Downloads\\eqsam1237_whmcs-clients.sql';
const rl = readline.createInterface({ input: fs.createReadStream(sqlPath, { encoding: 'latin1' }), crlfDelay: Infinity });

let currentTable = null;
let currentColumns = [];
let users = [];

function parseSqlTuple(line, columns) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('(')) return null;

  let content = trimmed;
  if (content.startsWith('(')) content = content.slice(1);
  if (content.endsWith(');')) content = content.slice(0, -2);
  else if (content.endsWith('),')) content = content.slice(0, -2);
  else if (content.endsWith(')')) content = content.slice(0, -1);

  const values = [];
  let inString = false;
  let escape = false;
  let currentVal = '';

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (escape) { currentVal += char; escape = false; continue; }
    if (char === '\\') { escape = true; continue; }
    if (char === "'" && !escape) { inString = !inString; continue; }
    if (!inString && char === ',') {
      let finalVal = currentVal.trim();
      if (finalVal.toUpperCase() === 'NULL') finalVal = null;
      values.push(finalVal);
      currentVal = '';
      continue;
    }
    currentVal += char;
  }
  let finalVal = currentVal.trim();
  if (finalVal.toUpperCase() === 'NULL') finalVal = null;
  values.push(finalVal);

  const obj = {};
  columns.forEach((col, idx) => { obj[col] = values[idx] !== undefined ? values[idx] : null; });
  return obj;
}

for await (const line of rl) {
  const trimmed = line.trim();
  if (trimmed.startsWith('INSERT INTO `')) {
    const match = trimmed.match(/^INSERT INTO `(\w+)`\s*\(([^)]+)\)\s*VALUES/);
    if (match) {
      currentTable = match[1];
      currentColumns = match[2].split(',').map(c => c.trim().replace(/`/g, ''));
      continue;
    }
  }
  if (currentTable === 'tblusers' && trimmed.startsWith('(')) {
    const u = parseSqlTuple(trimmed, currentColumns);
    if (u) users.push(u);
    if (trimmed.endsWith(');')) currentTable = null;
  }
}

console.log('Total de usuários em tblusers:', users.length);
console.log('Exemplos de tblusers com Andrew:');
console.log(users.filter(u => JSON.stringify(u).toLowerCase().includes('andrew')));
