const Bullet = require('./bullet')
const server = require('http').createServer(handler)
const io = require('socket.io')(server);
const ut = require("./utils");
const Rx = require('rxjs');

let hostname = '127.0.0.1';
let port = '16217';

let tracers = [];
let bullets = [];

server.listen(port, hostname);

function handler(req, res) {
	res.end();
}

function Tracer(socket) {
	let id;
	let x;
	let y;
	let angle;
	let width;
	let height;

	do {
		id = ut.Utils.randomInt(0, 10000000);
		console.log('--id', id);
	} while (tracers.includes(id))

	socket.on('tracer_update', function (new_data) {
		updateData(new_data);
		broadcast('tracer_update', getData(), id);
	});

	socket.on('tracer_new', function () {
		console.log('tracer_new');
		let world = { 
			tracers: tracers.filter(tr => tr.getId() !== id).map(tr => tr.getData()) 
		};
		x = ut.Utils.randomInt(100, 700);
		y = ut.Utils.randomInt(100, 500);
		angle = ut.Utils.random(0, 10);
		width = 16;
		height = 40;
		sendEvent('init_world', {tracer_data: getData(), world});
		broadcast('tracer_create', getData(), id);
	});

	socket.on('disconnect', function() {
		tracers = tracers.filter(tr => tr.getId() != id);
		broadcast('tracer_disconnect', id, id);
	});

	socket.on('bullet_create', function(data) {
		let bullet = Bullet.create_bullet(data);
		bullets.push( bullet );
		data.id = bullet.getId();
		broadcast('bullet_create', data);
	});

	function sendEvent(event, data) {
		socket.emit(event, data);
	}

	function getData() {
		return {
			id, x, y, angle, width,	height
		}
	}

	function updateData(data) {
		x = parseFloat(data.x) || x;
		y = parseFloat(data.y) || y;
		angle = parseFloat(data.angle) || angle;
	}

	function checkCollision(pos) {
		let point_angle = ut.Utils.pointsAngle({x, y}, pos);
		let r = ut.Utils.vectorLength({x, y}, pos);
		let rotated_pos = { x: x + r * Math.cos(point_angle + angle), y: y + r *Math.sin(point_angle + angle) };
		return ut.Utils.isPointInsideRect(rotated_pos, getRect());
	}

	function getRect() {
		return {
			x1: x - width/2,
			x2: x + width/2,
			y1: y - height/2,
			y2: y + height/2
		}
	}

	return {
		getId: () => id,
		sendEvent,
		getData,
		checkCollision
	}
}

function broadcast(event, data, exclude_id=null) {
	tracers.filter(tracer => tracer.getId() !== exclude_id)
	.forEach(tracer => {
		tracer.sendEvent(event, data);
	});
}

function processBullets(dt) {
	bullets.forEach(bullet => {
		let tracer = bullet.move(dt, tracers);
		if (tracer) {
			broadcast('bullet_destroy', { id: bullet.getId() });
			broadcast('tracer_hit', { id: tracer.getId(), damage: bullet.getDamage() });
		}
	});
	bullets = bullets.filter( bullet => bullet.isAlive());
}

let prev_timestamp = Date.now();
function getDiff() {
	let timestamp = Date.now();
	let diff = 0;
	if (prev_timestamp)
		diff = (timestamp - prev_timestamp) / 1000;
	prev_timestamp = timestamp;
	return diff;
}

function step() {
	const dt = getDiff();
	processBullets(dt);
}

io.on('connection', function (socket) {
	let tracer = Tracer(socket);
	tracers.push(tracer);
});

Rx.Observable.interval(60 / 1000)
.subscribe(step);