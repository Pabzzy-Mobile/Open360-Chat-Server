const redis = require('redis');
let RedisClient = redis.createClient({
    host: 'open360-redis-socket',
    port: 6379
});

RedisClient.on("error", function(error) {
    console.error(error);
});

// Tell the server what port it should use. 4002 is for testing purposes
const PORT = parseInt(process.env.PORT) || 4002;

const io = require('socket.io').listen(PORT);

// TODO MAKE AN AUTHENTICATION SERVER FOR THIS CHECKING THE SOCKETED USER

// Allow cross origin requests
io.origins('*:*');

// Require some data over the connections start
io.use((socket, next) => {
    let handshakeData = socket.request;

    RedisClient.set(socket.id + "room", handshakeData._query['channel'] || 'universal');
    RedisClient.set(socket.id + "user", handshakeData._query['user']);

    next();
});

io.on('connection', (socket) => {
    console.log("New connection on: " + socket.id);
    RedisClient.get(socket.id + "room", (err, reply) => {
        socket.join(reply);
    });

    socket.on('chat-message', (data) => {
        if (data.message === "") return;
        RedisClient.get(socket.id + "user", (err, reply) => {
            console.log("chat message received from: " + reply);
            console.log(data);
            data.user = reply;
            RedisClient.get(socket.id + "room", (err, reply) => {
                io.to(reply).emit("chat-message", data);
            });
        });
    });

    socket.on('disconnect', () => {
        console.log(socket.id + " disconnected");
        RedisClient.set(socket.id, "false");
    });
});