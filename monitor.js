var charm = require('charm')(),
	colors = require('colors'),
	consoleTitle = require('console-title'),
	readline = require('readline'),
	moment = require('moment'),
	comms = new (require('./comms'))();

var rl, timeMode = 'rel';


rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
rl.setPrompt(':');

rl.on('line', function(line) {
	//process.stdout.write('\a');

	line = line.split(' ');
	switch (line[0]) {		
		case 'stop':
		case 'pause':

			comms.send('pause', { id: line[1] });
			break;

		case 'start':
		case 'resume':

			comms.send('resume', { id: line[1] });
			break;

		case 'r':
		case 'run':

			comms.send('run', { id: line[1] });
			break;

		case 'rel':
			timeMode = 'rel';
			updateTimes();
			break;
		case 'abs':
			timeMode = 'abs';
			updateTimes();
			break;

		case 'q':
		case 'quit':
			return process.exit(0);
		default:
			charm.position(0, process.stdout.rows).erase('end').write(' Invalid command '.bgRed);
		
	}

});

// override the default clearLine so that pressing enter doesn't move the cursor down a line,
// totally blowing our carefully maintained cursor position
rl.clearLine = function() {
	charm.position(0, process.stdout.rows).erase('end');
	this.line = '';
	this.cursor = 0;
	this.prevRows = 0;
};

var jobLine = {}, jobs=[null,null,null,null,null], nextJobLine = 5;

function init() {
	consoleTitle('ultracron monitor');
	charm.pipe(process.stdout);
	

	render();

	process.stdout.on('resize', render);
	
}
init();
function jobStats(job, stats) {
	if (!jobLine[job]) {
		jobLine[job] = nextJobLine++;
		jobs.push(stats);
	}

	var y = jobLine[job];
	jobs[y] = {
		id: job,
		stats: stats
	};



	renderJobLine(y);
	updateTimes();
}


function render() {
	charm.reset();
	charm.write('ultracron monitor'.bgBlue + '\n');
	charm.write('\n');
	charm.write('Job                                 Runs    Last           Next                \n');
	charm.write('================================================================================\n'.gray);

	for (var y = 5; y < jobs.length; y++) {
		renderJobLine(y);
	}
	updateTimes();
}

function renderJobLine(y) {
	var name = jobs[y].id.substr(0, 35);
	if (jobs[y].stats.paused) {
		name = name.yellow;
	}

	charm.position(0, y).erase('end').write(name);
	charm.position(37, y).write(''+jobs[y].stats.runs);
}

// jobStats('q', {runs:0, last:Date.now(), next:Date.now() + 1000*30});

function bot() {
	charm.position(0, process.stdout.rows);
	rl.prompt(true);
}


setInterval(updateTimes, 1000);

function updateTimes() {
	charm.position(0, 2).write(new Date().toString().gray);

	for (var y = 5; y < jobs.length; y++) {
		charm.position(45, y).erase('end').write(formatDate(jobs[y].stats.last));
		charm.position(60, y).write(jobs[y].stats.paused ? 'paused'.yellow : formatDate(jobs[y].stats.next, true));
	}

	bot();

}

moment.locale('en', {
	relativeTime: {
		future: "in %s",
		past:   "%s ago",
		s:  "%d seconds",
		m:  "a minute",
		mm: "%d minutes",
		h:  "an hour",
		hh: "%d hours",
		d:  "a day",
		dd: "%d days",
		M:  "a month",
		MM: "%d months",
		y:  "a year",
		yy: "%d years"
	}
});

function formatDate(t, shouldBeFuture) {
	if (!t) {
		return '-'.gray;
	}

	var date = moment(t), delta = Math.abs(Date.now() - t), str;

	if (timeMode == 'rel') {
		//str = timeago(date);
		str = date.fromNow();
	} else {
		str = date.format('M/D h:mma');
	}

	if (delta < 5000) {
		return str.green;
	} else if (shouldBeFuture && Date.now() - t > 0) {
		return str.red;
	} else if (delta > 1000*60*20) {
		return str.gray;
	} else {
		return str;
	}
}

comms.connect(3010, function() {
	comms.send('list');
});

comms.on('jobs', function(msg) {
	for (var job in msg.jobs) {
		jobStats(job, msg.jobs[job]);
	}
});

comms.on('job', function(msg) {
	jobStats(msg.id, msg.stats);
});