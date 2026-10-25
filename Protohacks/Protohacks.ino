#include <Arduino_LED_Matrix.h>

Arduino_LED_Matrix matrix;

const int X_PIN = A0;
const int Y_PIN = A1;
const int BUZZER_PIN = 2;

const int COLUMNS = 13;
const int ROWS = 8;

// Every row must contain exactly 13 characters.
const char maze[ROWS][COLUMNS + 1] = {
  "#############",
  "#S..........#",
  "###.#########",
  "#...........#",
  "#.###########",
  "#...........#",
  "###########G#",
  "#############"
};

uint8_t frame[ROWS * COLUMNS] = {};

int x = 1;
int y = 1;

bool ledOn = true;
bool gameStarted = false;
bool gameOver = false;
bool gameWon = false;

unsigned long lastBlink = 0;
unsigned long lastMove = 0;

// Timer variables
unsigned long startTime = 0;
int lastSecondBeep = 0;


// --------------------------------------------------
// DRAW MAZE
// --------------------------------------------------

void drawMazeAndDot() {

  for (int row = 0; row < ROWS; row++) {
    for (int col = 0; col < COLUMNS; col++) {

      char cell = maze[row][col];

      frame[row * COLUMNS + col] =
        (cell == '#' || cell == 'G') ? 1 : 0;
    }
  }

  // Draw player's blinking dot
  if (ledOn && !gameOver) {
    frame[y * COLUMNS + x] = 1;
  }

  matrix.draw(frame);
}


// --------------------------------------------------
// ONE SECOND BEEP
// --------------------------------------------------

void playSecondBeep() {

  tone(BUZZER_PIN, 1000, 100);
}


// --------------------------------------------------
// FAILURE TUNE
// --------------------------------------------------

void playTimeoutTune() {

  tone(BUZZER_PIN, 400, 300);
  delay(350);

  tone(BUZZER_PIN, 300, 300);
  delay(350);

  tone(BUZZER_PIN, 200, 600);
  delay(650);

  noTone(BUZZER_PIN);
}


// --------------------------------------------------
// VICTORY SOUND
// --------------------------------------------------

void playVictoryTune() {

  tone(BUZZER_PIN, 1000, 150);
  delay(200);

  tone(BUZZER_PIN, 1500, 150);
  delay(200);

  tone(BUZZER_PIN, 2000, 300);
  delay(350);

  noTone(BUZZER_PIN);
}


// --------------------------------------------------
// SETUP
// --------------------------------------------------

void setup() {

  analogReadResolution(12);

  matrix.begin();

  pinMode(BUZZER_PIN, OUTPUT);

  // Timer DOES NOT start here.
  // The player has not moved yet.

  drawMazeAndDot();
}


// --------------------------------------------------
// MAIN LOOP
// --------------------------------------------------

void loop() {

  // Stop everything if the game is over.
  if (gameOver || gameWon) {
    return;
  }

  unsigned long now = millis();


  // --------------------------------------------------
  // BLINKING PLAYER
  // --------------------------------------------------

  if (now - lastBlink >= 300) {

    lastBlink = now;

    ledOn = !ledOn;

    drawMazeAndDot();
  }


  // --------------------------------------------------
  // TIMER
  // Only runs after the player has started moving.
  // --------------------------------------------------

  if (gameStarted) {

    unsigned long elapsed = now - startTime;

    // Beep once every second
    if (elapsed >= 1000 && elapsed < 10000) {

      int currentSecond = elapsed / 1000;

      if (currentSecond > lastSecondBeep) {

        lastSecondBeep = currentSecond;

        playSecondBeep();
      }
    }


    // --------------------------------------------------
    // TIMEOUT AFTER 10 SECONDS
    // --------------------------------------------------

    if (elapsed >= 10000) {

      gameOver = true;

      // Turn off entire LED matrix
      for (int i = 0; i < ROWS * COLUMNS; i++) {
        frame[i] = 0;
      }

      matrix.draw(frame);

      // Play failure tune
      playTimeoutTune();

      return;
    }
  }


  // --------------------------------------------------
  // JOYSTICK MOVEMENT
  // --------------------------------------------------

  if (now - lastMove >= 180) {

    lastMove = now;

    int nextX = x;
    int nextY = y;

    int xValue = analogRead(X_PIN);
    int yValue = analogRead(Y_PIN);


    if (xValue < 1400) {
      nextX--;
    }
    else if (xValue > 2700) {
      nextX++;
    }
    else if (yValue < 1400) {
      nextY--;
    }
    else if (yValue > 2700) {
      nextY++;
    }


    // --------------------------------------------------
    // VALID MOVEMENT
    // --------------------------------------------------

    if (nextX >= 0 && nextX < COLUMNS &&
        nextY >= 0 && nextY < ROWS &&
        maze[nextY][nextX] != '#') {

      // Move the player
      x = nextX;
      y = nextY;

      // --------------------------------------------------
      // START TIMER ON FIRST VALID MOVE
      // --------------------------------------------------

      if (!gameStarted) {

        gameStarted = true;

        startTime = millis();

        lastSecondBeep = 0;
      }


      drawMazeAndDot();


      // --------------------------------------------------
      // CHECK FOR GOAL
      // --------------------------------------------------

      if (maze[y][x] == 'G') {

        gameWon = true;

        // Stop buzzer
        noTone(BUZZER_PIN);

        // Play victory sound
        playVictoryTune();

        return;
      }
    }
  }
}