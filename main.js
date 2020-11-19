const http = require('http').createServer();
const redis = require('redis');
// Create the database client
let RedisClient = redis.createClient({
    host: 'open360-redis-socket',
    port: 6379
});

// Listen for any database errors
RedisClient.on("error", function(error) {
    console.error(error);
});

// Require our core modules
const {Util, API} = require("./core/");

// Tell the server what port it should use. 4002 is for testing purposes
const PORT = parseInt(process.env.PORT) || 4002;

// Start the socket server
const {Server, Socket} = require('socket.io');
const io = new Server(http, {
    // Allow cross origin requests
    // This allows for third party clients for the chat
    cors: {
        // The `*` is used as the wildcard here.
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["content-type"]
    }
});

// Require some data over the connections start
io.use((socket, next) => {
    let handshakeData = socket.request;

    let room = (handshakeData._query['channel'] || 'universal');
    let username = handshakeData._query['user'];

    let socketUserKey = Util.getUserKey(socket);
    let socketColourKey = Util.getColourKey(socket);
    let socketRoomKey = Util.getRoomKey(socket);

    // Register the socket to the database along with the room the socket is trying to join
    RedisClient.set(socketRoomKey, room);

    if (username == ""){
        RedisClient.set(socketUserKey, false);
        RedisClient.set(socketColourKey, false);
    } else {
        RedisClient.set(socketUserKey, username);
        RedisClient.set(socketColourKey, Util.randomColour());
    }

    next();
});

// Count the chat members
io.use((socket, next) => {
    let handshakeData = socket.request;

    let room = (handshakeData._query['channel'] || 'universal');
    let username = handshakeData._query['user'];

    if (username == ""){
        next();
        return;
    }

    Util.addMemberToRoom(RedisClient, room, username);

    RedisClient.get(Util.getRoomCountKey(room), (err, count) => {
        if (err) console.error(err);
        console.log(room, ":", count);
    });

    next();
});

// On socket connection
io.on('connection', (socket) => {
    let socketUserKey = Util.getUserKey(socket);
    let socketColourKey = Util.getColourKey(socket);
    let socketRoomKey = Util.getRoomKey(socket);

    //console.log("New connection on: " + socket.id);
    // Get the room the socket is supposed to be in and add it to the room
    RedisClient.get(socketRoomKey, (err, reply) => {
        socket.join(reply);
    });

    // TODO: Require some kind of chat session token to verify the user
    //socket.emit('require-info', (data));

    // Retransmit chat messages from the sockets
    socket.on('chat-message', (data) => {
        // Check if the message is empty
        if (data.message === "") return;
        // Get the username
        RedisClient.get(socketUserKey, (err, username) => {
            if (username === "false" || username === false){
                return false;
            }
            // Get the colour
            RedisClient.get(socketColourKey, (err, colour) => {
                // Make the message safe
                data.message = Util.sanitize(data.message);
                // Add the username and colour to the data object
                data.user = username;
                data.colour = colour;
                RedisClient.get(socketRoomKey, (err, roomname) => {
                    // Send the data to the socket
                    io.to(roomname).emit("chat-message", data);
                });
            });
        });
    });

    // On disconnect delete the socket from the database
    socket.on('disconnect', () => {
        //console.log(socket.id + " disconnected");
        RedisClient.get(socketUserKey, (err, username) => {
            RedisClient.get(socketRoomKey, (err, roomname) => {
                Util.removeMemberFromRoom(RedisClient, roomname, username);
                RedisClient.set(Util.getUserKey(socket), false);
                RedisClient.set(Util.getColourKey(socket), false);
            });
        });
    });
});

http.listen(PORT, function () {
    console.log("Listening on *:", PORT);
});

// CONNECT TO THE INTERNAL API

// Socket for connecting to the internal API
const internalIo = require("socket.io-client");

const internalSocket = internalIo("ws://open-360-api-sock:4000", {
    reconnectionDelayMax: 10000,
    query: {
        name: "open360:chat-api-server"
    }
});

internalSocket.on("connect", function (){
    console.log("Connected to Internal API");
    internalSocket.emit("log",{log:"Connected to Internal API", type:"info"});
});

internalSocket.on("chat-api", (data) => {
    if (data.type == "question"){
        switch (data.package.prompt){
            case "roomStats":
                API.chat.handleRoomStatsRequest(RedisClient, internalSocket, data);
                break;
            case "status":
                internalSocket.emit("api-message", {
                    target: data.ack,
                    ack: "chat-api",
                    type: "message",
                    package: {
                        prompt: "status-reply",
                        status: "alive"
                    }
                });
                break;
        }
    }
    if (data.type == "message"){
        switch (data.package.prompt){
        }
    }
});

// ------ END OF INTERNAL API RESPONSES