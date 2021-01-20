'use strict';

let plugins = require('gulp-load-plugins');
let gulp = require('gulp');
let yaml = require('js-yaml');
let autoprefixer = require('autoprefixer');
let yargs = require('yargs');
let named = require('vinyl-named');
let fs = require('fs');
let webpack2 = require('webpack');
let webpackStream = require('webpack-stream');
let browser = require('browser-sync');

// Load all Gulp plugins into one variable
const $ = plugins();

// Check for --production flag
const PRODUCTION = !!(yargs.argv.production);

//Load Configs file
const { PATHS } = loadConfig()

// load configuration file
function loadConfig() {
    let ymlFile = fs.readFileSync('config.yml', 'utf8');
    return yaml.load(ymlFile);
}

// Copy files out of the assets folder
// This task skips over the "img", "js", and "scss" folders, which are parsed separately
function copy_assets() {
    return gulp.src(PATHS.assets)
        .pipe(gulp.dest(PATHS.dist + '/public'))
}

//Copy Express JS web files
function copy_static(){
    return gulp.src(PATHS.static)
        .pipe(gulp.dest(PATHS.dist))
}


// Compile Sass into CSS
// In production, the CSS is compressed
function sass() {

    const postCssPlugins = [
        // Autoprefixer
        autoprefixer(),
    ].filter(Boolean);

    return gulp.src('src/public/scss/app.scss')
        .pipe($.sourcemaps.init())
        .pipe($.sass({
            includePaths: PATHS.sass
        })
            .on('error', $.sass.logError))
        .pipe($.postcss(postCssPlugins))
        .pipe($.if(PRODUCTION, $.cleanCss({ compatibility: 'ie9' })))
        .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
        .pipe(gulp.dest(PATHS.dist + '/public/css'))
        .pipe(browser.reload({ stream: true }));
}

// Webpack config
let webpackConfig = {
    mode: (PRODUCTION ? 'production' : 'development'),
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [ "@babel/preset-env" ],
                        compact: false
                    }
                }
            }
        ]
    },
    devtool: !PRODUCTION && 'source-map'
}

// Combine JavaScript into one file
// In production, the file is minified
function javascript() {
    return gulp.src(PATHS.entries)
        .pipe(named())
        .pipe($.sourcemaps.init())
        .pipe(webpackStream(webpackConfig, webpack2))
        .pipe($.if(PRODUCTION, $.terser()
            .on('error', e => { console.log(e); })
        ))
        .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
        .pipe(gulp.dest(PATHS.dist + '/public/js'));
}


// commands
exports.build = gulp.parallel(javascript, sass, copy_assets, copy_static);