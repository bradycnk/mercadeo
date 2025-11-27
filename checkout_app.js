// =========================================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN
// =========================================================
const SUPABASE_URL = 'https://lnajsuwkmxaaaukktxgvi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuYWpzdXdrbXhhYWt1a2t4Z3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTY4NjgsImV4cCI6MjA3OTczMjg2OH0.GcB-p6J6CqwaefZ7Wi1LVCkNepzV86-Z0fn_EdU9M4s';

const sb = sb.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const paymentForm = document.getElementById('payment-form');
const paymentError = document.getElementById('payment-error');
let checkoutData = null; // Datos del carrito

// =========================================================
// 2. CARGAR RESUMEN Y OBTENER DATOS
// =========================================================

const loadCheckoutData = () => {
    const dataString = localStorage.getItem('checkoutData');
    if (!dataString) {
        alert('No hay datos de pedido. Regresando al catálogo.');
        window.location.href = 'buyer_dashboard.html';
        return;
    }
    
    checkoutData = JSON.parse(dataString);
    const summaryList = document.getElementById('checkout-summary-list');
    
    checkoutData.cart.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.name} x${item.quantity} ($${(item.price * item.quantity).toFixed(2)})`;
        summaryList.appendChild(li);
    });
    
    document.getElementById('delivery-status').textContent = checkoutData.deliveryNeeded ? 'Sí Requerido' : 'No Requerido';
    document.getElementById('checkout-total-ves').textContent = `Bs. ${checkoutData.totalVes}`;
    document.getElementById('checkout-total-usd').textContent = `$${checkoutData.totalUsd.toFixed(2)}`;
};

// =========================================================
// 3. PROCESO DE PAGO Y CREACIÓN DE ORDEN
// =========================================================

const handleSubmitPayment = async (e) => {
    e.preventDefault();
    paymentError.textContent = '';
    
    if (!checkoutData || checkoutData.cart.length === 0) {
        paymentError.textContent = 'El carrito está vacío. Por favor, vuelva al catálogo.';
        return;
    }

    const paymentCaptureFile = document.getElementById('payment-capture-file').files[0];
    const paymentRef = document.getElementById('payment-ref').value;
    const { totalUsd, totalVes, deliveryNeeded, cart } = checkoutData;

    try {
        // 1. Obtener el ID del comprador
        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw new Error('Usuario no autenticado.');
        const buyer_id = user.id;

        // 2. Subir el comprobante de pago
        const fileName = `${buyer_id}/payment_${Date.now()}_${paymentCaptureFile.name}`;
        const { error: uploadError } = await sb.storage
            .from('payments') // Debes crear un bucket llamado 'payments' en sb Storage
            .upload(fileName, paymentCaptureFile);
        
        if (uploadError) throw uploadError;

        // Obtener la URL pública.
        const { data: urlData } = sb.storage
            .from('payments')
            .getPublicUrl(fileName);
        
        const paymentProofUrl = urlData.publicUrl;

        // 3. Identificar el vendedor (Para simplificar, tomamos el seller_id del primer producto)
        // En una app compleja, manejarías múltiples vendedores por pedido o un solo vendedor.
        // Aquí asumimos, por simplicidad, que todos los items son del mismo vendedor (o tomamos el primero).
        const seller_id = cart[0]?.seller_id || '9d431057-3f9b-43d8-8c50-b6f728c7731a'; // ID de vendedor de ejemplo, DEBES ajustarlo para tu lógica

        // 4. Crear la orden en la base de datos
        const { error: orderError } = await sb
            .from('orders')
            .insert({
                buyer_id: buyer_id,
                seller_id: seller_id, 
                total_usd: totalUsd,
                total_ves: parseFloat(totalVes),
                status: 'pending', // Esperando confirmación del pago por el vendedor
                payment_ref: paymentRef,
                payment_proof_url: paymentProofUrl,
                delivery_needed: deliveryNeeded,
                items: cart,
            });

        if (orderError) throw orderError;

        // 5. Finalización
        localStorage.removeItem('cart'); // Limpiar carrito
        localStorage.removeItem('checkoutData'); // Limpiar datos de checkout
        alert('¡Pedido realizado con éxito! Tu orden está pendiente de confirmación de pago por el vendedor.');
        window.location.href = 'purchase_history.html'; // Redirigir al historial

    } catch (error) {
        console.error('Error al procesar el pago:', error.message);
        paymentError.textContent = `Error: ${error.message}`;
    }
};

// Event Listeners
paymentForm.addEventListener('submit', handleSubmitPayment);
window.onload = loadCheckoutData;