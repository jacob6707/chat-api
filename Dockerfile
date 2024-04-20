FROM node:lts-alpine
WORKDIR /home/node/app
VOLUME /home/node/app/public
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["npm", "start"]