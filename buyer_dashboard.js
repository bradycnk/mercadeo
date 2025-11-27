// =========================================================
// 1. CONFIGURACIÓN DE SUPABASE DE BRADY
// =========================================================
const SUPABASE_URL = 'https://lnajsuwkmxaakukkxgvi.supabase.co';
// Clave Anónima Publicable original
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuYWpzdXdrbXhhYWt1a2t4Z3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTY4NjgsImV4cCI6MjA3OTczMjg2OH0.GcB-p6J6CqwaefZ7Wi1LVCkNepzV86-Z0fn_EdU9M4s';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================
// 2. FUNCIÓN DE CERRAR SESIÓN
// =========================================================
const handleLogout = async () => {
    try {
        const { error } = await sb.auth.signOut();
        if (error) throw error;
        
        // Redirigir al usuario a la página de inicio o login
        window.location.href = 'auth.html'; 
    } catch (error) {
        console.error('Error al cerrar sesión:', error.message);
        alert('Hubo un problema al cerrar la sesión.');
    }
};

// =========================================================
// 3. LISTENERS
// =========================================================
const logoutButton = document.getElementById('logout-button');

if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });
}
