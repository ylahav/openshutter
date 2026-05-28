import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'../src/routes/admin/photos/[id]/edit/+page.svelte',
);
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');

const bad = `\t\t\t}

\t\t\t\tformData = { ...formData };
\t\t\t}
\t\t} catch (err) {`;
const good = `\t\t} catch (err) {`;

if (!s.includes(bad)) {
	console.error('bad block not found');
	process.exit(1);
}

s = s.replace(bad, good);
fs.writeFileSync(file, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('fixed syntax');
