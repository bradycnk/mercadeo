// =========================================================
// 1. CONFIGURACIÓN DE SUPABASE DE BRADY
// =========================================================
const SUPABASE_URL = 'https://lnajsuwkmxaakukkxgvi.supabase.co';
// Clave Anónima Publicable original
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuYWpzdXdrbXhhYWt1a2t4Z3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTY4NjgsImV4cCI6MjA3OTczMjg2OH0.GcB-p6J6CqwaefZ7Wi1LVCkNepzV86-Z0fn_EdU9M4s';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ordersList = document.getElementById('orders-list');


// =========================================================
// 2. OBTENER Y MOSTRAR ÓRDENES
// =========================================================

const fetchPurchaseHistory = async () => {
    ordersList.innerHTML = '<p id="loading-message">Cargando tu historial...</p>';

    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }

    // Obtener órdenes del comprador, incluyendo detalles del vendedor (JOIN)
    const { data: orders, error } = await sb
        .from('orders')
        .select(`
            *,
            seller:profiles!seller_id (business_name, logo_url, email)
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error al cargar órdenes:', error);
        ordersList.innerHTML = '<p class="error-message">Error al cargar el historial.</p>';
        return;
    }
    
    if (orders.length === 0) {
        ordersList.innerHTML = '<p>Aún no has realizado ninguna compra.</p>';
        return;
    }
    
    ordersList.innerHTML = '';
    orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        
        // Crear lista de ítems comprados
        const itemsList = order.items.map(item => 
            `<li>${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}</li>`
        ).join('');

        orderCard.innerHTML = `
            <h4>Orden #${order.id.substring(0, 8)}</h4>
            <p><strong>Fecha:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
            <p><strong>Estado:</strong> <span class="status">${order.status.toUpperCase()}</span></p>
            <p><strong>Total:</strong> Bs. ${order.total_ves} / $${order.total_usd.toFixed(2)}</p>
            
            <h5>Vendedor:</h5>
            <p>
                Empresa: ${order.seller.business_name || 'N/A'}<br>
                Contacto: <a href="mailto:${order.seller.email}">${order.seller.email}</a>
            </p>
            
            <h5>Detalles del pedido:</h5>
            <ul>${itemsList}</ul>
            <a href="${order.payment_proof_url}" target="_blank" class="btn primary">Ver Comprobante de Pago</a>
        `;
        ordersList.appendChild(orderCard);
    });
};

// Inicio de la aplicación

window.onload = fetchPurchaseHistory;

