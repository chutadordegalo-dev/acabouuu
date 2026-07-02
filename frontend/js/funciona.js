async function name() {
    let container = document.getElementByID('pontoForm')

    let pontosColeta = fetch('')

    let html = ''

    pontosColeta.array.forEach(ponto => {
        html += ```
            <div>
                <label class="block text-xs font-bold text-gray-600 mb-1">Nome do Ponto</label>
                <input type="text" id="ponto-nome" required class="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-eco-dark bg-gray-50 text-sm" placeholder="Ex: ${ponto.nome}">
            </div>
        ```    
    });

    container.innerHTML(html)
}