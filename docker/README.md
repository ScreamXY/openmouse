# Container publishing

Run `make publish` from a clean checkout after authenticating Docker to GHCR
with package write access. It builds and tests the frontend, then publishes
`ghcr.io/screamxy/openmouse:latest` and a commit tag for amd64 and arm64.
The image revision label records the complete source commit. Publishing runs on
the development machine and does not update the running server automatically.

Only Caddy, built static files and the license ship in the runtime image.
No source checkout, Node.js or build tools are needed on the server. The build
context is allowlisted; local env files and credentials are excluded. Optional
PostHog analytics is disabled. Cloudflare headers are converted for Caddy at
build time. Cloudflare API endpoints respond with JSON 503 because their
backend is not included. External images and fonts can still load upstream.

Run as UID 1000 with a read-only root, writable tmpfs at /data and /config,
and HTTP port 8080 bound only to host loopback. Terminate HTTPS with Tailscale
Serve; never enable Funnel. The app requires an origin root and HTTPS for
WebHID. The mouse is attached to the browser's computer, not the web server.

Hosting configuration, deployment paths and the app index belong to the private
[ScreamXY/internal-apps](https://github.com/ScreamXY/internal-apps) repository.
On the server, in that deployment directory:

```sh
docker compose pull openmouse
docker compose up -d --no-deps --wait openmouse
```

Retain the running image digest before pulling so it is available for rollback.
The container health check verifies its local HTTP endpoint. Also verify the
external HTTPS assets and real mouse behavior after updating.
