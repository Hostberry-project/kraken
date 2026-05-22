FROM node:20-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY addon.js config.js moria_3_3_9.zm3 ./
COPY lib ./lib
COPY public ./public
COPY scripts/moria-extract.js ./scripts/moria-extract.js

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "addon.js"]
