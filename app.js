var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var busboy = require('connect-busboy');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var dashboardRouter = require('./routes/dashboard');
var cbatRouter = require('./routes/cbat');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(busboy());

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/dashboard', dashboardRouter);
app.use('/cbat', cbatRouter);

module.exports = app;
