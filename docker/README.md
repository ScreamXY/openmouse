# Container image

`make publish` builds the image for amd64 and arm64 and pushes it to
`ghcr.io/screamxy/openmouse` with two tags: `latest` and the short commit hash.
Run it from a clean checkout, after you log Docker in to GHCR with package write
access. The image label `org.opencontainers.image.revision` holds the full commit.
Publishing does not update the server.

The Docker build runs `npm run build`, `npm test` and `npm run size`. The runtime
image holds only Caddy, the built static files and the license. No Node.js, source
or build tools are needed on the server.

- PostHog analytics is off.
- The security headers come from `functions/_lib/security-headers.js`, the same
  set that the Cloudflare deployment uses. `security-headers.mjs` turns them into
  Caddy directives at build time.
- The Cloudflare Functions in `functions/` are not included, so `/api/*` returns 503.
- External images and fonts still load from their own hosts.
- `.dockerignore` is an allowlist, so local env files and credentials stay out
  of the build.

## Running

Run the container as UID 1000 with a read-only root file system, writable tmpfs
mounts at `/data` and `/config`, and port 8080 bound to host loopback only. Serve
HTTPS with Tailscale Serve and never enable Funnel. WebHID needs HTTPS, and the
app must be served at the origin root. The mouse connects to the browser's
computer, not to the server.

## Updating the server

The Compose file, deployment paths and app index live in the private
[ScreamXY/internal-apps](https://github.com/ScreamXY/internal-apps) repository.
In that deployment directory on the server:

```sh
docker compose pull openmouse
docker compose up -d --no-deps --wait openmouse
```

Write down the running image digest before you pull, so you can roll back. The
container health check only tests local HTTP. After an update, also open the site
over HTTPS and test the real mouse.
