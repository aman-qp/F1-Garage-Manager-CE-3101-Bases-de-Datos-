const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('./db');

router.post('/', async (req, res) => {
  const { id_circuito, dc_global } = req.body;

  console.log('Simulación solicitada:', { id_circuito, dc_global });

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id_circuito', sql.Int, id_circuito)
      .input('dc_global', sql.Decimal(10,2), dc_global)
      .execute('sp_SimularCarrera');

    console.log('Simulación exitosa');
    console.log('Resultados:', result.recordset.length, 'carros');

    res.status(200).json({
      mensaje: 'Simulación ejecutada correctamente',
      resultados: result.recordset
    });

  } catch (err) {
    console.error('Error en simulación:', err);

    // Errores específicos del SP (THROW con número)
    if (err.number === 50010) {
      // dc_global demasiado grande
      return res.status(400).json({
        error: err.message
      });
    }

    if (err.number >= 50001 && err.number <= 50006) {
      // Otros errores de validación del SP
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

    // Error genérico del SP
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