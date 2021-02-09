/*
Temperature and humidity station

Tutorial link: https://www.learn.voltaat.com/post/build-a-mini-weather-station

This is an Arduino sketch reads the temperature and humidity and calculates the heat index. It also displays the information on an LCD screen

Components Needed:
1. DHT sensor ....x1
2. LCD screen ....x1

Connections:
Arduino pin GND → Breadboard ground line
Arduino pin 5V  → Breadboard 5V line
LCD GND         → Breadboard ground line
LCD Vcc         → Breadboard 5V line
LCD SDA         → Arduino pin A4
LCD SCL         → Arduino pin A5
DHT GND         → Breadboard ground line
DHT Vcc         → Breadboard 5V line
DHT Signal      → Arduino pin 2

*/

#include <DHT.h>               // DHT sensor library
#include <LiquidCrystal_I2C.h> // LCD library

#define DHT_PIN   2     // DHT sensor data pin
#define DHT_TYPE  DHT11 // Can be one of: DHT11, DHT21, or DHT22

// Uncomment to use Fahrenheit
//#define FAHRENHEIT 1

// LCD instance
LiquidCrystal_I2C lcd(0x27, 16, 2);

// DHT instance
DHT dht(DHT_PIN, DHT_TYPE);

// Commands inside void setup run once
void setup() {
  
  Serial.begin(9600); // Start the serial monitor
  lcd.init();         // Initialize the LCD screen
  lcd.backlight();    // Turn on backlight on the LCD
  dht.begin();        // Start the DHT sensor
  
}

// Commands inside void loop run forever
void loop() {

  // Reading humidity
  float h = dht.readHumidity();

#ifdef FAHRENHEIT
  // Reading temperature
  float t  = dht.readTemperature(true);
  // Computing heat index
  float hi = dht.computeHeatIndex(t, h);
#else
  // Reading temperature
  float t  = dht.readTemperature();
  // Computing heat index
  float hi = dht.computeHeatIndex(t, h, false);
#endif

  // Printing to LCD

  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print(t);

  lcd.setCursor(8, 0);
  lcd.print("H:");
  lcd.print(h);

  lcd.setCursor(0, 1);
  lcd.print("I:");
  lcd.print(hi);

  // Printing to serial monitor

  Serial.print("Temperature: ");
  Serial.print(t);
#ifdef FAHRENHEIT
  Serial.print(" °C");
#else
  Serial.print(" °F");
#endif

  Serial.print(", Humidity: ");
  Serial.print(h);
  Serial.print(" %");

  Serial.print(", Heat index: ");
  Serial.print(hi);
#ifdef FAHRENHEIT
  Serial.print(" °C");
#else
  Serial.print(" °F");
#endif

  Serial.println();

  // Wait for one second
  delay(1000);

}
