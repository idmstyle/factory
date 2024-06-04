const express = require('express');
const path = require('path');

var app = express();
app.use('/factory', express.static(__dirname));
var server = app.listen('7002', () => {
    console.log('running');
});