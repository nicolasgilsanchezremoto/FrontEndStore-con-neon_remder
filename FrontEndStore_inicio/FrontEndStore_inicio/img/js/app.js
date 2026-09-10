// AQUI ESTÁ EL CAMBIO PRINCIPAL: Se usa la URL de Render
const API_URL = 'https://frontendstore-con-neon-remder.onrender.com/api';

let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
let usuarioActual = JSON.parse(localStorage.getItem('usuario')) || null;

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    renderUserMenu();
    renderCarrito();
    
    // Lógica del Formulario de Registro
    const formRegistro = document.getElementById('formRegistro');
    if(formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                nombre: document.getElementById('nombre').value,
                cedula: document.getElementById('cedula').value,
                celular: document.getElementById('celular').value,
                correo: document.getElementById('correo').value,
                direccion: document.getElementById('direccion').value,
                banco: document.getElementById('banco').value,
                numero_tarjeta: document.getElementById('tarjeta').value,
                password: document.getElementById('password').value
            };

            const res = await fetch(`${API_URL}/registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if(result.success) {
                alert('¡Registro exitoso! Se han abonado $30.000 a tu monedero.');
                localStorage.setItem('usuario', JSON.stringify(result.usuario));
                window.location.href = 'index.html';
            } else {
                alert(result.error);
            }
        });
    }

    // Lógica del Formulario de Login
    const formLogin = document.getElementById('formLogin');
    if(formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                correo: document.getElementById('loginCorreo').value,
                password: document.getElementById('loginPassword').value
            };
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if(result.success) {
                localStorage.setItem('usuario', JSON.stringify(result.usuario));
                window.location.href = 'index.html';
            } else {
                alert(result.error);
            }
        });
    }
});

// Renderizar menú de navegación dependiendo de si hay sesión
function renderUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if(!userMenu) return;

    if (usuarioActual) {
        userMenu.innerHTML = `
            <span style="color: var(--blanco); font-size: 1.8rem; font-family: var(--fuentePrincipal);">Hola, ${usuarioActual.nombre} | Monedero: $${usuarioActual.saldo}</span>
            <button onclick="cerrarSesion()" class="formulario__submit" style="padding: 0.5rem 1rem; width: auto;">Salir</button>
        `;
    } else {
        userMenu.innerHTML = `
            <a class="navegacion_enlace" href="login.html">Ingresar</a>
            <a class="navegacion_enlace" href="registro.html">Registrarse</a>
        `;
    }
}

function cerrarSesion() {
    localStorage.removeItem('usuario');
    localStorage.removeItem('carrito');
    window.location.reload();
}

// Lógica del Carrito
function agregarAlCarrito(nombre, precio) {
    if (!usuarioActual) {
        alert("Debes iniciar sesión para añadir productos al carrito.");
        window.location.href = 'login.html';
        return;
    }
    
    let item = carrito.find(p => p.nombre === nombre);
    if (item) {
        item.cantidad++;
    } else {
        carrito.push({ nombre, precio, cantidad: 1 });
    }
    localStorage.setItem('carrito', JSON.stringify(carrito));
    renderCarrito();
}

function renderCarrito() {
    const seccion = document.getElementById('carritoSeccion');
    const lista = document.getElementById('listaCarrito');
    const totalSpan = document.getElementById('totalCarrito');
    
    if(!seccion || !lista) return;

    if (carrito.length === 0) {
        seccion.style.display = 'none';
        return;
    }

    seccion.style.display = 'block';
    lista.innerHTML = '';
    let total = 0;

    carrito.forEach((item, index) => {
        total += item.precio * item.cantidad;
        lista.innerHTML += `<li>${item.cantidad}x ${item.nombre} - $${item.precio * item.cantidad} 
        <button onclick="eliminarDelCarrito(${index})" style="background: red; color: white; border: none; cursor: pointer;">X</button></li>`;
    });
    totalSpan.textContent = `$${total}`;
}

async function finalizarCompra() {
    if (!usuarioActual) return alert("Debes iniciar sesión.");
    
    const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    
    if (total > usuarioActual.saldo) {
        alert("Saldo insuficiente en el monedero. Tu saldo es $" + usuarioActual.saldo);
        return;
    }

    const res = await fetch(`${API_URL}/comprar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: usuarioActual.id, total, carrito })
    });
    
    const result = await res.json();
    if(result.success) {
        alert("¡Compra realizada con éxito! Se descontó de tu monedero.");
        usuarioActual.saldo = result.nuevoSaldo;
        localStorage.setItem('usuario', JSON.stringify(usuarioActual));
        carrito = [];
        localStorage.removeItem('carrito');
        renderCarrito();
        renderUserMenu();
    } else {
        alert(result.error);
    }
}