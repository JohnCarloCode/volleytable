# 🏐 Pizarra Voley

Tablero de entrenador de voleibol online — como la pizarra magnética típica, pero para móvil, iPad y portátil. 100% frontend, sin backend.

## Características

- **Campo de voleibol** con tres vistas: **Completo**, solo **Arriba** o solo **Abajo** (con red y líneas de ataque).
- **Rotación** del campo: **Vertical** (red horizontal) u **Horizontal** (red vertical). Las
  posiciones se guardan relativas a la red, así que rotar conserva la colocación táctica.
- **Fichas atadas a un campo** (lado A/B): no pueden cruzar la red arrastrando.
- **Máximo 6 jugadores por campo** (los balones no cuentan).
- **Añadir jugadores** como fichas redondas con:
  - Nombre
  - Dorsal o iniciales (centro de la ficha)
  - **Posición** (S, OH, OPP, MB, L, DS) elegida con un select → aparece como insignia arriba a la derecha
  - Color (paleta + color personalizado)
  - Foto (se sube, se recorta a círculo y se optimiza)
  - **Ubicación** obligatoria: en el campo o en el banquillo, y en qué lado
- **Dos banquillos separados**, uno por campo (Arriba/Izquierda y Abajo/Derecha).
- **Intercambio**: toca una ficha del banquillo y luego un jugador del mismo campo para
  cambiarlos; o tócala y luego una posición vacía del campo para colocarla.
- **Balón** como ficha extra rápida.
- **Arrastrar y soltar** las fichas con el dedo o el ratón (pointer events → funciona igual en táctil y desktop).
- **Editar / al banquillo / eliminar** una ficha: tócala para seleccionarla y usa los botones ✎ / 🪑 / ✕.
- **Guardado automático** en `localStorage` (jugadores, posiciones, banquillo, vista y orientación).
- Botón **🗑 Borrar todo** para vaciar el tablero.

## Uso

```bash
npm install
npm run dev      # servidor de desarrollo (http://localhost:5173)
npm run build    # build de producción en dist/
npm run preview  # previsualiza el build
```

## Stack

React + Vite + Tailwind CSS. Sin más dependencias.
