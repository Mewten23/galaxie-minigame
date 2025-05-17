const fs = require('fs');
const path = require('path');
const SAVE_PATH = path.join(__dirname, 'ships.json');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let players = {};  // Spielername → { ships: [...] }

try {
    const savedData = fs.readFileSync(SAVE_PATH, 'utf-8');
    players = JSON.parse(savedData);
    // Sicherstellen, dass alle "ships" Felder Objekte sind
    for (const player in players) {
        if (!players[player].ships || Array.isArray(players[player].ships)) {
            players[player].ships = {};  // leeres Objekt statt Array
        }
    }
    console.log('Schiffsdaten geladen.');
} catch (e) {
    console.log('Keine gespeicherten Schiffsdaten gefunden. Starte neu.');
}



app.use(express.static('public'));

io.on('connection', (socket) => {
    let currentPlayerName = null;

    console.log(`Client connected: ${socket.id}`);

    socket.on('registerPlayer', (playerName) => {
    currentPlayerName = playerName;
    if (!players[currentPlayerName]) {
        players[currentPlayerName] = { ships: {} };
        // 🟢 neu: sofort speichern
        fs.writeFileSync(SAVE_PATH, JSON.stringify(players, null, 2));
    } else if (Array.isArray(players[currentPlayerName].ships)) {
        players[currentPlayerName].ships = {};
    }
    io.emit('updateShips', getAllShips());
});

    const { v4: uuidv4 } = require('uuid'); // ganz oben hinzufügen

socket.on('addShip', ({ name, type }) => {
    if (!players[currentPlayerName]) {
        players[currentPlayerName] = { ships: {} }; // ⚠️ jetzt Objekt statt Array
    }

    const shipId = uuidv4(); // neue eindeutige ID

    players[currentPlayerName].ships[shipId] = {
    id: shipId,
    x: 100 + Math.random() * 200,
    y: 100 + Math.random() * 200,
    name: name || `Venator`,
    type: type || 'Venator',
    hyperjumpInProgress: false,
    target: null,
    rotationAngle: 0,
    desiredAngle: 0,
    isPreparingJump: false,
    _dirty: true
};


    io.emit('updateShips', getAllShips());
});

    socket.on('moveShip', ({ shipId, x, y, rotationAngle }) => {
    if (!currentPlayerName) return;

    const ship = players[currentPlayerName]?.ships?.[shipId];
    if (ship) {
        ship.x = x;
        ship.y = y;
        if (rotationAngle !== undefined) ship.rotationAngle = rotationAngle;

        // Diese beiden sind wichtig:
		console.log(`[MOVE] ${currentPlayerName} bewegt ${shipId} zu (${x}, ${y})`);
        ship._dirty = true;
        players[currentPlayerName]._dirty = true;
	
        io.emit('updateShips', getAllShips());
    }
});



    socket.on('evacuateShip', (shipId) => {
  const ships = players[currentPlayerName]?.ships;
  if (ships && ships[shipId]) {
    setTimeout(() => {
      delete ships[shipId];
      players[currentPlayerName]._dirty = true;
      io.emit('updateShips', getAllShips());
    }, 30000);
  }
});


    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        // Spieler bleibt im Speicher
    });
});

// Alle Schiffe aller Spieler zusammenfassen
function getAllShips() {
    const allShips = {};
    for (const playerId in players) {
        const ships = players[playerId].ships;
        for (const shipId in ships) {
            allShips[shipId] = {
                ...ships[shipId],
                owner: playerId // wichtig für Client
            };
        }
    }
    return allShips;
}


setInterval(() => {
    let needsSave = false;

    for (const player in players) {
        if (players[player]._dirty) {
            needsSave = true;
            players[player]._dirty = false;
        }

        for (const shipId in players[player].ships) {
            const ship = players[player].ships[shipId];
            if (ship._dirty) {
                needsSave = true;
                ship._dirty = false;
            }
        }
    }

    if (needsSave) {
        fs.writeFile(SAVE_PATH, JSON.stringify(players, null, 2), err => {
            if (err) console.error("Fehler beim Speichern:", err);
        });
    }
}, 1000);



const PORT = 3000;
http.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
