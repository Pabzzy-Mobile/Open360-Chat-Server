function sanitize(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let colours = [
    "red",
    "blue",
    "green"
];

function randomColourOLD(){
    let index = Math.floor(Math.random() * Math.floor(colours.length));
    return colours[index];
}

function randomColour(){
    return "#" + Math.random().toString(16).slice(2, 8);
}

module.exports = {
    sanitize,
    randomColour
}