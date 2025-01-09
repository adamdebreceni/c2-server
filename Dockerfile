FROM node:lts-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build-server

ENTRYPOINT npm run server & npm run website
