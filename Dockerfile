# Expo (web) dev server for the PointzPlus app.
FROM node:26-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 8081

# --host lan binds beyond localhost so the published port is reachable.
CMD ["npx", "expo", "start", "--web", "--host", "lan", "--port", "8081"]
