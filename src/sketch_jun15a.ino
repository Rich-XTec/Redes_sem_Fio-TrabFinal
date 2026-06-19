#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>

#define RST_PIN_1      4    // RST do RFID externo (fora)
#define SS_PIN_1       5    // SDA do RFID externo (fora)
#define RST_PIN_2      2    // RST do RFID interno (dentro)
#define SS_PIN_2       15   // SDA do RFID interno (dentro)
#define SERVO_PIN      13
#define LDR_PIN        34

#define SERVO_ABERTO       90
#define SERVO_FECHADO       0
#define TEMPO_PORTA_ABERTA 5000
#define LDR_LIMIAR        2000

String TAG_GATO = "F306622D";

MFRC522 rfidExterno(SS_PIN_1, RST_PIN_1);
MFRC522 rfidInterno(SS_PIN_2, RST_PIN_2);
Servo travaServo;

bool portaAberta = false;
unsigned long ultimaAbertura = 0;

void abrirPorta(String direcao);

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== PORTA GATO - 2x RFID + SERVO + LDR ===");

  pinMode(LDR_PIN, INPUT);

  // Desativa os dois SS antes de iniciar
  pinMode(SS_PIN_1, OUTPUT);
  pinMode(SS_PIN_2, OUTPUT);
  digitalWrite(SS_PIN_1, HIGH);
  digitalWrite(SS_PIN_2, HIGH);

  travaServo.attach(SERVO_PIN);
  travaServo.write(SERVO_FECHADO);
  Serial.println("[SERVO] Porta fechada.");

  SPI.begin();

  rfidExterno.PCD_Init();
  delay(50);
  Serial.println("[RFID-EXT] Leitor externo inicializado.");

  rfidInterno.PCD_Init();
  delay(50);
  Serial.println("[RFID-INT] Leitor interno inicializado.");

  Serial.println("Comandos: OPEN | STATUS");
  Serial.println("Aproxime a tag no leitor externo (fora) ou interno (dentro).");
}

void loop() {
  // --- Comandos Serial ---
  if (Serial.available() > 0) {
    String comando = Serial.readStringUntil('\n');
    comando.trim();

    if (comando == "OPEN" || comando == "open") {
      Serial.println("[MANUAL] Abrindo porta...");
      abrirPorta("manual");
    } else if (comando == "STATUS" || comando == "status") {
      int ldr = analogRead(LDR_PIN);
      Serial.println("\n=== STATUS ===");
      Serial.println("LDR: " + String(ldr) + "/4095 -> " + (ldr < LDR_LIMIAR ? "ESCURO" : "CLARO"));
      Serial.println("Porta: " + String(portaAberta ? "ABERTA" : "fechada"));
      Serial.println("==============\n");
    }
  }

  // --- RFID Externo: gato do lado de fora querendo entrar ---
  digitalWrite(SS_PIN_2, HIGH); // desativa interno
  if (rfidExterno.PICC_IsNewCardPresent() && rfidExterno.PICC_ReadCardSerial()) {
    String uid = "";
    for (byte i = 0; i < rfidExterno.uid.size; i++) {
      if (rfidExterno.uid.uidByte[i] < 0x10) uid += "0";
      uid += String(rfidExterno.uid.uidByte[i], HEX);
    }
    uid.toUpperCase();
    Serial.println("[RFID-EXT] TAG: " + uid);

    if (uid == TAG_GATO) {
      Serial.println("[RFID-EXT] Tag reconhecida! Gato entrando.");
      int ldr = analogRead(LDR_PIN);
      Serial.println("[LDR] " + String(ldr) + "/4095 -> " + (ldr < LDR_LIMIAR ? "ESCURO" : "CLARO"));
      abrirPorta("entrando");
    } else {
      Serial.println("[RFID-EXT] Tag desconhecida.");
    }

    rfidExterno.PICC_HaltA();
    rfidExterno.PCD_StopCrypto1();
    delay(2000);
  }

  // --- RFID Interno: gato do lado de dentro querendo sair ---
  digitalWrite(SS_PIN_1, HIGH); // desativa externo
  if (rfidInterno.PICC_IsNewCardPresent() && rfidInterno.PICC_ReadCardSerial()) {
    String uid = "";
    for (byte i = 0; i < rfidInterno.uid.size; i++) {
      if (rfidInterno.uid.uidByte[i] < 0x10) uid += "0";
      uid += String(rfidInterno.uid.uidByte[i], HEX);
    }
    uid.toUpperCase();
    Serial.println("[RFID-INT] TAG: " + uid);

    if (uid == TAG_GATO) {
      Serial.println("[RFID-INT] Tag reconhecida! Gato saindo.");
      int ldr = analogRead(LDR_PIN);
      Serial.println("[LDR] " + String(ldr) + "/4095 -> " + (ldr < LDR_LIMIAR ? "ESCURO" : "CLARO"));
      abrirPorta("saindo");
    } else {
      Serial.println("[RFID-INT] Tag desconhecida.");
    }

    rfidInterno.PICC_HaltA();
    rfidInterno.PCD_StopCrypto1();
    delay(2000);
  }

  // Reativa os dois SS para leitura
  digitalWrite(SS_PIN_1, LOW);
  digitalWrite(SS_PIN_2, LOW);
}

void abrirPorta(String direcao) {
  if (portaAberta) return;
  if (millis() - ultimaAbertura < 5000) return;

  portaAberta = true;
  ultimaAbertura = millis();
  Serial.println("[PORTA] Abrindo - " + direcao + "...");
  travaServo.write(SERVO_ABERTO);
  delay(TEMPO_PORTA_ABERTA);
  travaServo.write(SERVO_FECHADO);
  Serial.println("[PORTA] Fechada.");
  portaAberta = false;
}