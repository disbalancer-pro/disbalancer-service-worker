const express = require('express');
const origin = express();

// Origin server to serve site from
origin.use(express.static('origin'));
origin.listen(5000, function() {
    console.log("Origin server listening on 5000");
});

// Server to replicate a content node
const edge = express();
edge.use(express.static('edge'));
edge.listen(5001, function() {
    console.log("Edge server listening on 5001");
});
