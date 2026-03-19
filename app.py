from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
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


class Evento(db.Model):
    __tablename__ = "eventos"

    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(150))
    data = db.Column(db.String(50))
    local = db.Column(db.String(100))
    imagem = db.Column(db.String(255))
    preco = db.Column(db.Float)

with app.app_context():
    db.create_all()

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
        senha=senha_hash
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
            "email": usuario.email
        }
    }), 200

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
            "imagem": e.imagem,
            "preco": e.preco
        })

    return jsonify(lista), 200

@app.route("/seed-eventos", methods=["POST"])
def seed_eventos():
    if Evento.query.first():
        return jsonify({"mensagem": "Eventos já cadastrados"}), 200

    eventos = [
        Evento(titulo="Festival de Rock", data="2026-04-20", local="São Paulo", imagem="", preco=80),
        Evento(titulo="Show Pop Night", data="2026-05-10", local="Rio de Janeiro", imagem="", preco=120),
        Evento(titulo="Noite Eletrônica", data="2026-06-15", local="Belo Horizonte", imagem="", preco=90),
    ]

    db.session.bulk_save_objects(eventos)
    db.session.commit()

    return jsonify({"mensagem": "Eventos inseridos com sucesso"}), 201

if __name__ == "__main__":
    app.run(debug=True)