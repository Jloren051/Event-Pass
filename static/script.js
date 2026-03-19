// ==================== STATE ====================
let currentUser = null;
let cart = [];
let previousScreen = "events-screen";
let events = [
    {
        id: 1,
        title: "Festa Eletrônica 2026",
        date: new Date(2026, 3, 15),
        location: "São Paulo - SP",
        emoji: "🎵",
        price: 80,
        ticketTypes: [
            { id: "normal", name: "Pista", price: 80, description: "Acesso geral ao evento" },
            { id: "vip", name: "VIP", price: 150, description: "Acesso VIP com open bar" },
            { id: "backstage", name: "Backstage", price: 250, description: "Acesso backstage e meet & greet" }
        ]
    },
    {
        id: 2,
        title: "Show de Rock",
        date: new Date(2026, 4, 20),
        location: "Rio de Janeiro - RJ",
        emoji: "🎸",
        price: 100,
        ticketTypes: [
            { id: "normal", name: "Inteira", price: 100, description: "Acesso geral ao evento" },
            { id: "vip", name: "VIP", price: 180, description: "Acesso VIP com estacionamento grátis" }
        ]
    },
    {
        id: 3,
        title: "Festival de Música",
        date: new Date(2026, 5, 10),
        location: "Belo Horizonte - MG",
        emoji: "🎭",
        price: 120,
        ticketTypes: [
            { id: "normal", name: "Ingresso Normal", price: 120, description: "Acesso ao festival" },
            { id: "vip", name: "VIP", price: 200, description: "Acesso VIP com lounges" },
            { id: "premium", name: "Premium", price: 350, description: "Experiência premium completa" }
        ]
    },
    {
        id: 4,
        title: "Comedy Night",
        date: new Date(2026, 2, 5),
        location: "Curitiba - PR",
        emoji: "🎤",
        price: 60,
        ticketTypes: [
            { id: "normal", name: "Meia-entrada", price: 60, description: "Acesso ao show" },
            { id: "vip", name: "VIP", price: 100, description: "Acesso VIP com meet & greet" }
        ]
    },
    {
        id: 5,
        title: "Festa de Ano Novo",
        date: new Date(2026, 11, 31),
        location: "Salvador - BA",
        emoji: "🎉",
        price: 200,
        ticketTypes: [
            { id: "normal", name: "Ingresso Normal", price: 200, description: "Acesso ao evento" },
            { id: "vip", name: "VIP", price: 350, description: "Acesso VIP com open bar" },
            { id: "suite", name: "Suite", price: 800, description: "Suite privativa com serviço" }
        ]
    }
];

let purchasedTickets = [
    {
        id: "ticket-1",
        eventId: 1,
        eventTitle: "Festa Eletrônica 2026",
        eventDate: new Date(2026, 3, 15),
        ticketType: "VIP",
        price: 150,
        barcode: "1234567890AB",
        purchaseDate: new Date(2026, 2, 1)
    },
    {
        id: "ticket-2",
        eventId: 2,
        eventTitle: "Show de Rock",
        eventDate: new Date(2026, 4, 20),
        ticketType: "Normal",
        price: 100,
        barcode: "2345678901CD",
        purchaseDate: new Date(2026, 2, 5)
    }
];

let selectedEvent = null;

// ==================== UTILITY FUNCTIONS ====================
function showScreen(screenId) {
    console.log("Mostrando tela:", screenId);
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });
    const screenElement = document.getElementById(screenId);
    if (screenElement) {
        screenElement.classList.add("active");
    } else {
        console.error("Tela não encontrada:", screenId);
    }
    window.scrollTo(0, 0);
}

function goBack() {
    console.log("Voltando para:", previousScreen);
    showScreen(previousScreen);
}

function formatDate(date) {
    return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function formatTime(date) {
    return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatCurrency(value) {
    return value.toFixed(2).replace(".", ",");
}

function isEventUpcoming(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
}

function generateBarcode() {
    let barcode = "";
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < 12; i++) {
        barcode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return barcode;
}

function getCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function getCartCount() {
    return cart.reduce((total, item) => total + item.quantity, 0);
}

// ==================== USER MANAGEMENT ====================
function signup(name, email, password) {
    if (password.length < 6) {
        alert("Senha deve ter pelo menos 6 caracteres");
        return false;
    }

    currentUser = {
        id: Date.now(),
        name: name,
        email: email,
        password: password
    };

    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    alert("Cadastro realizado com sucesso!");
    showEventsScreen();
    updateNavbar();
    return true;
}

function login(email, password) {
    const user = {
        id: Date.now(),
        name: "Usuário",
        email: email,
        password: password
    };

    currentUser = user;
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    alert("Login realizado com sucesso!");
    showEventsScreen();
    updateNavbar();
    return true;
}

function logout() {
    currentUser = null;
    localStorage.removeItem("currentUser");
    cart = [];
    updateNavbar();
    updateCart();
    showEventsScreen();
}

function updateNavbar() {
    const userInfo = document.getElementById("user-info");
    const authButtons = document.getElementById("auth-buttons");
    const usernameDisplay = document.getElementById("username-display");

    if (currentUser) {
        userInfo.style.display = "flex";
        authButtons.style.display = "none";
        usernameDisplay.textContent = currentUser.name;
    } else {
        userInfo.style.display = "none";
        authButtons.style.display = "flex";
    }
}

function loadUserFromLocalStorage() {
    const stored = localStorage.getItem("currentUser");
    if (stored) {
        currentUser = JSON.parse(stored);
        updateNavbar();
    }
}

// ==================== CART MANAGEMENT ====================
function addToCart(eventId, ticketTypeId, quantity) {
    const event = events.find(e => e.id === eventId);
    const ticketType = event.ticketTypes.find(t => t.id === ticketTypeId);

    const cartItem = {
        eventId: eventId,
        eventTitle: event.title,
        ticketTypeId: ticketTypeId,
        ticketTypeName: ticketType.name,
        price: ticketType.price,
        quantity: quantity
    };

    const existingItem = cart.find(
        item => item.eventId === eventId && item.ticketTypeId === ticketTypeId
    );

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push(cartItem);
    }

    updateCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

function updateCartItemQuantity(index, quantity) {
    if (quantity <= 0) {
        removeFromCart(index);
    } else {
        cart[index].quantity = quantity;
        updateCart();
    }
}

function updateCart() {
    const cartCount = document.getElementById("cart-count");
    const cartItemsContainer = document.getElementById("cart-items");
    const cartEmpty = document.getElementById("cart-empty");
    const cartSummary = document.getElementById("cart-summary");
    const totalTickets = document.getElementById("total-tickets");
    const totalPrice = document.getElementById("total-price");

    cartCount.textContent = getCartCount();

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = "";
        cartEmpty.style.display = "block";
        cartSummary.style.display = "none";
    } else {
        cartEmpty.style.display = "none";
        cartSummary.style.display = "block";

        cartItemsContainer.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.eventTitle}</div>
                    <div class="cart-item-type">${item.ticketTypeName}</div>
                    <div class="cart-item-price">R$ ${formatCurrency(item.price)}</div>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-control">
                        <button onclick="updateCartItemQuantity(${index}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateCartItemQuantity(${index}, ${item.quantity + 1})">+</button>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${index})">Remover</button>
                </div>
            </div>
        `).join("");

        totalTickets.textContent = getCartCount();
        totalPrice.textContent = formatCurrency(getCartTotal());
    }
}

// ==================== EVENTS SCREEN ====================
function renderEvents() {
    const eventsList = document.getElementById("events-grid");

    eventsList.innerHTML = events.map(event => {
        const isUpcoming = isEventUpcoming(event.date);
        const dateStr = formatDate(event.date);

        return `
            <div class="event-card" onclick="selectEvent(${event.id})">
                <div class="event-image">${event.emoji}</div>
                <div class="event-content">
                    <div class="event-title">${event.title}</div>
                    <div class="event-date">📅 ${dateStr}</div>
                    <div class="event-location">📍 ${event.location}</div>
                    <div class="event-price">A partir de R$ ${formatCurrency(event.price)}</div>
                    <button class="btn-buy" onclick="selectEvent(${event.id}); event.stopPropagation();">
                        ${isUpcoming ? "Comprar Ingresso" : "Evento Passado"}
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

function selectEvent(eventId) {
    console.log("Evento selecionado:", eventId);

    if (!currentUser) {
        alert("Você precisa fazer login para comprar ingressos");
        previousScreen = "events-screen";
        showScreen("login-screen");
        return;
    }

    selectedEvent = events.find(e => e.id === eventId);
    console.log("Evento encontrado:", selectedEvent);

    if (!isEventUpcoming(selectedEvent.date)) {
        alert("Este evento já ocorreu");
        return;
    }

    previousScreen = "events-screen";
    showTicketTypeScreen();
}

function showEventsScreen() {
    renderEvents();
    showScreen("events-screen");
}

// ==================== TICKET TYPE SCREEN ====================
function showTicketTypeScreen() {
    console.log("Mostrando tela de tipos de ingresso");
    const eventTitle = document.getElementById("event-title-ticket");
    const ticketTypesContainer = document.getElementById("ticket-types");

    if (!eventTitle || !ticketTypesContainer) {
        console.error("Elementos não encontrados");
        return;
    }

    eventTitle.textContent = selectedEvent.title;

    ticketTypesContainer.innerHTML = selectedEvent.ticketTypes.map((ticketType, index) => `
        <div class="ticket-type-card">
            <div class="ticket-type-header">
                <div class="ticket-type-name">${ticketType.name}</div>
                <div class="ticket-type-price">R$ ${formatCurrency(ticketType.price)}</div>
            </div>
            <div class="ticket-type-description">${ticketType.description}</div>
            <div class="ticket-type-actions">
                <select class="quantity-select" id="quantity-${index}">
                    <option value="1">1x</option>
                    <option value="2">2x</option>
                    <option value="3">3x</option>
                    <option value="4">4x</option>
                    <option value="5">5x</option>
                    <option value="6">6x</option>
                    <option value="7">7x</option>
                    <option value="8">8x</option>
                    <option value="9">9x</option>
                    <option value="10">10x</option>
                </select>
                <button class="add-to-cart-btn" onclick="addQuantityToCart(${selectedEvent.id}, '${ticketType.id}', ${index})">
                    Adicionar
                </button>
                <button class="view-cart-btn" onclick="goToCart()">
                    Ver carrinho
                </button>
            </div>
        </div>
    `).join("");

    showScreen("ticket-type-screen");
}

function addQuantityToCart(eventId, ticketTypeId, index) {
    console.log("Adicionando ao carrinho:", eventId, ticketTypeId, index);

    const quantitySelect = document.getElementById(`quantity-${index}`);
    if (!quantitySelect) {
        console.error("Select de quantidade não encontrado");
        return;
    }

    const quantity = parseInt(quantitySelect.value);
    console.log("Quantidade:", quantity);

    // Adicionar novo item
    addToCart(eventId, ticketTypeId, quantity);
    alert(`${quantity} ingresso(s) adicionado(s) ao carrinho!`);
}

function goToCart() {
    if (cart.length === 0) {
        alert("Seu carrinho está vazio");
        return;
    }
    previousScreen = "ticket-type-screen";
    showScreen("cart-screen");
}

// ==================== CART SCREEN ====================
if (document.getElementById("checkout-btn")) {
    document.getElementById("checkout-btn").addEventListener("click", () => {
        if (cart.length === 0) {
            alert("Seu carrinho está vazio");
            return;
        }

        previousScreen = "cart-screen";
        showPaymentScreen();
    });
}

if (document.getElementById("back-from-cart")) {
    document.getElementById("back-from-cart").addEventListener("click", goBack);
}

// ==================== PAYMENT SCREEN ====================
function showPaymentScreen() {
    console.log("Mostrando tela de pagamento");
    console.log("Carrinho:", cart);

    const paymentItems = document.getElementById("payment-items");
    const paymentTotal = document.getElementById("payment-total");

    if (!paymentItems || !paymentTotal) {
        console.error("Elementos de pagamento não encontrados");
        return;
    }

    paymentItems.innerHTML = cart.map(item => `
        <div class="payment-item">
            <div>
                <div class="payment-item-name">${item.eventTitle}</div>
                <div class="payment-item-name" style="color: var(--border-color); font-size: 0.9rem;">
                    ${item.ticketTypeName} x${item.quantity}
                </div>
            </div>
            <div class="payment-item-price">R$ ${formatCurrency(item.price * item.quantity)}</div>
        </div>
    `).join("");

    paymentTotal.textContent = formatCurrency(getCartTotal());

    showScreen("payment-screen");
}

if (document.getElementById("payment-form")) {
    document.getElementById("payment-form").addEventListener("submit", (e) => {
        e.preventDefault();

        const cardnumber = document.getElementById("cardnumber").value.replace(/\s/g, "");
        if (cardnumber.length !== 16) {
            alert("Número do cartão inválido");
            return;
        }

        cart.forEach(item => {
            for (let i = 0; i < item.quantity; i++) {
                purchasedTickets.push({
                    id: `ticket-${Date.now()}-${Math.random()}`,
                    eventId: item.eventId,
                    eventTitle: item.eventTitle,
                    eventDate: selectedEvent.date,
                    ticketType: item.ticketTypeName,
                    price: item.price,
                    barcode: generateBarcode(),
                    purchaseDate: new Date()
                });
            }
        });

        alert("Pagamento realizado com sucesso! Seus ingressos foram salvos.");
        cart = [];
        updateCart();
        previousScreen = "events-screen";
        showPurchasedScreen();
        document.getElementById("payment-form").reset();
    });
}

if (document.getElementById("back-from-payment")) {
    document.getElementById("back-from-payment").addEventListener("click", goBack);
}

// ==================== PURCHASED SCREEN ====================
function showPurchasedScreen() {
    renderPurchasedTickets("all");
    showScreen("purchased-screen");
}

function renderPurchasedTickets(filter = "all") {
    const purchasedContainer = document.getElementById("purchased-tickets");
    const noTickets = document.getElementById("no-tickets");

    let ticketsToShow = purchasedTickets;

    if (filter === "upcoming") {
        ticketsToShow = purchasedTickets.filter(t => isEventUpcoming(t.eventDate));
    } else if (filter === "past") {
        ticketsToShow = purchasedTickets.filter(t => !isEventUpcoming(t.eventDate));
    }

    if (ticketsToShow.length === 0) {
        purchasedContainer.innerHTML = "";
        noTickets.style.display = "block";
        return;
    }

    noTickets.style.display = "none";

    purchasedContainer.innerHTML = ticketsToShow.map(ticket => {
        const isUpcoming = isEventUpcoming(ticket.eventDate);
        const statusClass = isUpcoming ? "upcoming" : "past";
        const statusText = isUpcoming ? "Próximo" : "Passado";

        return `
            <div class="purchased-ticket ${statusClass}">
                <div class="ticket-header">
                    <div class="ticket-event-name">${ticket.eventTitle}</div>
                    <div class="ticket-status ${statusClass}">${statusText}</div>
                </div>
                <div class="ticket-details">
                    <p><strong>Tipo:</strong> ${ticket.ticketType}</p>
                    <p><strong>Data:</strong> ${formatDate(ticket.eventDate)} ${formatTime(ticket.eventDate)}</p>
                    <p><strong>Preço:</strong> R$ ${formatCurrency(ticket.price)}</p>
                    <p><strong>Comprado em:</strong> ${formatDate(ticket.purchaseDate)}</p>
                </div>
                <div class="ticket-barcode">
                    <div class="barcode">${ticket.barcode}</div>
                    <div class="barcode-label">Código do Ingresso</div>
                </div>
            </div>
        `;
    }).join("");
}

document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        renderPurchasedTickets(e.target.dataset.filter);
    });
});

if (document.getElementById("back-from-purchased")) {
    document.getElementById("back-from-purchased").addEventListener("click", goBack);
}

// ==================== AUTH SCREENS ====================
if (document.getElementById("login-form")) {
    document.getElementById("login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        login(email, password);
        document.getElementById("login-form").reset();
    });
}

if (document.getElementById("signup-form")) {
    document.getElementById("signup-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("signup-name").value;
        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;
        const passwordConfirm = document.getElementById("signup-password-confirm").value;

        if (password !== passwordConfirm) {
            alert("As senhas não conferem");
            return;
        }

        signup(name, email, password);
        document.getElementById("signup-form").reset();
    });
}

if (document.getElementById("login-link")) {
    document.getElementById("login-link").addEventListener("click", () => {
        previousScreen = "events-screen";
        showScreen("login-screen");
    });
}

if (document.getElementById("signup-link")) {
    document.getElementById("signup-link").addEventListener("click", () => {
        previousScreen = "events-screen";
        showScreen("signup-screen");
    });
}

if (document.getElementById("switch-to-signup")) {
    document.getElementById("switch-to-signup").addEventListener("click", () => {
        showScreen("signup-screen");
    });
}

if (document.getElementById("switch-to-login")) {
    document.getElementById("switch-to-login").addEventListener("click", () => {
        showScreen("login-screen");
    });
}

if (document.getElementById("back-from-login")) {
    document.getElementById("back-from-login").addEventListener("click", goBack);
}

if (document.getElementById("back-from-signup")) {
    document.getElementById("back-from-signup").addEventListener("click", goBack);
}

if (document.getElementById("logout-btn")) {
    document.getElementById("logout-btn").addEventListener("click", () => {
        logout();
    });
}

if (document.querySelector(".logo")) {
    document.querySelector(".logo").addEventListener("click", () => {
        showEventsScreen();
    });
}

// ==================== NAVIGATION ====================
if (document.getElementById("cart-btn")) {
    document.getElementById("cart-btn").addEventListener("click", () => {
        if (!currentUser) {
            alert("Você precisa fazer login para acessar o carrinho");
            previousScreen = "events-screen";
            showScreen("login-screen");
            return;
        }
        previousScreen = "events-screen";
        showScreen("cart-screen");
    });
}

if (document.getElementById("back-from-tickets")) {
    document.getElementById("back-from-tickets").addEventListener("click", goBack);
}

if (document.getElementById("back-to-events")) {
    document.getElementById("back-to-events").addEventListener("click", goBack);
}

if (document.getElementById("go-to-cart-from-tickets")) {
    document.getElementById("go-to-cart-from-tickets").addEventListener("click", goToCart);
}

// ==================== CARD INPUT FORMATTING ====================
if (document.getElementById("cardnumber")) {
    document.getElementById("cardnumber").addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\s/g, "").replace(/(\d{4})/g, "$1 ").trim();
    });
}

if (document.getElementById("cardexpiry")) {
    document.getElementById("cardexpiry").addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/(\d{2})/g, "$1/").slice(0, 5);
    });
}

if (document.getElementById("cardcvv")) {
    document.getElementById("cardcvv").addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\D/g, "");
    });
}

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
    console.log("Página carregada");
    loadUserFromLocalStorage();
    showEventsScreen();
    updateCart();
});