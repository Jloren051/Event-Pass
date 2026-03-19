
let currentUser = null;
let eventos = [];

const eventosPadrao = [
    { id: 1, titulo: "Festa Eletrônica 2026", data: "15/04/2026", local: "São Paulo", emoji: "🎵", preco: 80 },
    { id: 2, titulo: "Show de Rock", data: "20/05/2026", local: "Rio de Janeiro", emoji: "🎸", preco: 100 },
    { id: 3, titulo: "Festival de Música", data: "10/06/2026", local: "Belo Horizonte", emoji: "🎭", preco: 120 }
];

function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(screenId).classList.add("active");
}

function updateNavbar() {
    const userInfo = document.getElementById("user-info");
    const authButtons = document.getElementById("auth-buttons");

    if (currentUser) {
        userInfo.style.display = "flex";
        authButtons.style.display = "none";
        document.getElementById("username-display").textContent = currentUser.nome;
    } else {
        userInfo.style.display = "none";
        authButtons.style.display = "flex";
    }
}

async function carregarEventos() {
    try {
        const res = await fetch("/eventos");
        const data = await res.json();
        eventos = (res.ok && data.length > 0) ? data : eventosPadrao;
    } catch {
        eventos = eventosPadrao;
    }
    renderEventos();
}

function renderEventos() {
    const container = document.getElementById("events-grid");

    container.innerHTML = eventos.map(e => `
        <div class="event-card">
            <div class="event-image">${e.emoji || "🎉"}</div>
            <div class="event-content">
                <div class="event-title">${e.titulo}</div>
                <div class="event-date">📅 ${e.data}</div>
                <div class="event-location">📍 ${e.local}</div>
                <div class="event-price">R$ ${e.preco}</div>
            </div>
        </div>
    `).join("");
}

async function cadastrarUsuario(nome, email, senha, confirmarSenha) {
    try {
        const res = await fetch("/cadastrar", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({nome, email, senha, confirmarSenha})
        });

        const data = await res.json();
        alert(data.mensagem);

        if (res.ok) {
            // Redireciona para login após cadastro
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
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, senha})
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

document.addEventListener("DOMContentLoaded", () => {
    carregarEventos();
    updateNavbar();

    
    const signupForm = document.getElementById("signup-form");
    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const nome = document.getElementById("signup-name").value;
        const email = document.getElementById("signup-email").value;
        const senha = document.getElementById("signup-password").value;
        const confirmarSenha = document.getElementById("signup-password-confirm").value;

        await cadastrarUsuario(nome, email, senha, confirmarSenha);
    });

    const loginForm = document.getElementById("login-form");
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = document.getElementById("login-email").value;
        const senha = document.getElementById("login-password").value;

        await loginUsuario(email, senha);
    });

   
    document.getElementById("login-link").addEventListener("click", () => showScreen("login-screen"));
    document.getElementById("signup-link").addEventListener("click", () => showScreen("signup-screen"));

    document.getElementById("switch-to-login").addEventListener("click", () => showScreen("login-screen"));
    document.getElementById("switch-to-signup").addEventListener("click", () => showScreen("signup-screen"));

    document.getElementById("logout-btn").addEventListener("click", () => {
        currentUser = null;
        updateNavbar();
        showScreen("events-screen");
    });
});