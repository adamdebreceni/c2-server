FROM node:lts-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build-server
RUN npm run build-website

ENTRYPOINT npm run server -- --port 13405
