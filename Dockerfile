FROM node:15.0.1-alpine3.12

ARG PORT
ENV PORT=$PORT

WORKDIR /app
COPY package.json .
RUN npm install
COPY main.js .
COPY core ./core

EXPOSE $PORT

CMD [ "npm", "start" ]