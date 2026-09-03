# Node.js + Express API. Production-only deps, minimal Alpine runtime.
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

FROM node:20-alpine
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app

EXPOSE 5000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
