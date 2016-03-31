'use strict';

const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const w = 'o';
const b = 'x';
const x = ' ';

const INITIAL_GAME_STATE = {
  a: [ w, x, w, x, x, x, b, x ],
  b: [ x, w, x, x, x, b, x, b ],
  c: [ w, x, w, x, x, x, b, x ],
  d: [ x, w, x, x, x, b, x, b ],
  e: [ w, x, w, x, x, x, b, x ],
  f: [ x, w, x, x, x, b, x, b ],
  g: [ w, x, w, x, x, x, b, x ],
  h: [ x, w, x, x, x, b, x, b ],
};


class Game {
  constructor(id, white, black) {
    this.id = id;
    this.white = white;
    this.black = black;

    this.currentPlayer = white;
    this.state = INITIAL_GAME_STATE;
  }

  stateToString() {
    return Object.keys(this.state).map(key => key + ' : ' + this.state[key].join(' | ')).join('\n');
  }

  move(from, to) {
    console.log('state before move:');
    console.log(this.stateToString());

    this.state[from.letter][from.number - 1] = x;
    this.state[to.letter][to.number - 1] = this.currentPlayer === this.white ? w : b;
    this.currentPlayer = this.currentPlayer === this.white ? this.black : this.white;

    console.log('moved, state:');
    console.log(this.stateToString());
    console.log('current player: ', this.currentPlayer.name);
  }
}

class Player {
  constructor(name) {
    this.name = name;
  }
}

const players = {
  martin: new Player('Martin'),
  liam: new Player('Liam'),
  kim: new Player('Kim'),
};

const games = [
  new Game('FIRST', players.kim, players.martin),
  new Game('SECOND', players.liam, players.martin),
];

app.get('/', (req, res) => res.send('hi'));
app.get('/games', (req, res) => res.send(games));
app.get('/games/:id', (req, res) => res.send(games.find(game => game.id === req.params.id)));
app.get('/players', (req, res) => res.send(Object.keys(players).map(key => players[key])));

const urlParamsFromSocket = socket => {
  const urlPath = socket.upgradeReq.url.substr(2);
  const paramsArray = urlPath.split(/[/?=&]/);
  const params = {};

  for (let i = 0; i < paramsArray.length; i += 2) {
    const key = paramsArray[i];
    const value = paramsArray[i + 1];
    params[key] = value;
  }

  return params;
}

const sockets = [];
const ws = require('ws');
let server;
const connect = httpServer => {
  server = new ws.Server({server: httpServer});

  server.on('connection', function(socket) {
    const params = urlParamsFromSocket(socket);

    const playerId = params.player;
    const gameId = params.game;

    if (!playerId || !gameId) {
      socket.send('Please provide "player" and "game" as url parameters.');
      socket.close();
    }

    const game = games.find(game => game.id === gameId);
    
    if (!game) {
      socket.send('No game with id ' + gameId + ' was found');
      socket.close();
    }

    const player = players[playerId];

    if (player !== game.white && player !== game.black) {
      socket.send(`You (${playerId}) are not a part of this game (white: ${game.white.name}, black: ${game.black.name}).`);
      socket.close();
    }

    socket.on('message', message => {
      if (game.currentPlayer !== player) {
        socket.send("It's not your turn!");
        return;
      }

      game.move(
          {letter: 'a', number: 3},
          {letter: 'b', number: 4}
      );

      socket.send('hi');
    });

    socket.on('close', () => {
      sockets.splice(sockets.findIndex(s => s === socket), 1);
    });
  });
};

const port = 3478;
const httpServer = app.listen(port, () => console.log('listening on port', port));
connect(httpServer);
