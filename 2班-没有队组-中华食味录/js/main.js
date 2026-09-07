document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav-list');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  var topButton = document.querySelector('.back-top');
  if (topButton) {
    window.addEventListener('scroll', function () {
      topButton.classList.toggle('show', window.scrollY > 420);
    });
    topButton.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  var filters = document.querySelectorAll('.filter-button');
  var cards = document.querySelectorAll('.dish-card[data-cuisine]');
  filters.forEach(function (button) {
    button.addEventListener('click', function () {
      filters.forEach(function (item) { item.classList.remove('active'); });
      button.classList.add('active');
      var value = button.dataset.filter;
      cards.forEach(function (card) { card.hidden = value !== 'all' && card.dataset.cuisine !== value; });
    });
  });

  var quote = document.querySelector('[data-random-quote]');
  if (quote) {
    var lines = ['一方水土，写进一道菜里。', '认真吃饭，也是认真生活。', '火候有分寸，风味有来处。', '从一桌家常味，读懂一座城。'];
    quote.textContent = lines[Math.floor(Math.random() * lines.length)];
  }
});
