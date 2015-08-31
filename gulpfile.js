(function() {﻿
  'use strict';
  /* ***** CUSTOM CONFIGURATION PROPERTIES. ***** */
  // note: should match the main angular module name (used by ng-template)
  var moduleName = 'odata.ui.grid',
    devServerPort = 5000,
    paths = {
      html: 'lib/**/*.html',
      libScripts: ['lib/**/*.ts', '!lib/**/tests/*.ts'], // ignore tests dir
      testsDest: 'dist/tests',
      testsOrig: 'lib/**/tests/*.ts',
      lint: ['lib/**/*.ts', 'demo/**/*.ts'],
      demoLess: 'demo/**/*.less',
      demoTs: 'demo/**/*.ts',
      demoDest: 'demo',
      less: 'lib/**/*.less',
      dest: 'dist',
      livereload: ['index.html',  'demo/**/*.js', 'demo/**/*.css', 'dist/**/*.js', 'dist/**/*.css', '!dist/**/tests/*.ts']
    };

  /* ***** LOAD DEPENDENCIES ***** */
  var del = require('del'),
    gulp = require('gulp'),
    bower = require('gulp-bower'),
    tsc = require('gulp-tsc'),
    concat = require('gulp-concat-util'),
    browserSync = require('browser-sync').create(),
    tslint = require('gulp-tslint'),
    less = require('gulp-less'),
    notify = require('gulp-notify'),
    minifyHtml = require('gulp-minify-html'),
    minifyCSS = require('gulp-minify-css'),
    ngTemplate = require('gulp-ng-template'),
    rename = require('gulp-rename'),
    sourceMaps = require('gulp-sourcemaps'),
    gutil = require('gulp-util'),
    pkg = require('./package.json'),
    runSequence = require('run-sequence'),
    uglify = require('gulp-uglify'),
    karma = require('karma').Server;

  /* *********** ERROR HANDLING *********** */
  var handleError = function(task) {
    return function(err) {
      notify.onError({ message: task + ' failed, check the logs..', sound: false })(err);
      gutil.log(gutil.colors.bgRed(task + ' error:'), gutil.colors.red(err));
    };
  };
  /* *********** TASKS METHODS *********** */
  var tasks = {
    clean: function(callback) { del([paths.dest + '/**/*.*'], callback); },
    bower: function() { return bower({ cmd: 'update' }); },
    less: function() {
      return gulp.src(paths.less)
        .pipe(sourceMaps.init())
        .pipe(less({ compress: true }).on('error', handleError))
        .pipe(concat(pkg.name + '.css'))
        .pipe(gulp.dest(paths.dest))
        .pipe(minifyCSS({ keepBreaks: false }).on('error', handleError))
        .pipe(rename({ suffix: '.min' }))
        .pipe(sourceMaps.write('./'))
        .pipe(gulp.dest(paths.dest));
    },
    demoLess: function() {
      return gulp.src(paths.demoLess)
        .pipe(less().on('error', handleError))
        .pipe(gulp.dest(paths.demoDest));
    },
    demoTs: function() {
      return gulp.src(paths.demoTs)
        .pipe(tsc({
          module: 'CommonJS',
          sourceMap: false,
          emitError: false,
          declaration: false
        }).on('error', handleError))
        .pipe(gulp.dest(paths.demoDest))
        .on('error', handleError);
    },
    templates: function() {
      return gulp.src(paths.html)
        .pipe(minifyHtml({ empty: true, quotes: true }))
        .pipe(ngTemplate({
          moduleName: moduleName,
          standalone: false,
          filePath: (pkg.name + '.tpl.js'),
          prefix: 'lib/',
        }).on('error', handleError))
        .pipe(gulp.dest(paths.dest));
    },
    compileTests: function() {
      return gulp.src(paths.testsOrig)
        .pipe(tsc({
          module: 'CommonJS',
          sourceMap: false,
          declaration: false,
          emitError: false,
          out: pkg.name + '.js'
        }).on('error', handleError))
        .pipe(gulp.dest(paths.testsDest))
        .on('error', handleError);
    },
    tsd: function (callback) {
        tsd({
            command: 'reinstall',
            config: './tsd.json'
        }, callback);
    },
    karma: function(done) {
      var karmaServer = new karma({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
      }, function() { return done(); });
      return karmaServer.start();
    },
    compress: function() {
      return gulp.src(paths.dest + '/' + pkg.name + '.js')
        .pipe(rename({ suffix: '.min' }))
        .pipe(uglify().on('error', handleError))
        .pipe(gulp.dest(paths.dest));
    },
    compileScripts: function() {
      return gulp.src(paths.libScripts)
        .pipe(tsc({
          module: 'CommonJS',
          emitError: false,
          sourceMap: true,
          declaration: true,
          out: pkg.name + '.js'
        }).on('error', handleError))
        .pipe(gulp.dest(paths.dest))
        .on('error', handleError);
    },
    watch: function() {
      gulp.watch(paths.libScripts, ['lint', 'compile-scripts']).on('error', handleError);
      gulp.watch(paths.less, ['less']).on('error', handleError);
      gulp.watch(paths.testsOrig, ['lint', 'test']).on('error', handleError);
      gulp.watch(paths.html, ['templates']).on('error', handleError);
      gulp.watch(paths.demoLess, ['demo-less']).on('error', handleError);
      gulp.watch(paths.demoTs, ['demo-ts']).on('error', handleError);
      gulp.watch(paths.livereload, ['reload-browser']).on('error', handleError);
    },
    lint: function () {
        return gulp.src(paths.lint)
            .pipe(tslint())
            .pipe(tslint.report('prose', { emitError: false }))
            .on('error', handleError);
    },
    reloadBrowser: function() { browserSync.reload(); },
    startServer: function() {
      browserSync.init({ port: devServerPort, server: { baseDir: './', } });
    }
  };

  /* *********** GULP TASKS *********** */
  gulp.task('clean', tasks.clean);
  gulp.task('compile-tests', tasks.compileTests);
  gulp.task('karma', tasks.karma);
  gulp.task('test', function(callback) { runSequence('compile-tests', 'karma', callback); });
  gulp.task('bower', tasks.bower);
  gulp.task('less', tasks.less);
  gulp.task('update', function(callback) { runSequence('bower', callback); });
  gulp.task('templates', tasks.templates);
  gulp.task('demo-less', tasks.demoLess);
  gulp.task('demo-ts', tasks.demoTs);
  gulp.task('compress', tasks.compress);
  gulp.task('compile-scripts', tasks.compileScripts);
  gulp.task('compile', function(callback) {
    runSequence(
      ['less', 'templates', 'lint', 'compile-scripts'],
      'compress', 'test', 'demo-less', 'demo-ts', callback);
  });
  gulp.task('lint', tasks.lint);
  gulp.task('build', function(callback) { runSequence('clean', 'update', 'compile', callback); });
  gulp.task('start-server', tasks.startServer);
  gulp.task('reload-browser', tasks.reloadBrowser);
  gulp.task('watch', tasks.watch);
  gulp.task('dev', function(callback) { runSequence('compile', 'start-server', 'watch', callback); });
  gulp.task('default', ['build']);
})();
