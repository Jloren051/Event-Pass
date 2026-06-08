from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from datetime import datetime
from werkzeug.utils import secure_filename
from functools import wraps
import bcrypt
import uuid
import os
import mercadopago
import json
 
load_dotenv()


app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), 'templates'),
    static_folder=os.path.join(os.path.dirname(__file__), 'static'),
    static_url_path='/static'
)

CORS(app)

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DB_URI")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["UPLOAD_FOLDER"] = os.path.join(app.static_folder, 'uploads')

if not os.path.exists(app.config["UPLOAD_FOLDER"]):
    os.makedirs(app.config["UPLOAD_FOLDER"])

db = SQLAlchemy(app)

MERCADOPAGO_TOKEN = "APP_USR-4215736688545258-060516-44b2435ec76016486122d16fe0df96b9-1225559296"
mp_sdk = mercadopago.SDK(MERCADOPAGO_TOKEN)

class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    senha = db.Column(db.LargeBinary, nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    compras = db.relationship("IngressoComprado", back_populates="usuario", lazy=True, cascade="all, delete-orphan")


class Evento(db.Model):
    __tablename__ = "eventos"

    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(150), nullable=False)
    data = db.Column(db.String(50), nullable=False)
    local = db.Column(db.String(100), nullable=False)
    imagem_url = db.Column(db.String(255), nullable=True)
    preco = db.Column(db.Float, nullable=False)
    tipos_ingresso = db.relationship("TipoIngresso", backref="evento", lazy=True, cascade="all, delete-orphan")
    categoria = db.Column(db.String(50), nullable=True)
    genero_musical = db.Column(db.String(50), nullable=True)


class TipoIngresso(db.Model):
    __tablename__ = "tipos_ingresso"

    id = db.Column(db.Integer, primary_key=True)
    evento_id = db.Column(db.Integer, db.ForeignKey("eventos.id"), nullable=False)
    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.String(255))
    preco = db.Column(db.Float, nullable=False)
    quantidade_disponivel = db.Column(db.Integer, default=100)

class IngressoComprado(db.Model):
    __tablename__ = "ingressos_comprados"

    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(100), unique=True, nullable=False)
    data_compra = db.Column(db.DateTime, default=datetime.utcnow)
    
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    evento_id = db.Column(db.Integer, db.ForeignKey("eventos.id"), nullable=False)
    tipo_ingresso_id = db.Column(db.Integer, db.ForeignKey("tipos_ingresso.id"), nullable=False)
    
    quantidade = db.Column(db.Integer, nullable=False)
    preco_total = db.Column(db.Float, nullable=False)

    usuario = db.relationship("Usuario", back_populates="compras")
    evento = db.relationship("Evento")
    tipo_ingresso = db.relationship("TipoIngresso")

with app.app_context():
    db.create_all()

    if not Usuario.query.filter_by(is_admin=True).first():
        print("\n⚠️  Nenhum administrador encontrado. Criando admin padrão...")

        admin_email = "admin@eventpass.com"
        admin_senha = "adminpassword"
        
        usuario_existente = Usuario.query.filter_by(email=admin_email).first()
        if usuario_existente:
            usuario_existente.is_admin = True
        else:
            senha_hash = bcrypt.hashpw(admin_senha.encode("utf-8"), bcrypt.gensalt())
            admin = Usuario(nome="Admin", email=admin_email, senha=senha_hash, is_admin=True)
            db.session.add(admin)
        
        db.session.commit()
        print(f"✅ Administrador criado com sucesso! Use estas credenciais para login:")
        print(f"   Email: {admin_email} | Senha: {admin_senha}\n")
    
    if not Evento.query.first():
        print("\n🌱 Criando eventos padrão...\n")
        
        eventos_data = [
            {
                "titulo": "Festa Eletrônica 2026",
                "data": "15/04/2026",
                "local": "São Paulo",
                "imagem_url": "/static/uploads/placeholder_festa.jpg",
                "preco": 80,
                "categoria": "Festa",
                "genero_musical": "Eletrônica",
                "tipos": [ 
                    {"nome": "Inteira", "descricao": "Ingresso inteiro", "preco": 80, "quantidade": 100},
                    {"nome": "Meia Entrada", "descricao": "Meia entrada", "preco": 40, "quantidade": 50}
                ]
            },
            {
                "titulo": "Show de Rock",
                "data": "20/05/2026",
                "local": "Rio de Janeiro",
                "imagem_url": "/static/uploads/placeholder_show.jpg",
                "preco": 100,
                "categoria": "Show",
                "genero_musical": "Rock",
                "tipos": [ 
                    {"nome": "Inteira", "descricao": "Ingresso inteiro", "preco": 100, "quantidade": 100},
                    {"nome": "Meia Entrada", "descricao": "Meia entrada", "preco": 50, "quantidade": 50},
                    {"nome": "Meia Idoso", "descricao": "60+ anos", "preco": 50, "quantidade": 30}
                ]
            },
            {
                "titulo": "Festival de Música",
                "data": "10/06/2026",
                "local": "Belo Horizonte",
                "imagem_url": "/static/uploads/placeholder_festival.jpg",
                "preco": 120,
                "categoria": "Festival",
                "genero_musical": "Variado",
                "tipos": [ 
                    {"nome": "Inteira", "descricao": "Ingresso inteiro", "preco": 120, "quantidade": 100},
                    {"nome": "Meia Entrada", "descricao": "Meia entrada", "preco": 60, "quantidade": 50},
                    {"nome": "Meia Social", "descricao": "Comprovante de baixa renda", "preco": 60, "quantidade": 40}
                ]
            }
        ]
        
        for evento_data in eventos_data:
            evento = Evento(
                titulo=evento_data["titulo"],
                data=evento_data["data"],
                local=evento_data["local"],
                imagem_url=evento_data["imagem_url"],
                preco=evento_data["preco"],
                categoria=evento_data["categoria"],
                genero_musical=evento_data["genero_musical"]
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
        print("✅ 3 eventos criados com sucesso!\n")

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


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = None
        
        if request.is_json:
            json_data = request.get_json(silent=True)
            if json_data:
                user_id = json_data.get("user_id")
        elif request.form:
            user_id = request.form.get('user_id')
        
        if not user_id:
            user_id = request.args.get('user_id')

        if not user_id:
            return jsonify({"mensagem": "Autenticação necessária (ID de usuário ausente)."}), 401

        try:
            usuario = db.session.get(Usuario, int(user_id))
        except (ValueError, TypeError):
            return jsonify({"mensagem": "ID de usuário inválido."}), 400

        if not usuario or not usuario.is_admin:
            return jsonify({"mensagem": "Acesso negado. Requer permissão de administrador."}), 403
            
        return f(*args, **kwargs)
    return decorated_function

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

@app.route("/eventos", methods=["GET"])
def listar_eventos():
    try:
        query = Evento.query

        preco_max = request.args.get('preco_max', type=float)
        categoria = request.args.get('categoria', type=str)
        genero = request.args.get('genero', type=str)
        titulo = request.args.get('titulo', type=str)

        if preco_max is not None and preco_max < 300:
            query = query.filter(Evento.preco <= preco_max)
        
        if categoria and categoria != 'todos':
            query = query.filter(Evento.categoria == categoria)
        
        if genero and genero != 'todos':
            query = query.filter(Evento.genero_musical == genero)

        if titulo:
            query = query.filter(Evento.titulo.ilike(f'%{titulo}%'))

        eventos = query.order_by(Evento.data).all()

        lista = []
        for e in eventos:
            lista.append({
                "id": e.id,
                "titulo": e.titulo,
                "data": e.data,
                "local": e.local,
                "imagem_url": e.imagem_url,
                "preco": e.preco
            })

        return jsonify(lista), 200
    except Exception as err:
        print(f"Erro ao listar eventos: {err}")
        return jsonify([]), 200

@app.route("/evento/<int:evento_id>", methods=["GET"])
def obter_evento(evento_id):
    evento = db.session.get(Evento, evento_id)

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
        "imagem_url": evento.imagem_url,
        "preco": evento.preco,
        "categoria": evento.categoria,
        "genero_musical": evento.genero_musical,
        "tipos_ingresso": tipos_ingresso
    }), 200

@app.route("/criar-evento", methods=["POST"])
@admin_required
def criar_evento():
    titulo = request.form.get("titulo", "").strip()
    data = request.form.get("data", "").strip()
    local = request.form.get("local", "").strip()
    categoria = request.form.get("categoria", "Outro")
    genero_musical = request.form.get("genero_musical", "N/A")
    tipos_ingresso_json = request.form.get("tipos_ingresso", "[]")
    tipos_ingresso = json.loads(tipos_ingresso_json)
    
    try:
        preco = float(request.form.get("preco", 0))
    except (ValueError, TypeError):
        return jsonify({"mensagem": "Preço inválido"}), 400

    if not titulo or not data or not local or preco <= 0:
        return jsonify({"mensagem": "Preencha todos os campos corretamente"}), 400

    imagem_url = None
    if 'imagem' in request.files:
        file = request.files['imagem']
        if file and file.filename != '':
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
            imagem_url = f"/static/uploads/{unique_filename}"

    try:
        datetime.strptime(data, "%d/%m/%Y")
    except ValueError:
        return jsonify({"mensagem": "Data inválida. Use o formato DD/MM/YYYY"}), 400

    novo_evento = Evento(
        titulo=titulo,
        data=data,
        local=local,
        imagem_url=imagem_url,
        preco=float(preco),
        categoria=categoria,
        genero_musical=genero_musical
    )

    db.session.add(novo_evento)
    db.session.flush()

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
            "imagem_url": novo_evento.imagem_url,
            "preco": novo_evento.preco
        }
    }), 201

@app.route("/editar-evento/<int:evento_id>", methods=["PUT"])
@admin_required
def editar_evento(evento_id):
    evento = db.session.get(Evento, evento_id)

    if not evento:
        return jsonify({"mensagem": "Evento não encontrado"}), 404

    titulo = request.form.get("titulo", "").strip()
    data = request.form.get("data", "").strip()
    local = request.form.get("local", "").strip()
    categoria = request.form.get("categoria", "Outro")
    genero_musical = request.form.get("genero_musical", "N/A")
    tipos_ingresso_json = request.form.get("tipos_ingresso", "[]")
    tipos_ingresso = json.loads(tipos_ingresso_json)
    
    try:
        preco = float(request.form.get("preco", 0))
    except (ValueError, TypeError):
        return jsonify({"mensagem": "Preço inválido"}), 400

    if not titulo or not data or not local or preco <= 0:
        return jsonify({"mensagem": "Preencha todos os campos corretamente"}), 400

    try:
        datetime.strptime(data, "%d/%m/%Y")
    except ValueError:
        return jsonify({"mensagem": "Data inválida. Use o formato DD/MM/YYYY"}), 400

    if 'imagem' in request.files:
        file = request.files['imagem']
        if file and file.filename != '':
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
            evento.imagem_url = f"/static/uploads/{unique_filename}"

    evento.titulo = titulo
    evento.data = data
    evento.local = local
    evento.preco = float(preco)
    evento.categoria = categoria
    evento.genero_musical = genero_musical

    TipoIngresso.query.filter_by(evento_id=evento_id).delete()

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
            "imagem_url": evento.imagem_url,
            "preco": evento.preco
        }
    }), 200

@app.route("/deletar-evento/<int:evento_id>", methods=["DELETE"])
@admin_required
def deletar_evento(evento_id):
    evento = db.session.get(Evento, evento_id)

    if not evento:
        return jsonify({"mensagem": "Evento não encontrado"}), 404

    db.session.delete(evento)
    db.session.commit()

    return jsonify({"mensagem": "Evento deletado com sucesso"}), 200

@app.route("/criar-pagamento-mp", methods=["POST"])
def criar_pagamento_mp():
    dados = request.get_json()
    usuario_id = dados.get("usuario_id")
    carrinho = dados.get("carrinho")

    if not usuario_id or not carrinho:
        return jsonify({"mensagem": "Dados da requisição inválidos"}), 400

    usuario = db.session.get(Usuario, usuario_id)
    if not usuario:
        return jsonify({"mensagem": "Usuário não encontrado"}), 404

    total_price = sum(item.get("total", 0) for item in carrinho)
    if total_price <= 0:
        return jsonify({"mensagem": "O valor total da compra deve ser maior que zero."}), 400

    items_description = ", ".join([f"{item['quantidade']}x {item['tipo_nome']}" for item in carrinho])

    payment_data = {
        "transaction_amount": round(float(total_price), 2),
        "description": items_description,
        "payment_method_id": "pix",
        "payer": {
            "email": usuario.email,
        }
    }

    try:
        print(f"ℹ️  Criando pagamento no Mercado Pago para o usuário {usuario.email} no valor de {total_price}")
        request_options = mercadopago.config.RequestOptions()
        request_options.custom_headers = { 'x-idempotency-key': str(uuid.uuid4()) }

        payment_result = mp_sdk.payment().create(payment_data, request_options)
        payment = payment_result.get("response")

        if payment_result.get("status") in [200, 201]:
            print(f"✅ Pagamento criado com sucesso! ID: {payment['id']}")
            return jsonify({
                "payment_id": payment["id"],
                "qr_code_base64": payment["point_of_interaction"]["transaction_data"]["qr_code_base64"],
                "qr_code": payment["point_of_interaction"]["transaction_data"]["qr_code"]
            }), 201
        else:
            print("❌ Erro na API do Mercado Pago. Status:", payment_result.get("status"))
            print("   Detalhes do erro:", payment)
            
            error_message = "Erro ao criar pagamento no Mercado Pago."
            if payment and 'message' in payment:
                error_message = payment['message']
            
            return jsonify({"mensagem": error_message, "details": payment}), payment_result.get("status", 500)

    except Exception as e:
        print(f"🚨 Exceção ao criar pagamento no Mercado Pago: {e}")
        return jsonify({"mensagem": "Erro interno ao se comunicar com o serviço de pagamento."}), 500

@app.route("/processar-pagamento-cartao", methods=["POST"])
def processar_pagamento_cartao():
    data = request.get_json()
    token = data.get("token")
    issuer_id = data.get("issuer_id")
    payment_method_id = data.get("payment_method_id")
    installments = data.get("installments")
    carrinho = data.get("carrinho")
    usuario_id = data.get("usuario_id")
    payer_data = data.get("payer", {})

    if not all([token, payment_method_id, installments, carrinho, usuario_id, payer_data]):
        return jsonify({"mensagem": "Dados de pagamento incompletos."}), 400

    usuario = db.session.get(Usuario, usuario_id)
    if not usuario:
        return jsonify({"mensagem": "Usuário não encontrado."}), 404

    total_price = sum(item.get("total", 0) for item in carrinho)
    if total_price <= 0:
        return jsonify({"mensagem": "O valor total da compra deve ser maior que zero."}), 400

    cardholder_name = payer_data.get("name", "")
    name_parts = cardholder_name.strip().split(' ')
    first_name = name_parts[0]
    last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''

    payment_data = {
        "transaction_amount": round(float(total_price), 2),
        "token": token,
        "installments": int(installments),
        "payment_method_id": payment_method_id,
        "issuer_id": issuer_id,
        "payer": {
            "email": payer_data.get("email"),
            "first_name": first_name,
            "last_name": last_name,
            "identification": {
                "type": payer_data.get("identification", {}).get("type"),
                "number": payer_data.get("identification", {}).get("number")
            }
        }
    }

    try:
        payment_response = mp_sdk.payment().create(payment_data)
        payment = payment_response.get("response")

        if payment and payment.get("status") == "approved":
            for item in carrinho:
                tipo_ingresso = db.session.get(TipoIngresso, item.get("tipo_ingresso_id"))
                if not tipo_ingresso or tipo_ingresso.quantidade_disponivel < int(item.get("quantidade")):
                    db.session.rollback()
                    # Idealmente, aqui você deveria tentar fazer o estorno do pagamento
                    return jsonify({"mensagem": f"Estoque insuficiente para '{tipo_ingresso.nome}'. O pagamento foi aprovado, mas a compra falhou. Contate o suporte."}), 409

                tipo_ingresso.quantidade_disponivel -= int(item.get("quantidade"))
                nova_compra = IngressoComprado(
                    codigo=f"EVT-{tipo_ingresso.evento_id}-{usuario_id}-{str(uuid.uuid4())[:8].upper()}",
                    usuario_id=usuario_id,
                    evento_id=item.get("evento_id"),
                    tipo_ingresso_id=item.get("tipo_ingresso_id"),
                    quantidade=int(item.get("quantidade")),
                    preco_total=float(item.get("total"))
                )
                db.session.add(nova_compra)
            
            db.session.commit()
            return jsonify({"mensagem": "Pagamento aprovado e ingressos gerados com sucesso!"}), 201
        else:
            print("❌ Pagamento com cartão falhou. Resposta da API:")
            print(json.dumps(payment, indent=4))
            
            error_message = "Pagamento recusado."
            if payment and payment.get('message'):
                error_message = payment.get('message')
            elif payment and payment.get('status_detail'):
                error_message = payment.get('status_detail')

            return jsonify({"mensagem": error_message}), 402
    except Exception as e:
        db.session.rollback()
        return jsonify({"mensagem": f"Erro ao processar pagamento com cartão: {e}"}), 500

@app.route("/comprar-ingressos", methods=["POST"])
def comprar_ingressos():
    dados = request.get_json()
    usuario_id = dados.get("usuario_id")
    carrinho = dados.get("carrinho")
    payment_id = dados.get("payment_id")

    if not all([usuario_id, carrinho, payment_id]):
        return jsonify({"mensagem": "Dados da requisição inválidos"}), 400

    try:
        payment_info = mp_sdk.payment().get(payment_id)
        if payment_info.get("status") not in [200, 201]:
            print(f"⚠️  Pagamento com ID {payment_id} não encontrado no Mercado Pago.")
            return jsonify({"mensagem": "Pagamento não encontrado no Mercado Pago."}), 404
        
        payment = payment_info["response"]
        print(f"ℹ️  Verificando pagamento {payment_id}. Status: {payment.get('status')}, Detalhe: {payment.get('status_detail')}")
        if payment.get("status") != "approved":
            status_detail = payment.get('status_detail', 'desconhecido')
            mensagem = f"Pagamento ainda não foi aprovado. Status: {status_detail}. Tente novamente em alguns instantes ou pague o PIX."
            return jsonify({"mensagem": mensagem}), 402
    except Exception as e:
        print(f"🚨 Exceção ao verificar pagamento no Mercado Pago: {e}")
        return jsonify({"mensagem": "Erro ao verificar o status do pagamento com o provedor."}), 500

    usuario = db.session.get(Usuario, usuario_id)
    if not usuario:
        return jsonify({"mensagem": "Usuário não encontrado"}), 404

    try:
        for item in carrinho:
            tipo_ingresso = db.session.get(TipoIngresso, item.get("tipo_ingresso_id"))
            if not tipo_ingresso:
                return jsonify({"mensagem": f"Tipo de ingresso ID {item.get('tipo_ingresso_id')} não encontrado."}), 404

            quantidade_comprada = int(item.get("quantidade"))
            if tipo_ingresso.quantidade_disponivel < quantidade_comprada:
                return jsonify({"mensagem": f"Estoque insuficiente para '{tipo_ingresso.nome}'."}), 400

            tipo_ingresso.quantidade_disponivel -= quantidade_comprada

            nova_compra = IngressoComprado(
                codigo=f"EVT-{tipo_ingresso.evento_id}-{usuario_id}-{str(uuid.uuid4())[:8].upper()}",
                usuario_id=usuario_id,
                evento_id=item.get("evento_id"),
                tipo_ingresso_id=item.get("tipo_ingresso_id"),
                quantidade=quantidade_comprada,
                preco_total=float(item.get("total"))
            )
            db.session.add(nova_compra)

        db.session.commit()
        return jsonify({"mensagem": "Compra realizada com sucesso! Seus ingressos foram gerados."}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Erro ao processar compra: {e}")
        return jsonify({"mensagem": "Ocorreu um erro ao processar sua compra."}), 500

@app.route("/meus-ingressos/<int:usuario_id>", methods=["GET"])
def meus_ingressos(usuario_id):
    if not db.session.get(Usuario, usuario_id):
        return jsonify({"mensagem": "Usuário não encontrado"}), 404

    compras = IngressoComprado.query.filter_by(usuario_id=usuario_id).order_by(IngressoComprado.data_compra.desc()).all()

    lista_ingressos = []
    for compra in compras:
        try:
            data_evento_obj = datetime.strptime(compra.evento.data, "%d/%m/%Y")
            status = "próximo" if data_evento_obj.date() >= datetime.utcnow().date() else "passado"
        except ValueError:
            status = "indefinido"

        lista_ingressos.append({
            "codigo": compra.codigo,
            "data_compra": compra.data_compra.strftime("%d/%m/%Y %H:%M"),
            "quantidade": compra.quantidade,
            "preco_total": compra.preco_total,
            "evento": {
                "titulo": compra.evento.titulo, "data": compra.evento.data, "local": compra.evento.local,
                "imagem_url": compra.evento.imagem_url, "status": status
            },
            "tipo_ingresso": {"nome": compra.tipo_ingresso.nome}
        })

    return jsonify(lista_ingressos), 200

@app.route("/seed-eventos", methods=["POST"])
def seed_eventos():
    if Evento.query.first():
        return jsonify({"mensagem": "Eventos já cadastrados"}), 200

    eventos_data = [
        {
            "titulo": "Festival de Rock",
            "data": "20/04/2026",
            "local": "São Paulo",
            "imagem_url": None,
            "preco": 80,
            "categoria": "Show",
            "genero_musical": "Rock",
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
            "imagem_url": None,
            "preco": 120,
            "categoria": "Festa",
            "genero_musical": "Pop",
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
            "imagem_url": None,
            "preco": 90,
            "categoria": "Festival",
            "genero_musical": "Eletrônica",
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
            imagem_url=evento_data["imagem_url"],
            preco=evento_data["preco"],
            categoria=evento_data["categoria"],
            genero_musical=evento_data["genero_musical"]
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
