const socket = io("http://localhost:5000");
const inputContainer = document.querySelector(".input__container");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

socket.on("connect", () => {
  console.log("connection  serverd!");
});

window.addEventListener("resize", (e) => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

class Game {
  constructor(canvas, ctx) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.frames = 60;
    this.frame = 0;
    this.field = [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ];
    this.sides = {};
    this.isWGH = this.canvas.width > this.canvas.height ? true : false;
    this.width =
      this.canvas.width > this.canvas.height
        ? this.canvas.height
        : this.canvas.width;
    this.height = this.width;
    this.zeroWidth =
      this.canvas.width > this.canvas.height
        ? this.canvas.width * 0.05
        : this.canvas.height * 0.04;
    this.canvas.addEventListener("click", (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      const x = e.clientX;
      const y = e.clientY;
      ctx.stroke();
      socket.on(
        "updateBoard",
        (board) => ((this.field = board), console.log(this.field))
      );
      for (let i = 0; this.field.length > i; i++) {
        for (let j = 0; this.field[i].length > j; j++) {
          if (
            isWithinBoundaries(
              this.width * 0.2 * (j + 1),
              this.height * 0.2 * i,
              this.width * 0.2 * (j + 2),
              this.height * 0.2 * (i + 1),
              x,
              y
            ) &&
            this.field[i][j] === ""
          )
            socket.emit("makeAmove", { i, j });
        }
      }
    });
    socket.on("sendPlayerSide", (sides) => {
      this.sides = sides;
      console.log(sides);
    });
    socket.on("weGotWinner", (winner) => {
      console.log(winner);
      const gameoverPamplet = document.querySelector(".gameover__container");
      gameoverPamplet.classList.remove("display-none");
      if (winner.username === username)
        gameoverPamplet.querySelector(".gameover__title").textContent =
          "You Won!";
      else
        gameoverPamplet.querySelector(".gameover__title").textContent =
          "You Lost!";
    });
  }
  drawGameScreen() {
    this.ctx.fillStyle = "black";
    this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fill();
    this.frame++;
  }
  drawLines() {
    this.ctx.strokeStyle = "#eee";
    this.ctx.moveTo(this.width * 0.3, this.height * 0.2);
    this.ctx.lineTo(this.width * 0.7, this.height * 0.2);
    this.ctx.moveTo(this.width * 0.3, this.height * 0.4);
    this.ctx.lineTo(this.width * 0.7, this.height * 0.4);
    this.ctx.moveTo(this.width * 0.4, this.height * 0.1);
    this.ctx.lineTo(this.width * 0.4, this.height * 0.5);
    this.ctx.moveTo(this.width * 0.6, this.height * 0.1);
    this.ctx.lineTo(this.width * 0.6, this.height * 0.5);
    this.ctx.stroke();
  }
  #drawSides() {
    this.ctx.font = "20px Arial";
    this.ctx.fillStyle = "#eee";
    this.ctx.fillText(
      "X: " + (this.sides.x === username ? username : this.sides.x),
      this.canvas.width * 0.1,
      this.height - 100
    );

    this.ctx.fillText(
      "0: " + (this.sides.zero === username ? username : this.sides.zero),
      this.canvas.width - this.canvas.width * 0.3,
      this.height - 100
    );
  }
  #drawZero(x, y) {
    this.ctx.beginPath();
    this.ctx.arc(
      ((this.width * 0.5) / 3) * (x + 1) + (this.width * 0.5) / 3,
      ((this.height * 0.5) / 3) * (y + 1) - this.zeroWidth / 2,
      this.zeroWidth,
      0,
      2 * Math.PI
    );
    this.ctx.stroke();
  }
  #drawX(x, y) {
    this.ctx.beginPath();
    this.ctx.moveTo(
      ((this.width * 0.5) / 3) * (x + 1) +
        (this.width * 0.5) / 3 +
        this.zeroWidth,
      ((this.height * 0.5) / 3) * (y + 1) - this.zeroWidth
    );
    this.ctx.lineTo(
      ((this.width * 0.5) / 3) * (x + 1) +
        (this.width * 0.5) / 3 -
        this.zeroWidth,
      ((this.height * 0.5) / 3) * (y + 1) + this.zeroWidth
    );
    this.ctx.stroke();
    this.ctx.moveTo(
      ((this.width * 0.5) / 3) * (x + 1) +
        (this.width * 0.5) / 3 -
        this.zeroWidth,
      ((this.height * 0.5) / 3) * (y + 1) - this.zeroWidth
    );
    this.ctx.lineTo(
      ((this.width * 0.5) / 3) * (x + 1) +
        (this.width * 0.5) / 3 +
        this.zeroWidth,
      ((this.height * 0.5) / 3) * (y + 1) + this.zeroWidth
    );
    this.ctx.stroke();
  }
  drawFigures() {
    for (let i = 0; this.field.length > i; i++) {
      for (let j = 0; this.field[i].length > j; j++) {
        if (this.field[i][j] === "0") this.#drawZero(j, i);
        if (this.field[i][j] === "x") this.#drawX(j, i);
      }
    }
    if (this.sides?.x) this.#drawSides();
  }
}

let username = "";
let game = null;

inputContainer.querySelector("input").addEventListener("input", (e) => {
  username = e.target.value;
});

inputContainer.querySelector(".input__send").addEventListener("click", (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();
  e.stopPropagation();
  if (username.length > 4)
    (game = new Game(canvas, ctx)),
      gameEngine(),
      hideShowUsernameInput(),
      socket.emit("addUsername", username);
});

document
  .querySelector(".gameover__play-again")
  .addEventListener("click", (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    socket.emit("restartSession");
    const gameoverPamplet = document.querySelector(".gameover__container");
    gameoverPamplet.classList.add("display-none");
  });

function gameEngine() {
  game.drawGameScreen();
  game.drawLines();
  game.drawFigures();

  requestAnimationFrame(gameEngine);
}

function hideShowUsernameInput() {
  inputContainer.classList.contains("display-none")
    ? inputContainer.classList.remove("display-none")
    : inputContainer.classList.add("display-none");
}

function isWithinBoundaries(x1, y1, x2, y2, x, y) {
  if (x >= x1 && x <= x2) {
    if (y >= y1 && y <= y2) {
      console.log(x1, y1, x2, y2, x, y);
      return true;
    }
  }
}

// const game = new Game(canvas, ctx);
// gameEngine();
