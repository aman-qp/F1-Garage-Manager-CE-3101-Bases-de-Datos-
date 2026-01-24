const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('./db');

router.post('/', async (req, res) => {
  const { id_circuito, dc_global } = req.body;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id_circuito', sql.Int, id_circuito)
      .input('dc_global', sql.Decimal(10,2), dc_global)
      .execute('sp_SimularCarrera');

    res.status(200).json({
      mensaje: 'Simulación ejecutada correctamente',
      resultados: result.recordset
    });

  } catch (err) {
    console.error(err);

    //Error controlado 
    if (err.code === 'EREQUEST') {
      return res.status(400).json({
        error: err.originalError?.info?.message 
          || 'Error en la simulación de la carrera'
      });
    }
    //Error inesperado
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;