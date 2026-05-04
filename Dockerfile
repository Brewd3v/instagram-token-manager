FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY schema.sql ./
COPY src ./src

RUN npm run build

# ---- runtime ----
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY schema.sql ./

VOLUME ["/data"]
EXPOSE 3000

CMD ["node", "dist/index.js"]
