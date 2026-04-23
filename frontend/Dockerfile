# Build stage only — output is copied to a shared volume served by Caddy.
FROM node:20-alpine

WORKDIR /app

# Backend URL is baked into the bundle at build time (CRA requirement)
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
ENV CI=true
ENV NODE_OPTIONS=--max-old-space-size=2048
ENV DISABLE_ESLINT_PLUGIN=true

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY . .

RUN yarn build
