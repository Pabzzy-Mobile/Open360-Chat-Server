const {RedisClient} = require("redis");

function sanitize(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// https://jsfiddle.net/1nm8ojxy/
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function randomColour(){
    //return "#" + Math.random().toString(16).slice(2, 8);
    return "#" + getRandomArbitrary(0.6, 0.9).toString(16).slice(2, 8);
}

/**
 * @param {Socket} socket
 * @return {string}
 */
function getUserKey(socket){
    return socket.id + "/user";
}

/**
 * @param {Socket} socket
 * @return {string}
 */
function getColourKey(socket){
    return socket.id + "/colour";
}


/**
 * @param {Socket} socket
 * @return {string}
 */
function getRoomKey(socket){
    return socket.id + "/room";
}

/**
 * @param {string} room
 * @return {string}
 */
function getRoomMembersKey(room){
    return room + "/users";
}

/**
 * @param {string} room
 * @return {string}
 */
function getRoomCountKey(room){
    return room + "/member-count";
}

// REDIS STUFF

/**
 *
 * @param {RedisClient} redisClient
 * @param {string} member
 * @param {string} room
 */
function addMemberToRoom(redisClient, room, member){
    redisClient.rpush([getRoomMembersKey(room), member], (err, reply) => {});

    crementRoomMember(redisClient, room, true);
}

/**
 *
 * @param {RedisClient} redisClient
 * @param {string} member
 * @param {string} room
 */
function removeMemberFromRoom(redisClient, room, member){
    redisClient.lpos(getRoomMembersKey(room), member, (err, index) => {
        redisClient.lset(getRoomMembersKey(room), index, "DELETED", (err, success) => {
            redisClient.lrem(getRoomMembersKey(room), 1, "DELETED", (err, success) => {});
        });
    });

    crementRoomMember(redisClient, room, false);
}

/**
 *
 * @param {RedisClient} redisClient
 * @param {boolean} increment
 * @param {string} room
 */
function crementRoomMember(redisClient, room, increment){
    let memberCountKey = getRoomCountKey(room);

    redisClient.get(memberCountKey, function (err, reply){
        if (reply == null){
            redisClient.set(memberCountKey, 1);
        } else {
            reply = parseInt(reply);
            if (increment) {
                redisClient.set(memberCountKey, reply + 1);
            } else {
                redisClient.set(memberCountKey, reply - 1);
            }
        }
    });
}

// --- END OF REDIS STUFF ---

module.exports = {
    sanitize,
    randomColour,
    getUserKey,
    getColourKey,
    getRoomKey,
    getRoomCountKey,
    getRoomMembersKey,
    addMemberToRoom,
    removeMemberFromRoom
}