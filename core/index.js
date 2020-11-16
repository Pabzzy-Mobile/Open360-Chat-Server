console.log("Loading Util Module");
let Util = require("./util.js");
console.log("Loading API Handlers Module");
let API = require("./api/");

module.exports = {
    Util: Util,
    API: API
}