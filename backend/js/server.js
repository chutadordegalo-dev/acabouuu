const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const crypto = require('crypto'); // Módulo nativo do Node para criptografia reversível (Cartão)
require('dotenv').config();

const app = express();
const PORT = 3000;

// Configuração da Criptografia para o Cartão de Crédito (AES-256-CBC)
const ALGORITMO_CARTAO = 'aes-256-cbc';
const CHAVE_SECRETA_CARTAO = crypto.scryptSync('SuaPalavraChaveMuitoSeguraEcoByte', 'salt', 32); 
const IV_CARTAO = crypto.randomBytes(16); // Vetor de inicialização fictício fixo ou dinâmico

function criptografarCartao(dados) {
    const cipher = crypto.createCipheriv(ALGORITMO_CARTAO, CHAVE_SECRETA_CARTAO, IV_CARTAO);
    let encrypted = cipher.update(JSON.stringify(dados), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

// Configurações e Middlewares obrigatórios
app.use(cors()); // Habilita o CORS para todas as origens (suas páginas HTML locais/servidor)
app.use(express.json());

// Conexão com o seu banco de dados MySQL
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecobyte_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Testar conexão inicial
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Erro ao conectar no Banco de Dados:', err.message);
    } else {
        console.log('🚀 Conectado com sucesso ao Banco de Dados da EcoByte!');
        connection.release();
    }
});

// ==========================================
// 1. ROTAS DE AUTENTICAÇÃO E USUÁRIOS
// ==========================================

// Rota de Cadastro de Usuário (Senha Criptografada com bcrypt)
app.post('/api/auth/cadastro', async (req, res) => {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ sucesso: false, erro: "Campos obrigatórios ausentes" });

    try {
        // Criptografando a senha antes de salvar
        const saltRounds = 10;
        const senhaCriptografada = await bcrypt.hash(senha, saltRounds);

        const sql = "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)";
        db.query(sql, [nome, email, senhaCriptografada], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ sucesso: false, erro: "E-mail já cadastrado." });
                }
                return res.status(500).json({ sucesso: false, erro: err.message });
            }
            res.status(201).json({ sucesso: true, id: result.insertId, nome, email });
        });
    } catch (error) {
        res.status(500).json({ sucesso: false, erro: "Erro interno no servidor." });
    }
});

// Rota de Login (Verificação da senha hash)
app.post('/api/auth/login', (req, res) => {
    const { email, senha } = req.body;
    
    const sql = "SELECT * FROM usuarios WHERE email = ?";
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        if (results.length === 0) return res.status(401).json({ sucesso: false, erro: "Usuário ou senha inválidos." });

        const usuario = results[0];
        // Compara a senha digitada com o hash guardado no banco
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
        
        if (!senhaCorreta) return res.status(401).json({ sucesso: false, erro: "Usuário ou senha inválidos." });

        res.json({
            sucesso: true,
            usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, foto: usuario.foto }
        });
    });
});

// ADICIONADO: Rota para atualizar o nome do usuário no MySQL
app.put('/api/usuarios/atualizar-nome', (req, res) => {
    const { id_usuario, novo_nome } = req.body;

    if (!id_usuario || !novo_nome) {
        return res.status(400).json({ sucesso: false, erro: "Dados incompletos para atualização." });
    }

    const sql = "UPDATE usuarios SET nome = ? WHERE id = ?";
    db.query(sql, [novo_nome, id_usuario], (err, result) => {
        if (err) {
            console.error("Erro ao atualizar nome no MySQL:", err.message);
            return res.status(500).json({ sucesso: false, erro: err.message });
        }
        res.json({ sucesso: true, mensagem: "Nome atualizado com sucesso no banco de dados!" });
    });
});


// ==========================================
// 2. ROTAS DA LOJA (PRODUTOS E PEDIDOS)
// ==========================================

// Rota para buscar os produtos (Retorna quantidades e informações para a vitrine)
app.get('/api/produtos', (req, res) => {
    db.query("SELECT * FROM produtos", (err, results) => {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        res.json(results);
    });
});

// Rota para Criar Pedidos - Atualizada para aceitar buscas por Nome ou por ID direto do produto
app.post('/api/pedidos', (req, res) => {
    const { id_usuario, total, frete, metodo_pagamento, itens, produtos, detalhes_cartao } = req.body;
    const listaItens = itens || produtos;

    if (!listaItens || !Array.isArray(listaItens) || listaItens.length === 0) {
        return res.status(400).json({ sucesso: false, erro: "O pedido não possui itens válidos no carrinho." });
    }

    let pixCopiaECola = null;
    let boletoCodigo = null;
    let cartaoCriptografado = null;

    // Lógica para tratar cada método de pagamento solicitado
    if (metodo_pagamento === 'Pix') {
        pixCopiaECola = `00020101021126330014br.gov.bcb.pix0111ecobytepix${Math.floor(Math.random() * 100000)}5204000053039865405${total}5802BR5915EcoByteRecicla6009SaoPaulo62070503***6304ABCD`;
    } else if (metodo_pagamento === 'Boleto' || metodo_pagamento === 'Boleto Bancário') {
        boletoCodigo = `34191.79001 01043.513184 91020.150008 7 987600000${total.toString().replace('.', '')}`;
    } else if (metodo_pagamento === 'Cartão de Crédito' && detalhes_cartao) {
        cartaoCriptografado = criptografarCartao(detalhes_cartao);
    }

    // Insere o registro na tabela pai de pedidos
    const queryPedido = "INSERT INTO pedidos (id_usuario, total, frete, metodo_pagamento, pix_copia_e_cola, boleto_codigo, cartao_dados_criptografados) VALUES (?, ?, ?, ?, ?, ?, ?)";
    
    db.query(queryPedido, [id_usuario, total, frete, metodo_pagamento, pixCopiaECola, boletoCodigo, cartaoCriptografado], (err, resultPedido) => {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });

        const idPedidoInserido = resultPedido.insertId;

        // Buscamos a tabela de produtos atualizada do banco para vincular tanto nomes textuais quanto IDs numéricos
        db.query("SELECT id, nome FROM produtos", (errProd, produtosBanco) => {
            if (errProd) return res.status(500).json({ sucesso: false, erro: "Erro ao mapear IDs de produtos." });

            // Itera sobre cada item enviado no carrinho
            listaItens.forEach(item => {
                // Tenta achar o produto pelo ID direto ou faz a busca inteligente por equivalência de texto ignorando maiúsculas
                const produtoCorrespondente = produtosBanco.find(p => 
                    p.id === Number(item.id) || 
                    (p.nome && item.nome && p.nome.trim().toLowerCase() === item.nome.trim().toLowerCase())
                );
                
                if (produtoCorrespondente) {
                    const idProdutoReal = produtoCorrespondente.id;
                    const precoReal = item.preco;
                    const quantityReal = item.quantidade || item.qtd || 1;

                    const queryItens = "INSERT INTO pedido_itens (id_pedido, id_produto, quantidade, preco_unitario) VALUES (?, ?, ?, ?)";
                    db.query(queryItens, [idPedidoInserido, idProdutoReal, quantityReal, precoReal], (errIten) => {
                        if (errIten) {
                            console.error("Erro ao registrar item do pedido: ", errIten.message);
                        } else {
                            // Deduz a quantidade vendida da tabela de produtos de forma segura
                            const queryEstoque = "UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?";
                            db.query(queryEstoque, [quantityReal, idProdutoReal], (errEst) => {
                                if (errEst) console.error("Erro ao atualizar o estoque no MySQL: ", errEst.message);
                            });
                        }
                    });
                } else {
                    console.warn(`Aviso: Produto "${item.nome || 'ID: ' + item.id}" não localizado na tabela de produtos do banco.`);
                }
            });

            // Envia a resposta de sucesso de volta
            res.json({
                sucesso: true,
                mensagem: "Pedido gravado e estoque atualizado com sucesso!",
                id_pedido: idPedidoInserido,
                pix: pixCopiaECola,
                boleto: boletoCodigo
            });
        });
    });
});


// ==========================================
// 3. ROTAS DE COLETA CORPORATIVA (INICIO.JS)
// ==========================================

// CRUD - Create: Enviar solicitação de Coleta Corporativa
app.post('/api/cotacao', (req, res) => {
    const { nome, email, contato, endereco, descricao } = req.body;
    
    const sql = "INSERT INTO coletas_corporativas (nome, email, contato, endereco, descricao) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [nome, email, contato, endereco, descricao], (err, result) => {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        res.json({ success: true, id: result.insertId });
    });
});


// ==========================================
// 4. ROTAS DO CRUD COMPLETO EXIGIDO (EXEMPLO DE SUPORTE)
// ==========================================

// CRUD - Read (Listar todas as coletas solicitadas)
app.get('/api/admin/coletas', (req, res) => {
    db.query("SELECT * FROM coletas_corporativas ORDER BY criado_em DESC", (err, results) => {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        res.json({ sucesso: true, dados: results });
    });
});

// CRUD - Update (Atualizar dados de uma solicitação de coleta específica)
app.put('/api/admin/coletas/:id', (req, res) => {
    const { id } = req.params;
    const { nome, email, contato, endereco, descricao } = req.body;

    const sql = "UPDATE coletas_corporativas SET nome = ?, email = ?, contato = ?, endereco = ?, descricao = ? WHERE id = ?";
    db.query(sql, [nome, email, contato, endereco, descricao, id], (err, result) => {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        res.json({ success: true, mensagem: "Solicitação updated com sucesso!" });
    });
});

// CRUD - Delete (Apagar uma solicitação do banco)
app.delete('/api/admin/coletas/:id', (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM coletas_corporativas WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        res.json({ success: true, mensagem: "Solicitação excluída com sucesso!" });
    });
});
// --- ROTAS DO ADMINISTRADOR ---

// 1. Adicionar Novo Produto na Loja
app.post('/api/admin/produtos', (req, res) => {
    const { nome, preco, quantidade, imagem } = req.body;

    if (!nome || !preco || quantidade === undefined) {
        return res.status(400).json({ sucesso: false, erro: "Preencha os campos obrigatórios." });
    }

    const sql = "INSERT INTO produtos (nome, preco, quantidade, imagem) VALUES (?, ?, ?, ?)";
    db.query(sql, [nome, preco, quantidade, imagem || 'img/default.png'], (err, result) => {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        res.json({ sucesso: true, mensagem: "Produto adicionado com sucesso!", id: result.insertId });
    });
});

// 2. Adicionar Novo Ponto de Coleta no Mapa
app.post('/api/admin/pontos', (req, res) => {
    const { nome, endereco, lat, lng } = req.body;

    if (!nome || !endereco || !lat || !lng) {
        return res.status(400).json({ sucesso: false, erro: "Todos os campos do ponto são obrigatórios." });
    }

    const sql = "INSERT INTO pontos (nome, endereco, lat, lng) VALUES (?, ?, ?, ?)";
    db.query(sql, [nome, endereco, lat, lng], (err, result) => {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        res.json({ sucesso: true, mensagem: "Ponto de coleta adicionado com sucesso!", id: result.insertId });
    });
});
// Inicialização do servidor Express
app.listen(PORT, () => {
    console.log(`📡 Servidor EcoByte rodando perfeitamente na porta ${PORT}`);
});