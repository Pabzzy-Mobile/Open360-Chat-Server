const express = require('express');
const app = express()
const http = require('http').createServer(app);

// Tell the server what port it should use. 4002 is for testing purposes
const PORT = parseInt(process.env.PORT) || 4002;

app.listen(PORT, () => {
    console.info("Listening on: " + PORT);
});