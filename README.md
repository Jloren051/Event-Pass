# 🎟️ Event Pass

Sistema web de venda de ingressos para eventos, desenvolvido com **Python**, **Flask**, **SQLAlchemy**, **HTML**, **CSS** e **JavaScript**.

O projeto permite cadastrar usuários, realizar login e visualizar eventos disponíveis em uma interface simples e intuitiva.

---

## 📌 Sobre o projeto

O **Event Pass** foi criado com o objetivo de simular uma plataforma de venda de ingressos para eventos.

A aplicação possui:

- Backend em Flask (API e regras de negócio)
- Frontend com HTML, CSS e JavaScript
- Banco de dados relacional com SQLAlchemy

---

## 🚀 Tecnologias utilizadas

### 🔧 Backend
- Python
- Flask
- Flask-CORS
- Flask-SQLAlchemy
- bcrypt
- python-dotenv

### 🎨 Frontend
- HTML5
- CSS3
- JavaScript

### 🗄️ Banco de dados
- SQLite / MySQL / PostgreSQL (configurável via `.env`)

---

## 📂 Estrutura do projeto

```
Event-Pass/
├── app.py
├── requirements.txt
├── .env
├── templates/
│   └── index.html
└── static/
    ├── script.js
    └── styles.css
```

---

## ⚙️ Funcionalidades

- Cadastro de usuários  
- Login com senha criptografada  
- Listagem de eventos  
- Inserção de eventos iniciais (seed)  
- Interface web integrada  
- Navegação entre telas  

---

## 🧠 Como funciona

Ao iniciar o projeto:

1. O Flask carrega as variáveis do `.env`
2. Conecta ao banco via SQLAlchemy
3. Cria as tabelas automaticamente
4. Renderiza a interface web
5. O frontend consome as rotas da API

---

## 🔐 Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```
SECRET_KEY=sua_chave_secreta
DB_URI=sqlite:///eventpass.db
```

### Outros bancos (opcional)

**MySQL**
```
DB_URI=mysql+pymysql://usuario:senha@localhost/eventpass
```

**PostgreSQL**
```
DB_URI=postgresql://usuario:senha@localhost/eventpass
```

---

## ▶️ Como executar o projeto

### 1. Clonar o repositório
```
git clone https://github.com/Jloren051/Event-Pass.git
```

### 2. Entrar na pasta
```
cd Event-Pass
```

### 3. Criar ambiente virtual

**Windows**
```
python -m venv .venv
.venv\Scripts\activate
```

**Linux / Mac**
```
python3 -m venv .venv
source .venv/bin/activate
```

### 4. Instalar dependências
```
pip install -r requirements.txt
```

### 5. Criar arquivo `.env`
Use o modelo mostrado acima.

### 6. Rodar o projeto
```
python app.py
```

### 7. Acessar no navegador
```
http://127.0.0.1:5000
```

---

## 🔗 Rotas da aplicação

### Página
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Página principal |

### Usuários
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/cadastrar` | Cadastro de usuário |
| POST | `/login` | Login |

### Eventos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/eventos` | Listar eventos |
| POST | `/seed-eventos` | Inserir eventos iniciais |

---

## 📝 Exemplos de requisição

### Cadastro
```json
POST /cadastrar
{
  "nome": "Julia",
  "email": "julia@email.com",
  "senha": "123456",
  "confirmarSenha": "123456"
}
```

### Login
```json
POST /login
{
  "email": "julia@email.com",
  "senha": "123456"
}
```

---

## 📸 Interface

A aplicação possui:

- Tela de login  
- Tela de cadastro  
- Listagem de eventos  
- Navegação entre telas  
- Área do usuário  

---

## ⚠️ Observações

- Senhas são criptografadas com `bcrypt`
- O banco é configurado via `.env`
- A rota `/seed-eventos` popula o banco inicialmente
- Pode ser necessário ajustar o `requirements.txt`

---

## 🔧 Melhorias futuras

- Carrinho de compras  
- Pagamento de ingressos  
- Geração de tickets  
- Autenticação com JWT  
- Painel administrativo  
- Upload de imagens  

---

## 👩‍💻 Integrantes

### Júlia Lourenço
- GitHub: https://github.com/Jloren051  
- LinkedIn: https://www.linkedin.com/in/julia-louren%C3%A7o-8065082ba/

### Erick Xavier
- GitHub: https://github.com/ErickXr  
- LinkedIn: https://www.linkedin.com/in/erickxavierdev/

---

## 📄 Licença

Projeto desenvolvido para fins acadêmicos.

---

## 📦 requirements.txt sugerido

```
flask
flask-cors
flask-sqlalchemy
python-dotenv
bcrypt
```