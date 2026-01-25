#include "DHT.h"

#define DHTPIN 2     // Пинът към който е вързан сензора
#define DHTTYPE DHT11   // Или DHT22, ако ползвате белия сензор
#define ALARM_PIN 8  // Пин за зумера и диода

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
  pinMode(ALARM_PIN, OUTPUT);
}

void loop() {
  // Изчакваме малко между измерванията
  delay(2000);

  // Четем влажност и температура
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  // Проверка за грешки при четенето
  if (isnan(h) || isnan(t)) {
    // Пращаме грешка в JSON формат
    Serial.println("{\"error\": true}");
    return;
  }

  // Логика за Хардуерна Аларма (ако е над 28 градуса)
  bool alarmActive = false;
  if (t > 28.0) {
    digitalWrite(ALARM_PIN, HIGH); // Свири!
    alarmActive = true;
  } else {
    digitalWrite(ALARM_PIN, LOW); // Мълчи
    alarmActive = false;
  }

  // Пращаме JSON към React
  // Пример: {"temp": 24.5, "hum": 60, "alarm": false}
  Serial.print("{\"temp\":");
  Serial.print(t);
  Serial.print(", \"hum\":");
  Serial.print(h);
  Serial.print(", \"alarm\":");
  Serial.print(alarmActive ? "true" : "false");
  Serial.println("}");
}