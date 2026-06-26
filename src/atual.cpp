#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include "firebase_door.h"

/*
  Codigo para o funcionamento do circuito
  Não engloba a conexão wifi com o firebase.

  Os modulos de conexão, Leitura e Escrita no firebase estão funcionando.

  Versão do codigo com 2 leitores RFID.

  Quando for fazer upload no esp, apertar o botão BOOT quando aparecer Connecting... no terminal
*/

#define RST_PIN_1 4 // RST do RFID externo (fora)
#define SS_PIN_1 5  // SDA do RFID externo (fora)
#define RST_PIN_2 27 // RST do RFID interno (dentro)
#define SS_PIN_2 15 // SDA do RFID interno (dentro)
#define SERVO_PIN 13
#define LDR_PIN 34

// NOVOS PINOS DOS LEDS
#define LED_VERMELHO 32 // Indicador de saída
#define LED_VERDE 33    // Indicador de entrada

#define SERVO_ABERTO 90
#define SERVO_FECHADO 0
#define TEMPO_PORTA_ABERTA 5000
#define LDR_LIMIAR 2000

#define WIFI_SSID "Jacare"
#define WIFI_PASSWORD "semsal2023"

// #define WIFI_SSID "Labdigitais"
// #define WIFI_PASSWORD "labbom123"

String TAG_GATO = "F306622D";

MFRC522 rfidExterno(SS_PIN_1, RST_PIN_1);
MFRC522 rfidInterno(SS_PIN_2, RST_PIN_2);
Servo travaServo;

bool portaAberta = false;

void conectarWIFI()
{
  // Conecta ao Wi-Fi
  Serial.print("Conectando ao WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED)
  {
    Serial.print(".");
    delay(500);
  }
  Serial.print("\nConectado! IP: ");
  Serial.println(WiFi.localIP().toString());
}

void setup()
{
  Serial.begin(115200);
  Serial.println("\n=== PORTA GATO - 2x RFID + SERVO + LDR ===");
  Serial.println("\n=== INICIANDO SISTEMA DA PORTA ===");

  pinMode(LDR_PIN, INPUT);

  // Configuração dos LEDs
  pinMode(LED_VERMELHO, OUTPUT);
  pinMode(LED_VERDE, OUTPUT);
  digitalWrite(LED_VERMELHO, LOW); // Garante que iniciam apagados
  digitalWrite(LED_VERDE, LOW);

  // Desativa os dois SS antes de iniciar
  pinMode(SS_PIN_1, OUTPUT);
  pinMode(SS_PIN_2, OUTPUT);

  // Configura o Servo e garante que a porta inicie trancada
  travaServo.attach(SERVO_PIN);
  travaServo.write(SERVO_FECHADO);
  Serial.println("[SERVO] Porta fechada.");

  // Inicia barramento SPI e os dois leitores RFID
  SPI.begin(18, 19, 23, -1);

  digitalWrite(SS_PIN_1, LOW);
  rfidExterno.PCD_Init();
  delay(50);
  Serial.println("[RFID-EXT] Leitor externo inicializado.");
  digitalWrite(SS_PIN_1, HIGH);

  digitalWrite(SS_PIN_2, LOW);
  rfidInterno.PCD_Init();
  delay(50);
  Serial.println("[RFID-INT] Leitor interno inicializado.");
  digitalWrite(SS_PIN_2, HIGH);

  conectarWIFI();

  // Inicia o módulo isolado do Firebase e Relógio
  inicializarFirebase();

  Serial.println("Sistema pronto. Aguardando leitura da tag...");
}

// =========================================================================
// FUNÇÃO PARA ABRIR A PORTA
// =========================================================================
void acionarPorta(String direcao)
{
  int nivelLuz = analogRead(LDR_PIN);

  Serial.print("[PORTA] Abrindo para o gato: ");
  Serial.println(direcao);

  portaAberta = true;
  travaServo.write(SERVO_ABERTO); // Abre a trava

  // Acende o LED correspondente à direção
  if (direcao == "entrando")
  {
    digitalWrite(LED_VERDE, HIGH);
  }
  else if (direcao == "saindo")
  {
    digitalWrite(LED_VERMELHO, HIGH);
  }

  // Registra no banco de dados enquanto a porta está aberta
  enviarDadosFirebase(TAG_GATO, direcao, nivelLuz);

  delay(TEMPO_PORTA_ABERTA); // Aguarda o gato passar

  travaServo.write(SERVO_FECHADO); // Tranca a porta novamente
  portaAberta = false;

  // Apaga os LEDs após a porta fechar
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_VERMELHO, LOW);

  Serial.println("[PORTA] Porta fechada e travada.");
}

// =========================================================================
// LOOP PRINCIPAL
// =========================================================================
void loop()
{
  // ---------------------------------------------------------
  // 1. LEITURA DO LADO EXTERNO (Gato querendo entrar)
  // ---------------------------------------------------------

  if (rfidExterno.PICC_IsNewCardPresent() && rfidExterno.PICC_ReadCardSerial())
  {
    String uid = "";
    for (byte i = 0; i < rfidExterno.uid.size; i++)
    {
      uid += String(rfidExterno.uid.uidByte[i] < 0x10 ? "0" : "");
      uid += String(rfidExterno.uid.uidByte[i], HEX);
    }
    uid.toUpperCase();

    Serial.print("\n[LEITURA] Tag detectada fora: ");
    Serial.println(uid);

    // VALIDAÇÃO ESTRITA: Só entra no IF se for exatamente a TAG registrada
    if (uid == TAG_GATO)
    {
      Serial.println("[AUTORIZADO] Tag reconhecida no leitor EXTERNO.");
      
      // -> Verifica Política 1: A porta está travada no app?
      if (isPortaTravada())
      {
        Serial.println("[BLOQUEADO] O modo 'LOCKED' esta ativado no Firebase. Acesso negado.");
        // Pisca o LED vermelho indicando porta bloqueada
        for (int i = 0; i < 3; i++) {
          digitalWrite(LED_VERMELHO, HIGH); delay(200); digitalWrite(LED_VERMELHO, LOW); delay(200);
        }
      }
      else
      {
        acionarPorta("entrando");
      }
    }
    else
    {
      Serial.print("[NEGADO] Tag desconhecida tentou entrar: ");
      Serial.println(uid);
    }

    rfidExterno.PICC_HaltA();
    rfidExterno.PCD_StopCrypto1();
    delay(1000); // Pausa para evitar múltiplas leituras seguidas
  }

  // ---------------------------------------------------------
  // 2. LEITURA DO LADO INTERNO (Gato querendo sair)
  // ---------------------------------------------------------

  if (rfidInterno.PICC_IsNewCardPresent() && rfidInterno.PICC_ReadCardSerial())
  {
    String uid = "";
    for (byte i = 0; i < rfidInterno.uid.size; i++)
    {
      uid += String(rfidInterno.uid.uidByte[i] < 0x10 ? "0" : "");
      uid += String(rfidInterno.uid.uidByte[i], HEX);
    }
    uid.toUpperCase();

    Serial.print("\n[LEITURA] Tag detectada dentro: ");
    Serial.println(uid);

    // VALIDAÇÃO ESTRITA: Só entra no IF se for exatamente a TAG registrada
    if (uid == TAG_GATO)
    {
      Serial.println("[AUTORIZADO] Tag reconhecida no leitor INTERNO.");

      // -> Verifica Política 1: A porta está travada no app?
      if (isPortaTravada())
      {
        Serial.println("[BLOQUEADO] O modo 'LOCKED' esta ativado no Firebase. Saida negada.");
        for (int i = 0; i < 3; i++) {
          digitalWrite(LED_VERMELHO, HIGH); delay(200); digitalWrite(LED_VERMELHO, LOW); delay(200);
        }
      }
      else 
      {
        // -> Verifica Política 2: O modo noturno (toque de recolher) está ativo?
        int horaAtual = obterHoraAtual();
        bool modoNoturno = isModoNoturnoAtivo();

        if (modoNoturno && (horaAtual >= 22 || horaAtual < 6))
        {
          Serial.println("[BLOQUEADO] Horario de recolher (night_enabled = true)! O gato nao pode sair agora.");
          // Pisca o led vermelho para indicar bloqueio
          for (int i = 0; i < 3; i++)
          {
            digitalWrite(LED_VERMELHO, HIGH);
            delay(200);
            digitalWrite(LED_VERMELHO, LOW);
            delay(200);
          }
        }
        else
        {
          acionarPorta("saindo");
        }
      }
    }
    else
    {
      Serial.print("[NEGADO] Tag desconhecida tentou sair: ");
      Serial.println(uid);
    }

    rfidInterno.PICC_HaltA();
    rfidInterno.PCD_StopCrypto1();
    delay(1000);
  }

  // Pequeno delay para estabilidade do ESP32 no loop
  delay(50);
}