# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci
RUN npm run build -w apps/web

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4173

RUN npm install -g http-server@14

COPY --from=base /app/apps/web/dist ./dist

EXPOSE 4173

RUN chown -R node:node /app

USER node

CMD ["sh", "-c", "http-server dist -p ${PORT:-4173} -a 0.0.0.0"]
