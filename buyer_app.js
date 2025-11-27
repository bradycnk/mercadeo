// =========================================================
// 1. CONFIGURACIÓN DE SUPABASE DE BRADY
// =========================================================
const SUPABASE_URL = 'https://lnajsuwkmxaakukkxgvi.supabase.co';
// Clave Anónima Publicable original
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuYWpzdXdrbXhhYWt1a2t4Z3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTY4NjgsImV4cCI6MjA3OTczMjg2OH0.GcB-p6J6CqwaefZ7Wi1LVCkNepzV86-Z0fn_EdU9M4s';

const sb = sb.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables de Estado
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let isVesMode = false;
// ** TASA DE CAMBIO: En un proyecto real, esto debe ser una llamada a una API
const BCV_RATE = 36.5; // Tasa de ejemplo (Bs. por $1 USD)

// Elementos del DOM
const productList = document.getElementById('product-list');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartTotalUsd = document.getElementById('cart-total-usd');
const cartTotalVes = document.getElementById('cart-total-ves');
const toggleCurrencyBtn = document.getElementById('toggle-currency');
const logoutBtn = document.getElementById('logout-btn');
const checkoutBtn = document.getElementById('checkout-btn');
const categoryFilter = document.getElementById('category-filter');

// =========================================================
// 2. LÓGICA DE MONEDA
// =========================================================

/** Convierte USD a VES usando la tasa BCV definida. */
const convertToVes = (usd) => {
    return (usd * BCV_RATE).toFixed(2);
};

/** Actualiza la vista de los precios en el catálogo. */
const updateCurrencyView = () => {
    const prices = document.querySelectorAll('.product-price');
    prices.forEach(span => {
        const usdPrice = parseFloat(span.dataset.usd);
        if (isVesMode) {
            span.textContent = `Bs. ${convertToVes(usdPrice)}`;
        } else {
            span.textContent = `$${usdPrice.toFixed(2)}`;
        }
    });

    // Actualiza el botón
    toggleCurrencyBtn.textContent = isVesMode ? 'Mostrar en USD' : 'Mostrar en VES';
    
    // Actualiza el carrito
    updateCartDisplay();
};

toggleCurrencyBtn.addEventListener('click', () => {
    isVesMode = !isVesMode;
    updateCurrencyView();
});

// =========================================================
// 3. GESTIÓN DEL CARRITO
// =========================================================

/** Calcula el total del carrito y guarda el estado. */
const calculateCartTotal = () => {
    const totalUsd = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalVes = convertToVes(totalUsd);
    
    cartTotalUsd.textContent = `$${totalUsd.toFixed(2)}`;
    cartTotalVes.textContent = `Bs. ${totalVes}`;
    
    checkoutBtn.disabled = cart.length === 0;
    document.getElementById('empty-cart-message').style.display = cart.length === 0 ? 'block' : 'none';
    
    // Guardar en el almacenamiento local
    localStorage.setItem('cart', JSON.stringify(cart));
    
    return { totalUsd, totalVes };
};

/** Renderiza la lista de items en la barra lateral. */
const updateCartDisplay = () => {
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        calculateCartTotal();
        return;
    }
    
    cart.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';

        const itemPrice = isVesMode 
            ? `Bs. ${convertToVes(item.price * item.quantity)}`
            : `$${(item.price * item.quantity).toFixed(2)}`;
            
        itemDiv.innerHTML = `
            <span>${item.name} (x${item.quantity})</span>
            <span>${itemPrice}</span>
            <button class="btn btn-remove-item" data-product-id="${item.id}">X</button>
        `;
        cartItemsContainer.appendChild(itemDiv);
    });

    calculateCartTotal();
};

/** Añade un producto al carrito o incrementa su cantidad. */
const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    updateCartDisplay();
    alert(`${product.name} añadido al carrito.`);
};

/** Remueve un producto del carrito. */
const removeFromCart = (productId) => {
    cart = cart.filter(item => item.id !== productId);
    updateCartDisplay();
};

// Listener para remover items
cartItemsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove-item')) {
        const productId = e.target.dataset.productId;
        removeFromCart(productId);
    }
});


// =========================================================
// 4. CARGA DE PRODUCTOS DESDE SUPABASE
// =========================================================

/** Crea el HTML de la tarjeta de producto. */
const createProductCard = (product) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <img src="${product.image_url || 'placeholder.png'}" alt="${product.name}">
        <h4>${product.name}</h4>
        <p>${product.description.substring(0, 50)}...</p>
        <div class="price-display">
            <span class="product-price" data-usd="${product.price}">$${product.price.toFixed(2)}</span>
        </div>
        <button class="btn secondary add-to-cart-btn" data-product='${JSON.stringify(product)}'>Añadir al Carrito</button>
    `;
    return card;
};

/** Obtiene y muestra los productos. */
const fetchAndDisplayProducts = async (category = null) => {
    let query = sb.from('products').select('*');
    
    if (category) {
        query = query.eq('category', category);
    }

    const { data: products, error } = await query;
    
    if (error) {
        console.error('Error al cargar productos:', error);
        productList.innerHTML = '<p class="error-message">Error al cargar el catálogo.</p>';
        return;
    }

    productList.innerHTML = '';
    products.forEach(product => {
        productList.appendChild(createProductCard(product));
    });

    // Asegurar que la vista de precios sea correcta (USD o VES)
    updateCurrencyView();
};

/** Llenar el filtro de categorías (Debe hacerse al inicio). */
const populateCategories = async () => {
    // Nota: Esto asume que tienes un conjunto de categorías limitado en tu DB.
    // Una implementación más robusta leería categorías únicas de los productos.
    const commonCategories = ["Electrónica", "Ropa", "Hogar", "Alimentos", "Servicios", "Belleza", "Libros", "Deportes", "Juguetes", "Automotriz"];
    commonCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categoryFilter.appendChild(option);
    });
};

// Listener para el filtro de categorías
categoryFilter.addEventListener('change', (e) => {
    fetchAndDisplayProducts(e.target.value || null);
});


// =========================================================
// 5. AUTENTICACIÓN Y REDIRECCIÓN
// =========================================================

const checkAuthAndRedirect = async () => {
    const { data: { session } } = await sb.auth.getSession();
    
    if (!session) {
        window.location.href = 'auth.html'; // Redirigir si no está logeado
        return;
    }

    // Opcional: Verificar que el rol sea 'buyer'
    const { data: profile, error } = await sb.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role !== 'buyer' || error) {
        await sb.auth.signOut();
        window.location.href = 'auth.html';
        return;
    }
    
    // Si la sesión es válida y es comprador, cargamos el contenido
    populateCategories();
    fetchAndDisplayProducts();
    updateCartDisplay();
};

const handleLogout = async () => {
    const { error } = await sb.auth.signOut();
    localStorage.removeItem('cart'); // Limpiar el carrito al cerrar sesión
    if (error) {
        console.error('Error al cerrar sesión:', error.message);
    } else {
        window.location.href = 'auth.html';
    }
};

// Event Listeners
logoutBtn.addEventListener('click', handleLogout);

// Listener para añadir al carrito
productList.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart-btn')) {
        // Obtenemos los datos del producto directamente del atributo 'data-product' del botón
        const productData = JSON.parse(e.target.dataset.product);
        addToCart(productData);
    }
});

// Listener para proceder al pago
checkoutBtn.addEventListener('click', () => {
    // Guardamos el estado final del carrito antes de ir al pago
    const { totalUsd, totalVes } = calculateCartTotal();
    const deliveryNeeded = document.getElementById('delivery-check').checked;

    localStorage.setItem('checkoutData', JSON.stringify({ 
        cart, 
        totalUsd, 
        totalVes, 
        deliveryNeeded 
    }));
    
    // Redirigir a la página de pago
    window.location.href = 'checkout.html'; 
});


// Inicio de la aplicación

checkAuthAndRedirect();
