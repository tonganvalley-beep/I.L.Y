(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var navToggle = document.querySelector(".nav-toggle");
  var siteNav = document.querySelector(".site-nav");
  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = siteNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  var quote = document.getElementById("random-quote");
  var quoteSource = document.getElementById("quote-source");
  var quotes = [
    ["有些电影，过了很久还记得其中一个镜头。", "观影随记 · 本站撰写"],
    ["看完别急着关掉，也听听片尾的那首歌。", "观影随记 · 本站撰写"],
    ["今晚有空的话，挑一部一直想看的电影吧。", "观影随记 · 本站撰写"],
    ["同一部电影，隔几年再看，喜欢的地方也许会变。", "观影随记 · 本站撰写"]
  ];
  if (quote && quoteSource) {
    var selected = quotes[Math.floor(Math.random() * quotes.length)];
    quote.textContent = selected[0];
    quoteSource.textContent = "— " + selected[1];
  }

  var carouselGrids = document.querySelectorAll(".home-page .archive-section .movie-grid");
  Array.prototype.forEach.call(carouselGrids, function (grid, carouselIndex) {
    var section = grid.closest(".archive-section");
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".movie-card"));
    if (!section || cards.length < 2) {
      return;
    }

    var sectionTitle = section.querySelector("h2");
    var titleText = sectionTitle ? sectionTitle.textContent : "电影";
    var shell = document.createElement("div");
    var previousButton = document.createElement("button");
    var nextButton = document.createElement("button");
    var status = document.createElement("div");
    var statusText = document.createElement("span");
    var dots = document.createElement("div");
    var activeIndex = 0;
    var backgroundTimer;
    var pointerStartX = null;

    shell.className = "carousel-shell";
    shell.tabIndex = 0;
    shell.setAttribute("role", "region");
    shell.setAttribute("aria-roledescription", "轮播图");
    shell.setAttribute("aria-label", titleText + "电影陈列");

    previousButton.className = "carousel-button carousel-button--previous";
    previousButton.type = "button";
    previousButton.textContent = "‹";
    previousButton.setAttribute("aria-label", "查看上一部" + titleText + "电影");

    nextButton.className = "carousel-button carousel-button--next";
    nextButton.type = "button";
    nextButton.textContent = "›";
    nextButton.setAttribute("aria-label", "查看下一部" + titleText + "电影");

    status.className = "carousel-status";
    status.setAttribute("aria-live", "polite");
    dots.className = "carousel-dots";
    dots.setAttribute("aria-label", "选择电影");
    status.appendChild(statusText);
    status.appendChild(dots);

    grid.parentNode.insertBefore(shell, grid);
    shell.appendChild(previousButton);
    shell.appendChild(grid);
    shell.appendChild(nextButton);
    shell.appendChild(status);
    section.classList.add("carousel-ready");

    cards.forEach(function (card, index) {
      var dot = document.createElement("button");
      var movieTitle = card.querySelector("h3");
      dot.className = "carousel-dot";
      dot.type = "button";
      dot.setAttribute("aria-label", "查看" + (movieTitle ? "《" + movieTitle.textContent + "》" : "第 " + (index + 1) + " 部电影"));
      dot.addEventListener("click", function () {
        setActive(index);
      });
      dots.appendChild(dot);
    });

    function updateBackground(immediate) {
      var poster = cards[activeIndex].querySelector(".poster-frame img");
      if (!poster) {
        return;
      }
      var applyBackground = function () {
        var source = poster.currentSrc || poster.src;
        section.style.setProperty("--showcase-bg", "url(\"" + source.replace(/\"/g, "%22") + "\")");
        window.requestAnimationFrame(function () {
          section.classList.remove("is-bg-changing");
        });
      };

      window.clearTimeout(backgroundTimer);
      if (immediate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        applyBackground();
      } else {
        section.classList.add("is-bg-changing");
        backgroundTimer = window.setTimeout(applyBackground, 150);
      }
    }

    function setActive(nextIndex, immediate) {
      activeIndex = (nextIndex + cards.length) % cards.length;
      cards.forEach(function (card, index) {
        var forward = (index - activeIndex + cards.length) % cards.length;
        var position = "hidden";
        if (forward === 0) {
          position = "current";
        } else if (forward === 1) {
          position = "next";
        } else if (forward === cards.length - 1) {
          position = "previous";
        }

        card.setAttribute("data-carousel-position", position);
        card.setAttribute("aria-hidden", position === "current" ? "false" : "true");
        Array.prototype.forEach.call(card.querySelectorAll("a, button"), function (control) {
          control.tabIndex = position === "current" ? 0 : -1;
        });
      });

      Array.prototype.forEach.call(dots.children, function (dot, index) {
        dot.setAttribute("aria-current", index === activeIndex ? "true" : "false");
      });

      var currentTitle = cards[activeIndex].querySelector("h3");
      statusText.textContent = String(activeIndex + 1).padStart(2, "0") + " / " + String(cards.length).padStart(2, "0") + " · " + (currentTitle ? currentTitle.textContent : titleText);
      updateBackground(immediate);
    }

    previousButton.addEventListener("click", function () {
      setActive(activeIndex - 1);
    });
    nextButton.addEventListener("click", function () {
      setActive(activeIndex + 1);
    });
    shell.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActive(activeIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setActive(activeIndex + 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        setActive(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setActive(cards.length - 1);
      }
    });
    shell.addEventListener("pointerdown", function (event) {
      pointerStartX = event.clientX;
    });
    shell.addEventListener("pointerup", function (event) {
      if (pointerStartX === null) {
        return;
      }
      var distance = event.clientX - pointerStartX;
      pointerStartX = null;
      if (Math.abs(distance) > 48) {
        setActive(activeIndex + (distance < 0 ? 1 : -1));
      }
    });
    shell.addEventListener("pointercancel", function () {
      pointerStartX = null;
    });

    grid.setAttribute("data-carousel-index", String(carouselIndex + 1));
    setActive(0, true);
  });

  var backToTop = document.querySelector(".back-to-top");
  if (backToTop) {
    window.addEventListener("scroll", function () {
      backToTop.classList.toggle("is-visible", window.scrollY > 420);
    }, { passive: true });
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
  }
})();
