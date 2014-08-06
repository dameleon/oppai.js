var gulp = require('gulp');
var uglify = require('gulp-uglifyjs');
var header = require('gulp-header');
var connect = require('gulp-connect');
var concat = require('gulp-concat');
var pkg = require('./package.json');

var BANNER = '/*! <%= name %> / @version:<%= version %> @author:<%= author %> @license:<%= license %> */ \n';

gulp.task('dist', function() {
    gulp.src(['src/oppai.js', 'src/oppai.breast.js'])
        .pipe(concat('oppai.min.js'))
        // .pipe(uglify('oppai.min.js', {
        //     outSourceMap: true
        // }))
        .pipe(header(BANNER, pkg))
        .pipe(gulp.dest('dist/'))
        .pipe(gulp.dest('sample/js/'))
});

gulp.task('develop', function() {
    gulp.watch('src/**/*.js', ['dist']);
    connect.server({
        root: ['sample'],
        port: 8000,
        livereload: true
    });
});

gulp.task('test', function() {
    console.log('no test available');
});

gulp.task('default', ['dist']);
