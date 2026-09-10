const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config(); // Llama a las variables del .env

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ... (Tus rutas de /api/registro, /api/login, etc. se mantienen exactamente igual) ...

// Registro de Usuario
app.post('/api/registro', async (req, res) => {
    const { nombre, cedula, celular, correo, direccion, banco, numero_tarjeta, password } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO usuarios (nombre, cedula, celular, correo, direccion, banco, numero_tarjeta, password) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, nombre, saldo`,
            [nombre, cedula, celular, correo, direccion, banco, numero_tarjeta, password]
        );
        res.json({ success: true, usuario: result.rows[0] });
    } catch (err) {
        console.error('Error en registro:', err);
        res.status(500).json({ success: false, error: 'Error al registrar o usuario ya existe' });
    }
});




// Login de Usuario
app.post('/api/login', async (req, res) => {
    const { correo, password } = req.body;
    try {
        const result = await pool.query('SELECT id, nombre, saldo FROM usuarios WHERE correo = $1 AND password = $2', [correo, password]);
        if (result.rows.length > 0) {
            res.json({ success: true, usuario: result.rows[0] });
        } else {
            res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
        }
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ success: false, error: 'Error en el servidor' });
    }
});

// Procesar Compra
app.post('/api/comprar', async (req, res) => {
    const { usuario_id, total, carrito } = req.body;
    try {
        // Verificar saldo del usuario
        const userRes = await pool.query('SELECT saldo FROM usuarios WHERE id = $1', [usuario_id]);
        
        if (userRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        let saldoActual = parseFloat(userRes.rows[0].saldo);

        if (saldoActual < total) {
            return res.status(400).json({ success: false, error: 'Saldo insuficiente en el monedero' });
        }

        // Descontar saldo
        await pool.query('UPDATE usuarios SET saldo = saldo - $1 WHERE id = $2', [total, usuario_id]);

        // Registrar cabecera de la compra
        const compraRes = await pool.query(
            'INSERT INTO compras (usuario_id, total) VALUES ($1, $2) RETURNING id',
            [usuario_id, total]
        );
        const compra_id = compraRes.rows[0].id;

        // Registrar detalles de cada producto en la compra
        for (let item of carrito) {
            await pool.query(
                'INSERT INTO detalles_compra (compra_id, producto_nombre, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)',
                [compra_id, item.nombre, item.cantidad, item.precio]
            );
        }

        // Consultar el nuevo saldo actualizado
        const saldoFinal = await pool.query('SELECT saldo FROM usuarios WHERE id = $1', [usuario_id]);
        res.json({ success: true, nuevoSaldo: saldoFinal.rows[0].saldo });

    } catch (err) {
        console.error('Error procesando la compra:', err);
        res.status(500).json({ success: false, error: 'Error al procesar la compra' });
    }
});


// Endpoint para Recargar Saldo mediante el Juego
app.post('/api/recargar', async (req, res) => {
    const { usuario_id, monto } = req.body;
    try {
        if (!usuario_id || !monto || monto <= 0) {
            return res.status(400).json({ success: false, error: 'Datos de recarga inválidos' });
        }

        // Incrementar el saldo en la base de datos de Neon
        const result = await pool.query(
            'UPDATE usuarios SET saldo = saldo + $1 WHERE id = $2 RETURNING saldo',
            [monto, usuario_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        res.json({ success: true, nuevoSaldo: result.rows[0].saldo });
    } catch (err) {
        console.error('Error al recargar saldo:', err);
        res.status(500).json({ success: false, error: 'Error interno al procesar la recarga' });
    }
});



// Actualiza el puerto para que Render pueda asignar uno automáticamente
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));