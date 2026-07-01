# Dashboard - Porta Inteligente para Gatos 🐱

Este diretório contém o frontend da **Porta Inteligente para Gatos**, desenvolvido em React e Vite para monitoramento e controle remoto em tempo real.

A aplicação está publicada e pode ser acessada em:
🔗 **[https://portagatoiot.web.app/](https://portagatoiot.web.app/)**

---

## 🛠️ Tecnologias Utilizadas
* **React** + **Vite** (para uma interface ágil e carregamento rápido)
* **Firebase Realtime Database** (para atualização de dados em tempo real entre o dashboard e o hardware ESP32)

---

## 📁 Estrutura dos Principais Arquivos

* **`src/App.jsx`**: Componente principal da aplicação e gerenciamento do estado global.
* **`src/services/firebase.js`**: Configuração e conexão com o Firebase Realtime Database.
* **`src/components/Controls.jsx`**: Painel de controle da porta e das configurações (trinco manual e segurança noturna).
* **`src/components/CatStatus.jsx`**: Exibição do status atual do gato (dentro/fora de casa e contagem de saídas).
* **`src/components/EventList.jsx`**: Histórico completo e filtrável de registros de passagens e eventos.
* **`src/components/Analytics.jsx`**: Exibição de gráficos de frequência (SVG) e estatísticas de uso.
* **`src/components/StatusCard.jsx`**: Indicador visual simples e direto do estado atual da porta (Trancada/Liberada).
* **`src/App.css`**: Arquivo com os estilos visuais modernos da interface.
* **`index.html`**: Página HTML inicial da aplicação.
* **`firebase.json`**: Configurações de hospedagem no Firebase Hosting.

---

## 🚀 Como Rodar Localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
