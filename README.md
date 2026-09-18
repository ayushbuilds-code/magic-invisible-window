# Magic Invisible Window (Web Version)

The Magic Invisible Window has been completely ported to a modern, browser-based web application! 
It uses MediaPipe Tasks Vision for hand tracking and the HTML5 Canvas API for real-time video blending.

## Features
- Runs entirely in the browser (no Python dependencies required!)
- Fast, real-time hand tracking
- 6 dynamic visual effects (Invisible, Grayscale, Pixelation, Blur, Glitch, Negative)
- Strict Gesture mode for accurate tracking
- Built-in video recording

## How to Run Locally

You can run this using any static HTTP server. If you have Python installed, simply open your terminal in this directory and run:

```bash
python3 -m http.server 8000
```

Then, open your Google Chrome browser and navigate to:
[http://localhost:8000](http://localhost:8000)

## How to Use
1. Click **Start Camera** and grant Chrome permission to use your webcam.
2. Step out of the frame (or press `B`/`SPACE`) to capture a clean reference background.
3. Bring your hands up and stretch your index fingers apart to create the magic window.
4. Press `1-6` to switch effects, `G` to toggle Strict Mode, and `R` to start/stop video recording!

## Deployment
Because this project consists entirely of static files (`.html`, `.css`, `.js`), you can easily host it on GitHub Pages, Vercel, or Netlify by simply pushing this directory to a repository. No backend configuration is required!
