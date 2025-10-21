# Dogule NAS Deployment

This directory documents how to deploy the Dogule application stack on a self-hosted NAS using Docker Compose.

## Prerequisites

- Docker Engine and Docker Compose Plugin installed on the NAS.
- Access to a PostgreSQL volume location for persistent data.
- TLS certificates stored in `deploy/certs` as `fullchain.pem` and `privkey.pem` if HTTPS is required.
- Container images published to GitHub Container Registry (GHCR) for the server and web applications.

## 1. Transfer the release or authenticate to GHCR

Choose one of the following approaches:

- Copy the repository to the NAS:

  ```bash
  scp -r dogule user@nas:/opt/dogule
  ```

- Or pull the pre-built images directly by logging into GHCR:

  ```bash
  docker login ghcr.io -u <github-username>
  ```

  When prompted, use a GitHub personal access token with `read:packages` scope.

## 2. Configure environment variables and start the stack

1. Copy the example environment file and edit it with production secrets and image references:

   ```bash
   cp .env.prod.example .env.prod
   nano .env.prod
   ```

   Update `SERVER_IMAGE` and `WEB_IMAGE` to point to the GHCR images published by CI. Ensure `DATABASE_URL` and `JWT_SECRET` are present, otherwise the server container exits with `ERR_DEPLOY_ENV_001`.

2. Boot the production stack:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
   ```

   The command provisions PostgreSQL, the Node.js server, the static web frontend, and the Nginx reverse proxy. Containers restart automatically if they crash.

## 3. Operations

### View logs

Check the health of running services:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f
```

If a healthcheck fails, Docker reports `ERR_HEALTH_001` in the output. Investigate service logs to find the underlying issue.

### Database backups

Create an on-demand PostgreSQL dump in a local `backups` folder:

```bash
set -a
source .env.prod
set +a
mkdir -p backups
PG_CONTAINER=$(docker compose -f docker-compose.prod.yml --env-file .env.prod ps -q postgres)
docker exec "$PG_CONTAINER" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "backups/dogule-$(date +%Y%m%d%H%M%S).sql"
```

### Updating the stack

1. Pull the latest images (after CI publishes them to GHCR):

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod pull
   ```

2. Apply the update with minimal downtime:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
   ```

3. Remove dangling images after verification:

   ```bash
   docker image prune -f
   ```

## Troubleshooting

- `ERR_DEPLOY_ENV_001`: One or more required environment variables are missing. Confirm `.env.prod` defines `DATABASE_URL` and `JWT_SECRET`.
- `ERR_HEALTH_001`: Docker healthcheck failed. Inspect service logs and ensure dependent services are reachable.
- TLS errors: Verify `deploy/certs/fullchain.pem` and `deploy/certs/privkey.pem` contain valid certificates readable by the container.
