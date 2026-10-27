// Loaded in <head> on every page: apply the saved theme before paint,
// then add the corner clock and theme toggle once the page is ready.

(function () {
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem('theme');
    if (saved) root.dataset.theme = saved;
  } catch (e) {}

  function isDark() {
    if (root.dataset.theme) return root.dataset.theme === 'dark';
    return matchMedia('(prefers-color-scheme: dark)').matches;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var corner = document.createElement('div');
    corner.className = 'corner';
    corner.innerHTML =
      '<span class="clock" title="Time in Bangalore">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="10.5"/>' +
          '<line class="h" x1="12" y1="12" x2="12" y2="6.8"/>' +
          '<line class="m" x1="12" y1="12" x2="12" y2="4.2"/>' +
          '<line class="s" x1="12" y1="14" x2="12" y2="3.4"/>' +
          '<circle class="pin" cx="12" cy="12" r="1"/>' +
        '</svg>Bangalore</span>' +
      '<button type="button" class="theme"></button>';
    document.body.appendChild(corner);

    // Bangalore time, whatever the visitor's timezone
    var hands = corner.querySelectorAll('line');
    var fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' });
    function tick() {
      var t = {};
      fmt.formatToParts(new Date()).forEach(function (p) { t[p.type] = +p.value; });
      var angles = [(t.hour % 12 + t.minute / 60) * 30, (t.minute + t.second / 60) * 6, t.second * 6];
      hands.forEach(function (hand, i) { hand.setAttribute('transform', 'rotate(' + angles[i] + ' 12 12)'); });
    }
    tick();
    setInterval(tick, 1000);

    var mark = document.querySelector('.mark');
    if (mark) morph(mark);

    var button = corner.querySelector('.theme');
    function label() {
      button.textContent = isDark() ? 'light' : 'dark';
      button.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode');
    }
    label();
    button.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
      label();
    });
  });

  // The homepage mark: 400 pixels that turn in 3D and reshape AH -> hundrd -> sphere.
  // The 4 pixels that make hundrd's 100th square stay signal orange in every shape.
  function morph(button) {
    var canvas = button.querySelector('canvas');
    var N = 400, SIGNAL_FROM = 396, SIZE = 120;

    // hundrd mark: 10x10 grid, 6-unit pixels on a 10-unit pitch, each pixel a 2x2 of points
    function hundrd() {
      var pts = [], s = 0.72;
      for (var row = 0; row < 10; row++) for (var col = 0; col < 10; col++)
        for (var k = 0; k < 4; k++) {
          var x = col * 10 + 1.5 + (k % 2) * 3, y = row * 10 + 1.5 + Math.floor(k / 2) * 3;
          pts.push([(x - 48) * s, (y - 48) * s, 0]);
        }
      return pts;
    }

    function fromText(txt, font) {
      var off = document.createElement('canvas');
      off.width = off.height = 100;
      var o = off.getContext('2d');
      o.font = font; o.textAlign = 'center'; o.textBaseline = 'middle';
      o.fillText(txt, 50, 54);
      var data = o.getImageData(0, 0, 100, 100).data, filled = [];
      for (var y = 0; y < 100; y += 2) for (var x = 0; x < 100; x += 2)
        if (data[(y * 100 + x) * 4 + 3] > 128) filled.push([x - 50, y - 50]);
      var pts = [];
      for (var i = 0; i < N; i++) {
        var p = filled[Math.floor(i * filled.length / N)];
        pts.push([p[0] * 0.9, p[1] * 0.9, (Math.random() - 0.5) * 8]);
      }
      return pts;
    }

    function sphere(r) {
      var pts = [], g = Math.PI * (3 - Math.sqrt(5));
      for (var i = 0; i < N; i++) {
        var y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), t = g * i;
        pts.push([Math.cos(t) * rad * r, y * r, Math.sin(t) * rad * r]);
      }
      return pts;
    }

    var shapes = [fromText('AH', '700 46px -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif'), hundrd(), sphere(38)];
    var dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.height = SIZE * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    var cur = shapes[0].map(function (p) { return p.slice(); }), shape = 0, t = 0, timer;

    function draw() {
      var cs = getComputedStyle(root), ink = cs.getPropertyValue('--ink').trim(), signal = cs.getPropertyValue('--signal').trim();
      var ry = Math.sin(t) * 0.9, rx = -0.15, cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
      var out = cur.map(function (p, i) {
        var x = p[0] * cy - p[2] * sy, z = p[0] * sy + p[2] * cy;
        var y = p[1] * cx - z * sx; z = p[1] * sx + z * cx;
        return [x, y, z, i >= SIGNAL_FROM];
      }).sort(function (a, b) { return a[2] - b[2]; });
      ctx.clearRect(0, 0, SIZE, SIZE);
      out.forEach(function (p) {
        var k = 220 / (220 - p[2]), depth = Math.max(0, Math.min(1, (p[2] + 45) / 90));
        var side = 2.35 * k * (0.7 + depth * 0.6);
        ctx.globalAlpha = p[3] ? 1 : Math.min(1, 0.45 + depth * 0.9);
        ctx.fillStyle = p[3] ? signal : ink;
        ctx.fillRect(60 + p[0] * k - side / 2, 60 + p[1] * k - side / 2, side, side);
      });
      ctx.globalAlpha = 1;
    }

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw();
      new MutationObserver(draw).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
      return;
    }

    function next() {
      shape = (shape + 1) % shapes.length;
      clearTimeout(timer);
      timer = setTimeout(next, 3800);
    }
    button.addEventListener('click', next);
    timer = setTimeout(next, 3800);

    (function loop() {
      t += 0.012;
      var target = shapes[shape];
      for (var i = 0; i < N; i++) for (var k = 0; k < 3; k++)
        cur[i][k] += (target[i][k] - cur[i][k]) * (0.06 + (i % 7) * 0.006);
      draw();
      requestAnimationFrame(loop);
    })();
  }
})();
