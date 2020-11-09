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

module.exports = {
    sanitize,
    randomColour
}