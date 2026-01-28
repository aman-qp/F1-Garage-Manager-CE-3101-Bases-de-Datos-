const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('./db');

router.post('/', async (req, res) => {
  const { id_circuito, dc_global, carros } = req.body;

  console.log('Simulación solicitada:', { id_circuito, dc_global, carros });

  // ============================
  // Validaciones básicas
  // ============================
  if (!id_circuito || !dc_global) {
    return res.status(400).json({
      error: 'id_circuito y dc_global son obligatorios'
    });
  }

  if (!Array.isArray(carros) || carros.length === 0) {
    return res.status(400).json({
      error: 'Debe seleccionar al menos un carro para simular'
    });
  }


  const carrosCsv = carros.join(',');

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id_circuito', sql.Int, id_circuito)
      .input('dc_global', sql.Decimal(10, 2), dc_global)
      .input('carros_csv', sql.VarChar(sql.MAX), carrosCsv)  
      .execute('sp_SimularCarrera');

    console.log('Simulación exitosa');
    console.log('Resultados:', result.recordset.length, 'carros');

    res.status(200).json({
      mensaje: 'Simulación ejecutada correctamente',
      resultados: result.recordset
    });

  } catch (err) {
    console.error('Error en simulación:', err);

    // ============================
    // Errores controlados del SP
    // ============================

    // dc_global demasiado grande
    if (err.number === 50010) {
      return res.status(400).json({
        error: err.message
      });
    }

    // Otros errores de validación del SP
    if (err.number >= 50001 && err.number <= 50006) {
      return res.status(400).json({
        error: err.message
      });
    }

    // Error de overflow aritmético
    if (err.message && err.message.includes('Arithmetic overflow')) {
      return res.status(400).json({
        error: 'El valor de dc_global es demasiado grande y causa un desbordamiento en los cálculos. Use un valor más pequeño.'
      });
    }

    // Error de conversión
    if (err.message && err.message.includes('converting numeric to data type varchar')) {
      return res.status(400).json({
        error: 'Error en los cálculos: el dc_global produce valores demasiado grandes. Intente con un valor menor.'
      });
    }

    // Error genérico del request SQL
    if (err.code === 'EREQUEST') {
      return res.status(400).json({
        error: err.message || 'Error al ejecutar la simulación'
      });
    }

    // Error inesperado
    return res.status(500).json({
      error: 'Error interno del servidor',
      detalle: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
