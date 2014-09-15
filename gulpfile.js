var gulp = require('gulp');
var uglify = require('gulp-uglifyjs');
var header = require('gulp-header');
var connect = require('gulp-connect');
var concat = require('gulp-concat');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var pkg = require('./package.json');

var BANNER = '/*! <%= name %> / @version:<%= version %> @author:<%= author %> @license:<%= license %> */ \n';

gulp.task('jshint', function() {
    gulp.src(['src/**/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter(stylish));
});

gulp.task('dist', function() {
    gulp.src(['src/oppai.js', 'src/*.js'])
        .pipe(concat('oppai.min.js'))
        .pipe(uglify('oppai.min.js', {
            outSourceMap: true
        }))
        .pipe(header(BANNER, pkg))
        .pipe(gulp.dest('dist/'))
});

gulp.task('dist-sample', function() {
    gulp.src(['src/oppai.js', 'src/*.js'])
        .pipe(concat('oppai.js'))
        .pipe(header(BANNER, pkg))
        .pipe(gulp.dest('sample/js/'))
});

gulp.task('develop', ['dist-sample'], function() {
    gulp.watch('src/**/*.js', ['jshint', 'dist-sample']);
    connect.server({
        root: ['sample'],
        port: 8000,
        livereload: true
    });
});

gulp.task('test', function() {
    console.log('no test available');
});

gulp.task('default', ['jshint', 'dist']);
