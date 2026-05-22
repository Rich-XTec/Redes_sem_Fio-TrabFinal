#include <WiFi.h>
#include <FirebaseESP32.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>

// =========================================================================
// 1. CONFIGURAÇÕES (PREENCHA AQUI)
// =========================================================================
#define WIFI_SSID "Formiga"
#define WIFI_PASSWORD "Gatos07."

//---- Informações do banco, não mudar -----
#define API_KEY "AIzaSyCzB9FvqwWxcbFKA2oYgHmrA8KRd5CWiYY" // Sua chave
#define DATABASE_URL "portagatoiot-default-rtdb.firebaseio.com"

// Tag autorizada (Deixe em branco na 1ª vez, leia no Serial Monitor e cole aqui depois) (depois colar a tag ali, no momento vai ser teste)
String TAG_GATO = "GATO_SIMULADO";

// =========================================================================
// 2. DEFINIÇÃO DE PINOS DO ESP32
// =========================================================================

// do Leitor RFID RC522
#define MISO_PIN 5
#define MOSI_PIN 18
#define SCK_PIN 19
#define RST_PIN 22        // Pino RST do Leitor RFID RC522
#define SS_PIN 21         // Pino SDA/SS do Leitor RFID RC522

#define SERVO_PIN 13      // Pino de controle do Servo Motor (Fio Laranja/Amarelo)
#define LDR_PIN 34        // Pino Analógico do Sensor de Luminosidade
#define SENSOR_IN_PIN 25  // Sensor Infravermelho 1 (Dentro de casa)
#define SENSOR_OUT_PIN 26 // Sensor Infravermelho 2 (Fora de casa)
#define LED_PIN 32        // Pino do LED de sinalização
#define BUZZER_PIN 33     // Pino do Buzzer


// =========================================================================
// 3. INSTÂNCIAS E OBJETOS
// =========================================================================
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

MFRC522 rfid(SS_PIN, RST_PIN);
Servo travaServo;
WiFiUDP ntpUDP;

// Fuso horário UTC-3 (Brasil) = -3 horas * 3600 segundos = -10800
NTPClient timeClient(ntpUDP, "pool.ntp.org", -10800);

// =========================================================================
// SETUP (Configuração Inicial)
// =========================================================================
void setup()
{
  Serial.begin(115200);

  // Configura os pinos de entrada e saída
  pinMode(SENSOR_IN_PIN, INPUT);
  pinMode(SENSOR_OUT_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Configura o Motor e fecha a porta (Ângulo 0)
  travaServo.attach(SERVO_PIN);
  travaServo.write(0);

  // Inicia a comunicação com o Leitor RFID
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN);
  rfid.PCD_Init();

  // Conecta ao Wi-Fi
  Serial.print("Conectando ao WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED)
  {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nConectado! IP: " + WiFi.localIP().toString());

  // Inicia o relógio da internet
  timeClient.begin();

  // Configura o Firebase
  Serial.println("Conectando ao Firebase...");
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Como o banco está em modo teste, logamos anonimamente
  if (Firebase.signUp(&config, &auth, "", ""))
  {
    Serial.println("Firebase Autorizado com Sucesso!");
  }
  else
  {
    Serial.printf("Erro no Firebase: %s\n", config.signer.signupError.message.c_str());
  }

  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

// =========================================================================
// LOOP PRINCIPAL
// =========================================================================
void loop()
{
  // Atualiza a hora via internet
  timeClient.update();

  // ---------------------------------------------------------
  // 1. MODO DE TESTE PELO MONITOR SERIAL (Sem a Tag Física)
  // ---------------------------------------------------------
  if (Serial.available() > 0)
  {
    String comando = Serial.readStringUntil('\n'); // Lê o que você digitou
    comando.trim();                                // Remove espaços ocultos

    if (comando == "TESTE" || comando == "teste")
    {
      Serial.println("\n=============================");
      Serial.println("[SIMULAÇÃO] Comando de teste recebido via Serial!");
      // Finge que leu a tag correta e chama a função principal
      processarAcesso();
    }
  }

  // ---------------------------------------------------------
  // 2. MODO REAL (Para quando a Tag e o Leitor chegarem)
  // ---------------------------------------------------------
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial())
  {

    String uidLido = "";
    for (byte i = 0; i < rfid.uid.size; i++)
    {
      uidLido += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
      uidLido += String(rfid.uid.uidByte[i], HEX);
    }
    uidLido.toUpperCase();
    Serial.println("\n=============================");
    Serial.println("TAG DETECTADA: " + uidLido);

    if (uidLido == TAG_GATO)
    {
      processarAcesso();
    }
    else
    {
      Serial.println("Acesso Negado: Gato desconhecido.");
      apitarErro();
    }

    delay(3000);
  }
}

// =========================================================================
// LÓGICA DE NEGÓCIO E FUNÇÕES AUXILIARES
// =========================================================================
void processarAcesso()
{
  // 1. Descobrir a direção lendo os sensores infravermelhos
  // Lógica simples: se o sensor de dentro estiver bloqueado, ele quer sair.
  String direcao = "indefinido";
  if (digitalRead(SENSOR_IN_PIN) == LOW)
  {
    direcao = "saindo";
  }
  else if (digitalRead(SENSOR_OUT_PIN) == LOW)
  {
    direcao = "entrando";
  }
  else
  {
    // Se nenhum sensor disparar, assumimos que ele quer entrar por segurança
    direcao = "entrando";
  }

  // 2. Toque de Recolher (Horário de Bloqueio)
  int horaAtual = timeClient.getHours();
  bool acessoPermitido = true;

  // Bloqueia a saída entre 22h e 5h59
  if (horaAtual >= 22 || horaAtual < 6)
  {
    if (direcao == "saindo")
    {
      acessoPermitido = false;
      Serial.println("Acesso Negado: Horário de recolher ativo! Gato não pode sair.");
    }
  }

  // 3. Executa a Ação
  if (acessoPermitido)
  {
    abrirPorta();
    enviarDadosFirebase(direcao);
  }
  else
  {
    apitarErro();
  }
}

void abrirPorta()
{
  Serial.println("Acesso Permitido! Abrindo a porta...");

  // Liga o LED e faz um bipe curto
  digitalWrite(LED_PIN, HIGH);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(200);
  digitalWrite(BUZZER_PIN, LOW);

  // Gira o Servo para 90 graus (abre a trava)
  travaServo.write(90);

  // Mantém aberto por 5 segundos
  delay(5000);

  // Retorna o Servo para 0 graus (fecha a trava)
  travaServo.write(0);

  // Desliga o LED
  digitalWrite(LED_PIN, LOW);
  Serial.println("Porta fechada.");
}

void apitarErro()
{
  // Emite 3 bipes rápidos indicando erro/bloqueio
  for (int i = 0; i < 3; i++)
  {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(150);
    digitalWrite(BUZZER_PIN, LOW);
    delay(150);
  }
}

void enviarDadosFirebase(String direcao)
{
  // Lê a luminosidade analógica (0 a 4095 no ESP32)
  int nivelLuz = analogRead(LDR_PIN);

  // Prepara o pacote de dados (JSON)
  FirebaseJson json;
  json.set("tag_gato", TAG_GATO);
  json.set("acao", direcao);
  json.set("luminosidade", nivelLuz);
  json.set("horario", timeClient.getFormattedTime());
  json.set("timestamp", ".sv/timestamp"); // Pega o milissegundo exato do servidor do Google

  // Envia para o banco de dados na coleção "historico_eventos"
  Serial.print("Enviando dados para o Firebase... ");
  if (Firebase.RTDB.pushJSON(&fbdo, "/historico_eventos", &json))
  {
    Serial.println("Sucesso!");
  }
  else
  {
    Serial.println("Falha ao enviar: " + fbdo.errorReason());
  }
}