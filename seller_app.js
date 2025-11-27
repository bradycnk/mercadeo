// =========================================================
// 1. CONFIGURACIÓN DE SUPABASE DE BRADY
// =========================================================
const SUPABASE_URL = 'https://lnajsuwkmxaakukkxgvi.supabase.co';
// Clave Anónima Publicable original
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuYWpzdXdrbXhhYWt1a2t4Z3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTY4NjgsImV4cCI6MjA3OTczMjg2OH0.GcB-p6J6CqwaefZ7Wi1LVCkNepzV86-Z0fn_EdU9M4s';

const sb = sb.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos del DOM
const productForm = document.getElementById('product-form');
const productListBody = document.getElementById('seller-product-list');
const sellerOrdersList = document.getElementById('seller-orders-list');
const logoutBtn = document.getElementById('logout-btn');
const productCategorySelect = document.getElementById('product-category');
const formSubmitBtn = document.getElementById('form-submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const productError = document.getElementById('product-error');
const currentImageUrlDisplay = document.getElementById('current-image-url');

let currentSellerId = null;

// Categorías comunes (como solicitaste)
const commonCategories = ["Electrónica", "Ropa", "Hogar", "Alimentos", "Servicios", "Belleza", "Libros", "Deportes", "Juguetes", "Automotriz"];

// =========================================================
// 2. GESTIÓN DE PRODUCTOS (Añadir, Editar, Eliminar)
// =========================================================

/** Llenar el select de categorías. */
const populateCategories = () => {
    commonCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        productCategorySelect.appendChild(option);
    });
};

/** Lógica para subir una imagen. */
const uploadProductImage = async (file, productId) => {
    const fileName = `${currentSellerId}/${productId}_${Date.now()}_${file.name}`;
    
    // Subir imagen a un bucket llamado 'product-images' (debes crearlo en sb Storage)
    const { error: uploadError } = await sb.storage
        .from('product-images')
        .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = sb.storage
        .from('product-images')
        .getPublicUrl(fileName);
        
    return urlData.publicUrl;
};

/** Añadir o Actualizar un producto. */
const handleProductSubmit = async (e) => {
    e.preventDefault();
    productError.textContent = '';
    
    const productId = document.getElementById('product-id').value;
    const isEditing = !!productId;
    
    const name = document.getElementById('product-name').value;
    const description = document.getElementById('product-description').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const category = document.getElementById('product-category').value;
    const imageFile = document.getElementById('product-image-file').files[0];
    let imageUrl = currentImageUrlDisplay.querySelector('a')?.href; // URL existente

    try {
        // 1. Subir nueva imagen si existe
        if (imageFile) {
            imageUrl = await uploadProductImage(imageFile, productId || Date.now());
        } else if (!isEditing && !imageUrl) {
            // Si es un producto nuevo y no hay imagen, podemos usar un placeholder
            imageUrl = null; 
        }

        // 2. Construir los datos
        const productData = { 
            name, 
            description, 
            price, 
            category, 
            image_url: imageUrl,
            seller_id: currentSellerId
        };
        
        // 3. Insertar o Actualizar
        if (isEditing) {
            // EDITAR
            const { error } = await sb
                .from('products')
                .update(productData)
                .eq('id', productId);
            if (error) throw error;
            alert('Producto actualizado con éxito.');
        } else {
            // AÑADIR NUEVO
            const { error } = await sb
                .from('products')
                .insert([productData]);
            if (error) throw error;
            alert('Producto añadido con éxito.');
        }

        // 4. Limpiar formulario y recargar lista
        resetProductForm();
        fetchSellerProducts();

    } catch (error) {
        console.error('Error en la gestión del producto:', error);
        productError.textContent = `Error: ${error.message}`;
    }
};

/** Cargar datos del producto en el formulario para editar. */
const loadProductForEdit = (product) => {
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-description').value = product.description;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-category').value = product.category;
    
    // Mostrar URL de imagen actual
    if (product.image_url) {
        currentImageUrlDisplay.classList.remove('hidden');
        currentImageUrlDisplay.querySelector('a').href = product.image_url;
    } else {
        currentImageUrlDisplay.classList.add('hidden');
    }
    
    formSubmitBtn.textContent = 'Guardar Cambios';
    cancelEditBtn.style.display = 'inline-block';
};

/** Eliminar un producto. */
const deleteProduct = async (productId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;
    
    try {
        const { error } = await sb
            .from('products')
            .delete()
            .eq('id', productId);
            
        if (error) throw error;
        
        alert('Producto eliminado con éxito.');
        fetchSellerProducts();
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        alert(`Error al eliminar: ${error.message}`);
    }
};

/** Limpia el formulario y vuelve al modo 'Añadir'. */
const resetProductForm = () => {
    productForm.reset();
    document.getElementById('product-id').value = '';
    formSubmitBtn.textContent = 'Añadir Producto';
    cancelEditBtn.style.display = 'none';
    currentImageUrlDisplay.classList.add('hidden');
};

/** Obtener y mostrar todos los productos del vendedor. */
const fetchSellerProducts = async () => {
    productListBody.innerHTML = '<tr><td colspan="5">Cargando productos...</td></tr>';
    
    const { data: products, error } = await sb
        .from('products')
        .select('*')
        .eq('seller_id', currentSellerId)
        .order('created_at', { ascending: false });

    if (error) {
        productListBody.innerHTML = `<tr><td colspan="5" class="error-message">Error al cargar: ${error.message}</td></tr>`;
        return;
    }
    
    if (products.length === 0) {
        productListBody.innerHTML = `<tr><td colspan="5">Aún no tienes productos en venta.</td></tr>`;
        return;
    }
    
    productListBody.innerHTML = '';
    products.forEach(product => {
        const row = productListBody.insertRow();
        row.innerHTML = `
            <td>${product.id.substring(0, 8)}...</td>
            <td>${product.name}</td>
            <td>$${product.price.toFixed(2)}</td>
            <td>${product.category}</td>
            <td class="action-btns">
                <button class="btn btn-edit" data-product='${JSON.stringify(product)}'>Editar</button>
                <button class="btn btn-delete" data-product-id="${product.id}">Eliminar</button>
            </td>
        `;
    });
};

// Listeners para la tabla de productos
productListBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-edit')) {
        const productData = JSON.parse(e.target.dataset.product);
        loadProductForEdit(productData);
    } else if (e.target.classList.contains('btn-delete')) {
        const productId = e.target.dataset.productId;
        deleteProduct(productId);
    }
});

productForm.addEventListener('submit', handleProductSubmit);
cancelEditBtn.addEventListener('click', resetProductForm);


// =========================================================
// 3. GESTIÓN DE ÓRDENES (Ver y Confirmar Pago)
// =========================================================

/** Muestra la lista de órdenes recibidas por el vendedor. */
const fetchSellerOrders = async () => {
    sellerOrdersList.innerHTML = '<p>Cargando órdenes...</p>';
    
    // Obtener órdenes dirigidas a este vendedor
    const { data: orders, error } = await sb
        .from('orders')
        .select(`
            *,
            buyer:profiles!buyer_id (email)
        `)
        .eq('seller_id', currentSellerId)
        .order('created_at', { ascending: false });

    if (error) {
        sellerOrdersList.innerHTML = `<p class="error-message">Error al cargar órdenes: ${error.message}</p>`;
        return;
    }

    if (orders.length === 0) {
        sellerOrdersList.innerHTML = '<p>No tienes órdenes pendientes.</p>';
        return;
    }
    
    sellerOrdersList.innerHTML = '';
    orders.forEach(order => {
        const itemsList = order.items.map(item => 
            `<li>${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}</li>`
        ).join('');

        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-card-seller';
        orderDiv.innerHTML = `
            <h4>Orden #${order.id.substring(0, 8)} - Estado: <span style="color: ${order.status === 'pending' ? 'red' : 'green'};">${order.status.toUpperCase()}</span></h4>
            <p><strong>Comprador:</strong> ${order.buyer.email}</p>
            <p><strong>Total:</strong> Bs. ${order.total_ves} / $${order.total_usd.toFixed(2)}</p>
            <p><strong>Delivery:</strong> ${order.delivery_needed ? 'Sí' : 'No'}</p>
            
            <h5>Detalles de Pago:</h5>
            <ul>
                <li>Referencia (últimos 4 dígitos): <strong>${order.payment_ref}</strong></li>
                <li>Comprobante: <a href="${order.payment_proof_url}" target="_blank" class="btn primary">Ver Captura de Pago</a></li>
            </ul>
            
            <h5>Items:</h5>
            <ul>${itemsList}</ul>
            
            <div id="actions-${order.id}">
                ${order.status === 'pending' ? 
                    `<button class="btn secondary confirm-payment-btn" data-order-id="${order.id}">Confirmar Pago</button>` 
                    : ''
                }
                ${order.status === 'paid' ? 
                    `<button class="btn primary mark-shipped-btn" data-order-id="${order.id}">Marcar como Enviado</button>` 
                    : ''
                }
            </div>
        `;
        sellerOrdersList.appendChild(orderDiv);
    });
};

/** Actualizar el estado de la orden. */
const updateOrderStatus = async (orderId, newStatus) => {
    try {
        const { error } = await sb
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);
            
        if (error) throw error;
        
        alert(`Orden #${orderId.substring(0, 8)} actualizada a estado: ${newStatus.toUpperCase()}`);
        fetchSellerOrders(); // Recargar la lista
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        alert(`Error al actualizar estado: ${error.message}`);
    }
};

sellerOrdersList.addEventListener('click', (e) => {
    const orderId = e.target.dataset.orderId;
    if (!orderId) return;

    if (e.target.classList.contains('confirm-payment-btn')) {
        updateOrderStatus(orderId, 'paid');
    } else if (e.target.classList.contains('mark-shipped-btn')) {
        updateOrderStatus(orderId, 'shipped');
    }
    // Podrías añadir 'mark-delivered-btn' aquí también.
});


// =========================================================
// 4. AUTENTICACIÓN E INICIO
// =========================================================

const checkAuthAndInit = async () => {
    const { data: { user } } = await sb.auth.getUser();
    
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    
    // Obtener el perfil del vendedor y verificar rol
    const { data: profile, error } = await sb
        .from('profiles')
        .select('role, business_name')
        .eq('id', user.id)
        .single();
        
    if (error || profile?.role !== 'seller') {
        alert('Acceso denegado. Rol incorrecto.');
        await sb.auth.signOut();
        window.location.href = 'auth.html';
        return;
    }
    
    // Inicializar la aplicación del vendedor
    currentSellerId = user.id;
    document.getElementById('business-display').textContent = `Empresa: ${profile.business_name || 'N/A'}`;
    
    populateCategories();
    fetchSellerProducts();
    fetchSellerOrders();
};

const handleLogout = async () => {
    const { error } = await sb.auth.signOut();
    if (error) {
        console.error('Error al cerrar sesión:', error.message);
    } else {
        window.location.href = 'auth.html';
    }
};

logoutBtn.addEventListener('click', handleLogout);

// Inicio de la aplicación

checkAuthAndInit();
