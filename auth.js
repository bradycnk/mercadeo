// =========================================================
// 1. CONFIGURACIÓN DE SUPABASE DE BRADY
// =========================================================
const SUPABASE_URL = 'https://lnajsuwkmxaaaukktxgvi.supabase.co';
// Clave Anónima Publicable original
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuYWpzdXdrbXhhYWt1a2t4Z3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTY4NjgsImV4cCI6MjA3OTczMjg2OH0.GcB-p6J6CqwaefZ7Wi1LVCkNepzV86-Z0fn_EdU9M4s';

// CORRECCIÓN: Usamos 'sb' para el cliente de Supabase
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos del DOM (Comunes)
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const recoveryForm = document.getElementById('recovery-form');
const signupError = document.getElementById('signup-error');

// Elementos del DOM (Registro)
const roleBuyer = document.getElementById('role-buyer');
const roleSeller = document.getElementById('role-seller');
const sellerFields = document.getElementById('seller-fields');
const showLoginLink = document.getElementById('show-login');
const showSignupLink = document.getElementById('show-signup');
const showRecoveryLink = document.getElementById('show-recovery');
const linkToSignupDiv = document.getElementById('link-to-signup');


// =========================================================
// 2. LÓGICA DE UI: MOSTRAR/OCULTAR FORMULARIOS
// =========================================================

/** Muestra un formulario y oculta los otros. */
const showForm = (formToShow) => {
    // Ocultar todos
    signupForm.classList.add('hidden');
    loginForm.classList.add('hidden');
    recoveryForm.classList.add('hidden');
    showLoginLink.parentElement.classList.add('hidden');
    linkToSignupDiv.classList.add('hidden');
    
    // Mostrar el deseado
    formToShow.classList.remove('hidden');
    
    // Mostrar enlaces de navegación
    if (formToShow === signupForm) {
        showLoginLink.parentElement.classList.remove('hidden');
    } else {
        linkToSignupDiv.classList.remove('hidden');
    }
};

// Listeners para cambiar la vista
showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    showForm(loginForm);
});

showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    showForm(signupForm);
});

showRecoveryLink.addEventListener('click', (e) => {
    e.preventDefault();
    showForm(recoveryForm);
});

/** Alterna la visibilidad de los campos de Vendedor. */
const toggleSellerFields = () => {
    const businessNameInput = document.getElementById('business-name');
    const logoFileInput = document.getElementById('logo-file');
    
    if (roleSeller.checked) {
        sellerFields.classList.remove('hidden');
        businessNameInput.setAttribute('required', 'required');
        logoFileInput.setAttribute('required', 'required');
    } else {
        sellerFields.classList.add('hidden');
        businessNameInput.removeAttribute('required');
        logoFileInput.removeAttribute('required');
    }
};

roleBuyer.addEventListener('change', toggleSellerFields);
roleSeller.addEventListener('change', toggleSellerFields);


// =========================================================
// 3. FUNCIÓN DE REGISTRO
// =========================================================

const handleSignUp = async (e) => {
    e.preventDefault();
    signupError.textContent = ''; 

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.querySelector('input[name="role"]:checked').value;
    const businessName = document.getElementById('business-name').value;
    const logoFile = document.getElementById('logo-file').files[0];

    try {
        // A. Registrar el usuario en auth.users de Supabase
        const { data, error } = await sb.auth.signUp({ 
            email,
            password,
        });

        if (error) throw error;
        const user = data.user;
        
        // B. Subir la imagen del logo (solo para vendedores)
        let logoUrl = null;
        if (role === 'seller' && logoFile) {
            // Se debe crear el bucket 'logos' en Supabase Storage
            const fileName = `${user.id}/logo/${Date.now()}_${logoFile.name}`;
            const { error: uploadError } = await sb.storage
                .from('logos') 
                .upload(fileName, logoFile);

            if (uploadError) throw uploadError;
            
            const { data: urlData } = sb.storage
                .from('logos')
                .getPublicUrl(fileName);
            
            logoUrl = urlData.publicUrl;
        }

        // C. Insertar el perfil en la tabla 'profiles'
        const { error: profileError } = await sb
            .from('profiles')
            .insert([
                { 
                    id: user.id, 
                    email: email, 
                    role: role, 
                    business_name: role === 'seller' ? businessName : null,
                    logo_url: logoUrl,
                },
            ]);

        if (profileError) throw profileError;

        // D. Redireccionar al usuario
        alert(`Registro exitoso. Revisa tu correo ${email} para confirmar y luego inicia sesión.`);
        showForm(loginForm); // Muestra la vista de login después del registro
        document.getElementById('login-email').value = email;

    } catch (error) {
        console.error('Error de registro:', error.message);
        signupError.textContent = `Error: ${error.message}`;
    }
};

signupForm.addEventListener('submit', handleSignUp);


// =========================================================
// 4. FUNCIÓN DE INICIO DE SESIÓN
// =========================================================

const handleLogin = async (e) => {
    e.preventDefault();
    const loginError = document.getElementById('login-error');
    loginError.textContent = '';

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const { data, error } = await sb.auth.signInWithPassword({ 
            email,
            password,
        });

        if (error) throw error;
        
        // Redirigir según el rol del usuario
        const { data: profile, error: profileError } = await sb
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

        if (profileError) throw profileError;

        if (profile.role === 'buyer') {
            window.location.href = 'buyer_dashboard.html'; 
        } else if (profile.role === 'seller') {
            window.location.href = 'seller_dashboard.html'; 
        }

    } catch (error) {
        console.error('Error de inicio de sesión:', error.message);
        loginError.textContent = `Error: ${error.message}. Verifica tu correo y contraseña.`;
    }
};

loginForm.addEventListener('submit', handleLogin);


// =========================================================
// 5. FUNCIÓN DE RECUPERACIÓN DE CONTRASEÑA
// =========================================================

const handleRecovery = async (e) => {
    e.preventDefault();
    const recoveryError = document.getElementById('recovery-error');
    recoveryError.textContent = '';
    recoveryError.style.color = 'red';

    const email = document.getElementById('recovery-email').value;

    try {
        const { error } = await sb.auth.resetPasswordForEmail(email, { 
             // URL de redirección ajustada para GitHub Pages (bradycnk.github.io/mercadeo/)
            redirectTo: window.location.origin + '/mercadeo/new_password.html',
        });

        if (error) throw error;
        
        recoveryError.textContent = '✅ Enlace de recuperación enviado. Revisa tu correo electrónico.';
        recoveryError.style.color = 'green';
        
    } catch (error) {
        console.error('Error de recuperación:', error.message);
        recoveryError.textContent = `Error: ${error.message}`;
    }
};

recoveryForm.addEventListener('submit', handleRecovery);


// =========================================================
// 6. VERIFICAR SESIÓN AL CARGAR LA PÁGINA
// =========================================================

const checkSession = async () => {
    const { data: { session } } = await sb.auth.getSession(); 
    
    if (session) {
        // Si hay una sesión activa, verificamos el rol y redirigimos
        const { data: profile, error } = await sb
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (error) {
            console.error('Error al obtener el perfil:', error);
            return;
        }

        if (profile.role === 'buyer') {
            window.location.href = 'buyer_dashboard.html';
        } else if (profile.role === 'seller') {
            window.location.href = 'seller_dashboard.html';
        }
    }
    // Si no hay sesión, se mantiene en el formulario de registro por defecto
};

checkSession();
