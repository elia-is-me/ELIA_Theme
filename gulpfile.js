const gulp = require("gulp");
const browserify = require("browserify");
const source = require("vinyl-source-stream");
const tsify = require("tsify");

gulp.task("default", function () {
    return browserify({
        "basedir": ".",
        "entries": "src/ELIA/main.ts",
        "debug": false,
        "cache": {},
        "packageCache": {}
    })
        .plugin(tsify
            , {
                "target": "ES2018",
                "baseUrl": "./",
            })
        .on('error', function (error) { console.error(error.toString()); })
        .bundle()
        .pipe(source("elia-theme.js"))
        .pipe(gulp.dest("out"));
});
