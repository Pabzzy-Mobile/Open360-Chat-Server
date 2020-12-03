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
const {RedisAccess, API} = require("./core/");
const Util = require("open360-util");

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

    let socketUserKey = RedisAccess.getUserKey(socket);
    let socketColourKey = RedisAccess.getColourKey(socket);
    let socketRoomKey = RedisAccess.getRoomKey(socket);

    // Register the socket to the database along with the room the socket is trying to join
    RedisClient.set(socketRoomKey, room);

    if (username == ""){
        RedisClient.set(socketUserKey, false);
        RedisClient.set(socketColourKey, false);
    } else {
        RedisClient.set(socketUserKey, username);
        RedisClient.set(socketColourKey, Util.random.randomColour());
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

    RedisAccess.addMemberToRoom(RedisClient, room, username);

    RedisClient.get(RedisAccess.getRoomCountKey(room), (err, count) => {
        if (err) console.error(err);
        console.log(room, ":", count);
    });

    next();
});

// Send the count to the server
io.use((socket, next) => {
    let handshakeData = socket.request;

    let room = handshakeData._query['channel'];
    let username = handshakeData._query['user'];

    if (room == ""){
        next();
        return;
    }

    // Send a message to the web server with the viewer count
    RedisClient.get(RedisAccess.getRoomCountKey(room), (err, memberCount) => {
        API.chat.sendViewerCount(internalSocket, room, memberCount);
    });

    next();
});

// On socket connection
io.on('connection', (socket) => {
    let socketUserKey = RedisAccess.getUserKey(socket);
    let socketColourKey = RedisAccess.getColourKey(socket);
    let socketRoomKey = RedisAccess.getRoomKey(socket);

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
                data.message = Util.stringExtensions.sanitize(data.message);
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
                RedisAccess.removeMemberFromRoom(RedisClient, roomname, username);
                RedisClient.set(RedisAccess.getUserKey(socket), false);
                RedisClient.set(RedisAccess.getColourKey(socket), false);
                // Send a message to the web server with the decreased viewer count
                RedisClient.get(RedisAccess.getRoomCountKey(roomname), (err, memberCount) => {
                    API.chat.sendViewerCount(internalSocket, roomname, memberCount);
                });
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
// Connect to the internal API server
const internalSocket = internalIo("ws://open-360-api-sock:4000", {
    reconnectionDelayMax: 10000,
    query: {
        name: "open360:chat-api-server"
    }
});

internalSocket.on("connect", function (){
    // Log the connection
    console.log("Connected to Internal API");
    internalSocket.emit("log",{log:"Connected to Internal API", type:"info"});
});

// Listen for messages or requests from the API
// Check the Internal API for more info about the packages sent and received in the internal API
internalSocket.on("chat-api", (data) => {
    if (data.type == "question"){
        switch (data.package.prompt){
            // Room Stats answers with the member count of a chat room
            case "roomStats":
                API.chat.handleRoomStatsRequest(RedisClient, internalSocket, data);
                break;
            // Answers with the status of the web page
            case "status":
                let pack = {
                    prompt: "status-reply",
                    status: "alive"
                };
                Util.api.sendMessage(socket, data.ack, "chat-api", pack);
                break;
        }
    }
    if (data.type == "message"){
        switch (data.package.prompt){
        }
    }
});

// ------ END OF INTERNAL API RESPONSES