console.log("Loading Util Module");
let RedisAccess = require('./redisAccess.js');
console.log("Loading API Handlers Module");
let API = require("./api/");

module.exports = {
    RedisAccess: RedisAccess,
    API: API
}