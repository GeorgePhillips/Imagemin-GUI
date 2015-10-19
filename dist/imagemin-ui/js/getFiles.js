(function () {
	var walk = require("walk");
	var path = require("path");
	var async = require("async");
	var fs = require("fs");

	var validExtensions = {
		".gif": true,
		".jpg": true,
		".jpeg": true,
		".png": true,
		".svg": true
	};

	function getFiles(filenames, callback) {
		var files = {};

		function addFile(filename, stat) {
			var extension = path.extname(filename);
			if (extension && validExtensions[extension]) {
				console.log(filename, stat);
				files[filename] = stat;
				stat.name = path.basename(filename);
			}
		}

		async.each(filenames, function (filename, next) {
			fs.stat(filename, function (err, stat) {
				if (stat.isDirectory()) {
					walkDirectory(filename, function (err, dirFiles) {
						if (err) {
							return next(err);
						}

						for (var name in dirFiles) {
							if (dirFiles.hasOwnProperty(name)) {
								addFile(name, dirFiles[name]);
							}
						}
						next();
					});
				} else {
					addFile(filename, stat);
					next();
				}
			});
		}, function (err) {
			callback(err, files);
		});
	}

	function walkDirectory(directory, callback) {
		var files = {};
		walker = walk.walk(directory);

		walker.on("file", function (root, stat, next) {
			files[path.join(root, stat.name)] = stat;
			next();
		});

		walker.on("errors", function (root, nodeStatsArray, next) {
			next();
		});

		walker.on("end", function () {
			callback(null, files);
		});
	}

	window.getFiles = getFiles;
}());
