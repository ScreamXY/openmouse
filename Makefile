IMAGE ?= ghcr.io/screamxy/openmouse
PLATFORMS ?= linux/amd64,linux/arm64
.PHONY: publish
# Build, tests and bundle-size validation run inside the Docker build.
publish:
	@test -z "$$(git status --porcelain)" || { echo "Commit changes first so the image matches a revision."; exit 1; }
	docker buildx build --platform $(PLATFORMS) --push \
		--build-arg REVISION=$$(git rev-parse HEAD) \
		--label org.opencontainers.image.revision=$$(git rev-parse HEAD) \
		-t $(IMAGE):latest -t $(IMAGE):$$(git rev-parse --short HEAD) .
