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

  function createDishCarousel(grid, carouselIndex) {
    var section = grid.closest('.section');
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.dish-card'));
    if (!section || cards.length < 2) { return; }

    var heading = section.querySelector('h2');
    var headingText = heading ? heading.textContent : '菜品';
    var shell = document.createElement('div');
    var previousButton = document.createElement('button');
    var nextButton = document.createElement('button');
    var status = document.createElement('div');
    var statusText = document.createElement('span');
    var dots = document.createElement('div');
    var currentCard = cards[0];
    var backgroundTimer;
    var pointerStartX = null;

    shell.className = 'dish-carousel';
    shell.tabIndex = 0;
    shell.setAttribute('role', 'region');
    shell.setAttribute('aria-roledescription', '轮播图');
    shell.setAttribute('aria-label', headingText + '陈列');

    previousButton.className = 'dish-carousel-button dish-carousel-button--previous';
    previousButton.type = 'button';
    previousButton.textContent = '‹';
    previousButton.setAttribute('aria-label', '查看上一道菜');
    nextButton.className = 'dish-carousel-button dish-carousel-button--next';
    nextButton.type = 'button';
    nextButton.textContent = '›';
    nextButton.setAttribute('aria-label', '查看下一道菜');

    status.className = 'dish-carousel-status';
    status.setAttribute('aria-live', 'polite');
    dots.className = 'dish-carousel-dots';
    dots.setAttribute('aria-label', '选择菜品');
    status.appendChild(statusText);
    status.appendChild(dots);

    grid.parentNode.insertBefore(shell, grid);
    shell.appendChild(previousButton);
    shell.appendChild(grid);
    shell.appendChild(nextButton);
    shell.appendChild(status);
    section.classList.add('dish-showcase', 'carousel-ready');
    grid.setAttribute('data-dish-carousel', String(carouselIndex + 1));

    function getVisibleCards() {
      return cards.filter(function (card) { return !card.hidden; });
    }

    function updateBackground(immediate) {
      var photo = currentCard && currentCard.querySelector('.dish-photo img');
      if (!photo) { return; }
      var applyBackground = function () {
        var source = photo.currentSrc || photo.src;
        section.style.setProperty('--dish-showcase-bg', 'url("' + source.replace(/"/g, '%22') + '")');
        window.requestAnimationFrame(function () { section.classList.remove('is-bg-changing'); });
      };
      window.clearTimeout(backgroundTimer);
      if (immediate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        applyBackground();
      } else {
        section.classList.add('is-bg-changing');
        backgroundTimer = window.setTimeout(applyBackground, 150);
      }
    }

    function render(immediate) {
      var visibleCards = getVisibleCards();
      if (!visibleCards.length) { return; }
      if (visibleCards.indexOf(currentCard) === -1) { currentCard = visibleCards[0]; }
      var activeIndex = visibleCards.indexOf(currentCard);

      cards.forEach(function (card) {
        var visibleIndex = visibleCards.indexOf(card);
        var position = 'filtered';
        if (visibleIndex !== -1) {
          var forward = (visibleIndex - activeIndex + visibleCards.length) % visibleCards.length;
          if (forward === 0) { position = 'current'; }
          else if (forward === 1) { position = 'next'; }
          else if (forward === visibleCards.length - 1) { position = 'previous'; }
          else { position = 'hidden'; }
        }
        card.setAttribute('data-carousel-position', position);
        card.setAttribute('aria-hidden', position === 'current' ? 'false' : 'true');
        Array.prototype.forEach.call(card.querySelectorAll('a, button'), function (control) {
          control.tabIndex = position === 'current' ? 0 : -1;
        });
      });

      dots.textContent = '';
      visibleCards.forEach(function (card, index) {
        var dot = document.createElement('button');
        var name = card.querySelector('h3');
        dot.className = 'dish-carousel-dot';
        dot.type = 'button';
        dot.setAttribute('aria-label', '查看' + (name ? '“' + name.textContent + '”' : '第 ' + (index + 1) + ' 道菜'));
        dot.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
        dot.addEventListener('click', function () { setActive(index); });
        dots.appendChild(dot);
      });

      var currentTitle = currentCard.querySelector('h3');
      statusText.textContent = String(activeIndex + 1).padStart(2, '0') + ' / ' + String(visibleCards.length).padStart(2, '0') + ' · ' + (currentTitle ? currentTitle.textContent : headingText);
      updateBackground(immediate);
    }

    function setActive(nextIndex) {
      var visibleCards = getVisibleCards();
      if (!visibleCards.length) { return; }
      currentCard = visibleCards[(nextIndex + visibleCards.length) % visibleCards.length];
      render(false);
    }

    previousButton.addEventListener('click', function () {
      var visibleCards = getVisibleCards();
      setActive(visibleCards.indexOf(currentCard) - 1);
    });
    nextButton.addEventListener('click', function () {
      var visibleCards = getVisibleCards();
      setActive(visibleCards.indexOf(currentCard) + 1);
    });
    shell.addEventListener('keydown', function (event) {
      var visibleCards = getVisibleCards();
      var activeIndex = visibleCards.indexOf(currentCard);
      if (event.key === 'ArrowLeft') {
        event.preventDefault(); setActive(activeIndex - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault(); setActive(activeIndex + 1);
      } else if (event.key === 'Home' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault(); setActive(0);
      } else if (event.key === 'End' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault(); setActive(visibleCards.length - 1);
      }
    });
    shell.addEventListener('pointerdown', function (event) { pointerStartX = event.clientX; });
    shell.addEventListener('pointerup', function (event) {
      if (pointerStartX === null) { return; }
      var distance = event.clientX - pointerStartX;
      pointerStartX = null;
      if (Math.abs(distance) > 48) {
        var visibleCards = getVisibleCards();
        setActive(visibleCards.indexOf(currentCard) + (distance < 0 ? 1 : -1));
      }
    });
    shell.addEventListener('pointercancel', function () { pointerStartX = null; });

    grid.dishCarousel = { refresh: function () { render(false); } };
    render(true);
  }

  Array.prototype.forEach.call(document.querySelectorAll('.dish-grid'), createDishCarousel);

  var filters = document.querySelectorAll('.filter-button');
  var cards = document.querySelectorAll('.dish-card[data-cuisine]');
  filters.forEach(function (button) {
    button.addEventListener('click', function () {
      filters.forEach(function (item) { item.classList.remove('active'); });
      button.classList.add('active');
      var value = button.dataset.filter;
      cards.forEach(function (card) { card.hidden = value !== 'all' && card.dataset.cuisine !== value; });
      var dishGrid = button.closest('.section').querySelector('.dish-grid');
      if (dishGrid && dishGrid.dishCarousel) { dishGrid.dishCarousel.refresh(); }
    });
  });

  var quote = document.querySelector('[data-random-quote]');
  if (quote) {
    var lines = ['一方水土，写进一道菜里。', '认真吃饭，也是认真生活。', '火候有分寸，风味有来处。', '从一桌家常味，读懂一座城。'];
    quote.textContent = lines[Math.floor(Math.random() * lines.length)];
  }
});
