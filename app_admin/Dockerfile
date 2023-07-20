FROM node:16.14.2-alpine

#use /app as working directory
WORKDIR /app

#create a working directory inside docker
COPY package*.json /app
COPY . /app

#RUN ls -al
#install all node dependencies
RUN npm install
#expose port of the web application
EXPOSE 3000
CMD ["node","server.js"]