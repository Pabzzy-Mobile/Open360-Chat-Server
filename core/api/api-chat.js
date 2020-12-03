const RedisAccess = require("../redisAccess.js");
const Util = require("open360-util");

/**
 * Handle an API request for chat room stats
 * @param {RedisClient} redisClient
 * @param {Socket} socket
 * @param {Object} data
 * @property {string} data.prompt - The prompt to filter this message, the target uses this to know what how to handle the
 *                           data in the package
 * @property {Object} data.data - Contains the data used to process this request
 * @property {string} data.message - Message for the API logger
 */
function handleRoomStatsRequest(redisClient, socket, data){
    // Get the room name string
    let room = data.package.room;
    // Get the number of members connected to the room and the members themselves
    redisClient.get(Util.getRoomCountKey(room), (err, memberCount) => {
        redisClient.lrange(Util.getRoomMembersKey(room), 0, -1, (err, members) => {
            let packet = {
                prompt: "roomStats-reply",
                data: {memberCount: memberCount, members: members},
                message: "Ok"
            }
            let target = data.ack;
            sendAPIMessage(socket, target, packet);
        });
    });
}

function sendViewerIncrement(socket, username, increment = true) {
    let packet = {
        prompt: "incrementViewers",
        data: {
            username: username,
            amount: 1,
            increment: true
        }
    };
    let target = "web-api";
    sendAPIMessage(socket, target, packet);
}

function sendViewerCount(socket, username, count) {
    let packet = {
        prompt: "setViewerCount",
        data: {
            username: username,
            count: count
        },
        message: "View Count Update Request"
    };
    let target = "web-api";
    sendAPIMessage(socket, target, packet);
}

function sendAPIMessage(socket, target, packet){
    if(socket)
        socket.emit("api-message", {
            target: target,
            ack: "chat-api",
            type: "message",
            package: packet
        });
}

function sendAPIQuestion(socket, target, packet){
    if(socket)
        socket.emit("api-message", {
            target: target,
            ack: "chat-api",
            type: "question",
            package: packet
        });
}

module.exports = {
    handleRoomStatsRequest: handleRoomStatsRequest,
    sendViewerIncrement: sendViewerIncrement,
    sendViewerCount: sendViewerCount
}