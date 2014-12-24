// hook up your servo to pin 5
// open a serial connection, then type a command like:
// "100s" to rotate the servo to 100 degrees

#include <Servo.h>
Servo jaw;

void setup() {
  jaw.attach(5);
  jaw.write(90);
  Serial.begin(9600);
}

static int v = 0;

void loop() {
  if (Serial.available() > 0) {
    char ch = Serial.read();
    switch(ch) {
      case '0'...'9':
        v = v * 10 + ch - '0';
        break;
      case 's':
        jaw.write(v);
        v = 0;
        break;
    }
  }
}

