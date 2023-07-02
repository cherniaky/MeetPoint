#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require("../app");
var debug = require("debug")("meetpoint-server:server");
var http = require("http");

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || "4000");
app.set("port", port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on("error", onError);
server.on("listening", onListening);

const { Server } = require("socket.io");

const io = new Server(server, { cors: { origin: "*" } });
let userConnections = [];

io.on("connection", (socket) => {
    console.log(socket.id);

    socket.on("newUser", (data) => {
        console.log("userconnect", data.userName, data.mid);

        const other_users = userConnections.filter((p) => p.mid == data.mid);

        userConnections.push({
            connectionId: socket.id,
            userName: data.userName,
            mid: data.mid,
        });

        other_users.forEach((v) => {
            // console.log(other_users.length);
            // console.log(v);
            socket.to(v.connectionId).emit("informAboutNewConnection", {
                userName: data.userName,
                connectionId: socket.id,
            });
        });

        socket.emit("userConnected", other_users);
        //return other_users;
    }); //end of userconnect

    socket.on("exchangeData", (data) => {
        console.log("data exchange", socket.id, data.to_connid);
        socket.to(data.to_connid).emit("exchangeData", {
            message: data.message,
            from_connid: socket.id,
        });
    }); //end of exchangeSDP

    // socket.on("reset", (data) => {
    //     var userObj = userConnections.find((p) => p.connectionId == socket.id);
    //     if (userObj) {
    //         var meetingid = userObj.meeting_id;
    //         var list = userConnections.filter(
    //             (p) => p.meeting_id == meetingid
    //         );
    //         userConnections = userConnections.filter(
    //             (p) => p.meeting_id != meetingid
    //         );

    //         list.forEach((v) => {
    //             socket.to(v.connectionId).emit("reset");
    //         });

    //         socket.emit("reset");
    //     }
    // }); //end of reset

    socket.on("sendMessage", (msg) => {
        console.log(msg);
        var userObj = userConnections.find((p) => p.connectionId == socket.id);
        if (userObj) {
            var meetingid = userObj.meeting_id;
            var from = userObj.user_id;

            var list = userConnections.filter((p) => p.meeting_id == meetingid);
            console.log(list);

            list.forEach((v) => {
                socket.to(v.connectionId).emit("showChatMessage", {
                    from: from,
                    message: msg,
                    time: getCurrDateTime(),
                });
            });

            socket.emit("showChatMessage", {
                from: from,
                message: msg,
                time: getCurrDateTime(),
            });
        }
    }); //end of reset

    socket.on("disconnect", function () {
        console.log("Got disconnect!");

        var userObj = userConnections.find((p) => p.connectionId == socket.id);
        if (userObj) {
            var meetingid = userObj.mid;

            userConnections = userConnections.filter(
                (p) => p.connectionId != socket.id
            );
            var list = userConnections.filter((p) => p.mid == meetingid);

            list.forEach((v) => {
                socket
                    .to(v.connectionId)
                    .emit("informAboutConnectionEnd", socket.id);
            });
        }
    });
});
/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== "listen") {
        throw error;
    }

    var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case "EACCES":
            console.error(bind + " requires elevated privileges");
            process.exit(1);
            break;
        case "EADDRINUSE":
            console.error(bind + " is already in use");
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = server.address();
    var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
    debug("Listening on " + bind);
}
