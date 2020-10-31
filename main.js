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

// Tell the server what port it should use. 4002 is for testing purposes
const PORT = parseInt(process.env.PORT) || 4002;

// Start the socket server
const io = require('socket.io').listen(PORT);

// Allow cross origin requests
// This allows for third party clients for the chat
io.origins('*:*');

// Require some data over the connections start
io.use((socket, next) => {
    let handshakeData = socket.request;

    // Register the socket to the database along with the room the socket is trying to join
    RedisClient.set(socket.id + "room", handshakeData._query['channel'] || 'universal');
    RedisClient.set(socket.id + "user", handshakeData._query['user']);

    next();
});

// On socket connection
io.on('connection', (socket) => {
    //console.log("New connection on: " + socket.id);
    // Get the room the socket is supposed to be in and add it to the room
    RedisClient.get(socket.id + "room", (err, reply) => {
        socket.join(reply);
    });

    // Retransmit chat messages from the sockets
    socket.on('chat-message', (data) => {
        // Check if the message is empty
        if (data.message === "") return;
        // Get the username
        RedisClient.get(socket.id + "user", (err, reply) => {
            // Add the username to the data object
            data.user = reply;
            RedisClient.get(socket.id + "room", (err, reply) => {
                // Send the data to the socket
                io.to(reply).emit("chat-message", data);
            });
        });
    });

    // On disconnect delete the socket from the database
    socket.on('disconnect', () => {
        //console.log(socket.id + " disconnected");
        RedisClient.set(socket.id + "room", false);
        RedisClient.set(socket.id + "user", false);
    });
});