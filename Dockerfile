FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY addon.js config.js ./
COPY lib ./lib
COPY public ./public

ENV NODE_ENV=production
ENV PORT=7000

EXPOSE 7000

CMD ["node", "addon.js"]
