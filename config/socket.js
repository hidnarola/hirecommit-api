const socketIO = (server) => {
    var io = require('socket.io')(server);
    io.on('connection', function (socket) {
        socket.on('join', function (id) {
            socket.join(id);
        });

        socket.on('leave', function (id) {
            socket.leave(id);
        });

        socket.on('changeOffer', function (id) {
            socket.to(id).emit('Offer', { id });
        });

        socket.on('isAllow', function (id) {
            socket.to(id).emit('Reflect', { id });
        });


        socket.on('disconnect', function () {
            io.emit('user disconnected');
        });
    });

}

module.exports = socketIO;
