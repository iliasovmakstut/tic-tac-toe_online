import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { v4 as uuidv4, v6 as uuidv6 } from "uuid";
import cors from "cors";

const port = process.env.PORT || 10000;
const app = express();
app.use(cors());
const server = createServer(app);

const io = new Server(server, {
  cors: {},
});

const usersIds = {};
const rooms = {};
const board = [
  ["", "", ""],
  ["", "", ""],
  ["", "", ""],
];

io.on("connection", (socket) => {
  usersIds[socket.id] = {
    id: socket.id,
  };

  socket.on("addUsername", (username) => {
    assignToRoom(socket);
    console.log(rooms);
    usersIds[socket.id].username = username;
    if (
      !rooms[usersIds[socket.id].roomId]?.player0 ||
      !rooms[usersIds[socket.id].roomId]?.playerX
    )
      return;
    io.to(usersIds[socket.id].roomId).emit("sendPlayerSide", {
      x: usersIds[rooms[usersIds[socket.id].roomId].playerX.id].username,
      zero: usersIds[rooms[usersIds[socket.id].roomId].player0.id].username,
    });
  });

  socket.on("makeAmove", (moveData) => {
    // console.log(rooms[usersIds[socket.id].roomId]);
    if (!rooms[usersIds[socket.id].roomId]) return;
    if (socket.id != rooms[usersIds[socket.id].roomId].currentMove) return;
    if (rooms[usersIds[socket.id].roomId].board[moveData.i][moveData.j] === "")
      rooms[usersIds[socket.id].roomId].board[moveData.i][moveData.j] =
        rooms[usersIds[socket.id].roomId].playerX.id == socket.id ? "x" : "0";
    if (winDetection(rooms[usersIds[socket.id].roomId].board)) {
      io.to(usersIds[socket.id].roomId).emit(
        "weGotWinner",
        winDetection(rooms[usersIds[socket.id].roomId].board) === "x"
          ? usersIds[rooms[usersIds[socket.id].roomId].playerX.id]
          : usersIds[rooms[usersIds[socket.id].roomId].player0.id]
      );
    }

    rooms[usersIds[socket.id].roomId].currentMove =
      rooms[usersIds[socket.id].roomId].currentMove ===
      rooms[usersIds[socket.id].roomId].playerX.id
        ? rooms[usersIds[socket.id].roomId].player0.id
        : rooms[usersIds[socket.id].roomId].playerX.id;
    io.to(usersIds[socket.id].roomId).emit(
      "updateBoard",
      rooms[usersIds[socket.id].roomId].board
    );
  });

  socket.on("disconnect", () => {
    const roomId = usersIds[socket.id]?.roomId;
    delete usersIds[socket.id];
    if (roomId && rooms[roomId]) {
      if (rooms[roomId].player0 && rooms[roomId].player0.id === socket.id) {
        delete rooms[roomId].player0;
      }
      if (rooms[roomId].playerX && rooms[roomId].playerX.id === socket.id) {
        delete rooms[roomId].playerX;
      }
      rooms[roomId].board = [
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
      ];
      console.log("User disconnected!", socket.id);
    }
  });

  socket.on("restartSession", () => {
    delete rooms[usersIds[socket.id].roomId];
    assignToRoom(socket);
    io.to(usersIds[socket.id].roomId).emit(
      "updateBoard",
      rooms[usersIds[socket.id].roomId].board
    );
  });
});

function winDetection(board) {
  //searching for x/0 in rows and columns
  for (let i = 0; board.length > i; i++) {
    let row0 = 0,
      rowX = 0;
    let col0 = 0,
      colX = 0;
    for (let j = 0; board[i].length > j; j++) {
      if (board[i][j] === "x") rowX++;
      if (board[i][j] === "0") row0++;
      if (board[j][i] === "x") colX++;
      if (board[j][i] === "0") col0++;
    }
    if (rowX === board.length || colX === board.length) return "x";
    if (row0 === board.length || col0 === board.length) return "0";
  }
  //searching for x/0 in rows and columns
  let diagX = 0,
    diag0 = 0;
  let antiX = 0,
    anti0 = 0;

  for (let i = 0; board.length > i; i++) {
    if (board[i][i] === "x") diagX++;
    if (board[i][i] === "0") diag0++;

    if (board[i][board.length - 1 - i] === "x") antiX++;
    if (board[i][board.length - 1 - i] === "0") anti0++;
  }

  if (antiX === 3 || diagX === 3) return "x";
  if (anti0 === 3 || diag0 === 3) return "0";

  return false;
}

function assignToRoom(socket) {
  if (rooms[Object.keys(rooms)[Object.keys(rooms).length - 1]]) {
    if (
      rooms[Object.keys(rooms)[Object.keys(rooms).length - 1]]?.playerX &&
      !rooms[Object.keys(rooms)[Object.keys(rooms).length - 1]]?.player0
    ) {
      rooms[Object.keys(rooms)[Object.keys(rooms).length - 1]].player0 =
        usersIds[socket.id];
      usersIds[socket.id].roomId =
        Object.keys(rooms)[Object.keys(rooms).length - 1];
    }
    if (
      !rooms[Object.keys(rooms)[Object.keys(rooms).length - 1]]?.playerX &&
      rooms[Object.keys(rooms)[Object.keys(rooms).length - 1]]?.player0
    ) {
      rooms[Object.keys(rooms)[Object.keys(rooms).length - 1]].playerX =
        usersIds[socket.id];
      usersIds[socket.id].roomId =
        Object.keys(rooms)[Object.keys(rooms).length - 1];
    }
    if (
      !rooms[Object.keys(rooms)[Object.keys(rooms).length - 1]]?.playerX &&
      !rooms[Object.keys(rooms)[Object.keys(rooms).length - 1]]?.player0
    ) {
      Math.random() > 0.5
        ? ((rooms[Object.keys(rooms)[Object.keys(rooms).length - 1]].playerX =
            usersIds[socket.id]),
          (usersIds[socket.id].roomId =
            Object.keys(rooms)[Object.keys(rooms).length - 1]))
        : (rooms[Object.keys(rooms)[Object.keys(rooms).length - 1]].player0 =
            usersIds[socket.id]);
      usersIds[socket.id].roomId =
        Object.keys(rooms)[Object.keys(rooms).length - 1];
      rooms[Object.keys(rooms)[Object.keys(rooms).length - 1]].board = [
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
      ];
    }
  }
  if (!usersIds[socket.id]?.roomId) {
    const uuid = uuidv4();
    rooms[uuid] = {
      playerX: usersIds[socket.id],
      board: [
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
      ],
    };
    usersIds[socket.id].roomId = uuid;
  }

  socket.join(usersIds[socket.id].roomId);
  if (
    rooms[usersIds[socket.id].roomId]?.playerX &&
    rooms[usersIds[socket.id].roomId]?.player0
  )
    rooms[usersIds[socket.id].roomId].currentMove =
      Math.random > 0.5
        ? rooms[usersIds[socket.id].roomId].playerX.id
        : rooms[usersIds[socket.id].roomId].player0.id;
}

app.get("/", (req, res) => {
  res.send("Server is alive!");
});

server.listen(port, () => {
  console.log("server is running on port: " + port);
});
