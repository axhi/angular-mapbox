(function()
{
    'use strict';

    var gulp = require('gulp'),
        concat = require('gulp-concat'),
        uglify = require('gulp-uglify'),
        ngmin = require('gulp-ngmin'),
        jshint = require('gulp-jshint'),
        livereload = require('gulp-livereload'),
        jshint = require('gulp-jshint'),
        stylish = require('jshint-stylish');

    gulp.task('watch', ['scripts'], function()
    {
        var server = livereload();
        gulp.watch('src/**/*.js', ['scripts']);
        gulp.watch('dist/**').on('change', function(file)
        {
            server.changed(file.path);
        });
    });

    gulp.task('jshint', function()
    {
        return gulp.src('src/**/*.js')
            .pipe(jshint())
            .pipe(jshint.reporter(stylish));
    });
})();
