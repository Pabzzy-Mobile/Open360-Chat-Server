FROM node:10.5.0

ARG PORT
ENV PORT=$PORT

WORKDIR /app
COPY package.json .
RUN npm install
COPY main.js .
COPY core ./core

EXPOSE $PORT

CMD [ "npm", "start" ]