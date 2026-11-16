// Keyboard + mouse state, in canvas coordinates. Edge presses are consumed
// once per frame so a single keypress never fires twice.
export class InputTracker {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 640, y: 360, down: false };
    this.onFirstGesture = null;
    this.onKey = null;
    this._onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (this.onFirstGesture) this.onFirstGesture();
      if (this.onKey) this.onKey(e.code);
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * 1280;
      this.mouse.y = ((e.clientY - r.top) / r.height) * 720;
    };
    this._onMouseDown = (e) => {
      this._onMouseMove(e);
      this.mouse.down = true;
      if (this.onFirstGesture) this.onFirstGesture();
    };
    this._onMouseUp = () => { this.mouse.down = false; };
    this._onBlur = () => { this.keys.clear(); this.mouse.down = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  down(code) {
    return this.keys.has(code);
  }

  consume(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  thrustVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  endFrame() {
    this.pressed.clear();
  }
}
