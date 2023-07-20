FROM node:16.14.2-alpine

WORKDIR /app_monitoring

COPY package*.json /app_monitoring
COPY . /app_monitoring

RUN npm install

EXPOSE 3002
CMD ["node", "server.js"]