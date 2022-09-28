const { series, dest, watch } = require('gulp');
const ts = require('gulp-typescript');
const browserify = require('browserify');

const source = require('vinyl-source-stream');

const streamify = require('gulp-streamify');
const uglify = require('gulp-uglify');

const tsProject = ts.createProject("tsconfig.json");

function compileTs(cb) {
  return tsProject.src()
    .pipe(tsProject())
    .pipe(dest('bundle'));
}

function browserifyTs(cb) {
  return browserify({
    entries: ['bundle/index.js']
  })
  .bundle()
  .pipe(source('index.js'))
  .pipe(streamify(uglify()))
  .pipe(dest('../static'));
}

exports.build = series(
  compileTs,
  browserifyTs
);

exports.watch = function() {
  watch("src/**/*.ts", exports.build);
}