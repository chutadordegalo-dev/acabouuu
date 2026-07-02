document.addEventListener("DOMContentLoaded", () => {
    let usuarioLogado = JSON.parse(localStorage.getItem('ecobyte_sessao'));
    let usuariosRegistrados = JSON.parse(localStorage.getItem('ecobyte_usuarios')) || [];

    if (!usuarioLogado) {
        alert("⚠️ Você precisa estar logado para acessar o perfil.");
        window.location.href = "loja.html";
        return;
    }

    const uploadFoto = document.getElementById("upload-foto");
    const avatarPreview = document.getElementById("avatar-preview");
    const formPerfil = document.getElementById("form-perfil");
    const inputUsername = document.getElementById("input-username");
    const inputEmail = document.getElementById("input-email");
    const userDisplayName = document.getElementById("user-display-name");
    const userDisplayEmail = document.getElementById("user-display-email");
    const btnLogout = document.getElementById("btn-logout");
    const btnTrocarConta = document.getElementById("btn-trocar-conta");

    userDisplayName.innerText = usuarioLogado.nome;
    userDisplayEmail.innerText = usuarioLogado.email;
    inputUsername.value = usuarioLogado.nome;
    inputEmail.value = usuarioLogado.email;
    if (usuarioLogado.foto) avatarPreview.src = usuarioLogado.foto;

    uploadFoto.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const imgData = event.target.result;
                avatarPreview.src = imgData;
                
                usuarioLogado.foto = imgData;
                localStorage.setItem('ecobyte_sessao', JSON.stringify(usuarioLogado));

                usuariosRegistrados = usuariosRegistrados.map(u => u.email === usuarioLogado.email ? { ...u, foto: imgData } : u);
                localStorage.setItem('ecobyte_usuarios', JSON.stringify(usuariosRegistrados));
            };
            reader.readAsDataURL(file);
        }
    });

    // ATUALIZADO: Evento ajustado para sincronizar com o banco de dados MySQL
    formPerfil.addEventListener("submit", (e) => {
        e.preventDefault();
        const novoNome = inputUsername.value.trim();
        
        if (!novoNome) {
            alert("⚠️ O nome não pode ficar vazio.");
            return;
        }

        // Faz uma chamada PUT para salvar no banco MySQL
        fetch('http://localhost:3000/api/usuarios/atualizar-nome', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id_usuario: usuarioLogado.id, // Envia o ID numérico do banco
                novo_nome: novoNome
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.sucesso) {
                // Altera o texto visual do perfil na tela
                userDisplayName.innerText = novoNome;
                
                // Sincroniza a sessão local do usuário logado
                usuarioLogado.nome = novoNome;
                localStorage.setItem('ecobyte_sessao', JSON.stringify(usuarioLogado));

                // Sincroniza o array de usuários simulados locais
                usuariosRegistrados = usuariosRegistrados.map(u => u.email === usuarioLogado.email ? { ...u, nome: novoNome } : u);
                localStorage.setItem('ecobyte_usuarios', JSON.stringify(usuariosRegistrados));
                
                alert("🎉 Modificações salvas com sucesso no banco de dados!");
            } else {
                alert("❌ Erro ao atualizar no banco: " + data.erro);
            }
        })
        .catch(err => {
            console.error("Erro de rede:", err);
            alert("❌ Não foi possível se conectar com o servidor.");
        });
    });

    btnLogout.addEventListener("click", encerrarSessao);
    btnTrocarConta.addEventListener("click", () => { if(confirm("Deseja alternar de conta?")) encerrarSessao(); });

    function encerrarSessao() {
        localStorage.removeItem('ecobyte_sessao');
        window.location.href = "loja.html";
    }
});

// --- Lógica do Menu Hambúrguer Mobile ---
const btnMobileMenu = document.getElementById('btn-mobile-menu');
const mobileMenu = document.getElementById('mobile-menu');
const btnLogoutMobile = document.getElementById('btn-logout-mobile');

// Abre e fecha o menu
btnMobileMenu.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
    const icone = btnMobileMenu.querySelector('i');
    if (mobileMenu.classList.contains('hidden')) {
        icone.className = "fa-solid fa-bars";
    } else {
        icone.className = "fa-solid fa-xmark";
    }
});

// Logout via menu mobile
if (btnLogoutMobile) {
    btnLogoutMobile.addEventListener('click', () => {
        localStorage.removeItem('ecobyte_sessao');
        window.location.href = "loja.html";
    });
}