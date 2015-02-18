var jot = require('json-over-tcp'),
	util = require('util'),
	events = require('events');


function Comms() {
	events.EventEmitter.call(this);
	this.clients = {};
}
util.inherits(Comms, events.EventEmitter);

Comms.prototype.send = function(type, msg) {
	msg = msg || {};
	msg.msg = type;
	this.write(msg);	
};

Comms.prototype.write = function(msg) {
	for (var k in this.clients) {
		this.clients[k].write(msg);
	}
};

Comms.prototype.listen = function(port) {
	var self = this, server = this.server = jot.createServer(port);
	server.on('connection', function(socket) {
		socket.on('error', function(err) {
			// ignore
		});
		wire(socket, self);

		self.emit('connection', socket);
	});
	server.listen(port);
	return server;
};

Comms.prototype.connect = function(port, host, cb) {
	var client = jot.connect(port, host, cb);
	
	wire(client, this);

	return client;

};




function wire(socket, instance) {
	instance.clients[idOf(socket)] = socket;
	socket.on('close', function() {
		delete instance.clients[idOf(socket)];
	});

	socket.on('data', function(msg) {
		instance.emit(msg.msg, msg, socket);
	});
}

function idOf(socket) {
	return socket.remoteAddress + ':' + socket.remotePort;
}

exports = module.exports = Comms;