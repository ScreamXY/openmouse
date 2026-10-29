FROM --platform=$BUILDPLATFORM node:24-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG REVISION
ENV CF_PAGES_COMMIT_SHA=$REVISION VITE_POSTHOG_KEY="" VITE_POSTHOG_HOST=""
RUN npm run build && npm test && npm run size \
    && node docker/security-headers.mjs \
    && rm -rf dist/server dist/_headers dist/_redirects

FROM caddy:2-alpine@sha256:eb4d35b7452d1ab6171fbdbe8d9275b2301dad6dad92115d91e19fb9b24d510f
RUN setcap -r /usr/bin/caddy
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/security-headers.caddy /etc/caddy/security-headers.caddy
COPY --from=build /app/dist/ /srv/
COPY LICENSE /srv/LICENSE
USER 1000:1000
EXPOSE 8080
LABEL org.opencontainers.image.source="https://github.com/ScreamXY/openmouse"
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
