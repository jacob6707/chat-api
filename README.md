# SwiftChat - API

The backend used by the SwiftChat project to handle authentication, messaging and user customization.

## Requirements
- [node.js v16 or higher](https://nodejs.org/en/)
- [Server running MongoDB v8 or higher](https://www.mongodb.com/try/download/community)

## Installation and setup
To setup the server, you first need to download all the modules using your package manager of choice.

Example with npm:
```console
$ npm install
```

Once the modules are downloaded, you will need to setup 2 environment variables in an .env file:
```env
PORT=8080
MONGODB_ENDPOINT="mongodb://<username>:<password>@<ip:port>/swiftchat&retryWrites=true"
```
The port can be any free port on your server.

In the MongoDB endpoint, change the username, password, ip and port in order for the server to connect to your database.

Example:
```env
MONGODB_ENDPOINT="mongodb://jacob6707:somePassword@127.0.0.1:27017/swiftchat?authSource=swiftchat&retryWrites=true"
```

Run the server:
```console
$ npm start
```

## Setup with Docker
Pull the image from the docker repository:
```console
$ docker pull jacob6707/swiftchat-api
```
Setup a .env file:
```env
PORT=8080
MONGODB_ENDPOINT="mongodb://<username>:<password>@<ip:port>/swiftchat&retryWrites=true"
```
Spin up a container using the env file:
```console
$ docker run --env-file /path/to/env/file jacob6707/swiftchat-api:latest
```

### Using Docker Compose
If you're using docker compose, copy the code below to your docker-compose.yml file:
```yml
services:
  mongo:
    image: mongo:latest
    container_name: mongo
    restart: unless-stopped
    volumes:
      - "./db:/data/db"
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: example
  swiftchat-api:
    image: jacob6707/swiftchat-api:latest
    container_name: swiftchat-api
    restart: unless-stopped
    ports:
      - 8080:8080
    environment:
      PORT: 8080
      MONGODB_ENDPOINT: mongodb://root:example@mongo:27017/swiftchat?authSource=admin&retryWrites=true
    depends_on:
      - mongo
```
Run the server using `docker compose up` or `docker-compose up`
