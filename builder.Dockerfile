FROM gcr.io/buildpacks/builder:latest

USER root
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  python3 \
  make \
  g++ \
  pkg-config \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  curl \
  && rm -rf /var/lib/apt/lists/*
USER cnb
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://localhost:8080/health || exit 1