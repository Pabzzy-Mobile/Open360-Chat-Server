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

module.exports = {
    handleRoomStatsRequest: handleRoomStatsRequest
}