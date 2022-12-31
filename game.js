const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");

let playerX = canvas.width / 2;
let playerY = canvas.height - 50;
let enemyX = Math.floor(Math.random() * canvas.width);
let enemyY = Math.floor(Math.random() * canvas.height / 2);
let bulletX = playerX;
let bulletY = playerY;
let bulletState = "ready";

const playerSpeed = 5;
const enemySpeed = 3;

const playerImage = new Image();
playerImage.src = "player.png";

const enemyImage = new Image();
enemyImage.src = "enemi.png";

const bulletImage = new Image();
bulletImage.src = "bullet.png";

function draw() {
  // Clear the canvas
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw the player and enemy on the canvas
  context.drawImage(playerImage, playerX, playerY);
  context.drawImage(enemyImage, enemyX, enemyY);
  
  // Check if the bullet is "fired"
  if (bulletState === "fired") {
    // Draw the bullet on the canvas
    context.drawImage(bulletImage, bulletX, bulletY);
    bulletY -= 5;
  }
  
  // Check if the bullet has reached the top of the canvas
  if (bulletY <= 0) {
    bulletState = "ready";
  }
  
  requestAnimationFrame(draw);
}

document.addEventListener("keydown", (event) => {
  // Move the player left or right
  if (event.key === "ArrowLeft") {
    playerX -= playerSpeed;
  } else if (event.key === "ArrowRight") {
    playerX += playerSpeed;
  }
  // Fire the bullet
  if (event.key === " ") {
    if (bulletState === "ready") {
      bulletX = playerX + 16;
      bulletY = playerY;
      bulletState = "fired";
    }
  }
});

draw();
