const gulp = require("gulp");
const browserify = require("browserify");
const source = require("vinyl-source-stream");
const tsify = require("tsify");
//const watchify = require("watchify");
//const babelify = require("babelify");

gulp.task("default", function () {
    // return browserify({
    //     basedir: "./src",
    //     debug: true,
    //     entries: ["ELIA/main.ts" ],
    //     paths: ["./src"],
    //     cache: {},
    //     packageCache: {}
    // })
    //     .plugin(tsify, { target: "es2017", include: ["src"]})
    //     .bundle()
    //     .pipe(source("bundle.js"))
    //     .pipe(gulp.dest("out"));
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
        // .transform(babelify, {
        //     // "presets": ["env"],
        //     // "extensions": [".ts"]
        // })
        .on('error', function (error) { console.error(error.toString()); })
        .bundle()
        .pipe(source("elia-theme-main.js"))
        .pipe(gulp.dest("out"));
});
