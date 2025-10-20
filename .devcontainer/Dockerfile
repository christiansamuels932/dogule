FROM node:20-bullseye

RUN apt-get update \
  && apt-get install -y --no-install-recommends git curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable pnpm

WORKDIR /workspace

COPY .devcontainer/entrypoint.sh /usr/local/bin/dogule-entrypoint.sh
RUN chmod +x /usr/local/bin/dogule-entrypoint.sh

CMD ["sleep", "infinity"]
