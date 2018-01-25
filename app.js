var server = require('http').createServer(handler)
var io = require('socket.io')(server);

let hostname = '127.0.0.1';
let port = '16217';

let tracers = [];

server.listen(port, hostname);

function handler(req, res) {
	res.end();
}

function Tracer(socket) {
	let id;
	let data = {};

	do {
		id = Math.round(Math.random() * 100000);
		console.log('--id', id);
	} while (tracers.includes(id))

	socket.on('tracer_update', function (new_data) {
		data = Object.assign(data, new_data);
		data_to_send = Object.assign({id}, new_data);
		broadcast('tracer_update', data_to_send, id);
	});

	socket.on('tracer_create', function (tracer_data) {
		let world = { 
			tracers: tracers.filter(tr => tr.getId() !== id).map(tr => tr.getData()) 
		};
		sendEvent('init_world', world);
		data = tracer_data;
		broadcast('tracer_create', getData(), id);
	});

	socket.on('disconnect', function() {
		tracers = tracers.filter(tr => tr.getId() != id);
		broadcast('tracer_disconnect', id, id);
	});

	function sendEvent(event, data) {
		socket.emit(event, data);
	}

	function getData() {
		return Object.assign({id}, data);
	}

	return {
		getId: () => id,
		sendEvent: sendEvent,
		getData: getData
	}
}

function broadcast(event, data, exclude_id) {
	tracers.filter(tracer => tracer.getId() !== exclude_id)
	.forEach(tracer => {
		tracer.sendEvent(event, data);
	});
}

io.on('connection', function (socket) {
	let tracer = Tracer(socket);
	tracers.push(tracer);
});