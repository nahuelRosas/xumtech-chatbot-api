FROM gcr.io/buildpacks/google-22/run:latest

USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg-turbo8 \
    libgif7 \
    librsvg2-common \
    curl \
    && rm -rf /var/lib/apt/lists/*
USER nonroot
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://localhost:8080/health || exit 1