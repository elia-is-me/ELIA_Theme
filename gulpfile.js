const gulp = require("gulp");
const ts = require("gulp-typescript");

gulp.task("default", function() {
	const proj = ts.createProject('panels/main/tsconfig.json');
	return proj.src()
		.pipe(proj())
		.js.pipe(gulp.dest('out'));
});
