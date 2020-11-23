const Util = require("../util.js");

function handleRoomStatsRequest(redisClient, socket, data){
    let room = data.package.room;
    redisClient.get(Util.getRoomCountKey(room), (err, memberCount) => {
        redisClient.lrange(Util.getRoomMembersKey(room), 0, -1, (err, members) => {
            socket.emit("api-message", {
                target: data.ack,
                ack: "chat-api",
                type: "message",
                package: {
                    prompt: "roomStats-reply",
                    data: {memberCount: memberCount, members: members},
                    message: "Ok"
                }
            });
        });
    });
}

function sendViewerIncrement(socket, username, increment = true) {
    if(socket)
        socket.emit("api-message", {
            target: "web-api",
            ack: "chat-api",
            type: "message",
            package: {
                prompt: "incrementViewers",
                data: {
                    username: username,
                    amount: 1,
                    increment: true
                }
            }
        });
}

function sendViewerCount(socket, username, count) {
    if(socket) {
        socket.emit("api-message", {
            target: "web-api",
            ack: "chat-api",
            type: "message",
            package: {
                prompt: "setViewerCount",
                data: {
                    username: username,
                    count: count
                },
                message: "View Count Update Request"
            }
        });
    }
}

module.exports = {
    handleRoomStatsRequest: handleRoomStatsRequest,
    sendViewerIncrement: sendViewerIncrement,
    sendViewerCount: sendViewerCount
}