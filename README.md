ultracron
=========

Ultracron is a simple job scheduler based on the excellent [later](https://www.npmjs.com/package/later) module.  Ultracron adds some basic job management utilities, syntactic sugar, and monitoring tools.

Example
-------

	ultracron.add('test-job', ultracron.schedule.text('every 5 min'), function(done) {
		console.log('I get called every five minutes!');
		done();
	});

[Later supports all kinds of schedule definitions.](http://bunkat.github.io/later/parsers.html)  (`ultracron.schedule == later.parse`)

API
---

### `add(id, schedule, fn)`

Adds a job.

- `id` - a unique job id (string)
- `schedule` - a later [schedule](http://bunkat.github.io/later/schedules.html)
- `fn` - the function to invoke.  The job function receives a callback argument, which is used only for statistic reporting.  The job function can also return a promise.

### `addPaused`

When `true`, all jobs are added in the paused state.  Useful for development/testing/debugging.

### `remove(id)`

Removes job `id`.

### `pause(id)`

Pauses job `id`.  Paused jobs will not be invoked on their regular schedule.  You can still invoke a paused job manually.

### `resume(id)`

Resumes job `id`.  The job will not be invoked immediately; it will run on its next scheduled occurrence.

### `reschedule(id, opts)`

Modifies the schedule of existing job `id`.

- `opts.schedule` - something parseable by the [text parser](http://bunkat.github.io/later/parsers.html#text).

### `run(id)`

Immediately invokes job `id`.

### `listen(port)`

Ultracron will open `port` and listen for connections from the monitoring tool.  There's absolutely no security, so don't open this port to the world.

Monitoring
----------

Ulracron includes a command-line tool for monitoring the status of your job scheduler.

![screenshot](http://i.imgur.com/KL3nkTu.png)

When you `npm install -g ultracron`, npm adds a `ucmon` command.  The monitor shows you the run/fail count, last run time, and next scheduled run time of each job.

You can also type some commands:

- `pause <jobspec>` - pauses job(s)
- `resume <jobspec>` - un-pauses job(s)
- `run <jobspec>` - immediately invokes job(s)
- `abs` - shows last/next run time as absolute time (ie "3/9 12:34p")
- `rel` - shows last/next run time as relative time (ie "in 5 minutes")
- `sched <jobspec> <schedule>` - changes a job's schedule
- `quit`

`<jobspec>` is a regex that matches one or more job IDs.

`ucmon` also takes some optional arguments:

- `-h`, `--host` - host to connect to.  Default 127.0.0.1.
- `-p`, `--port` - port to connect to.  Default 3010.