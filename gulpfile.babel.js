/* eslint */

import fs from 'fs'
import path from 'path'
import gulp from 'gulp'
import gulpLoadPlugins from 'gulp-load-plugins'
import browserSyncLib from 'browser-sync'
import pjson from './package.json'
import minimist from 'minimist'
import runSequence from 'run-sequence'
import pngquant from 'imagemin-pngquant'
import del from 'del'
import autoprefixer from 'autoprefixer-core'
import vsource from 'vinyl-source-stream'
import buffer from 'vinyl-buffer'
import es from 'event-stream'
import glob from 'glob'
import browserify from 'browserify'
import gulpif from 'gulp-if'
import jade from 'jade'

// Load all gulp plugins based on their names
// EX: gulp-copy -> copy
const plugins = gulpLoadPlugins()

// Create karma server
const karma = require('karma').server

let version = pjson.version
let config = pjson.config
let argv = minimist(process.argv.slice(2))
let production = !!(argv.production)
let watch = !!(argv.watch)
let open = !!(argv.open)
let dirs = config.directories
let taskTarget = production ? dirs.destination : dirs.temporary

// Create a new browserSync instance
let browserSync = browserSyncLib.create()

// Converts filepath/directory into a JS object recursively
// ex: `js/data.json` -> `{js: {data: [JSON Data]}`
let parseDirectory = (filepath, obj) => {
  let stats = fs.lstatSync(filepath)
  if (stats.isDirectory()) {
    obj[path.basename(filepath)] = {}
    fs.readdirSync(filepath).map(function (child) {
      obj[path.basename(filepath)] = parseDirectory(
        path.join(filepath, child),
        obj[path.basename(filepath)]
      )
    })
  } else {
    try {
      obj[path.basename(filepath).replace('.json', '')] = JSON.parse(
        fs.readFileSync(filepath, {encoding: 'utf8'})
      )
    } catch (e) {
      console.error('Error reading JSON for file: ' + filepath)
      console.error('===== Details Below =====')
      console.error(e)
    }
  }
  return obj
}

let dirToObj = (filepath) => {
  let dataObj = {}
  try {
    return parseDirectory(filepath, dataObj)
  } catch (e) {
    return {_data: {}}
  }
}

// Jade template compile
gulp.task('jade', () => {
  let dest = path.join(__dirname, taskTarget)
  // Convert directory to JS Object
  let siteData = dirToObj(path.join(__dirname, dirs.source, dirs.data))
  return gulp.src([
    path.join(__dirname, dirs.source, '**/*.jade'),
    '!' + path.join(__dirname, dirs.source, '{**/\_*,**/\_*/**}')
  ])
  // .pipe(plugins.changed(dest))
  .pipe(plugins.jade({
    jade: jade,
    locals: {
      config: config,
      debug: !production,
      site: {
        data: siteData[dirs.data],
        version: version
      }
    }
  }))
  .pipe(plugins.htmlmin({
    collapseBooleanAttributes: true,
    conservativeCollapse: true,
    removeCommentsFromCDATA: true,
    removeEmptyAttributes: true,
    removeRedundantAttributes: true
  }))
  .pipe(gulp.dest(dest))
  .pipe(browserSync.stream())
})

// Sass compilation
gulp.task('sass', () => {
  let dest = path.join(__dirname, taskTarget, dirs.styles.replace(/^_/, ''))
  gulp.src(path.join(__dirname, dirs.source, dirs.styles, '/*.{scss,sass}'))
    .pipe(plugins.plumber())
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.sass({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: [path.join(__dirname, dirs.source, dirs.styles) ]
    }).on('error', plugins.sass.logError))
    .pipe(plugins.postcss([autoprefixer({browsers: ['last 2 version', '> 5%', 'safari 5', 'ios 6', 'android 4']})]))
    .pipe(plugins.sourcemaps.write())
    .pipe(gulp.dest(dest))
    .pipe(browserSync.stream())
})

// ESLint
gulp.task('eslint', () => {
  gulp.src([
    path.join(__dirname, 'gulpfile.js'),
    path.join(__dirname, dirs.source, '**/*.js'),
    // Ignore all vendor folder files
    '!' + path.join(__dirname, '**/vendor/**', '*')
  ])
  .pipe(browserSync.reload({stream: true, once: true}))
  .pipe(plugins.eslint({
    useEslintrc: true
  }))
  .pipe(plugins.eslint.format())
  .pipe(plugins.if(!browserSync.active, plugins.eslint.failAfterError()))
})

// Imagemin
gulp.task('imagemin', () => {
  let dest = path.join(__dirname, taskTarget, dirs.images.replace(/^_/, ''))
  return gulp.src(path.join(__dirname, dirs.source, dirs.images, '**/*.{jpg,jpeg,gif,svg,png}'))
    .pipe(plugins.changed(dest))
    .pipe(gulpif(production, plugins.imagemin({
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      use: [pngquant({speed: 10})]
    })))
      .pipe(gulp.dest(dest))
})

gulp.task('browserify', () => {
  let dest = path.join(__dirname, taskTarget, dirs.scripts.replace(/^_/, ''))
  for (var filepath of config.mainScripts) {
    browserify(
      path.join(__dirname, dirs.source, dirs.scripts, filepath), {
      debug: true,
      transform: [
        require('envify'),
        require('babelify')
      ]
    }).bundle()
      .pipe(vsource(path.basename(filepath)))
      .pipe(buffer())
      .pipe(plugins.sourcemaps.init({loadMaps: true}))
        .pipe(gulpif(production, plugins.uglify()))
        .on('error', plugins.util.log)
      .pipe(plugins.sourcemaps.write('./'))
      .pipe(gulp.dest(dest))
      .pipe(browserSync.stream())
  }
})

// Clean
gulp.task('clean', del.bind(null, [
  path.join(__dirname, dirs.temporary),
  path.join(__dirname, dirs.destination)
]))

// Serve
gulp.task('copy', () => {
  let dest = path.join(__dirname, taskTarget)
  return gulp.src([
      path.join(__dirname, dirs.source, '**/*'),
      '!' + path.join(__dirname, dirs.source, '{**/\_*,**/\_*/**}'),
      '!' + path.join(__dirname, dirs.source, '**/*.jade')
    ])
    .pipe(plugins.changed(dest))
    .pipe(gulp.dest(dest))
})

// Default task
gulp.task('default', ['clean'], () => {
  gulp.start('build')
})

// Build production-ready code
gulp.task('build', [
  'copy',
  'imagemin',
  'jade',
  'sass',
  'browserify'
])

// Server tasks with watch
gulp.task('serve', [
    'imagemin',
    'copy',
    'jade',
    'browserify',
    'sass'
  ], () => {

    browserSync.init({
      open: open ? 'local' : false,
      startPath: config.baseUrl,
      server: {
        baseDir: taskTarget,
        routes: (() => {
          let routes = {}

          // Map base URL to routes
          routes[config.baseUrl] = taskTarget

          return routes
        })()
      }
    })

    if (!production) {

      // Styles
      gulp.watch([
        path.join(__dirname, dirs.source, dirs.styles, '**/*.{scss,sass}')
      ], ['sass'])

      // Jade Templates
      gulp.watch([
        path.join(__dirname, dirs.source, '**/*.jade'),
        path.join(__dirname, dirs.source, dirs.data, '**/*.json')
      ], ['jade'])

      // Copy
      gulp.watch([
        path.join(__dirname, dirs.source, '**/*'),
        '!' + path.join(__dirname, dirs.source, '{**/\_*,**/\_*/**}'),
        '!' + path.join(__dirname, dirs.source, '**/*.jade')
      ], ['copy'])

      // Scripts
      gulp.watch([
        path.join(__dirname, dirs.source, '**/*.js')
      ], ['browserify'])

      // Images
      gulp.watch([
        path.join(__dirname, dirs.source, dirs.images, '**/*.{jpg,jpeg,gif,svg,png}')
      ], ['imagemin'])

      // All other files
      gulp.watch([
        path.join(__dirname, dirs.temporary, '**/*')
      ]).on('change', browserSync.reload)
    }
  }
)

// Testing
gulp.task('test', (done) => {
  karma.start({
    configFile: path.join(__dirname, '/karma.conf.js'),
    singleRun: !watch,
    autoWatch: watch
  }, done)
})

gulp.task('deploy', ['build'], function (cb) {
  // return gulp.src(taskTarget)
  //   .pipe(plugins.subtree())
  //   .on('end', function () {
  //     gulp.start('clean')
  //   })

  var gutil = require('gulp-util')
  // FIXME: Code adapted from gulp-subtree, as for some reason it fails on my system :\
  ;(function subtree (folder, callback) {
    var exec = require('child_process').exec

    var remote = 'origin'
    var branch = 'gh-pages'
    var message = 'Distribution Commit'

    // execute('git add ' + folder, function () {
    exec('git add -A ' + folder + ' && git commit -m "' + message + '"', function (error) {
      if (error) {
        return callback(error)
      }
      // gutil.log('Temporarily committing ' + chalk.magenta(folder))
      gutil.log('Temporarily committing ' + gutil.colors.magenta(folder))
      exec('git ls-remote ' + remote + ' ' + branch, function (error, rmt) {
        if (error) {
          return callback(error)
        }
        if (rmt.length > 0) {
          gutil.log('Cleaning ' + gutil.colors.cyan(remote) + '/' + gutil.colors.cyan(branch))
          exec('git push ' + remote + ' :' + branch, function (error) {
            if (error) {
              return callback(error)
            }
            deployFinish()
          })
        } else {
          deployFinish()
        }
      })
    })

    // ////////////////////////////
    // Finish Deploy
    // ////////////////////////////
    var deployFinish = function () {
      gutil.log('Pushing ' + gutil.colors.magenta(folder) + ' to ' + gutil.colors.cyan(remote) + '/' + gutil.colors.cyan(branch))
      exec('git subtree push --prefix ' + folder + ' ' + remote + ' ' + branch, function (error) {
        if (error) {
          return callback(error)
        }
        gutil.log('Resetting ' + gutil.colors.magenta(folder) + ' temporary commit')
        // HACK: The only line changed from the original ("HEAD^" doesn't work on windows it seems)
        exec('git reset HEAD~', function (error) {
          return callback(error)
        })
      })
    }
  })(taskTarget, function (error) {
    if (error) {
      return cb(error)
    }
    // ////////////////////////////
    // Delete files
    // ////////////////////////////
    gutil.log('Deleting build files')
    gulp.start('clean')
    cb()
  })
})
