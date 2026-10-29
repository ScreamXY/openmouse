import { readFileSync, writeFileSync } from 'node:fs';
const source = readFileSync('public/_headers', 'utf8');
const lines = source.split('\n').filter(line => /^  [A-Za-z-]+: /.test(line));
if (!lines.some(line => line.startsWith('  Content-Security-Policy: '))) {
  throw new Error('Missing OpenMouse security headers');
}
writeFileSync('security-headers.caddy', lines.map(line => {
  const separator = line.indexOf(': ');
  return `header ${line.slice(0, separator).trim()} ${JSON.stringify(line.slice(separator + 2))}`;
}).join('\n') + '\n');
