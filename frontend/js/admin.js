const API_URL = 'http://localhost:3000/api';

// Envio do formulário de Produtos
document.getElementById('form-produto').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const dados = {
        nome: document.getElementById('prod-nome').value.trim(),
        preco: parseFloat(document.getElementById('prod-preco').value),
        quantidade: parseInt(document.getElementById('prod-qtd').value),
        imagem: document.getElementById('prod-img').value.trim()
    };

    try {
        const resposta = await fetch(`${API_URL}/admin/produtos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        const resultado = await resposta.json();

        if (resultado.sucesso) {
            alert("🎉 Produto cadastrado com sucesso no estoque!");
            document.getElementById('form-produto').reset();
        } else {
            alert("⚠️ Erro: " + resultado.erro);
        }
    } catch (err) {
        alert("❌ Falha ao conectar com o servidor.");
    }
});

// Envio do formulário de Pontos de Coleta
document.getElementById('form-ponto').addEventListener('submit', async (e) => {
    e.preventDefault();

    const dados = {
        nome: document.getElementById('ponto-nome').value.trim(),
        endereco: document.getElementById('ponto-end').value.trim(),
        lat: parseFloat(document.getElementById('ponto-lat').value),
        lng: parseFloat(document.getElementById('ponto-lng').value)
    };

    try {
        const resposta = await fetch(`${API_URL}/admin/pontos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        const resultado = await resposta.json();

        if (resultado.sucesso) {
            alert("🎉 Novo ponto de coleta adicionado geograficamente!");
            document.getElementById('form-ponto').reset();
        } else {
            alert("⚠️ Erro: " + resultado.erro);
        }
    } catch (err) {
        alert("❌ Falha ao conectar com o servidor.");
    }
});