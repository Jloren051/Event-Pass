let currentUser = null;
let eventos = [];
let eventoSelecionado = null;

const eventosPadrao = [
  {
    id: 1,
    titulo: "Festa Eletrônica 2026",
    data: "15/04/2026",
    local: "São Paulo",
    emoji: "🎵",
    preco: 80,
    tipos_ingresso: [],
  },
  {
    id: 2,
    titulo: "Show de Rock",
    data: "20/05/2026",
    local: "Rio de Janeiro",
    emoji: "🎸",
    preco: 100,
    tipos_ingresso: [],
  },
  {
    id: 3,
    titulo: "Festival de Música",
    data: "10/06/2026",
    local: "Belo Horizonte",
    emoji: "🎭",
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

  if (currentUser) {
    userInfo.style.display = "flex";
    authButtons.style.display = "none";
    document.getElementById("username-display").textContent = currentUser.nome;
    adminBtn.style.display = currentUser.is_admin ? "block" : "none";
  } else {
    userInfo.style.display = "none";
    authButtons.style.display = "flex";
    adminBtn.style.display = "none";
  }
}

// ==================== EVENTOS ====================

async function carregarEventos() {
  try {
    const res = await fetch("/eventos");
    const data = await res.json();
    eventos = res.ok && data.length > 0 ? data : eventosPadrao;
  } catch {
    eventos = eventosPadrao;
  }
  renderEventos();
}

function renderEventos() {
  const container = document.getElementById("events-grid");

  container.innerHTML = eventos
    .map(
      (e) => `
        <div class="event-card" onclick="selecionarEvento(${e.id})">
            <div class="event-image">${e.emoji || "🎉"}</div>
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

async function criarEvento(titulo, data, local, preco, emoji, tipos_ingresso) {
  try {
    const res = await fetch("/criar-evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo,
        data,
        local,
        preco,
        emoji,
        tipos_ingresso,
      }),
    });

    const data_res = await res.json();
    alert(data_res.mensagem);

    if (res.ok) {
      document.getElementById("create-event-form").reset();
      document.getElementById("ticket-types-container").innerHTML = `
                <div class="ticket-type-input">
                    <input type="text" class="ticket-name" placeholder="Nome (ex: Inteira)">
                    <input type="text" class="ticket-description" placeholder="Descrição">
                    <input type="number" class="ticket-price" placeholder="Preço" step="0.01" min="0">
                    <input type="number" class="ticket-quantity" placeholder="Quantidade" min="1" value="100">
                    <button type="button" class="btn btn-error" onclick="removerTipoIngresso(this)">Remover</button>
                </div>
            `;
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
      document.getElementById("edit-event-emoji").value = evento.emoji;

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

async function editarEvento(
  eventoId,
  titulo,
  data,
  local,
  preco,
  emoji,
  tipos_ingresso,
) {
  try {
    const res = await fetch(`/editar-evento/${eventoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo,
        data,
        local,
        preco,
        emoji,
        tipos_ingresso,
      }),
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
  if (!confirm("Tem certeza que deseja deletar este evento?")) return;

  try {
    const res = await fetch(`/deletar-evento/${eventoId}`, {
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

// ==================== INICIALIZAÇÃO ====================

document.addEventListener("DOMContentLoaded", () => {
  carregarEventos();
  updateNavbar();
  setupAdminTabs();
  atualizarContadorCarrinho();

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

  // CRIAR EVENTO
  const createEventForm = document.getElementById("create-event-form");
  createEventForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const titulo = document.getElementById("event-title").value;
    const data = document.getElementById("event-date").value;
    const local = document.getElementById("event-location").value;
    const preco = document.getElementById("event-price").value;
    const emoji = document.getElementById("event-emoji").value;
    const tipos_ingresso = coletarTiposIngresso("ticket-types-container");

    if (tipos_ingresso.length === 0) {
      alert("Adicione pelo menos um tipo de ingresso");
      return;
    }

    await criarEvento(titulo, data, local, preco, emoji, tipos_ingresso);
  });

  // EDITAR EVENTO
  const editEventForm = document.getElementById("edit-event-form");
  editEventForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const eventoId = document.getElementById("edit-event-id").value;
    const titulo = document.getElementById("edit-event-title").value;
    const data = document.getElementById("edit-event-date").value;
    const local = document.getElementById("edit-event-location").value;
    const preco = document.getElementById("edit-event-price").value;
    const emoji = document.getElementById("edit-event-emoji").value;
    const tipos_ingresso = coletarTiposIngresso("edit-ticket-types-container");

    if (tipos_ingresso.length === 0) {
      alert("Adicione pelo menos um tipo de ingresso");
      return;
    }

    await editarEvento(
      eventoId,
      titulo,
      data,
      local,
      preco,
      emoji,
      tipos_ingresso,
    );
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
    // Por enquanto, apenas navega para a tela de pagamento
    // A implementação real validaria o carrinho e prepararia os dados
    showScreen("payment-screen");
  });

  // NAVEGAÇÃO
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
    showScreen("ticket-type-screen");
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
