(function()
{
  'use strict';

  var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    stylish = require('jshint-stylish'),
    minify = require('gulp-minify');
  
  gulp.task('default', function() {
    gulp.src('dist/**/*.js')
      .pipe(minify({
        ext:{
          src:'.js',
          min:'.min.js'
        },
        exclude: ['lib'],
        ignoreFiles: ['*.min.js']
      }))
      .pipe(gulp.dest('dist'));
  });

  gulp.task('jshint', function()
  {
    return gulp.src('dist/angular-mapbox.js')
      .pipe(jshint())
      .pipe(jshint.reporter(stylish));
  });
})();
