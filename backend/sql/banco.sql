-- 1. Apaga o banco anterior se ele existir para começar do zero absoluto
DROP DATABASE IF EXISTS ecobyte_db;
CREATE DATABASE ecobyte_db;
USE ecobyte_db;

-- 1. Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL, -- Guardará o hash criptografado
    foto TEXT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Produtos da Loja (Para controle de estoque/quantidade)
CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    quantidade INT NOT NULL DEFAULT 0, -- Controle de Estoque solicitado
    imagem VARCHAR(255) NULL
);
-- Executar este comando no seu banco de dados (ecobyte_db):
CREATE TABLE IF NOT EXISTS pontos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    endereco TEXT NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 3. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    frete DECIMAL(10, 2) NOT NULL,
    metodo_pagamento VARCHAR(50) NOT NULL,
    pix_copia_e_cola TEXT NULL, -- Dados gerados dinamicamente para PIX
    boleto_codigo VARCHAR(100) NULL,
    cartao_dados_criptografados TEXT NULL, -- Dados do cartão salvos de forma segura
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- 4. Tabela de Itens do Pedido (Relacionamento N:M)
CREATE TABLE IF NOT EXISTS pedido_itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_produto INT NOT NULL,
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_produto) REFERENCES produtos(id)
);

-- 5. Tabela de Solicitações de Coleta Corporativa (Formulário do inicio.html/js)
CREATE TABLE IF NOT EXISTS coletas_corporativas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    contato VARCHAR(50) NOT NULL,
    endereco TEXT NOT NULL,
    descricao TEXT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserção de alguns produtos fictícios para teste inicial de estoque
USE ecobyte_db;

-- Limpa os dados de teste antigos antes (opcional, apenas se quiser resetar a tabela)
-- TRUNCATE TABLE produtos;

-- Insere os produtos reais do seu portfólio/loja EcoByte
-- 1. Limpa os registros antigos da tabela de produtos para não dar conflito
TRUNCATE TABLE produtos;

-- 2. Insere os 4 produtos com a escrita EXATA que o loja.js utiliza
INSERT INTO produtos (nome, preco, quantidade, imagem) VALUES 
('NVIDIA GTX 1660 Super 6GB', 1200.00, 30, 'img/placa_video.png'),
('SSD Kingston A400 480GB Sata III', 250.00, 30, 'img/ssd.png'),
('Memória RAM HyperX Fury 8GB DDR4', 180.00, 30, 'img/ram.png'),
('Intel Core i5-10400F 2.9GHz', 650.00, 30, 'img/processador.png');
UPDATE produtos 
SET quantidade = 30 
WHERE nome IN (
    'NVIDIA GTX 1660 Super 6GB', 
    'SSD Kingston A400 480GB Sata III', 
    'Memória RAM HyperX Fury 8GB DDR4', 
    'Intel Core i5-10400F 2.9GHz'
);