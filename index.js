var later = require('later'),
	comms = new (require('./comms'))();

var jobs = {};

exports.add = function(id, schedule, fn) {
	if (jobs[id]) {
		throw new Error('Already have a job named ' + id);
	}

	jobs[id] = {
		fn: fn,
		runs: 0,
		fails: 0,
		paused: !!exports.addPaused
	};

	setSchedule(id, schedule);
};

function setSchedule(id, schedule) {
	jobs[id].schedule = later.schedule(schedule);
	jobs[id].invoker = later.setInterval(function() {
		if (!jobs[id].paused) {
			run(id);
		}
	}, schedule);
}

exports.remove = function(id) {
	if (!jobs[id]) {
		throw new Error('No such job ' + id);
	}
	jobs[id].invoker.clear();
	delete jobs[id];
};


exports.pause = function(id) {
	if (!id) {
		for (var job in jobs) {
			exports.pause(job);
		}
		return;
	}
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

exports.reschedule = function(id, opts) {
	var job = jobs[id];
	job.invoker.clear();

	var schedule = later.parse.text(opts.schedule);
	setSchedule(id, schedule);
	job.next = job.schedule.next(2)[1].valueOf();
	updateJob(id);
};

exports.run = run;

function run(id) {
	var job = jobs[id];

	job.runs++;
	job.last = Date.now();
	job.next = job.schedule.next(2)[1].valueOf();

	updateJob(id);

  try {
    var retval = job.fn(done);
  } catch (ex) {
    done(ex);
  }

	// Promise support
	if (retval && typeof retval.then == 'function') {
		retval.then(function() {
			done();
		}, done);
	}

	function done(err) {
		if (err) {
			console.error('[' + new Date().toISOString() + '] Failed to run ' + id, err.stack);
			job.fails++;
			updateJob(id);
		}
	}
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


['pause', 'resume', 'run', 'reschedule'].forEach(function(cmd) {
	comms.on(cmd, function(msg, socket) {
		try {
			if (msg.id == '*') {
				msg.id = '.+';
			}
			var rex = new RegExp(msg.id);
			for (var job in jobs) {
				if (rex.test(job)) {
					exports[cmd](job, msg);
				}
			}
		} catch (ex) {
			console.error('Error running received command', ex);
			socket.write({msg:'err', err:ex.toString()});
		}
	});
});


exports.schedule = later.parse;

exports.listen = comms.listen.bind(comms);
