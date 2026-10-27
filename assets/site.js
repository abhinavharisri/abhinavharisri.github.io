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

    var coin = document.querySelector('.coin');
    if (coin) spinCoin(coin);

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

  // The homepage coin: idles in a slow spin, drag to spin it, click to flick it.
  function spinCoin(coin) {
    var body = coin.querySelector('.coin-body');

    // stacked discs give the coin its edge when it turns side-on
    for (var z = -2.5; z <= 2.5; z += 0.5) {
      var layer = document.createElement('span');
      layer.className = 'layer';
      layer.style.transform = 'translateZ(' + z + 'px)';
      body.insertBefore(layer, body.firstChild);
    }

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var idle = 0.5, angle = -25, speed = idle;
    var dragging = false, lastX = 0, moved = 0;

    (function loop() {
      if (!dragging) {
        angle += speed;
        speed += (idle - speed) * 0.025;
      }
      body.style.transform = 'rotateY(' + angle + 'deg)';
      requestAnimationFrame(loop);
    })();

    function flick() {
      speed += 28;
      coin.classList.remove('toss');
      void coin.offsetWidth;
      coin.classList.add('toss');
    }

    coin.addEventListener('pointerdown', function (e) {
      dragging = true;
      lastX = e.clientX;
      moved = 0;
      coin.setPointerCapture(e.pointerId);
    });
    coin.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      angle += dx * 1.4;
      speed = dx * 1.4;
    });
    coin.addEventListener('pointerup', function () {
      dragging = false;
      if (moved < 4) flick();
    });
    coin.addEventListener('pointercancel', function () { dragging = false; });
    coin.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flick(); }
    });
  }
})();
