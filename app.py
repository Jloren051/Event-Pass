from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from datetime import datetime
import bcrypt
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DB_URI")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    senha = db.Column(db.LargeBinary, nullable=False)
    is_admin = db.Column(db.Boolean, default=False)


class Evento(db.Model):
    __tablename__ = "eventos"

    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(150), nullable=False)
    data = db.Column(db.String(50), nullable=False)
    local = db.Column(db.String(100), nullable=False)
    imagem = db.Column(db.String(255))
    preco = db.Column(db.Float, nullable=False)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    tipos_ingresso = db.relationship("TipoIngresso", backref="evento", lazy=True, cascade="all, delete-orphan")


class TipoIngresso(db.Model):
    __tablename__ = "tipos_ingresso"

    id = db.Column(db.Integer, primary_key=True)
    evento_id = db.Column(db.Integer, db.ForeignKey("eventos.id"), nullable=False)
    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.String(255))
    preco = db.Column(db.Float, nullable=False)
    quantidade_disponivel = db.Column(db.Integer, default=100)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()

# ==================== AUTENTICAÇÃO ====================

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/cadastrar", methods=["POST"])
def cadastrar():
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

    if Usuario.query.filter_by(email=email).first():
        return jsonify({"mensagem": "Email já cadastrado"}), 400

    senha_hash = bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt())

    novo_usuario = Usuario(
        nome=nome,
        email=email,
        senha=senha_hash,
        is_admin=False
    )

    db.session.add(novo_usuario)
    db.session.commit()

    return jsonify({"mensagem": "Usuário cadastrado com sucesso"}), 201

@app.route("/login", methods=["POST"])
def login():
    dados = request.get_json()

    email = dados.get("email", "").strip().lower()
    senha = dados.get("senha", "")

    if not email or not senha:
        return jsonify({"mensagem": "Informe email e senha"}), 400

    usuario = Usuario.query.filter_by(email=email).first()

    if not usuario:
        return jsonify({"mensagem": "Usuário não encontrado"}), 404

    if not bcrypt.checkpw(senha.encode("utf-8"), usuario.senha):
        return jsonify({"mensagem": "Senha incorreta"}), 401

    return jsonify({
        "mensagem": "Login realizado com sucesso",
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "is_admin": usuario.is_admin
        }
    }), 200

# ==================== EVENTOS ====================

@app.route("/eventos", methods=["GET"])
def listar_eventos():
    eventos = Evento.query.all()

    lista = []
    for e in eventos:
        lista.append({
            "id": e.id,
            "titulo": e.titulo,
            "data": e.data,
            "local": e.local,
            "emoji": e.imagem,
            "preco": e.preco,
            "criado_em": e.criado_em.isoformat()
        })

    return jsonify(lista), 200

@app.route("/evento/<int:evento_id>", methods=["GET"])
def obter_evento(evento_id):
    evento = Evento.query.get(evento_id)

    if not evento:
        return jsonify({"mensagem": "Evento não encontrado"}), 404

    tipos_ingresso = []
    for ti in evento.tipos_ingresso:
        tipos_ingresso.append({
            "id": ti.id,
            "nome": ti.nome,
            "descricao": ti.descricao,
            "preco": ti.preco,
            "quantidade_disponivel": ti.quantidade_disponivel
        })

    return jsonify({
        "id": evento.id,
        "titulo": evento.titulo,
        "data": evento.data,
        "local": evento.local,
        "emoji": evento.imagem,
        "preco": evento.preco,
        "tipos_ingresso": tipos_ingresso
    }), 200

@app.route("/criar-evento", methods=["POST"])
def criar_evento():
    dados = request.get_json()

    titulo = dados.get("titulo", "").strip()
    data = dados.get("data", "").strip()
    local = dados.get("local", "").strip()
    preco = dados.get("preco", 0)
    emoji = dados.get("emoji", "🎉")
    tipos_ingresso = dados.get("tipos_ingresso", [])

    if not titulo or not data or not local or preco <= 0:
        return jsonify({"mensagem": "Preencha todos os campos corretamente"}), 400

    # Validar formato de data (DD/MM/YYYY)
    try:
        datetime.strptime(data, "%d/%m/%Y")
    except ValueError:
        return jsonify({"mensagem": "Data inválida. Use o formato DD/MM/YYYY"}), 400

    novo_evento = Evento(
        titulo=titulo,
        data=data,
        local=local,
        imagem=emoji,
        preco=float(preco)
    )

    db.session.add(novo_evento)
    db.session.flush()

    # Adicionar tipos de ingresso
    if tipos_ingresso:
        for ti in tipos_ingresso:
            tipo = TipoIngresso(
                evento_id=novo_evento.id,
                nome=ti.get("nome"),
                descricao=ti.get("descricao", ""),
                preco=float(ti.get("preco", 0)),
                quantidade_disponivel=int(ti.get("quantidade_disponivel", 100))
            )
            db.session.add(tipo)

    db.session.commit()

    return jsonify({
        "mensagem": "Evento cadastrado com sucesso",
        "evento": {
            "id": novo_evento.id,
            "titulo": novo_evento.titulo,
            "data": novo_evento.data,
            "local": novo_evento.local,
            "emoji": novo_evento.imagem,
            "preco": novo_evento.preco
        }
    }), 201

@app.route("/editar-evento/<int:evento_id>", methods=["PUT"])
def editar_evento(evento_id):
    dados = request.get_json()
    evento = Evento.query.get(evento_id)

    if not evento:
        return jsonify({"mensagem": "Evento não encontrado"}), 404

    titulo = dados.get("titulo", "").strip()
    data = dados.get("data", "").strip()
    local = dados.get("local", "").strip()
    preco = dados.get("preco", 0)
    emoji = dados.get("emoji", "🎉")
    tipos_ingresso = dados.get("tipos_ingresso", [])

    if not titulo or not data or not local or preco <= 0:
        return jsonify({"mensagem": "Preencha todos os campos corretamente"}), 400

    # Validar formato de data
    try:
        datetime.strptime(data, "%d/%m/%Y")
    except ValueError:
        return jsonify({"mensagem": "Data inválida. Use o formato DD/MM/YYYY"}), 400

    evento.titulo = titulo
    evento.data = data
    evento.local = local
    evento.imagem = emoji
    evento.preco = float(preco)

    # Deletar tipos de ingresso antigos
    TipoIngresso.query.filter_by(evento_id=evento_id).delete()

    # Adicionar novos tipos de ingresso
    if tipos_ingresso:
        for ti in tipos_ingresso:
            tipo = TipoIngresso(
                evento_id=evento_id,
                nome=ti.get("nome"),
                descricao=ti.get("descricao", ""),
                preco=float(ti.get("preco", 0)),
                quantidade_disponivel=int(ti.get("quantidade_disponivel", 100))
            )
            db.session.add(tipo)

    db.session.commit()

    return jsonify({
        "mensagem": "Evento atualizado com sucesso",
        "evento": {
            "id": evento.id,
            "titulo": evento.titulo,
            "data": evento.data,
            "local": evento.local,
            "emoji": evento.imagem,
            "preco": evento.preco
        }
    }), 200

@app.route("/deletar-evento/<int:evento_id>", methods=["DELETE"])
def deletar_evento(evento_id):
    evento = Evento.query.get(evento_id)

    if not evento:
        return jsonify({"mensagem": "Evento não encontrado"}), 404

    db.session.delete(evento)
    db.session.commit()

    return jsonify({"mensagem": "Evento deletado com sucesso"}), 200

# ==================== SEED ====================

@app.route("/seed-eventos", methods=["POST"])
def seed_eventos():
    if Evento.query.first():
        return jsonify({"mensagem": "Eventos já cadastrados"}), 200

    eventos_data = [
        {
            "titulo": "Festival de Rock",
            "data": "20/04/2026",
            "local": "São Paulo",
            "emoji": "🎸",
            "preco": 80,
            "tipos": [
                {"nome": "Inteira", "descricao": "Ingresso inteiro", "preco": 100, "quantidade": 100},
                {"nome": "Meia Entrada", "descricao": "Meia entrada", "preco": 50, "quantidade": 50},
                {"nome": "Meia Social", "descricao": "Meia entrada - comprovante de baixa renda", "preco": 50, "quantidade": 30},
            ]
        },
        {
            "titulo": "Show Pop Night",
            "data": "10/05/2026",
            "local": "Rio de Janeiro",
            "emoji": "🎤",
            "preco": 120,
            "tipos": [
                {"nome": "Inteira", "descricao": "Ingresso inteiro", "preco": 150, "quantidade": 150},
                {"nome": "Meia Entrada", "descricao": "Meia entrada", "preco": 75, "quantidade": 100},
                {"nome": "Meia Idoso", "descricao": "Meia entrada - 60+ anos", "preco": 75, "quantidade": 40},
                {"nome": "Meia PCD", "descricao": "Meia entrada - Pessoa com deficiência", "preco": 75, "quantidade": 20},
            ]
        },
        {
            "titulo": "Noite Eletrônica",
            "data": "15/06/2026",
            "local": "Belo Horizonte",
            "emoji": "🎵",
            "preco": 90,
            "tipos": [
                {"nome": "Inteira", "descricao": "Ingresso inteiro", "preco": 120, "quantidade": 200},
                {"nome": "Meia Entrada", "descricao": "Meia entrada", "preco": 60, "quantidade": 150},
                {"nome": "Meia Social", "descricao": "Meia entrada - comprovante de baixa renda", "preco": 60, "quantidade": 80},
            ]
        }
    ]

    for evento_data in eventos_data:
        evento = Evento(
            titulo=evento_data["titulo"],
            data=evento_data["data"],
            local=evento_data["local"],
            imagem=evento_data["emoji"],
            preco=evento_data["preco"]
        )
        db.session.add(evento)
        db.session.flush()

        for tipo_data in evento_data["tipos"]:
            tipo = TipoIngresso(
                evento_id=evento.id,
                nome=tipo_data["nome"],
                descricao=tipo_data["descricao"],
                preco=tipo_data["preco"],
                quantidade_disponivel=tipo_data["quantidade"]
            )
            db.session.add(tipo)

    db.session.commit()

    return jsonify({"mensagem": "Eventos inseridos com sucesso"}), 201

if __name__ == "__main__":
    app.run(debug=True)