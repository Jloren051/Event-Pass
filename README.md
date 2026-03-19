# 🎟️ Sistema de Venda de Ingressos

Este projeto é uma aplicação web de venda de ingressos para eventos. Possui cadastro e login de usuários, compra de ingressos, gerenciamento de carrinho e visualização de ingressos comprados.  

O backend é feito em **Flask** e os dados são armazenados no **MongoDB**. O frontend utiliza HTML, CSS e JavaScript.

---

## 🛠️ Tecnologias

- **Backend:** Python 3.x, Flask, Flask-CORS  
- **Banco de Dados:** MongoDB (Atlas ou local)  
- **Frontend:** HTML, CSS, JavaScript  
- **Gerenciamento de ambiente:** `.env`  

---

## ⚡ Funcionalidades

- Cadastro e login de usuários com validação de senha  
- Cadastro de eventos iniciais (seed)  
- Listagem de eventos e tipos de ingressos  
- Carrinho de compras e cálculo automático de total  
- Pagamento simulado e geração de ingressos  
- Visualização de ingressos comprados, filtrando futuros e passados  

---

## 📁 Estrutura do Projeto


meu-projeto/
│
├─ app.py # Backend Flask
├─ .env # Variáveis de ambiente
├─ templates/
│ └─ index.html # HTML principal
├─ static/
│ └─ main.js # JavaScript da aplicação
└─ README.md


---

## ⚙️ Configuração do Banco de Dados (.env)

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:


MONGO_URI=mongodb+srv://SEU_USUARIO:SUA_SENHA@cluster0.mongodb.net
DATABASE_NAME=nome_do_banco
SECRET_KEY=sua_chave_aleatoria


> Substitua `SEU_USUARIO`, `SUA_SENHA` e `nome_do_banco` pelos dados do seu MongoDB Atlas ou MongoDB local.  
> `SECRET_KEY` pode ser qualquer string para uso interno do Flask.  

---

## 🚀 Como rodar o projeto

1. Instale as dependências:

```bash
pip install flask flask-cors pymongo python-dotenv bcrypt

Certifique-se de que o MongoDB está acessível (Atlas ou local).

Execute a aplicação:

python app.py

Abra no navegador:

http://localhost:5000
🔧 Rotas importantes da API
Usuários
Rota	Método	Descrição
/cadastrar	POST	Cadastra usuário no banco
/login	POST	Realiza login e valida senha
Eventos
Rota	Método	Descrição
/eventos	GET	Lista todos os eventos
/seed-eventos	POST	Insere eventos iniciais (seed)
Pedidos
Rota	Método	Descrição
/pedidos	POST	Cria um pedido de compra
/pedidos/<email>	GET	Lista pedidos de um usuário
/ingressos/<email>	GET	Lista ingressos de um usuário
💡 Testando usuários no MongoDB

Para verificar os cadastros diretamente:

Acesse seu MongoDB Atlas ou MongoDB local.

Na coleção usuarios do banco definido no .env, você verá os documentos com nome, email e senha (criptografada).

Opcionalmente, crie uma rota temporária no app.py:

@app.route("/test-usuarios")
def test_usuarios():
    usuarios = list(usuarios_colecao.find())
    return {
        "usuarios": [ {"nome": u["nome"], "email": u["email"]} for u in usuarios ]
    }
=======
# Software-Product
>>>>>>> minha-alteracao
