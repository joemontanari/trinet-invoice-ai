import { crearApp } from './app.js';
import { config } from './config/env.js';

crearApp().listen(config.port, () => {
  console.log(`API de Trinet Invoice AI escuchando en el puerto ${config.port}`);
});
