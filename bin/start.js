#!/usr/bin/env node  
var path = require('path');
var binPath = path.dirname(path.dirname(process.argv.pop()));
process.chdir(binPath);
require('../gulpfile.js').run();
