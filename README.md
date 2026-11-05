<div align="center">

# 📅 Planejador — Organizador Pessoal de Atividades

![Java](https://img.shields.io/badge/Java-21-orange?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Render](https://img.shields.io/badge/Render-Deploy-46E3B7?style=for-the-badge&logo=render&logoColor=black)

Um app de planejamento instalável (PWA) para organizar compromissos, tarefas e possibilidades, com visão mensal, semanal e lista de pendências.

[🌐 Demo](https://planejador-web.onrender.com) · [📁 Repositório](https://github.com/devgomes07-droid/planejador-app) · [🐛 Relatar Bug](https://github.com/devgomes07-droid/planejador-app/issues)

</div>

> ⚠️ O backend roda no plano gratuito do Render e dorme após alguns minutos sem uso. O primeiro login do dia pode levar até 1 minuto para o servidor acordar.

<!-- AJUSTAR: coloque os prints em docs/ e confira os nomes -->
<p align="center">
  <img src="docs/login.png" alt="Tela de login" width="250" />
  <img src="docs/mensal.png" alt="Calendário mensal" width="250" />
  <img src="docs/semanal.png" alt="Visão semanal" width="250" />
</p>

---

## ✨ Características

### 📆 Planejamento
- Calendário **mensal** com destaque da atividade principal de cada dia
- Visão **semanal** com atividades com e sem horário
- Tela de **pendências**, com opção de transformar em atividade
- Painel do dia com cartões por tipo, status e horário
- Marcação de atividades como concluídas direto na semana

### 🗂️ Atividades
- 3 tipos: **Tarefa**, **Compromisso** e **Possibilidade**
- 4 prioridades: Baixa, Média, Alta e Urgente
- 5 status: Pendente, Em andamento, Concluído, Adiado e Cancelado
- Destaque manual no calendário mensal
- **Detecção de conflito de horários**, com bloqueio no front e validação no back (HTTP 409)

### 🔐 Autenticação
- Autenticação sem estado baseada em **JWT**
- Cadastro e login com validação por campo
- Mostrar/ocultar senha e confirmação de senha no cadastro
- Mensagens de erro claras e aviso de "servidor acordando"
- Persistência de sessão com `localStorage`

### 📱 UI/UX e PWA
- **Instalável** como app no Android, iOS, Windows e macOS
- Formulário e painel em modal (folha que sobe de baixo no celular)
- Fundo animado e transições suaves entre telas
- Totalmente responsivo, com suporte a teclado e notch no mobile
- Respeita `prefers-reduced-motion`

---

## 🛠️ Stack Tecnológico

### Backend
| Tecnologia | Propósito |
|---|---|
| Java | Linguagem principal |
| Spring Boot | Framework da aplicação |
| Spring Security | Autenticação e autorização |
| Spring Data JPA | Acesso a dados |
| PostgreSQL | Banco de dados relacional |
| JWT | Autenticação sem estado |
| Maven | Build e dependências |

### Frontend
| Tecnologia | Propósito |
|---|---|
| React + TypeScript | Interface e tipagem |
| Vite | Build e servidor de desenvolvimento |
| CSS puro | Estilo e tema (sem biblioteca de UI) |
| Service Worker | PWA e instalação |
| Capacitor | Projeto Android gerado |

### Infraestrutura
| Serviço | Propósito |
|---|---|
| Render | Backend (Docker) e frontend (Static Site) |
| Neon | PostgreSQL gerenciado |
| Docker | Build conteinerizado |
| GitHub | Versionamento e deploy automático a cada push na `main` |

---

## 🗂️ Estrutura do Projeto

```
planejador-app/
├── backend/                 # API Spring Boot
│   ├── src/main/java/...    # controllers, services, repositories, entities, security
│   ├── src/main/resources/  # application.properties
│   ├── Dockerfile
│   └── pom.xml
├── frontend/                # React + Vite (PWA)
│   ├── src/                 # telas, componentes, contextos e estilos
│   ├── public/              # ícones e manifest
│   └── android/             # projeto Capacitor
├── docs/                    # prints do README
└── README.md
```

<!-- AJUSTAR: confira a estrutura de pastas e o local do Dockerfile -->

---

## 🚀 Começando

### Pré-requisitos
- Java 21+ <!-- AJUSTAR: versão do pom.xml -->
- Node.js 20+
- Docker (para o PostgreSQL local)

### Configuração local

```bash
# 1. Clone o repositório
git clone https://github.com/devgomes07-droid/planejador-app.git
cd planejador-app

# 2. Suba o banco de dados
docker start planejador-db
```

Se o container ainda não existir:

```bash
docker run --name planejador-db \
  -e POSTGRES_DB=planejador \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=sua_senha \
  -p 5432:5432 -d postgres:16
```

<!-- AJUSTAR: nome do banco, usuário e porta conforme o application.properties -->

```bash
# 3. Rode o backend (http://localhost:8080)
cd backend
./mvnw spring-boot:run        # Windows: .\mvnw.cmd spring-boot:run

# 4. Rode o frontend (http://localhost:5173)
cd ../frontend
npm install
npm run dev
```

### ⚙️ Variáveis de ambiente

**Backend** (no Render, em *Environment*; nunca versione senhas)

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | URL de conexão do PostgreSQL <!-- AJUSTAR: nome real --> |
| `DATABASE_USERNAME` | Usuário do banco <!-- AJUSTAR --> |
| `DATABASE_PASSWORD` | Senha do banco <!-- AJUSTAR --> |
| `JWT_SECRET` | Segredo para assinar os tokens <!-- AJUSTAR --> |

**Frontend**

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL da API (padrão: `http://localhost:8080`) |

### 🐳 Docker

```bash
cd backend
docker build -t planejador-api .
docker run -p 8080:8080 \
  -e DATABASE_URL=jdbc:postgresql://host:5432/planejador \
  -e DATABASE_USERNAME=user \
  -e DATABASE_PASSWORD=pass \
  -e JWT_SECRET=secret \
  planejador-api
```

---

## 🔌 Endpoints da API

### Autenticação
| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/auth/register` | Cria uma conta |
| `POST` | `/api/auth/login` | Autentica e retorna o token |

### Atividades
| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/activities?startDate=&endDate=` | Lista atividades do período |
| `POST` | `/api/activities` | Cria uma atividade |
| `PUT` | `/api/activities/:id` | Atualiza uma atividade |
| `PATCH` | `/api/activities/:id/status` | Altera o status |
| `DELETE` | `/api/activities/:id` | Exclui uma atividade |

> As rotas de atividades exigem o header `Authorization: Bearer <token>`.

---

## 📱 Instalando como app

| Dispositivo | Como instalar |
|---|---|
| iPhone | Safari → Compartilhar → *Adicionar à Tela de Início* |
| Android | Chrome → menu ⋮ → *Instalar app* |
| Computador | Chrome ou Edge → ícone de instalar na barra de endereço |

---

## 🗺️ Roteiro

- [ ] Categorias com cor
- [ ] Atividades recorrentes
- [ ] Criação de atividades por texto com IA
- [ ] Notificações e lembretes
- [ ] Estatísticas de produtividade
- [ ] Modo escuro
- [ ] Testes automatizados no backend

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 👤 Autor

**Gabriel Gomes** — [@devgomes07-droid](https://github.com/devgomes07-droid) · [LinkedIn](https://www.linkedin.com/in/gabriel-gomes-almeida-70b464395)

*"Pequenas ações diárias geram ótimos resultados."* <!-- AJUSTAR: troque pela sua frase -->
