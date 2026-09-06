# Bichón Flappy

Pequeño videojuego HTML5 protagonizado por un bichón maltés.

## Novedad
Ahora puedes recoger **pequeñas salchichas** mientras atraviesas los huecos.  
Las salchichas tienen contador propio y un efecto visual al recogerlas.

## Cómo jugar
- `Espacio`: empezar / saltar.
- Flechas: moverse.
- `P`: pausar / continuar.
- En móvil: botones táctiles y toque sobre el área de juego para saltar.

## Ejecutar
Abre `index.html` en un navegador moderno.

Para evitar restricciones locales de algunos navegadores, también puedes levantar un servidor:

```bash
python -m http.server 8000
```

y abrir `http://localhost:8000`.

## Estructura
- `index.html`: interfaz.
- `css/style.css`: estilos.
- `js/game.js`: lógica del juego.
- `assets/images/bichon-sprite.png`: personaje.
- `tests/test-game.cjs`: comprobaciones básicas.
