const ut = require("./utils");

exports.Bullet = function(parent_id, x, y, angle) {
	let id = ut.Utils.randomInt(0, 10000000);;
	let speed = 2000;
	let x_speed = speed * Math.cos(angle);
	let y_speed = speed * Math.sin(angle);
	let max_age = 0.5;
	let age = 0;
	let damage = 3;



	function do_move(dt) {
		x -= x_speed * dt;
		y -= y_speed * dt;
		age = Math.min(max_age, age + dt);
	}
		
	function move(dt, tracers) {
		let target_delta = 0.0002;
		let repeat = Math.round(dt / target_delta);
		let step = dt / repeat;
		while (repeat--) {
			do_move(step);
			for (let tracer of tracers) {
				if (tracer.getId() !== parent_id) {
					if (tracer.checkCollision({x, y})) {
						destroy();
						return tracer;
					}
				}
			}
		}
		return null;
	}

	function destroy() {
		age = max_age;
	}

	return {
		move,
		isAlive: () => age < max_age,
		getDamage: () => damage,
		getId: () => id,
	}
}

exports.create_bullet = data => {
	return exports.Bullet(data.parent_id, data.x, data.y, data.angle);
}