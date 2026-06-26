#ifndef FIREBASE_DOOR_H
#define FIREBASE_DOOR_H

#include <WiFi.h>
#include <FirebaseESP32.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

// =========================================================================
// CONFIGURAÇÕES DO BANCO DE DADOS E HORÁRIO
// =========================================================================
#define API_KEY "AIzaSyCzB9FvqwWxcbFKA2oYgHmrA8KRd5CWiYY"
#define DATABASE_URL "portagatoiot-default-rtdb.firebaseio.com"

// Instâncias globais do Firebase
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Instâncias globais do Relógio da Internet (NTP)
WiFiUDP ntpUDP;
// Fuso horário UTC-3 (Brasil) = -3 horas * 3600 segundos = -10800
NTPClient timeClient(ntpUDP, "pool.ntp.org", -10800);

// =========================================================================
// FUNÇÕES DO ESCOPO DO FIREBASE E HORÁRIO
// =========================================================================

/**
 * Inicializa a configuração do Firebase e o relógio interno (NTP).
 */
void inicializarFirebase()
{
  // Inicia o relógio da internet internamente
  timeClient.begin();
  Serial.println("[NTP] Relógio da internet inicializado.");

  Serial.println("Conectando ao Firebase...");
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Autenticação anônima para modo de teste
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

/**
 * Retorna apenas a hora atual (0 a 23).
 * Útil para aplicar regras de toque de recolher no circuito principal.
 */
int obterHoraAtual()
{
  timeClient.update();
  return timeClient.getHours();
}

/**
 * Retorna o horário completo formatado (HH:MM:SS).
 */
String obterHorarioFormatado()
{
  timeClient.update();
  return timeClient.getFormattedTime();
}

/**
 * Lê no Firebase se a porta está trancada manualmente pelo app/banco.
 * Caminho: /door/locked
 */
bool isPortaTravada()
{
  if (Firebase.getBool(fbdo, "/door/locked"))
  {
    return fbdo.boolData(); // Retorna o valor lido do banco
  }
  else
  {
    Serial.print("Erro ao ler /door/locked: ");
    Serial.println(fbdo.errorReason());
    return false; // Por padrão, se falhar a conexão, assume que NÃO está travada
  }
}

/**
 * Lê no Firebase se o bloqueio noturno de segurança está habilitado.
 * Caminho: /security/night_enabled
 */
bool isModoNoturnoAtivo()
{
  if (Firebase.getBool(fbdo, "/security/night_enabled"))
  {
    return fbdo.boolData(); // Retorna o valor lido do banco
  }
  else
  {
    Serial.print("Erro ao ler /security/night_enabled: ");
    Serial.println(fbdo.errorReason());
    return true; // Por padrão, se falhar a conexão, mantemos o toque de recolher ativo por segurança
  }
}

/**
 * Envia o pacote JSON com os eventos de acesso do gato.
 * O horário é capturado de forma automática e interna antes do envio.
 */
void enviarDadosFirebase(String tagGato, String direcao, int nivelLuz)
{
  // Atualiza o relógio e captura a hora atual de forma interna
  timeClient.update();
  String horaRegistro = timeClient.getFormattedTime();

  // Prepara o pacote de dados (JSON)
  FirebaseJson json;
  json.set("tag_gato", tagGato);
  json.set("acao", direcao);
  json.set("luminosidade", nivelLuz);
  json.set("horario", horaRegistro);
  json.set("timestamp", ".sv/timestamp"); // Pega o milissegundo exato do servidor do Google

  // Envia para o banco de dados na coleção "historico_eventos"
  Serial.print("Enviando dados para o Firebase... ");
  if (Firebase.pushJSON(fbdo, "/historico_eventos", json))
  {
    Serial.println("Sucesso!");
  }
  else
  {
    Serial.print("Falha ao enviar: ");
    Serial.println(fbdo.errorReason());
  }
}

#endif