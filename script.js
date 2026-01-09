const form = document.getElementById('product-form');
const productList = document.getElementById('product-list');

form.addEventListener('submit', function(e) {
    e.preventDefault();

    // Obtener valores
    const name = document.getElementById('product-name').value;
    const desc = document.getElementById('product-desc').value;
    const price = document.getElementById('product-price').value;
    const imageFile = document.getElementById('product-image').files[0];

    // Leer la imagen para mostrarla
    const reader = new FileReader();
    reader.onload = function(event) {
        const productHTML = `
            <div class="card">
                <img src="${event.target.result}">
                <h3>${name}</h3>
                <p>${desc}</p>
                <span><strong>$${price}</strong></span>
            </div>
        `;
        // Agregar a la lista
        productList.innerHTML += productHTML;
        
        // Limpiar formulario
        form.reset();
    };

    if (imageFile) {
        reader.readAsDataURL(imageFile);
    }
});
