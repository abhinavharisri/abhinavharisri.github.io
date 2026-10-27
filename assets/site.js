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

  // The homepage mark: the hundrd pixel cube, six faces of 10x10 pixels, spinning in 3D.
  // Every few seconds it inflates into a sphere (each pixel pushed out from the centre)
  // and back. Front face's 100th pixel stays signal orange, like the hundrd logo.
  function morph(button) {
    var canvas = button.querySelector('canvas');
    var SIZE = 120, H = 26, R = 40, PITCH = 2 * H / 10;

    // the six faces: [axis that is fixed, its sign]; u/v walk the other two axes
    var cube = [], faceNormal = [], signal = 99;   // front face comes first, so pixel 99 is its bottom-right one
    [[2, 1], [2, -1], [0, 1], [0, -1], [1, 1], [1, -1]].forEach(function (f) {
      var a = f[0], u = (a + 1) % 3, v = (a + 2) % 3, n = [0, 0, 0];
      n[a] = f[1];
      for (var row = 0; row < 10; row++) for (var col = 0; col < 10; col++) {
        var p = [0, 0, 0];
        p[a] = H * f[1];
        p[u] = -H + PITCH * (col + 0.5);
        p[v] = -H + PITCH * (row + 0.5);
        cube.push(p);
        faceNormal.push(n);
      }
    });

    var ball = cube.map(function (p) {
      var len = Math.hypot(p[0], p[1], p[2]);
      return [p[0] / len * R, p[1] / len * R, p[2] / len * R];
    });

    var shapes = [cube, ball];
    var dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.height = SIZE * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    var cur = cube.map(function (p) { return p.slice(); }), shape = 0, mix = 0, t = 0.6, timer;

    function draw() {
      var cs = getComputedStyle(root), ink = cs.getPropertyValue('--ink').trim(), orange = cs.getPropertyValue('--signal').trim();
      var ry = t, rx = -0.5 + Math.sin(t * 0.7) * 0.12;
      var cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
      function turn(p) {
        var x = p[0] * cy + p[2] * sy, z = -p[0] * sy + p[2] * cy;
        return [x, p[1] * cx - z * sx, p[1] * sx + z * cx];
      }
      var out = cur.map(function (p, i) {
        // light each pixel by how much its surface faces the viewer: face normal on the cube, radial on the sphere
        var b = ball[i], f = faceNormal[i];
        var n = turn([f[0] + (b[0] / R - f[0]) * mix, f[1] + (b[1] / R - f[1]) * mix, f[2] + (b[2] / R - f[2]) * mix]);
        var q = turn(p);
        return [q[0], q[1], q[2], i === signal, n[2] / (Math.hypot(n[0], n[1], n[2]) || 1)];
      }).sort(function (a, b) { return a[2] - b[2]; });
      ctx.clearRect(0, 0, SIZE, SIZE);
      out.forEach(function (p) {
        var k = 220 / (220 - p[2]), facing = p[4];
        var side = 2.9 * k;
        ctx.globalAlpha = p[3] ? 1 : facing > 0 ? 0.3 + facing * 0.7 : 0.07;
        ctx.fillStyle = p[3] ? orange : ink;
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
      shape = 1 - shape;
      clearTimeout(timer);
      timer = setTimeout(next, shape ? 2600 : 4200);
    }
    button.addEventListener('click', next);
    timer = setTimeout(next, 4200);

    (function loop() {
      t += 0.008;
      mix += (shape - mix) * 0.05;
      var target = shapes[shape];
      for (var i = 0; i < cur.length; i++) for (var k = 0; k < 3; k++)
        cur[i][k] += (target[i][k] - cur[i][k]) * (0.05 + (i % 9) * 0.004);
      draw();
      requestAnimationFrame(loop);
    })();
  }
})();
