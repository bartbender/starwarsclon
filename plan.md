# plan.md — StarWars Clon

## 1) Información recopilada de internet (resumen útil)

### A) Referencia del juego original Star Wars (Atari, 1983)
- Vista en primera persona desde cabina, con combate espacial y disparos a cazas imperiales.
- Estética de gráficos vectoriales (líneas luminosas sobre fondo oscuro).
- Flujo arcade: apuntar, disparar, esquivar, impactos visuales y audio reactivo.

### B) Buenas prácticas web para Canvas + Game Loop
- Usar `requestAnimationFrame` como bucle principal por sincronización con refresco de pantalla.
- Separar lógica en `update(dt)` y `render()` para mantener arquitectura limpia.
- Gestionar entrada con estado persistente de teclado, ratón y touch.
- Escalar el canvas respetando aspect ratio y usando `devicePixelRatio` para nitidez.
- Traducir coordenadas de entrada (mouse/touch) del espacio CSS al espacio lógico de juego.

> Nota: este plan consolida la investigación web realizada para reproducir la base jugable del arcade en una sola página `index.html`.

---

## 2) Objetivo técnico del MVP
Crear un clon educativo jugable en una **single page** con:
1. **Cabecera**: título “StarWars Clon” en estilo infantil tipo Comic Sans, multicolor.
2. **Zona de juego**: un `<canvas>` que ocupe el mayor espacio disponible.
3. **Módulo principal**: `gameplay.js` con:
   - `init()` para inicialización completa.
   - `Run()` para arrancar bucle principal.
4. Bucle con captura de eventos (keyboard/mouse/touch), desplazamientos, colisiones, impactos, sonido y render.
5. Render vectorial 2D (simulación del look clásico 3D/vectorial).

---

## 3) Plan de implementación paso a paso para Copilot

### Fase 1 — Estructura de página
- Crear `index.html` con layout de dos filas:
  - Fila superior: `<h1>` multicolor con tipografía Comic Sans.
  - Fila inferior: `<canvas id="gameCanvas">` a pantalla útil.
- Aplicar estilos para:
  - Fondo negro.
  - Canvas responsivo con `touch-action: none`.
  - Sin scroll y con máximo aprovechamiento del viewport.

### Fase 2 — Arquitectura de `gameplay.js`
- Definir módulo `gameplay` con estado interno:
  - canvas/contexto
  - jugador
  - enemigos
  - disparos
  - impactos
  - estrellas/fondo
  - estado de entrada
  - audio
- Implementar método `init()`:
  - localizar canvas
  - obtener contexto 2D
  - crear entidades iniciales
  - registrar listeners de entrada
  - configurar resize responsivo
  - inicializar audio web

### Fase 3 — Bucle principal (`Run`)
- Implementar `Run()` para:
  - evitar doble arranque
  - inicializar timestamp
  - lanzar `requestAnimationFrame(loop)`
- `loop(timestamp)` debe ejecutar:
  1. cálculo de `dt`
  2. lectura de entradas (mover/disparar)
  3. actualización de entidades
  4. colisiones y gestión de impactos
  5. render completo

### Fase 4 — Sistema de control
- Keyboard:
  - movimiento con flechas / WASD
  - disparo con barra espaciadora
- Mouse:
  - apuntado por posición
  - disparo por click mantenido
- Touch:
  - apuntado por dedo principal
  - disparo en `touchstart`
  - `preventDefault` para evitar scroll accidental

### Fase 5 — Mecánicas esenciales
- Spawner sencillo de enemigos.
- Movimiento de enemigos hacia el jugador.
- Disparos del jugador con cooldown.
- Colisión circular (`distance < r1+r2`).
- Impacto breve con animación de expansión.
- Sonido de disparo sintético con WebAudio (si está disponible).

### Fase 6 — Render estilo vectorial
- Fondo negro + estrellas.
- Naves dibujadas con líneas (`moveTo/lineTo/stroke`).
- Mira de cabina en el centro del jugador.
- Colores brillantes (azul/cian para jugador, rojo para enemigos, amarillo para disparo).

### Fase 7 — Ajuste de escalado
- Mantener resolución lógica fija (por ejemplo 1024x576).
- Reescalar canvas al máximo espacio disponible sin deformar.
- Ajustar densidad con `devicePixelRatio`.

### Fase 8 — Validación mínima
- Verificar en navegador:
  - carga de `index.html`
  - inicialización sin errores
  - movimiento con teclado
  - disparo con teclado/mouse/touch
  - aparición de enemigos e impactos
  - redimensionado de ventana estable

---

## 4) Entregables
- `index.html`
- `gameplay.js`
- `README.md` (fines educativos + dedicatoria solicitada)

