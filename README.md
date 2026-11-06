# GUTAM GADU

A polished, responsive arcade game built using vanilla HTML5 Canvas, modern CSS, and JavaScript with synthesized arcade audio via Web Audio API.

## Features
- **Authentic Physics & Controls**: Smooth gravity, flap impulses, and rotational velocity diving.
- **Synthesized Audio (Web Audio API)**: Sound effects for flapping, scoring chimes, impacts, and game over without external MP3 files. Includes mute toggle button.
- **Parallax Background**: Multi-layer scrolling clouds, lush green hills, and striped moving ground.
- **Score & High Score Tracking**: Best scores persist automatically across sessions using `localStorage`.
- **Medal System**: Bronze, Silver, Gold, and Platinum medals awarded on game over based on your score.
- **Juice & Polish**: Screen shake on collisions, death flash, feather particle bursts, and floating "+1" score indicators.
- **Responsive Design**: Scales cleanly on desktop and mobile browsers.

## How to Play
Simply open [`index.html`](./index.html) in any modern web browser (Chrome, Edge, Firefox, Safari), or start a local server.

### Controls
| Action | Input |
|---|---|
| **Flap / Jump** | `Spacebar` / `Up Arrow` / `W` / Left Click / Touch Tap |
| **Pause / Resume** | `P` key |
| **Mute / Unmute** | `M` key or 🔊 button |
| **Restart Game** | `Spacebar` / `R` key / Play Again Button |

## Code Structure & Customization
The codebase is structured to make customizations straightforward:

- [`index.html`](./index.html): Markup structure, canvas container, and HUD overlays.
- [`style.css`](./style.css): Retro styling, animations, medal designs, and responsiveness.
- [`audio.js`](./audio.js): Self-contained Web Audio synthesizer (`SoundManager`).
- [`game.js`](./game.js): The core engine with a `CONFIG` object at the very top for tuning:
  ```javascript
  const CONFIG = {
    gravity: 980,           // Downward acceleration (px/s^2)
    jumpForce: -320,        // Upward impulse on flap (px/s)
    pipeSpeed: 140,         // Horizontal scrolling speed (px/s)
    pipeSpawnInterval: 1.7, // Seconds between pipes
    pipeGap: 135,           // Vertical gap opening
    pipeWidth: 60,          // Pipe width
    ...
  };
  ```

