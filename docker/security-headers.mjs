// Writes the canonical security headers as Caddy directives, so the image
// serves the same set as the Cloudflare deployment.
import { writeFileSync } from 'node:fs';
import { SECURITY_HEADERS } from '../functions/_lib/security-headers.js';

writeFileSync('security-headers.caddy', SECURITY_HEADERS.map(([name, value]) => `header ${name} ${JSON.stringify(value)}\n`).join(''));
