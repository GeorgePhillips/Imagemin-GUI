(function () {
	var files = {};
	var fs = require('fs-extra');
	var tmp = require('tmp');
	var path = require('path');
	var slug = require('slug');
	var async = require('async');
	var Imagemin = require('imagemin');
	var choose = document.getElementById("choose");
	var blankState = document.getElementById("blank-state");
	var results = document.getElementById("results");

	function toggleVisibility() {
		var keys = Object.keys(files);
		blankState.style.display = keys.length === 0 ? "inherit" : "none";
		results.style.display = keys.length !== 0 ? "table" : "none";
	}

	var icons = {
		"waiting": "hourglass",
		"working": "air",
		"warning": "attention",
		"saving": "upload",
		"error": "cancel",
		"complete": "check"
	};

	function renderFiles() {
		var html = "";

		html += "<thead><tr>";
		html += "<th width='30'></th>";
		html += "<th>File</th>";
		html += "<th class='metric' width='100'>Size</th>";
		html += "<th class='metric' width='100'>Savings</th>";
		html += "</tr></thead><tbody>";

		for (var filename in files) {
			if (files.hasOwnProperty(filename)) {
				var stat = files[filename];
				html += "<tr id='" + stat.id + "'>" + getFileRow(stat) + "</tr>";
			}
		}

		html += "</tbody>";
		results.innerHTML = html;
	}

	function renderFile(stat) {
		var row = document.getElementById(stat.id);
		if (row) {
			row.innerHTML = getFileRow(stat);
		}
	}

	function getFileRow(stat) {
		var html = "";
		html += "<td class='state'><span class='icon icon-" + icons[stat.state] + "'></span></td>";
		html += "<td>" + stat.name + "</td>";
		html += "<td class='metric'>" + stat.size + "</td>";
		html += "<td class='metric'>" + (100 - (stat.size / stat.originalSize * 100)).toFixed(2) + "%</td>";
		return html;
	}

	toggleVisibility();
	function onSelect(filenames) {
		if (filenames === undefined) return;

		getFiles(filenames, function (err, addedFiles) {
			for (var filename in addedFiles) {
				if (addedFiles.hasOwnProperty(filename)) {
					addFile(filename, addedFiles[filename]);
				}
			}
			addedFiles = null;
			renderFiles();
			toggleVisibility();
		});
	}

	var queue = async.queue(function processFile(stat, next) {
		stat.state = "working";
		renderFile(stat);

		tmp.tmpName(function (err, tmpDir) {
			if (err) {
				stat.state = "warning";
				renderFile(stat);
				return next();
			}

			console.log("Created temporary filename: ", tmpDir);
			new Imagemin()
				.src(stat.filename)
				.dest(tmpDir)
				.run(function (err, files) {
					if (err) {
						console.log(err);
						stat.state = "error";
						renderFile(stat);
						next();
					} else {
						var tmpFilename = path.join(tmpDir, stat.name);
						fs.stat(tmpFilename, function (err, updatedStat) {
							if (updatedStat.size < stat.size) {
								stat.size = updatedStat.size;
								stat.state = "saving";
								renderFile(stat);

								fs.move(tmpFilename, stat.filename, {clobber: true}, function (err) {
									if (err) {
										stat.state = "error";
									} else {
										stat.state = "complete";
									}
									renderFile(stat);
									next();
								});
							} else {
								stat.state = "complete";
								renderFile(stat);
								next();
							}
						});
					}
				});
		});
	}, 20);

	function addFile(filename, stat) {
		if (!files[filename] || files[filename].state === "complete") {
			stat.state = "waiting";
			stat.filename = filename;
			stat.originalSize = stat.size;
			stat.id = slug(filename);
			files[filename] = stat;

			queue.push(stat);
		}
	}

	var dialog = require("remote").require("dialog");
	choose.onclick = function openFileSelect() {
		dialog.showOpenDialog({
			properties: ["openFile", "openDirectory", "multiSelections"],
			filters: [{name: "Image Files", extensions: ["gif", "jpg", "png", "svg"]}]
		}, onSelect);
	};
})();
