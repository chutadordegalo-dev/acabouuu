let carrinho = JSON.parse(localStorage.getItem('ecobyte_carrinho')) || [];
let pedidosHistorico = JSON.parse(localStorage.getItem('ecobyte_pedidos')) || [];
let usuariosRegistrados = JSON.parse(localStorage.getItem('ecobyte_usuarios')) || [];
let usuarioLogado = JSON.parse(localStorage.getItem('ecobyte_sessao')) || null;

// Começa com o objeto vazio para ser preenchido pelos dados reais do banco MySQL
let estoqueProdutos = {};

let valorFrete = 0;
let modoAuthAtual = "login";
let filtroAbaAtual = "todos";

document.addEventListener('DOMContentLoaded', () => {
    inicializarElementosDOM();
    atualizarInterfaceUsuario();
    salvarCarrinho();
    configurarMudancaPagamento();
    
    // Busca os estoques e produtos direto do MySQL assim que a página carrega e monta a vitrine
    carregarEstoqueDoBanco();
});

function inicializarElementosDOM() {
    document.getElementById('btn-abrir-carrinho').addEventListener('click', abrirCarrinho);
    document.getElementById('btn-fechar-carrinho').addEventListener('click', fecharCarrinho);
    document.getElementById('btn-fechar-auth').addEventListener('click', fecharAuthModal);
    document.getElementById('btn-meus-pedidos').addEventListener('click', abrirPedidos);
    document.getElementById('btn-fechar-pedidos').addEventListener('click', fecharPedidos);

    document.getElementById('btn-aba-login').addEventListener('click', () => mudarAbaAuth('login'));
    document.getElementById('btn-aba-cadastro').addEventListener('click', () => mudarAbaAuth('cadastro'));
    document.getElementById('form-auth').addEventListener('submit', realizarAutenticacao);

    document.getElementById('btn-calcular-frete').addEventListener('click', calcularFrete);
    document.getElementById('btn-finalizar-compra').addEventListener('click', finalizarCompra);
}

// ADICIONADO/MODIFICADO: Função 100% dinâmica que gera os cards da vitrine direto do MySQL
function carregarEstoqueDoBanco() {
    fetch('http://localhost:3000/api/produtos')
        .then(res => res.json())
        .then(produtos => {
            const vitrine = document.getElementById('vitrine-produtos');
            if (!vitrine) return;

            // Limpa qualquer conteúdo antigo ou estático da vitrine
            vitrine.innerHTML = ''; 
            
            // Reseta o objeto de controle global de estoque
            estoqueProdutos = {}; 

            produtos.forEach(p => {
                // Sincroniza a quantidade para validações internas de carrinho no script
                estoqueProdutos[p.nome] = p.quantidade;

                // Verifica o status do estoque para mudar as cores e o botão
                const indisponivel = p.quantidade <= 0;
                
                let textoEstoque = '';
                if (indisponivel) {
                    textoEstoque = `<span class="font-semibold text-red-500 text-xs bg-red-50 px-2.5 py-1 rounded-full"><i class="fa-solid fa-circle-xmark mr-1"></i>Esgotado</span>`;
                } else {
                    textoEstoque = `<span class="font-semibold text-emerald-600 text-xs bg-emerald-50 px-2.5 py-1 rounded-full"><i class="fa-solid fa-circle-check mr-1"></i>${p.quantidade} un. disponíveis</span>`;
                }

                // Cria o Card do Produto utilizando as classes visuais do Tailwind
                const card = document.createElement('div');
                card.className = "bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-300";
                
                card.innerHTML = `
                    <div>
                        <div class="w-full h-36 bg-gray-50 rounded-xl p-3 flex items-center justify-center mb-3">
                            <img src="${p.imagem || '../img/default-product.png'}" alt="${p.nome}" class="max-h-full max-w-full object-contain mix-blend-multiply">
                        </div>
                        
                        <h3 class="font-bold text-gray-800 text-sm line-clamp-2 h-10 mb-2" title="${p.nome}">${p.nome}</h3>
                        
                        <div class="mb-4">${textoEstoque}</div>
                    </div>
                    
                    <div>
                        <p class="text-eco-dark font-extrabold text-base mb-3">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</p>
                        
                        <button 
                            onclick="adicionarAoCarrinho('${p.nome.replace(/'/g, "\\'")}', ${p.preco})"
                            ${indisponivel ? 'disabled class="w-full bg-gray-200 text-gray-400 py-2.5 rounded-xl font-bold text-xs cursor-not-allowed"' : 'class="w-full bg-eco-dark text-white py-2.5 rounded-xl font-bold text-xs hover:bg-eco-blue transition shadow-sm font-sans"'}
                        >
                            ${indisponivel ? 'Indisponível' : '<i class="fa-solid fa-cart-plus mr-1"></i> Adicionar ao Carrinho'}
                        </button>
                    </div>
                `;
                
                // Adiciona o card gerado dentro da vitrine html
                vitrine.appendChild(card);
            });

            // Atualiza o backup de segurança do localStorage
            localStorage.setItem('ecobyte_estoque', JSON.stringify(estoqueProdutos));
        })
        .catch(err => {
            console.error("❌ Erro ao sincronizar produtos do banco com a vitrine:", err);
            
            // Fallback de segurança se a API estiver offline
            const vitrine = document.getElementById('vitrine-produtos');
            if (vitrine && vitrine.children.length === 0) {
                vitrine.innerHTML = `
                    <div class="col-span-full text-center py-8 text-gray-500 text-xs">
                        <i class="fa-solid fa-triangle-exclamation text-amber-500 text-2xl block mb-2"></i>
                        Não foi possível carregar a vitrine em tempo real. O servidor está offline.
                    </div>
                `;
            }
        });
}

// MONITOR DE EXIBIÇÃO DE OPÇÃO DE CARTÃO
function configurarMudancaPagamento() {
    const radios = document.querySelectorAll('input[name="forma-pagamento"]');
    const secaoCartao = document.getElementById('secao-formulario-cartao');
    
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if(e.target.value === 'Cartão de Crédito') {
                secaoCartao.classList.remove('hidden');
            } else {
                secaoCartao.classList.add('hidden');
            }
        });
    });
}

// AUTH
function abrirAuthModal(modo = 'login') {
    document.getElementById('modal-auth').classList.remove('hidden');
    mudarAbaAuth(modo);
}
function fecharAuthModal() { document.getElementById('modal-auth').classList.add('hidden'); }

function mudarAbaAuth(modo) {
    modoAuthAtual = modo;
    const btnLogin = document.getElementById('btn-aba-login');
    const btnCadastro = document.getElementById('btn-aba-cadastro');
    const campoNome = document.getElementById('campo-nome-cadastro');
    const btnSubmit = document.getElementById('btn-submit-auth');

    if (modo === 'login') {
        btnLogin.className = "flex-1 pb-3 border-b-2 border-orange-500 text-orange-600 font-bold";
        btnCadastro.className = "flex-1 pb-3 border-b-2 border-transparent text-gray-400";
        campoNome.classList.add('hidden');
        btnSubmit.innerText = "Entrar na Conta";
    } else {
        btnCadastro.className = "flex-1 pb-3 border-b-2 border-orange-500 text-orange-600 font-bold";
        btnLogin.className = "flex-1 pb-3 border-b-2 border-transparent text-gray-400";
        campoNome.classList.remove('hidden');
        btnSubmit.innerText = "Criar Minha Conta";
    }
}

function realizarAutenticacao(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const senha = document.getElementById('auth-senha').value;
    const nome = document.getElementById('auth-nome').value.trim();

    if (modoAuthAtual === 'cadastro') {
        if (usuariosRegistrados.some(u => u.email === email)) {
            alert("⚠️ Este e-mail já está cadastrado!"); return;
        }
        const novoUsuario = { nome, email, senha, foto: "" };
        usuariosRegistrados.push(novoUsuario);
        localStorage.setItem('ecobyte_usuarios', JSON.stringify(usuariosRegistrados));
        usuarioLogado = novoUsuario;
    } else {
        const conta = usuariosRegistrados.find(u => u.email === email && u.senha === senha);
        if (!conta) { alert("❌ Credenciais incorretas!"); return; }
        usuarioLogado = conta;
    }

    localStorage.setItem('ecobyte_sessao', JSON.stringify(usuarioLogado));
    atualizarInterfaceUsuario();
    fecharAuthModal();
}

window.realizarLogout = function() {
    usuarioLogado = null;
    localStorage.removeItem('ecobyte_sessao');
    atualizarInterfaceUsuario();
};

function atualizarInterfaceUsuario() {
    usuarioLogado = JSON.parse(localStorage.getItem('ecobyte_sessao'));
    const wrapper = document.getElementById('area-autenticada');

    if (usuarioLogado) {
        wrapper.innerHTML = `
            <a href="perfil.html" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <img src="${usuarioLogado.foto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3'}" class="w-7 h-7 rounded-full object-cover border border-eco-light">
                <span class="text-xs font-bold text-eco-dark">Meu Perfil (${usuarioLogado.nome.split(' ')[0]})</span>
            </a>
            <button onclick="realizarLogout()" class="text-red-500 text-xs font-bold" title="Sair"><i class="fa-solid fa-power-off"></i></button>
        `;
    } else {
        wrapper.innerHTML = `
            <button onclick="abrirAuthModal('login')" class="text-xs font-bold text-gray-600 hover:text-eco-dark focus:outline-none">Entre</button>
            <span class="text-gray-300 text-xs">|</span>
            <button onclick="abrirAuthModal('cadastro')" class="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-full focus:outline-none">Cadastre-se</button>
        `;
    }
}

// LOGICA CARRINHO
function salvarCarrinho() {
    localStorage.setItem('ecobyte_carrinho', JSON.stringify(carrinho));
    atualizarBadge();
    renderizarCarrinho();
}

function atualizarBadge() {
    const contador = document.getElementById('carrinho-contador');
    const totalItens = carrinho.reduce((acc, item) => acc + item.qtd, 0);
    if(totalItens > 0) { contador.innerText = totalItens; contador.classList.remove('hidden'); }
    else { contador.classList.add('hidden'); }
}

window.adicionarAoCarrinho = function(nome, preco) {
    const item = carrinho.find(i => i.nome === nome);
    const qtdAtualNoCarrinho = item ? item.qtd : 0;
    const estoqueDisponivel = estoqueProdutos[nome] || 0;

    if (qtdAtualNoCarrinho + 1 > estoqueDisponivel) {
        alert("⚠️ Limite de estoque atingido para este item!");
        return;
    }

    if(item) item.qtd += 1; else carrinho.push({ nome, preco, qtd: 1 });
    salvarCarrinho(); abrirCarrinho();
};

window.removerItem = function(nome) { carrinho = carrinho.filter(i => i.nome !== nome); salvarCarrinho(); };
window.alterarQuantidade = function(nome, v) { 
    const item = carrinho.find(i => i.nome === nome);
    if(item) { 
        if (v > 0 && item.qtd + v > (estoqueProdutos[nome] || 0)) {
            alert("⚠️ Desculpe, não temos mais unidades disponíveis em estoque.");
            return;
        }
        item.qtd += v; 
        if(item.qtd <= 0) { removerItem(nome); return; } 
    }
    salvarCarrinho();
};

function abrirCarrinho() { document.getElementById('modal-carrinho').classList.remove('hidden'); }
function fecharCarrinho() { document.getElementById('modal-carrinho').classList.add('hidden'); }

// CÁLCULO CEP
function calcularFrete() {
    const cep = document.getElementById('input-cep').value.trim();
    const numeroCasa = document.getElementById('input-numero-casa').value.trim();
    const resultado = document.getElementById('resultado-frete');
    
    if(cep === '' || numeroCasa === '') { alert("⚠️ Digite o CEP e o número da sua casa!"); return; }

    valorFrete = Math.floor(Math.random() * 12) + 10;
    resultado.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600"></i> Enviar para Nº <strong>${numeroCasa}</strong><br>Frete: <strong>R$ ${valorFrete.toFixed(2).replace('.', ',')}</strong> (Prazo: 3-5 dias)`;
    resultado.classList.remove('hidden');
    renderizarCarrinho();
}

function renderizarCarrinho() {
    const container = document.getElementById('carrinho-itens');
    const subtotalElemento = document.getElementById('resumo-subtotal');
    const freteElemento = document.getElementById('resumo-frete');
    const totalElemento = document.getElementById('carrinho-total');
    
    if(carrinho.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-xs text-center py-6">Seu carrinho está vazio.</p>';
        subtotalElemento.innerText = 'R$ 0,00'; freteElemento.innerText = 'R$ 0,00'; totalElemento.innerText = 'R$ 0,00';
        return;
    }

    container.innerHTML = ''; let valorSubtotal = 0;
    carrinho.forEach(item => {
        valorSubtotal += (item.preco * item.qtd);
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-gray-50 p-2 rounded-xl border border-gray-100 text-xs shadow-sm";
        div.innerHTML = `
            <div class="flex-grow pr-1">
                <h4 class="font-semibold text-eco-dark text-xs line-clamp-1">${item.nome}</h4>
                <p class="text-gray-500">R$ ${item.preco.toFixed(2).replace('.', ',')}</p>
            </div>
            <div class="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1.5">
                <button onclick="alterarQuantidade('${item.nome.replace(/'/g, "\\'")}', -1)" class="font-bold text-gray-500 hover:text-eco-dark px-1">-</button>
                <span class="font-bold text-center text-xs w-4">${item.qtd}</span>
                <button onclick="alterarQuantidade('${item.nome.replace(/'/g, "\\'")}', 1)" class="font-bold text-gray-500 hover:text-eco-dark px-1">+</button>
            </div>
            <button onclick="removerItem('${item.nome.replace(/'/g, "\\'")}')" class="text-red-500 ml-2"><i class="fa-solid fa-trash"></i></button>
        `;
        container.appendChild(div);
    });

    subtotalElemento.innerText = `R$ ${valorSubtotal.toFixed(2).replace('.', ',')}`;
    freteElemento.innerText = valorFrete > 0 ? `R$ ${valorFrete.toFixed(2).replace('.', ',')}` : 'A calcular';
    totalElemento.innerText = `R$ ${(valorSubtotal + valorFrete).toFixed(2).replace('.', ',')}`;
}

// CHECKOUT INTEGRADO COM MYSQL
function finalizarCompra() {
    if(carrinho.length === 0) return;
    if(!usuarioLogado) { alert("⚠️ Faça login para concluir o pedido!"); abrirAuthModal('login'); return; }
    
    const cep = document.getElementById('input-cep').value.trim();
    const numeroCasa = document.getElementById('input-numero-casa').value.trim();
    if(cep === '' || numeroCasa === '') { alert("⚠️ Por favor, informe o CEP e o Número da Casa!"); return; }

    const formaSelecionada = document.querySelector('input[name="forma-pagamento"]:checked').value;
    let detalhesCartaoObj = null;

    if(formaSelecionada === 'Cartão de Crédito') {
        const num = document.getElementById('cartao-numero').value.trim();
        const nome = document.getElementById('cartao-nome').value.trim();
        const val = document.getElementById('cartao-validade').value.trim();
        const cvv = document.getElementById('cartao-cvv').value.trim();
        if(!num || !nome || !val || !cvv) {
            alert("❌ Preencha todos os dados do cartão de crédito para continuar!");
            return;
        }
        detalhesCartaoObj = { numero: num, nome_titular: nome, validade: val, cvv: cvv };
    }

    for (const item of carrinho) {
        if ((estoqueProdutos[item.nome] || 0) < item.qtd) {
            alert(`❌ O produto "${item.nome}" não possui estoque suficiente para fechar a compra.`);
            return;
        }
    }

    const valorSubtotalCalculado = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
    const valorTotalCalculado = valorSubtotalCalculado + valorFrete;

    const itensParaBackend = carrinho.map(item => ({
        nome: item.nome,
        preco: item.preco,
        quantidade: item.qtd
    }));

    const dadosEnvioAPI = {
        id_usuario: usuarioLogado.id || 1,
        total: valorTotalCalculado,
        frete: valorFrete,
        metodo_pagamento: formaSelecionada,
        itens: itensParaBackend,
        detalhes_cartao: detalhesCartaoObj
    };

    fetch('http://localhost:3000/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosEnvioAPI)
    })
    .then(res => res.json())
    .then(dadosResposta => {
        if (!dadosResposta.sucesso) {
            alert("❌ Erro no banco de dados: " + dadosResposta.erro);
            return;
        }

        const novoPedido = {
            id: dadosResposta.id_pedido,
            usuarioEmail: usuarioLogado.email,
            produtos: [...carrinho],
            total: valorTotalCalculado,
            pagamento: formaSelecionada,
            numeroCasa: numeroCasa,
            data: new Date().toLocaleDateString('pt-BR')
        };

        pedidosHistorico.push(novoPedido);
        localStorage.setItem('ecobyte_pedidos', JSON.stringify(pedidosHistorico));
        
        carrinho = []; valorFrete = 0;
        document.getElementById('input-cep').value = '';
        document.getElementById('input-numero-casa').value = '';
        document.getElementById('resultado-frete').classList.add('hidden');
        salvarCarrinho(); 
        fecharCarrinho();

        // Recarrega o estoque vindo do banco e atualiza os cards na tela automaticamente
        carregarEstoqueDoBanco();

        abrirModalVisualizacaoPagamento(novoPedido);
    })
    .catch(err => {
        console.error("Erro ao conectar à API:", err);
        alert("❌ O servidor está offline ou inacessível. O pedido não foi gravado no banco.");
    });
}

function abrirModalVisualizacaoPagamento(pedido) {
    const modal = document.getElementById('modal-checkout-resultado');
    const container = document.getElementById('conteudo-checkout-resultado');
    modal.classList.remove('hidden');

    const totalFormatado = pedido.total.toFixed(2).replace('.', ',');

    if(pedido.pagamento === 'Pix') {
        const payloadPixSimulado = `00020101021226580014br.gov.bcb.pix0136ecobyte-sustentavel-pix-99945225204223053039995204000053039865407${pedido.total.toFixed(2)}5802BR5915EcoByte%20Store6009Contagem62070503***6304`;
        
        container.innerHTML = `
            <div class="flex justify-between items-center border-b pb-2">
                <h4 class="font-bold text-emerald-600 flex items-center gap-1 text-sm"><i class="fa-solid fa-pix"></i> Pagamento via Pix</h4>
                <button onclick="fecharModalResultado()" class="text-gray-400 hover:text-gray-600 text-lg font-bold">×</button>
            </div>
            <p class="text-xs text-gray-600 leading-relaxed">Escaneie o QR Code abaixo pelo aplicativo do seu banco para concluir o pagamento de <strong>R$ ${totalFormatado}</strong> do Pedido <strong>#${pedido.id}</strong>.</p>
            
            <div class="bg-gray-100 p-3 w-48 h-48 mx-auto rounded-xl flex items-center justify-center shadow-inner">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(payloadPixSimulado)}" class="w-full h-full" alt="QR Code Pix EcoByte">
            </div>

            <div class="text-center"><span class="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full text-[10px]"><i class="fa-regular fa-clock mr-1"></i> Expira em <span id="pix-cronometro">05:00</span></span></div>

            <div class="space-y-2">
                <label class="block text-left text-[11px] font-bold text-gray-500">Pix Copia e Cola:</label>
                <input type="text" readonly value="${payloadPixSimulado}" id="input-pix-copia-cola" class="w-full bg-gray-50 border p-2 rounded-lg text-[10px] outline-none text-gray-500 truncate">
                <button onclick="copiarTextoCheckout('input-pix-copia-cola', 'Pix Copiado!')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs transition"><i class="fa-regular fa-copy mr-1"></i> Copiar Código Pix</button>
            </div>
        `;
        dispararCronometroPix();

    } else if(pedido.pagamento === 'Boleto Bancário') {
        const codBarrasSimulado = `34191.79001 01043.513184 91020.150008 7 982700000${pedido.total.toFixed(0)}`;
        
        container.innerHTML = `
            <div class="flex justify-between items-center border-b pb-2">
                <h4 class="font-bold text-gray-700 flex items-center gap-1 text-sm"><i class="fa-solid fa-barcode"></i> Boleto Bancário Gerado</h4>
                <button onclick="fecharModalResultado()" class="text-gray-400 hover:text-gray-600 text-lg font-bold">×</button>
            </div>
            <p class="text-xs text-gray-600">Seu boleto referente ao pedido <strong>#${pedido.id}</strong> foi gerado com sucesso no valor de <strong>R$ ${totalFormatado}</strong>.</p>
            
            <div class="border-2 border-dashed border-gray-300 p-4 rounded-xl bg-gray-50 font-mono text-center space-y-2">
                <i class="fa-solid fa-barcode text-5xl text-gray-800 block tracking-widest"></i>
                <span class="text-[10px] text-gray-500 block break-all" id="texto-boleto-barra">${codBarrasSimulado}</span>
            </div>

            <div class="space-y-2">
                <button onclick="copiarTextoCheckout('texto-boleto-barra', 'Linha digitável copiada!', true)" class="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 rounded-lg text-xs transition"><i class="fa-regular fa-copy mr-1"></i> Copiar Linha Digitável</button>
                <button onclick="alert('Simulando Impressão do Boleto PDF...')" class="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 rounded-lg text-xs transition"><i class="fa-solid fa-print mr-1"></i> Imprimir Boleto</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="py-6 space-y-3">
                <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-3xl"><i class="fa-solid fa-circle-check"></i></div>
                <h4 class="font-bold text-gray-800 text-base">Pagamento Aprovado!</h4>
                <p class="text-xs text-gray-500 max-w-xs mx-auto">Seu cartão de crédito foi processado com sucesso. O pedido <strong>#${pedido.id}</strong> foi enviado para faturamento.</p>
                <button onclick="fecharModalResultado(); abrirPedidos();" class="bg-blue-600 text-white font-bold px-6 py-2 rounded-xl text-xs hover:bg-blue-700 transition">Ver nos Meus Pedidos</button>
            </div>
        `;
    }
}

window.fecharModalResultado = function() { 
    document.getElementById('modal-checkout-resultado').classList.add('hidden'); 
};

window.copiarTextoCheckout = function(idAlvo, msgSucesso, ehElementoTexto = false) {
    const alvo = document.getElementById(idAlvo);
    const texto = ehElementoTexto ? alvo.innerText : alvo.value;
    navigator.clipboard.writeText(texto);
    alert(`💡 ${msgSucesso}`);
};

function dispararCronometroPix() {
    let tempo = 300; 
    const display = document.getElementById('pix-cronometro');
    const intervalo = setInterval(() => {
        if(!display) { clearInterval(intervalo); return; }
        let min = Math.floor(tempo / 60);
        let seg = tempo % 60;
        display.innerText = `${min < 10 ? '0' + min : min}:${seg < 10 ? '0' + seg : seg}`;
        if (--tempo < 0) { clearInterval(intervalo); display.innerText = "EXPIRADO"; }
    }, 1000);
}

// MEUS PEDIDOS ESTILO SHOPEE
function abrirPedidos() { document.getElementById('modal-pedidos').classList.remove('hidden'); filtrarPedidosShopee(filtroAbaAtual); }
function fecharPedidos() { document.getElementById('modal-pedidos').classList.add('hidden'); }

window.filtrarPedidosShopee = function(tipo) {
    filtroAbaAtual = tipo;
    const abas = { todos: 'aba-todos', Pix: 'aba-pendentes', Concluidos: 'aba-concluidos' };
    
    Object.keys(abas).forEach(key => {
        const el = document.getElementById(abas[key]);
        if(key === tipo) el.className = "flex-1 py-3 text-orange-600 border-b-2 border-orange-500";
        else el.className = "flex-1 py-3 text-gray-500 border-b-2 border-transparent hover:text-orange-600";
    });

    const container = document.getElementById('lista-pedidos-container');
    if(!usuarioLogado) { container.innerHTML = '<p class="text-center text-gray-400 text-xs py-6">Faça login para ver seus pedidos.</p>'; return; }

    let filtrados = pedidosHistorico.filter(p => p.usuarioEmail === usuarioLogado.email);
    
    if(tipo === 'Pix') {
        filtrados = filtrados.filter(p => p.pagamento === 'Pix');
    } else if(tipo === 'Concluidos') {
        filtrados = filtrados.filter(p => p.pagamento !== 'Pix');
    }

    if(filtrados.length === 0) { container.innerHTML = '<p class="text-center text-gray-400 text-xs py-6">Nenhum pedido nesta aba.</p>'; return; }

    container.innerHTML = '';
    filtrados.forEach(p => {
        const div = document.createElement('div');
        div.className = "bg-white p-3.5 rounded-xl border border-gray-200 text-xs space-y-2 shadow-sm";
        const itensText = p.produtos.map(i => `${i.qtd}x ${i.nome}`).join(', ');
        
        const badgeStatus = p.pagamento === 'Pix' 
            ? '<span class="text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-bold">Aguardando Pagamento</span>' 
            : '<span class="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">Aprovado pelo Banco</span>';

        div.innerHTML = `
            <div class="flex justify-between items-center border-b border-gray-100 pb-2">
                <span class="font-bold text-gray-800">ID: #${p.id}</span>
                ${badgeStatus}
            </div>
            <p class="text-gray-600 font-medium"><strong>Itens:</strong> ${itensText}</p>
            <p class="text-gray-500 text-[11px]"><strong>Entrega:</strong> Casa Nº ${p.numeroCasa} | <strong>Pagamento por:</strong> ${p.pagamento}</p>
            <div class="flex justify-between items-center pt-1 border-t border-gray-50 text-[11px]">
                <span class="text-gray-400">${p.data}</span>
                <span class="text-orange-600 font-bold text-sm">Total: R$ ${p.total.toFixed(2).replace('.', ',')}</span>
            </div>
        `;
        container.appendChild(div);
    });
};

// CONTROLE DO MENU HAMBÚRGUER MOBILE
document.addEventListener('DOMContentLoaded', () => {
    const btnMobileMenu = document.getElementById('btn-mobile-menu');
    const mobileMenu = document.getElementById('mobile-menu');

    btnMobileMenu.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        const icone = btnMobileMenu.querySelector('i');
        if (mobileMenu.classList.contains('hidden')) {
            icone.className = "fa-solid fa-bars";
        } else {
            icone.className = "fa-solid fa-xmark";
        }
    });

    document.getElementById('btn-meus-pedidos-mobile').addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        btnMobileMenu.querySelector('i').className = "fa-solid fa-bars";
        abrirPedidos();
    });

    document.getElementById('btn-abrir-carrinho-mobile').addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        btnMobileMenu.querySelector('i').className = "fa-solid fa-bars";
        abrirCarrinho();
    });

    const originalAtualizarInterface = atualizarInterfaceUsuario;
    atualizarInterfaceUsuario = function() {
        originalAtualizarInterface(); 
        
        usuarioLogado = JSON.parse(localStorage.getItem('ecobyte_sessao'));
        const wrapperMobile = document.getElementById('area-autenticada-mobile');
        if(!wrapperMobile) return;

        if (usuarioLogado) {
            wrapperMobile.innerHTML = `
                <a href="perfil.html" class="flex items-center gap-2 hover:opacity-80 transition-opacity py-1">
                    <img src="${usuarioLogado.foto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3'}" class="w-7 h-7 rounded-full object-cover border border-eco-light">
                    <span class="text-xs font-bold text-eco-dark">Meu Perfil (${usuarioLogado.nome.split(' ')[0]})</span>
                </a>
                <button onclick="realizarLogout(); document.getElementById('mobile-menu').classList.add('hidden');" class="text-red-500 text-xs font-bold text-left flex items-center gap-2 py-1">
                    <i class="fa-solid fa-power-off"></i> Sair da Conta
                </button>
            `;
        } else {
            wrapperMobile.innerHTML = `
                <button onclick="abrirAuthModal('login'); document.getElementById('mobile-menu').classList.add('hidden');" class="text-xs font-bold text-gray-600 hover:text-eco-dark text-left py-1">Entre</button>
                <button onclick="abrirAuthModal('cadastro'); document.getElementById('mobile-menu').classList.add('hidden');" class="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-full text-center w-full">Cadastre-se</button>
            `;
        }
    };
    
    atualizarInterfaceUsuario();
});