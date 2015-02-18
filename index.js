var later = require('later'),
	comms = new (require('./comms'))();

var jobs = {};

exports.add = function(id, schedule, fn) {
	if (jobs[id]) {
		throw new Error('Already have a job named ' + id);
	}

	var invoker = later.setInterval(function() {
		if (!jobs[id].paused) {
			run(id);
		}
	}, schedule);

	jobs[id] = {
		schedule: later.schedule(schedule),
		fn: fn,
		runs: 0,
		invoker: invoker
	};

	run(id);

};

exports.remove = function(id) {
	if (!jobs[id]) {
		throw new Error('No such job ' + id);
	}
	jobs[id].invoker.clear();
	delete jobs[id];
};


exports.pause = function(id) {
	jobs[id].paused = true;
	updateJob(id);
};

exports.resume = function(id) {
	jobs[id].paused = false;
	jobs[id].next = jobs[id].schedule.next(1).valueOf();
	if (jobs[id].next <= Date.now() + 1000) {
		jobs[id].next = jobs[id].schedule.next(2)[1].valueOf();
	}
	updateJob(id);
};

exports.run = run;

function run(id) {
	var job = jobs[id];

	job.runs++;
	job.last = Date.now();
	job.next = job.schedule.next(2)[1].valueOf();

	updateJob(id);

	job.fn();
}

function updateJob(id) {
	comms.send('job', {
		id: id,
		stats: jobs[id]
	});
}

comms.on('connection', function(socket) {
	socket.write({
		msg: 'jobs',
		jobs: jobs
	});
});


['pause', 'resume', 'run'].forEach(function(cmd) {
	comms.on(cmd, function(msg) {
		var rex = new RegExp(msg.id);
		for (var job in jobs) {
			if (rex.test(job)) {
				exports[cmd](job);
			}
		}
	});
});


exports.schedule = later.parse;

exports.listen = comms.listen.bind(comms);