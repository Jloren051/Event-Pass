let currentUser = null;
let eventos = [];
let eventoSelecionado = null;
const generosMusicais = [
  "Rock",
  "Pop",
  "Eletrônica",
  "Sertanejo",
  "Funk",
  "Pagode",
  "Variado",
  "N/A",
];

const eventosPadrao = [
  {
    id: 1,
    titulo: "Festa Eletrônica 2026",
    data: "15/04/2026",
    local: "São Paulo",
    imagem_url: null,
    preco: 80,
    tipos_ingresso: [],
  },
  {
    id: 2,
    titulo: "Show de Rock",
    data: "20/05/2026",
    local: "Rio de Janeiro",
    imagem_url: null,
    preco: 100,
    tipos_ingresso: [],
  },
  {
    id: 3,
    titulo: "Festival de Música",
    data: "10/06/2026",
    local: "Belo Horizonte",
    imagem_url: null,
    preco: 120,
    tipos_ingresso: [],
  },
];

// ==================== FUNÇÕES AUXILIARES ====================

function showScreen(screenId) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");
}

function updateNavbar() {
  const userInfo = document.getElementById("user-info");
  const authButtons = document.getElementById("auth-buttons");
  const adminBtn = document.getElementById("admin-btn");
  const myTicketsBtn = document.getElementById("my-tickets-btn");
  const userDashboardBtn = document.getElementById("user-dashboard-btn");

  if (currentUser) {
    userInfo.style.display = "flex";
    authButtons.style.display = "none";
    document.getElementById("username-display").textContent = currentUser.nome;
    adminBtn.style.display = currentUser.is_admin ? "block" : "none";
    myTicketsBtn.style.display = "block";
    userDashboardBtn.style.display = "block";
  } else {
    userInfo.style.display = "none";
    authButtons.style.display = "flex";
    adminBtn.style.display = "none";
    myTicketsBtn.style.display = "none";
    userDashboardBtn.style.display = "none";
  }
}

// ==================== EVENTOS ====================

async function carregarEventos() {
  const priceFilter = document.getElementById("price-filter");
  const categoryFilter = document.getElementById("category-filter");
  const genreFilter = document.getElementById("genre-filter");
  const searchFilter = document.getElementById("search-filter");

  const preco_max = priceFilter ? priceFilter.value : 300;
  const categoria = categoryFilter ? categoryFilter.value : "todos";
  const genero = genreFilter ? genreFilter.value : "todos";
  const titulo = searchFilter ? searchFilter.value.trim() : "";

  // Build query string
  const params = new URLSearchParams();
  if (preco_max < 300) {
    params.append('preco_max', preco_max);
  }
  if (categoria !== 'todos') {
    params.append('categoria', categoria);
  }
  if (genero !== 'todos') {
    params.append('genero', genero);
  }
  if (titulo) {
    params.append('titulo', titulo);
  }
  
  const queryString = params.toString();
  const url = `/eventos${queryString ? '?' + queryString : ''}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    eventos = res.ok ? data : [];
  } catch {
    eventos = [];
  }
  renderEventos();
}

function renderEventos() {
  const container = document.getElementById("events-grid");
  const noEventsMsg = document.getElementById("no-events-found");

  if (eventos.length === 0) {
      container.innerHTML = "";
      if (noEventsMsg) noEventsMsg.style.display = "block";
      return;
  }

  if (noEventsMsg) noEventsMsg.style.display = "none";
  container.innerHTML = eventos
    .map(
      (e) => `
        <div class="event-card" onclick="selecionarEvento(${e.id})">
            <img src="${e.imagem_url || '/static/uploads/placeholder_default.jpg'}" alt="${e.titulo}" class="event-image" onerror="this.onerror=null;this.src='/static/uploads/placeholder_default.jpg';"/>
            <div class="event-content">
                <div class="event-title">${e.titulo}</div>
                <div class="event-date">📅 ${e.data}</div>
                <div class="event-location">📍 ${e.local}</div>
                <div class="event-price">R$ ${e.preco}</div>
            </div>
        </div>
    `,
    )
    .join("");
}

async function selecionarEvento(eventoId) {
  try {
    const res = await fetch(`/evento/${eventoId}`);
    const evento = await res.json();

    if (res.ok) {
      eventoSelecionado = evento;
      document.getElementById("event-title-ticket").textContent = evento.titulo;
      renderTiposIngresso(evento.tipos_ingresso);
      showScreen("ticket-type-screen");
    }
  } catch (err) {
    console.error("Erro ao carregar evento:", err);
    alert("Erro ao carregar tipos de ingresso");
  }
}

function renderTiposIngresso(tipos) {
  const container = document.getElementById("ticket-types");

  if (!tipos || tipos.length === 0) {
    container.innerHTML =
      '<p style="color: var(--border-color);">Nenhum tipo de ingresso disponível</p>';
    return;
  }

  container.innerHTML = tipos
    .map(
      (tipo, index) => `
        <div class="ticket-type-card">
            <div class="ticket-type-header">
                <div>
                    <div class="ticket-type-name">${tipo.nome}</div>
                    <div class="ticket-type-description">${tipo.descricao || ""}</div>
                </div>
                <div class="ticket-type-price">R$ ${tipo.preco.toFixed(2)}</div>
            </div>
            <div class="ticket-type-info">
                <span>Disponível: ${tipo.quantidade_disponivel}</span>
            </div>
            <div class="ticket-type-actions">
                <select class="quantity-select" id="qty-${index}">
                    ${Array.from(
                      { length: Math.min(tipo.quantidade_disponivel, 10) },
                      (_, i) => `<option value="${i + 1}">${i + 1}</option>`,
                    ).join("")}
                </select>
                <button class="add-to-cart-btn" onclick="adicionarAoCarrinho(${index})">Adicionar</button>
            </div>
        </div>
    `,
    )
    .join("");
}

function adicionarAoCarrinho(tipoIndex) {
  if (!currentUser) {
    alert("Você precisa estar logado para adicionar itens ao carrinho.");
    showScreen("login-screen");
    return;
  }

  if (!eventoSelecionado) return;

  const tipo = eventoSelecionado.tipos_ingresso[tipoIndex];
  const quantidade = parseInt(
    document.getElementById(`qty-${tipoIndex}`).value,
  );

  let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

  // Verifica se o item já existe no carrinho
  const itemExistenteIndex = carrinho.findIndex(
    (item) =>
      item.evento_id === eventoSelecionado.id &&
      item.tipo_ingresso_id === tipo.id,
  );

  if (itemExistenteIndex > -1) {
    // Se existe, atualiza a quantidade
    carrinho[itemExistenteIndex].quantidade += quantidade;
    carrinho[itemExistenteIndex].total =
      carrinho[itemExistenteIndex].quantidade *
      carrinho[itemExistenteIndex].preco_unitario;
  } else {
    // Se não existe, adiciona novo item
    const item = {
      evento_id: eventoSelecionado.id,
      evento_titulo: eventoSelecionado.titulo,
      tipo_ingresso_id: tipo.id,
      tipo_nome: tipo.nome,
      preco_unitario: tipo.preco,
      quantidade: quantidade,
      total: tipo.preco * quantidade,
    };
    carrinho.push(item);
  }

  localStorage.setItem("carrinho", JSON.stringify(carrinho));

  alert(`${quantidade}x ${tipo.nome} adicionado ao carrinho!`);
  atualizarContadorCarrinho();
}

function atualizarContadorCarrinho() {
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  const total = carrinho.reduce((sum, item) => sum + item.quantidade, 0);
  document.getElementById("cart-count").textContent = total;
}

// ==================== CARRINHO ====================

function renderCarrinho() {
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  const itemsContainer = document.getElementById("cart-items");
  const summary = document.getElementById("cart-summary");
  const emptyMsg = document.getElementById("cart-empty");

  if (carrinho.length === 0) {
    itemsContainer.innerHTML = "";
    summary.style.display = "none";
    emptyMsg.style.display = "block";
    return;
  }

  summary.style.display = "block";
  emptyMsg.style.display = "none";

  itemsContainer.innerHTML = carrinho
    .map(
      (item, index) => `
    <div class="cart-item">
        <div class="cart-item-info">
            <div class="cart-item-title">${item.evento_titulo}</div>
            <div class="cart-item-ticket">${item.tipo_nome}</div>
            <div class="cart-item-price">
                ${item.quantidade} x R$ ${item.preco_unitario.toFixed(2)}
            </div>
        </div>
        <div class="cart-item-total">
            <span>R$ ${item.total.toFixed(2)}</span>
            <button class="btn-remove" onclick="removerDoCarrinho(${index})">Remover</button>
        </div>
    </div>
    `,
    )
    .join("");

  const totalTickets = carrinho.reduce((sum, item) => sum + item.quantidade, 0);
  const totalPrice = carrinho.reduce((sum, item) => sum + item.total, 0);

  document.getElementById("total-tickets").textContent = totalTickets;
  document.getElementById("total-price").textContent = totalPrice.toFixed(2);
}

function removerDoCarrinho(index) {
  let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  carrinho.splice(index, 1);
  localStorage.setItem("carrinho", JSON.stringify(carrinho));

  renderCarrinho();
  atualizarContadorCarrinho();
}

// ==================== PAGAMENTO ====================

function crc16(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function formatPixField(id, value) {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function gerarPayloadPix(chave, nome, cidade, valorTotal) {
  const valor = valorTotal > 0 ? valorTotal.toFixed(2) : "0.01";
  let payload = '000201';
  const gui = formatPixField('00', 'br.gov.bcb.pix');
  const key = formatPixField('01', chave);
  payload += formatPixField('26', gui + key);
  payload += formatPixField('52', '0000');
  payload += formatPixField('53', '0986');
  payload += formatPixField('54', valor);
  payload += formatPixField('58', 'BR');
  payload += formatPixField('59', nome);
  payload += formatPixField('60', cidade);
  payload += formatPixField('62', formatPixField('05', '***'));
  payload += '6304';
  payload += crc16(payload);
  return payload;
}

async function gerarQrCodePix(valorTotal) {
  const pixContainer = document.getElementById("pix-qrcode-container");
  const pixText = document.getElementById("pix-copia-e-cola");
  const copyBtn = document.getElementById("copy-pix-btn");

  pixContainer.innerHTML = "";
  pixText.value = "Aguarde...";
  copyBtn.onclick = null;

  try {
    const chave = "53270726813"; // CPF do usuário
    const nome = "ERICK XAVIER"; // Nome do recebedor
    const cidade = "SAO PAULO"; // Cidade do recebedor

    const payload = gerarPayloadPix(chave, nome, cidade, valorTotal);
    
    // Gera o QRCode usando a biblioteca qrcode.js
    new QRCode(pixContainer, {
        text: payload,
        width: 200,
        height: 200,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.M
    });

    pixText.value = payload;

    copyBtn.onclick = () => {
      const textToCopy = pixText.value;
      if (!textToCopy || textToCopy === "Aguarde..." || textToCopy === "Erro na geração do código.") return;

      // Tenta usar o método moderno
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(
          () => {
            alert("✅ Código copiado! Confirmando pagamento...");
            confirmarPagamento(); // Processa a compra automaticamente
          },
          () => {
            fallbackCopyTextToClipboard(textToCopy);
          },
        );
      } else {
        // Usa o método antigo (fallback) se o moderno não estiver disponível
        fallbackCopyTextToClipboard(textToCopy);
      }
    };

    function fallbackCopyTextToClipboard(text) {
      pixText.select();
      try {
        const successful = document.execCommand("copy");
        if (successful) {
          alert("✅ Código copiado! Confirmando pagamento...");
          confirmarPagamento(); // Processa a compra automaticamente
        } else {
          alert("Falha ao copiar. Selecione o texto e copie manualmente.");
        }
      } catch (err) {
        alert("Erro ao copiar. Tente manualmente.");
      }
    }
  } catch (err) {
    console.error("Erro ao gerar PIX QR Code:", err);
    pixContainer.innerHTML =
      "<p>Não foi possível gerar o QR Code. Tente novamente mais tarde.</p>";
    pixText.value = "Erro na geração do código.";
  }
}

function renderPagamento() {
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  const itemsContainer = document.getElementById("payment-items");
  const totalEl = document.getElementById("payment-total");

  // Mostra os itens do carrinho no resumo
  itemsContainer.innerHTML =
    carrinho.length > 0
      ? carrinho
          .map(
            (item) => `
        <div class="payment-item" style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.5rem;">
            <span>${item.quantidade}x ${item.tipo_nome} (${item.evento_titulo})</span>
            <span>R$ ${item.total.toFixed(2)}</span>
        </div>`,
          )
          .join("")
      : "<p>Nenhum item no carrinho.</p>";

  // Define o valor fixo de 0.01 para o pagamento PIX, conforme solicitado
  const totalPrice = carrinho.reduce((sum, item) => sum + item.total, 0);
  totalEl.textContent = totalPrice.toFixed(2);

  // Gera o QR Code do PIX
  gerarQrCodePix(totalPrice);
}

async function confirmarPagamento() {
  if (!currentUser) {
    alert("Sessão expirada. Faça login novamente.");
    showScreen("login-screen");
    return;
  }

  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  if (carrinho.length === 0) {
    alert("Seu carrinho está vazio.");
    return;
  }

  try {
    const res = await fetch("/comprar-ingressos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario_id: currentUser.id,
        carrinho: carrinho,
      }),
    });

    const data = await res.json();
    alert(data.mensagem);

    if (res.ok) {
      localStorage.removeItem("carrinho");
      atualizarContadorCarrinho();
      await renderMeusIngressos();
      showScreen("purchased-screen");
    }
  } catch (err) {
    alert("Erro ao processar a compra. Tente novamente.");
    console.error("Erro na compra:", err);
  }
}

// ==================== MEUS INGRESSOS ====================

async function renderMeusIngressos() {
  if (!currentUser) return;
  const container = document.getElementById("purchased-tickets");
  const noTicketsMsg = document.getElementById("no-tickets");
  container.innerHTML = "<p>Carregando ingressos...</p>";
  noTicketsMsg.style.display = "none";
  try {
    const res = await fetch(`/meus-ingressos/${currentUser.id}`);
    const ingressos = await res.json();
    if (!res.ok) throw new Error(ingressos.mensagem || "Erro ao buscar ingressos.");

    if (ingressos.length === 0) {
      container.innerHTML = "";
      noTicketsMsg.style.display = "block";
      return;
    }
    noTicketsMsg.style.display = "none";

    container.innerHTML = ingressos
      .map(
        (ingresso) => `
      <div class="purchased-ticket-card">
          <div class="ticket-header">
              <div class="ticket-event-title">${ingresso.evento.emoji} ${ingresso.evento.titulo}</div>
              <div class="ticket-status ${ingresso.evento.status}">${ingresso.evento.status === "próximo" ? "Próximo" : "Realizado"}</div>
          </div>
          <div class="ticket-body">
              <p><strong>Tipo:</strong> ${ingresso.tipo_ingresso.nome}</p>
              <p><strong>Quantidade:</strong> ${ingresso.quantidade}</p>
              <p><strong>Data do Evento:</strong> ${ingresso.evento.data}</p>
              <p><strong>Local:</strong> ${ingresso.evento.local}</p>
              <p><strong>Código:</strong> <span class="ticket-code">${ingresso.codigo}</span></p>
          </div>
          <div class="ticket-footer">
              Comprado em ${ingresso.data_compra} por R$ ${ingresso.preco_total.toFixed(2)}
          </div>
      </div>
  `,
      )
      .join("");
  } catch (err) {
    container.innerHTML = `<p style="color: var(--error-color);">${err.message}</p>`;
  }
}

// ==================== DASHBOARD ====================

async function carregarDashboardUsuario() {
  if (!currentUser) return;

  try {
    const res = await fetch(`/dashboard/usuario/${currentUser.id}`);
    const data = await res.json();

    document.getElementById("user-total-eventos").textContent = data.total_eventos;
    document.getElementById("user-total-ingressos").textContent = data.total_ingressos;

    const container = document.getElementById("user-eventos-mes");
    container.innerHTML = Object.entries(data.eventos_por_mes)
      .map(([mes, qtd]) => `<p>📅 ${mes}: <strong>${qtd}</strong> ingressos</p>`)
      .join("");

    showScreen("dashboard-user-screen");
  } catch (err) {
    console.error("Erro ao carregar dashboard:", err);
  }
}

async function carregarDashboardAdmin() {
  if (!currentUser || !currentUser.is_admin) return;

  try {
    // Enviamos o ID do usuário logado para o backend validar
    const res = await fetch(`/dashboard/admin?user_id=${currentUser.id}`);
    const data = await res.json();

    if (!res.ok) {
      alert(data.mensagem || "Acesso negado");
      return;
    }

    document.getElementById("admin-total-vendas").textContent = data.total_vendas;
    document.getElementById("admin-receita").textContent = "R$ " + data.receita_total.toFixed(2);

    // Renderizar Performance por Evento
    const eventosContainer = document.getElementById("admin-eventos-list");
    eventosContainer.innerHTML = data.eventos
      .map((e) => `
        <div class="admin-dashboard-item" style="border-bottom: 1px solid var(--border-color); padding: 0.8rem 0;">
          <p><strong>${e.evento}</strong></p>
          <p style="font-size: 0.85rem; color: var(--text-color);">🎟️ ${e.ingressos} ingressos | 💰 R$ ${e.receita.toFixed(2)}</p>
        </div>`)
      .join("");

    // Renderizar Vendas Recentes
    const salesContainer = document.getElementById("admin-recent-sales-list");
    if (data.vendas_recentes && data.vendas_recentes.length > 0) {
      salesContainer.innerHTML = data.vendas_recentes
        .map((v) => `
          <div class="admin-dashboard-item" style="border-bottom: 1px solid var(--border-color); padding: 0.8rem 0;">
            <p><strong>👤 ${v.usuario}</strong></p>
            <p style="font-size: 0.85rem; color: var(--text-color);">
              ${v.quantidade}x ${v.tipo} - ${v.evento}<br>
              <span style="color: var(--success-color); font-weight: bold;">R$ ${v.valor.toFixed(2)}</span> | 🕒 ${v.data}
            </p>
          </div>`)
        .join("");
    } else {
      salesContainer.innerHTML = "<p>Nenhuma venda recente.</p>";
    }

    showScreen("dashboard-admin-screen");
  } catch (err) {
    console.error("Erro ao carregar dashboard admin:", err);
  }
}

// ==================== AUTENTICAÇÃO ====================

async function cadastrarUsuario(nome, email, senha, confirmarSenha) {
  try {
    const res = await fetch("/cadastrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha, confirmarSenha }),
    });

    const data = await res.json();
    alert(data.mensagem);

    if (res.ok) {
      showScreen("login-screen");
    }
  } catch (err) {
    alert("Erro ao cadastrar usuário");
    console.error(err);
  }
}

async function loginUsuario(email, senha) {
  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });

    const data = await res.json();

    alert(data.mensagem);

    if (res.ok) {
      currentUser = data.usuario;
      updateNavbar();
      showScreen("events-screen");
    }
  } catch (err) {
    alert("Erro ao realizar login");
    console.error(err);
  }
}

// ==================== ADMIN - CRIAR EVENTO ====================

function removerTipoIngresso(btn) {
  btn.parentElement.remove();
}

function adicionarTipoIngresso(containerId = "ticket-types-container") {
  const container = document.getElementById(containerId);
  const div = document.createElement("div");
  div.className = "ticket-type-input";
  div.innerHTML = `
        <input type="text" class="ticket-name" placeholder="Nome (ex: Inteira)">
        <input type="text" class="ticket-description" placeholder="Descrição">
        <input type="number" class="ticket-price" placeholder="Preço" step="0.01" min="0">
        <input type="number" class="ticket-quantity" placeholder="Quantidade" min="1" value="100">
        <button type="button" class="btn btn-error" onclick="removerTipoIngresso(this)">Remover</button>
    `;
  container.appendChild(div);
}

function coletarTiposIngresso(containerId = "ticket-types-container") {
  const container = document.getElementById(containerId);
  const tipos = [];

  container.querySelectorAll(".ticket-type-input").forEach((input) => {
    const nome = input.querySelector(".ticket-name").value.trim();
    const descricao = input.querySelector(".ticket-description").value.trim();
    const preco = parseFloat(input.querySelector(".ticket-price").value) || 0;
    const quantidade_disponivel =
      parseInt(input.querySelector(".ticket-quantity").value) || 100;

    if (nome && preco > 0) {
      tipos.push({ nome, descricao, preco, quantidade_disponivel });
    }
  });

  return tipos;
}

async function criarEvento(formData) {
  if (!currentUser || !currentUser.is_admin) {
    alert("Acesso negado. Apenas administradores podem criar eventos.");
    return;
  }

  formData.append('user_id', currentUser.id);

  try {
    const res = await fetch("/criar-evento", {
      method: "POST",
      body: formData,
    });

    const data_res = await res.json();
    alert(data_res.mensagem);

    if (res.ok) {
      document.getElementById("create-event-form").reset();
      adicionarTipoIngresso("ticket-types-container", true); // Limpa e adiciona um novo
      await carregarEventos();
      renderAdminEventsList();
    }
  } catch (err) {
    alert("Erro ao criar evento");
    console.error(err);
  }
}

// ==================== ADMIN - EDITAR EVENTO ====================

async function carregarEventoParaEdicao(eventoId) {
  try {
    const res = await fetch(`/evento/${eventoId}`);
    const evento = await res.json();

    if (res.ok) {
      document.getElementById("edit-event-id").value = evento.id;
      document.getElementById("edit-event-title").value = evento.titulo;
      document.getElementById("edit-event-date").value = evento.data;
      document.getElementById("edit-event-location").value = evento.local;
      document.getElementById("edit-event-price").value = evento.preco;
      document.getElementById("edit-event-category").value = evento.categoria;
      document.getElementById("edit-event-genre").value = evento.genero_musical;

      const previewContainer = document.getElementById("edit-image-preview");
      if (evento.imagem_url) {
        previewContainer.innerHTML = `<img src="${evento.imagem_url}" alt="Preview da imagem atual">`;
      } else {
        previewContainer.innerHTML = "<p>Nenhuma imagem cadastrada.</p>";
      }

      // Popular tipos de ingresso
      const container = document.getElementById("edit-ticket-types-container");
      container.innerHTML = evento.tipos_ingresso
        .map(
          (tipo) => `
                <div class="ticket-type-input">
                    <input type="text" class="ticket-name" value="${tipo.nome}">
                    <input type="text" class="ticket-description" value="${tipo.descricao || ""}">
                    <input type="number" class="ticket-price" value="${tipo.preco}" step="0.01" min="0">
                    <input type="number" class="ticket-quantity" value="${tipo.quantidade_disponivel}" min="1">
                    <button type="button" class="btn btn-error" onclick="removerTipoIngresso(this)">Remover</button>
                </div>
            `,
        )
        .join("");

      showScreen("edit-event-screen");
    }
  } catch (err) {
    alert("Erro ao carregar evento");
    console.error(err);
  }
}

async function editarEvento(eventoId, formData) {
  if (!currentUser || !currentUser.is_admin) {
    alert("Acesso negado. Apenas administradores podem editar eventos.");
    return;
  }

  formData.append('user_id', currentUser.id);

  try {
    const res = await fetch(`/editar-evento/${eventoId}`, {
      method: "PUT",
      body: formData,
    });

    const data_res = await res.json();
    alert(data_res.mensagem);

    if (res.ok) {
      await carregarEventos();
      renderAdminEventsList();
      showScreen("admin-screen");
      document.querySelector('[data-tab="manage"]').click();
    }
  } catch (err) {
    alert("Erro ao editar evento");
    console.error(err);
  }
}

// ==================== ADMIN - DELETAR EVENTO ====================

async function deletarEvento(eventoId) {
  if (!currentUser || !currentUser.is_admin) {
    alert("Acesso negado. Apenas administradores podem deletar eventos.");
    return;
  }

  if (!confirm("Tem certeza que deseja deletar este evento?")) return;

  try {
    const res = await fetch(`/deletar-evento/${eventoId}?user_id=${currentUser.id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    alert(data.mensagem);

    if (res.ok) {
      await carregarEventos();
      renderAdminEventsList();
    }
  } catch (err) {
    alert("Erro ao deletar evento");
    console.error(err);
  }
}

// ==================== ADMIN - RENDERIZAR LISTA ====================

function renderAdminEventsList() {
  const container = document.getElementById("admin-events-list");

  if (eventos.length === 0) {
    container.innerHTML = "<p>Nenhum evento cadastrado</p>";
    return;
  }

  container.innerHTML = eventos
    .map((e) => {
      const tiposInfo = e.tipos_ingresso
        ? e.tipos_ingresso.map((t) => `${t.nome}`).join(", ")
        : "Sem tipos";
      return `
            <div class="admin-event-card">
                <div class="admin-event-info">
                    <div class="admin-event-title">${e.emoji} ${e.titulo}</div>
                    <div class="admin-event-details">
                        <p>📅 ${e.data} | 📍 ${e.local} | R$ ${e.preco}</p>
                        <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--success-color);">Tipos: ${tiposInfo}</p>
                    </div>
                </div>
                <div class="admin-event-actions">
                    <button class="btn btn-secondary" onclick="carregarEventoParaEdicao(${e.id})">Editar</button>
                    <button class="btn btn-error" onclick="deletarEvento(${e.id})">Deletar</button>
                </div>
            </div>
        `;
    })
    .join("");
}

// ==================== ADMIN - TABS ====================

function setupAdminTabs() {
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.tab;

      document
        .querySelectorAll(".admin-tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".admin-tab-content")
        .forEach((c) => c.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(`${tabName}-tab`).classList.add("active");

      if (tabName === "manage") {
        renderAdminEventsList();
      }
    });
  });
}

function popularDropdownGeneros() {
    const selects = [
        document.getElementById("event-genre"),
        document.getElementById("edit-event-genre")
    ];
    selects.forEach(select => {
        if (!select) return;
        select.innerHTML = generosMusicais
            .map(g => `<option value="${g}">${g}</option>`)
            .join('');
    });
}


// ==================== INICIALIZAÇÃO ====================

document.addEventListener("DOMContentLoaded", () => {
  carregarEventos();
  updateNavbar();
  setupAdminTabs();
  atualizarContadorCarrinho();
  popularDropdownGeneros();

  // SIGNUP
  const signupForm = document.getElementById("signup-form");
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nome = document.getElementById("signup-name").value;
    const email = document.getElementById("signup-email").value;
    const senha = document.getElementById("signup-password").value;
    const confirmarSenha = document.getElementById(
      "signup-password-confirm",
    ).value;

    await cadastrarUsuario(nome, email, senha, confirmarSenha);
  });

  // LOGIN
  const loginForm = document.getElementById("login-form");
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("login-email").value;
    const senha = document.getElementById("login-password").value;

    await loginUsuario(email, senha);
  });

  // FILTERS
  const priceFilter = document.getElementById("price-filter");
  const priceValue = document.getElementById("price-value");
  const categoryFilter = document.getElementById("category-filter");
  const genreFilter = document.getElementById("genre-filter");
  const searchFilter = document.getElementById("search-filter");
  const resetFiltersBtn = document.getElementById("reset-filters-btn");

  if (priceFilter) priceFilter.addEventListener("input", () => { priceValue.textContent = priceFilter.value; });
  if (priceFilter) priceFilter.addEventListener("change", () => carregarEventos());
  if (categoryFilter) categoryFilter.addEventListener("change", () => carregarEventos());
  if (genreFilter) genreFilter.addEventListener("change", () => carregarEventos());
  if (searchFilter) searchFilter.addEventListener("input", () => carregarEventos());

  if (resetFiltersBtn) resetFiltersBtn.addEventListener("click", () => {
      priceFilter.value = 300;
      priceValue.textContent = 300;
      categoryFilter.value = "todos";
      genreFilter.value = "todos";
      if (searchFilter) searchFilter.value = "";
      carregarEventos();
  });

  // CRIAR EVENTO
  const createEventForm = document.getElementById("create-event-form");
  createEventForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(createEventForm);
    const tipos_ingresso = coletarTiposIngresso("ticket-types-container");

    if (tipos_ingresso.length === 0) {
      alert("Adicione pelo menos um tipo de ingresso");
      return;
    }
    formData.append('tipos_ingresso', JSON.stringify(tipos_ingresso));

    await criarEvento(formData);
  });

  // EDITAR EVENTO
  const editEventForm = document.getElementById("edit-event-form");
  editEventForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(editEventForm);
    const eventoId = document.getElementById("edit-event-id").value;
    const tipos_ingresso = coletarTiposIngresso("edit-ticket-types-container");

    if (tipos_ingresso.length === 0) {
      alert("Adicione pelo menos um tipo de ingresso");
      return;
    }
    formData.append('tipos_ingresso', JSON.stringify(tipos_ingresso));

    await editarEvento(eventoId, formData);
  });

  // ADICIONAR TIPO DE INGRESSO
  document
    .getElementById("add-ticket-type-btn")
    .addEventListener("click", (e) => {
      e.preventDefault();
      adicionarTipoIngresso("ticket-types-container");
    });

  document
    .getElementById("edit-add-ticket-type-btn")
    .addEventListener("click", (e) => {
      e.preventDefault();
      adicionarTipoIngresso("edit-ticket-types-container");
    });

  // CARRINHO
  document.getElementById("cart-btn").addEventListener("click", () => {
    if (!currentUser) {
      alert("Você precisa estar logado para ver o carrinho.");
      showScreen("login-screen");
      return;
    }
    renderCarrinho();
    showScreen("cart-screen");
  });

  document.getElementById("checkout-btn").addEventListener("click", () => {
    renderPagamento();
    showScreen("payment-screen");
  });

  // MEUS INGRESSOS
  document.getElementById("my-tickets-btn").addEventListener("click", async () => {
    await renderMeusIngressos();
    showScreen("purchased-screen");
  });

  // DASHBOARD USUÁRIO
  document.getElementById("user-dashboard-btn").addEventListener("click", carregarDashboardUsuario);
  document.getElementById("back-from-user-dashboard").addEventListener("click", () => showScreen("events-screen"));


  document
    .getElementById("confirm-payment-btn")
    .addEventListener("click", confirmarPagamento);

  // NAVEGAÇÃO
  document.getElementById("logo-home").addEventListener("click", () => {
    showScreen("events-screen");
  });

  document
    .getElementById("login-link")
    .addEventListener("click", () => showScreen("login-screen"));
  document
    .getElementById("signup-link")
    .addEventListener("click", () => showScreen("signup-screen"));

  document
    .getElementById("switch-to-login")
    .addEventListener("click", () => showScreen("login-screen"));
  document
    .getElementById("switch-to-signup")
    .addEventListener("click", () => showScreen("signup-screen"));

  document.getElementById("logout-btn").addEventListener("click", () => {
    currentUser = null;
    updateNavbar();
    showScreen("events-screen");
  });

  // ADMIN
  document.getElementById("admin-btn").addEventListener("click", () => {
    showScreen("admin-screen");
    renderAdminEventsList();
  });

  document.getElementById("admin-dashboard-tab-btn").addEventListener("click", carregarDashboardAdmin);

  document.getElementById("back-from-admin").addEventListener("click", () => {
    showScreen("events-screen");
  });

  document
    .getElementById("back-from-edit-event")
    .addEventListener("click", () => {
      showScreen("admin-screen");
      document.querySelector('[data-tab="manage"]').click();
    });

  // CART E OUTROS
  document.getElementById("back-from-cart").addEventListener("click", () => {
    showScreen("events-screen");
  });

  document.getElementById("back-from-tickets").addEventListener("click", () => {
    showScreen("events-screen");
  });

  document.getElementById("back-from-payment").addEventListener("click", () => {
    showScreen("cart-screen");
  });

  document
    .getElementById("back-from-purchased")
    .addEventListener("click", () => {
      showScreen("events-screen");
    });

  document.getElementById("back-from-login").addEventListener("click", () => {
    showScreen("events-screen");
  });

  document.getElementById("back-from-signup").addEventListener("click", () => {
    showScreen("events-screen");
  });

  // BOTÕES DE NAVEGAÇÃO NA TELA DE INGRESSOS
  document.getElementById("back-to-events").addEventListener("click", () => {
    showScreen("events-screen");
  });

  document
    .getElementById("go-to-cart-from-tickets")
    .addEventListener("click", () => {
      if (!currentUser) {
        alert("Você precisa estar logado para ver o carrinho.");
        showScreen("login-screen");
        return;
      }
      renderCarrinho();
      showScreen("cart-screen");
    });
});
