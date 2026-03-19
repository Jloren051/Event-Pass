from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
from bson import ObjectId
import bcrypt
import os
import uuid
from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DATABASE_NAME")]

users_collection = db["users"]
events_collection = db["events"]
orders_collection = db["orders"]

def serialize_doc(doc):
    doc["_id"] = str(doc["_id"])
    return doc

# Configuração da chave secreta
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

# Conexão com o MongoDB
try:
    client = MongoClient(os.getenv("MONGO_URI"))
    db = client[os.getenv("DATABASE_NAME")]
    client.admin.command("ping")
    print("✅ MongoDB conectado com sucesso")
except Exception as e:
    print("❌ Erro ao conectar ao MongoDB:", e)
    exit(1)

# Coleções
usuarios_colecao = db["usuarios"]
eventos_colecao = db["eventos"]
pedidos_colecao = db["pedidos"]

# Função para serializar documentos do MongoDB (converter ObjectId para string)
def serializar_doc(doc):
    doc["_id"] = str(doc["_id"])
    return doc

# Rota principal
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/seed-events", methods=["POST"])
def seed_events():
    if events_collection.count_documents({}) > 0:
        return jsonify({"message": "Eventos já cadastrados"}), 200

    eventos = [
        {
            "title": "Festival de Rock",
            "date": "2026-04-20",
            "location": "São Paulo",
            "image": "https://via.placeholder.com/300x180",
            "ticketTypes": [
                {"name": "Pista", "price": 80, "description": "Acesso à pista comum"},
                {"name": "VIP", "price": 150, "description": "Área VIP próxima ao palco"},
                {"name": "Backstage", "price": 300, "description": "Experiência premium"}
            ]
        },
        {
            "title": "Show Pop Night",
            "date": "2026-05-10",
            "location": "Rio de Janeiro",
            "image": "https://via.placeholder.com/300x180",
            "ticketTypes": [
                {"name": "Pista", "price": 90, "description": "Acesso à pista comum"},
                {"name": "Premium", "price": 180, "description": "Área premium exclusiva"}
            ]
        },
        {
            "title": "Noite Eletrônica",
            "date": "2026-06-15",
            "location": "Belo Horizonte",
            "image": "https://via.placeholder.com/300x180",
            "ticketTypes": [
                {"name": "Pista", "price": 70, "description": "Entrada padrão"},
                {"name": "Camarote", "price": 220, "description": "Camarote com vista privilegiada"}
            ]
        }
    ]

    events_collection.insert_many(eventos)
    return jsonify({"message": "Eventos inseridos com sucesso"}), 201

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    confirm_password = data.get("confirmPassword", "")

    if not name or not email or not password or not confirm_password:
        return jsonify({"message": "Preencha todos os campos"}), 400

    if password != confirm_password:
        return jsonify({"message": "As senhas não coincidem"}), 400

    if len(password) < 6:
        return jsonify({"message": "A senha deve ter pelo menos 6 caracteres"}), 400

    existing_user = users_collection.find_one({"email": email})
    if existing_user:
        return jsonify({"message": "Email já cadastrado"}), 400

    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    users_collection.insert_one({
        "name": name,
        "email": email,
        "password": hashed_password
    })

    return jsonify({"message": "Usuário cadastrado com sucesso"}), 201

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"message": "Informe email e senha"}), 400

    user = users_collection.find_one({"email": email})

    if not user:
        return jsonify({"message": "Usuário não encontrado"}), 404

    if not bcrypt.checkpw(password.encode("utf-8"), user["password"]):
        return jsonify({"message": "Senha incorreta"}), 401

    return jsonify({
        "message": "Login realizado com sucesso",
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"]
        }
    }), 200

@app.route("/events", methods=["GET"])
def get_events():
    eventos = []

    for event in events_collection.find().sort("date", 1):
        event["_id"] = str(event["_id"])
        eventos.append(event)

    return jsonify(eventos), 200

@app.route("/orders", methods=["POST"])
def create_order():
    data = request.get_json()

    user_email = data.get("user_email", "").strip().lower()
    user_name = data.get("user_name", "").strip()
    items = data.get("items", [])
    total = data.get("total", 0)

    if not user_email or not items:
        return jsonify({"message": "Dados do pedido inválidos"}), 400

    tickets = []

    for item in items:
        quantity = int(item.get("quantity", 0))

        for _ in range(quantity):
            tickets.append({
                "ticket_code": str(uuid.uuid4())[:8].upper(),
                "event_id": item.get("event_id"),
                "event_title": item.get("event_title"),
                "event_date": item.get("event_date"),
                "event_location": item.get("event_location"),
                "ticket_type": item.get("ticket_type"),
                "unit_price": item.get("unit_price"),
                "purchase_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })

    order = {
        "user_email": user_email,
        "user_name": user_name,
        "items": items,
        "tickets": tickets,
        "total": total,
        "created_at": datetime.now()
    }

    result = orders_collection.insert_one(order)

    return jsonify({
        "message": "Pedido salvo com sucesso",
        "order_id": str(result.inserted_id),
        "tickets": tickets
    }), 201

@app.route("/orders/<email>", methods=["GET"])
def get_orders(email):
    pedidos = []

    for order in orders_collection.find({"user_email": email.lower()}).sort("created_at", -1):
        order["_id"] = str(order["_id"])
        if "created_at" in order:
            order["created_at"] = order["created_at"].strftime("%Y-%m-%d %H:%M:%S")
        pedidos.append(order)

    return jsonify(pedidos), 200

@app.route("/tickets/<email>", methods=["GET"])
def get_tickets(email):
    tickets = []

    for order in orders_collection.find({"user_email": email.lower()}):
        for ticket in order.get("tickets", []):
            tickets.append(ticket)

    return jsonify(tickets), 200

# Rota para inserir eventos iniciais (seed)
@app.route("/seed-eventos", methods=["POST"])
def seed_eventos():
    try:
        if eventos_colecao.count_documents({}) > 0:
            return jsonify({"mensagem": "Eventos já cadastrados"}), 200

        eventos = [
            {
                "titulo": "Festival de Rock",
                "data": "2026-04-20",
                "local": "São Paulo",
                "imagem": "https://via.placeholder.com/300x180",
                "tipos_ingresso": [
                    {"nome": "Pista", "preco": 80, "descricao": "Acesso à pista comum"},
                    {"nome": "VIP", "preco": 150, "descricao": "Área VIP próxima ao palco"},
                    {"nome": "Backstage", "preco": 300, "descricao": "Experiência premium"}
                ]
            },
            {
                "titulo": "Show Pop Night",
                "data": "2026-05-10",
                "local": "Rio de Janeiro",
                "imagem": "https://via.placeholder.com/300x180",
                "tipos_ingresso": [
                    {"nome": "Pista", "preco": 90, "descricao": "Acesso à pista comum"},
                    {"nome": "Premium", "preco": 180, "descricao": "Área premium exclusiva"}
                ]
            },
            {
                "titulo": "Noite Eletrônica",
                "data": "2026-06-15",
                "local": "Belo Horizonte",
                "imagem": "https://via.placeholder.com/300x180",
                "tipos_ingresso": [
                    {"nome": "Pista", "preco": 70, "descricao": "Entrada padrão"},
                    {"nome": "Camarote", "preco": 220, "descricao": "Camarote com vista privilegiada"}
                ]
            }
        ]

        eventos_colecao.insert_many(eventos)
        return jsonify({"mensagem": "Eventos inseridos com sucesso"}), 201

    except Exception as e:
        return jsonify({"mensagem": f"Erro ao inserir eventos: {e}"}), 500

# Rota para cadastro de usuários
@app.route("/cadastrar", methods=["POST"])
def cadastrar():
    try:
        dados = request.get_json()

        nome = dados.get("nome", "").strip()
        email = dados.get("email", "").strip().lower()
        senha = dados.get("senha", "")
        confirmar_senha = dados.get("confirmarSenha", "")

        if not nome or not email or not senha or not confirmar_senha:
            return jsonify({"mensagem": "Preencha todos os campos"}), 400

        if senha != confirmar_senha:
            return jsonify({"mensagem": "As senhas não coincidem"}), 400

        if len(senha) < 6:
            return jsonify({"mensagem": "A senha deve ter pelo menos 6 caracteres"}), 400

        usuario_existente = usuarios_colecao.find_one({"email": email})
        if usuario_existente:
            return jsonify({"mensagem": "Email já cadastrado"}), 400

        senha_hash = bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt())

        usuarios_colecao.insert_one({
            "nome": nome,
            "email": email,
            "senha": senha_hash
        })

        return jsonify({"mensagem": "Usuário cadastrado com sucesso"}), 201

    except Exception as e:
        return jsonify({"mensagem": f"Erro ao cadastrar usuário: {e}"}), 500

# Rota de login
@app.route("/login", methods=["POST"])
def login():
    try:
        dados = request.get_json()
        email = dados.get("email", "").strip().lower()
        senha = dados.get("senha", "")

        if not email or not senha:
            return jsonify({"mensagem": "Informe email e senha"}), 400

        usuario = usuarios_colecao.find_one({"email": email})
        if not usuario:
            return jsonify({"mensagem": "Usuário não encontrado"}), 404

        if not bcrypt.checkpw(senha.encode("utf-8"), usuario["senha"]):
            return jsonify({"mensagem": "Senha incorreta"}), 401

        return jsonify({
            "mensagem": "Login realizado com sucesso",
            "usuario": {
                "id": str(usuario["_id"]),
                "nome": usuario["nome"],
                "email": usuario["email"]
            }
        }), 200

    except Exception as e:
        return jsonify({"mensagem": f"Erro no login: {e}"}), 500

# Rota para listar eventos
@app.route("/eventos", methods=["GET"])
def listar_eventos():
    try:
        eventos = [serializar_doc(evento) for evento in eventos_colecao.find().sort("data", 1)]
        return jsonify(eventos), 200
    except Exception as e:
        return jsonify({"mensagem": f"Erro ao buscar eventos: {e}"}), 500

# Rota para criar pedido
@app.route("/pedidos", methods=["POST"])
def criar_pedido():
    try:
        dados = request.get_json()
        email_usuario = dados.get("email_usuario", "").strip().lower()
        nome_usuario = dados.get("nome_usuario", "").strip()
        itens = dados.get("itens", [])
        total = dados.get("total", 0)

        if not email_usuario or not itens:
            return jsonify({"mensagem": "Dados do pedido inválidos"}), 400

        ingressos = []

        for item in itens:
            quantidade = int(item.get("quantidade", 0))
            for _ in range(quantidade):
                ingressos.append({
                    "codigo_ingresso": str(uuid.uuid4())[:8].upper(),
                    "evento_id": item.get("evento_id"),
                    "titulo_evento": item.get("titulo_evento"),
                    "data_evento": item.get("data_evento"),
                    "local_evento": item.get("local_evento"),
                    "tipo_ingresso": item.get("tipo_ingresso"),
                    "preco_unitario": item.get("preco_unitario"),
                    "data_compra": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })

        pedido = {
            "email_usuario": email_usuario,
            "nome_usuario": nome_usuario,
            "itens": itens,
            "ingressos": ingressos,
            "total": total,
            "criado_em": datetime.now()
        }

        resultado = pedidos_colecao.insert_one(pedido)

        return jsonify({
            "mensagem": "Pedido salvo com sucesso",
            "pedido_id": str(resultado.inserted_id),
            "ingressos": ingressos
        }), 201

    except Exception as e:
        return jsonify({"mensagem": f"Erro ao criar pedido: {e}"}), 500

# Rota para listar pedidos de um usuário
@app.route("/pedidos/<email>", methods=["GET"])
def listar_pedidos(email):
    try:
        pedidos = []
        for pedido in pedidos_colecao.find({"email_usuario": email.lower()}).sort("criado_em", -1):
            pedido = serializar_doc(pedido)
            if "criado_em" in pedido:
                pedido["criado_em"] = pedido["criado_em"].strftime("%Y-%m-%d %H:%M:%S")
            pedidos.append(pedido)
        return jsonify(pedidos), 200
    except Exception as e:
        return jsonify({"mensagem": f"Erro ao buscar pedidos: {e}"}), 500

# Rota para listar ingressos de um usuário
@app.route("/ingressos/<email>", methods=["GET"])
def listar_ingressos(email):
    try:
        ingressos = []
        for pedido in pedidos_colecao.find({"email_usuario": email.lower()}):
            for ingresso in pedido.get("ingressos", []):
                ingressos.append(ingresso)
        return jsonify(ingressos), 200
    except Exception as e:
        return jsonify({"mensagem": f"Erro ao buscar ingressos: {e}"}), 500

if __name__ == "__main__":
    app.run(debug=True)