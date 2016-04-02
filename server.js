var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, "0.0.0.0");
console.log('on ', port);
var messages = [];

var router = express.Router();
router.get('/', function (req, res) {
  res.json(messages);
});

router.post('/', function (req, res) {
  if (req.body && req.body.author && req.body.text) {
    messages.push(req.body);
  }
  res.json(req.body);
});

app.use(bodyParser.json());
app.use(function (req, res, next) {
  console.log('req');
  next();
});
app.use(router);

function emit(socket, name, data) {
  socket.emit('action', Object.assign({}, data, {
    type: name,
  }));
}

// Chatroom

// usernames which are currently connected to the chat
var usernames = {};
var numUsers = 0;

io.on('connection', function (socket) {
  console.log('connected!');
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('CREATE_MESSAGE', function (data) {
    console.log('creating message', data);
    var evt = data.message;
    console.log(evt);
    // we tell the client to execute 'new message'
    emit(socket.broadcast, 'RECEIVE_MESSAGE', evt);
    emit(socket, 'RECEIVE_MESSAGE', evt);
  });

  // when the client emits 'CREATE_USER', this listens and executes
  socket.on('CREATE_USER', function (event) {
    console.log('create', event);
    var user = event.user;
    console.log('adding user', user.username);
    // we store the username in the socket session for this client
    socket.user = user;
    // add the client's username to the global list
    usernames[user.username] = user;
    ++numUsers;
    addedUser = true;
    user.username = 'new username';
    emit(socket, 'LOGIN_USER', user);
    // echo globally (all clients) that a person has connected
    emit(socket.broadcast, 'user joined', {
      user: socket.user,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    emit(socket.broadcast, 'typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    emit(socket.broadcast, 'stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    // remove the username from global usernames list
    if (addedUser) {
      delete usernames[socket.user.username];
      --numUsers;

      // echo globally that this client has left
      emit(socket.broadcast, 'user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
/*
console.log(1);
var engine = require('engine.io');
var server = new engine.Server();

server.on('connection', function(socket){
  console.log('here');
  socket.send('hi');
});*/