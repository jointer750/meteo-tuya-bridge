require('dotenv').config();
const express = require('express');
const { TuyaContext } = require('@tuya/tuya-connector-nodejs');

const app = express();
const port = process.env.PORT || 3000;

// Configurar SDK de Tuya
const tuya = new TuyaContext({
  baseUrl: 'https://openapi.tuyaeu.com', // Europa Central
  accessKey: process.env.TUYA_ACCESS_ID,
  secretKey: process.env.TUYA_ACCESS_SECRET,
});

const DEVICE_ID = process.env.TUYA_DEVICE_ID;

// Función auxiliar para sacar valores por "code"
function getCodeValue(statusArray, code) {
  const item = statusArray.find((d) => d.code === code);
  return item ? item.value : null;
}

// Endpoint principal: devuelve datos "limpios" de la estación
app.get('/meteo', async (req, res) => {
  try {
    const response = await tuya.request({
      method: 'GET',
      path: `/v1.0/devices/${DEVICE_ID}/status`,
      body: {},
    });

    // Log completo en consola para ver la forma real
    console.log('Tuya raw response:', JSON.stringify(response, null, 2));

    if (!response || response.success === false) {
      return res.status(500).json({
        error: 'tuya_not_success',
        raw: response || null,
      });
    }

    const status = response.result || [];

    const payload = {
      timestamp: new Date().toISOString(),
      temp: getCodeValue(status, 'temp_current_external') ?? getCodeValue(status, 'temp_current'),
      humidity: getCodeValue(status, 'humidity_outdoor') ?? getCodeValue(status, 'humidity_value'),
      windSpeedAvg: getCodeValue(status, 'windspeed_avg'),
      windGust: getCodeValue(status, 'windspeed_gust'),
      rain1h: getCodeValue(status, 'rain_1h'),
      rain24h: getCodeValue(status, 'rain_24h'),
      rainRate: getCodeValue(status, 'rain_rate'),
      pressure: getCodeValue(status, 'atmospheric_pressture'),
      uvIndex: getCodeValue(status, 'uv_index'),
      dewPoint: getCodeValue(status, 'dew_point_temp'),
      feelsLike: getCodeValue(status, 'feellike_temp'),
      raw: status, // por si queremos verlo en Make
    };

    res.json(payload);
  } catch (err) {
    console.error('Error pidiendo datos a Tuya (catch):', err.response?.data || err.message);
    res.status(500).json({
      error: 'tuya_request_failed',
      detail: err.message,
      raw: err.response?.data || null,
    });
  }
});

// Arrancar servidor
app.listen(port, () => {
  console.log(`Servidor Meteo-Tuya escuchando en http://localhost:${port}`);
});
