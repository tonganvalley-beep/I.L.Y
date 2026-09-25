(() => {
  'use strict';
  const { el, button } = ILY;
  function mountChapterMoment({ stage, node, state, assets, go }) {
    ILY.mountScene(stage, node, assets);
    let frame = 0, last = 0, elapsed = 0, done = false, clicks = 0, count = 3, finishedAt = 0;
    /* 2026-09-25：5 秒不点击自动开始扩散（×3 步进 0.45s/步），手动点击会重置闲置窗口；
       铺满后的收束仍按原链路（FILL_HOLD 停顿 → fracture → 0.5s 后 go(next)）。 */
    let lastInteract = 0, autoStarted = false, lastAutoAt = 0, fillHoldTimer = 0;
    const blocked = () => document.hidden || !!document.querySelector('dialog[open]');
    // 最终章「搜索」与「短信」演出：改用新款手机（与女主视角短信弹窗同一部智能机）作为 UI
    const isPhoneMoment = node.type === 'search' || node.type === 'letter';
    const panel = el('section', isPhoneMoment ? 'heroine-sms-scene moment-phone-scene' : 'chapter-moment ' + node.type); stage.append(panel);
    // 新款手机外壳：状态栏 + 屏幕内容（外观类复用 heroine-sms-*，样式见 chapters.css 的 moment-* 段）
    function buildPhone(clock) {
      const device = el('div', 'heroine-sms-device');
      const screen = el('div', 'heroine-sms-screen');
      const status = el('div', 'heroine-sms-status');
      status.append(el('span', 'heroine-sms-clock', clock || ''), el('span', 'heroine-sms-status-icons', '\u25b2  \u25cf'));
      screen.append(status);
      device.append(screen);
      panel.append(device);
      return screen;
    }
    function unlock(id) { if (!state.flags.achievements.includes(id)) state.flags.achievements.push(id); }
    if (node.type === 'letter') {
      // 短信弹窗：ILY 的回信以短信气泡呈现在新款手机屏幕上
      const screen = buildPhone((node.date || '').split(' ').pop());
      const header = el('header', 'heroine-sms-header');
      const contact = el('div', 'heroine-sms-contact');
      contact.append(el('h1', '', 'ILY'), el('span', '', '短信'));
      header.append(el('span', 'heroine-sms-back', '\u2039'), el('span', 'heroine-sms-avatar'), contact);
      const thread = el('div', 'heroine-sms-thread');
      thread.append(el('div', 'heroine-sms-day', node.date || ''));
      const bubble = el('div', 'heroine-sms-bubble');
      if (node.subject) bubble.append(el('span', 'moment-sms-subject', node.subject));
      bubble.append(el('span', 'heroine-sms-copy', node.text));
      thread.append(bubble);
      const footer = el('div', 'moment-phone-footer');
      footer.append(button('合上手机', () => go(node.next)));
      screen.append(header, thread, footer);
    }
    // —— 终章 S05「检索 ily」：手机浏览器 ——
    // 首页（搜索框）→ 结果页（多个网站，逐条浮出）→ 点开链接进入该站正文 → 返回键可回退。
    // 条目文案取自最终章脚本 S05 段；最后一条是原先直接铺在结果里的文案，现在收进链接里。
    const HOME_URL = 'sou.example.com';
    const RESULTS_URL = 'sou.example.com/search?q=ily';
    const SEARCH_SITES = [
      {
        title: 'ily 是什么的缩写？', url: 'www.zdic.example/ily',
        snippet: 'ily 是由 i、l、y 一起组成的英文单词，在本文中可以认识该词的意思，以及试听标准发音。',
        lead: 'ily 是由 i、l、y 一起组成的英文单词。',
        rows: [['词性', '缩写 · 网络用语'], ['全拼', 'I LOVE YOU'], ['读音', '/ˌaɪ el ˈwaɪ/']],
        body: ['在论坛、短信与社交网络上，ily 常被用来代替「I LOVE YOU」整句出现。']
      },
      {
        title: 'ily 的意思·用法', url: 'www.jiten.example/ily',
        snippet: '“ILY”是“I LOVE YOU”的缩写，可用于表示“我爱你”“我喜欢你”“再见”等意思。',
        lead: '“ILY”是“I LOVE YOU”的缩写。',
        list: ['我爱你。', '我喜欢你。', '也用作道别时的招呼：再见。'],
        body: ['一整句话被压成三个字母，语气却比整句更轻。']
      },
      {
        title: 'ily 的意思·用法·发音 英日辞典', url: 'www.nkr-dict.example/ily',
        snippet: 'NKR 辞典：ily 是【意思】【缩写】I LOVE YOU（我爱你）……可用于表达爱意，以及道别时的招呼。',
        lead: 'NKR 辞典：ily 是【意思】【缩写】I LOVE YOU（我爱你）。',
        rows: [['读音', '/ˌaɪ el ˈwaɪ/'], ['词条编号', 'NKR-ily-0413']],
        list: ['可用于表达爱意。', '也可用于道别时的招呼。'],
        body: ['例：ILY，明天见。—— 既像约定，也像告别。']
      },
      {
        title: '【ILY 是什么的缩写？】-用语集', url: 'www.yougo-jiten.example/ILY',
        snippet: '意思·解释：ily 的意思是“我喜欢你”“我爱你”，是“I LOVE YOU”的首字母排列。常见于论坛发言以及邮件中。',
        lead: '意思·解释：ily 的意思是“我喜欢你”“我爱你”，是“I LOVE YOU”的首字母排列。',
        body: ['常见于论坛发言以及邮件中，也多见于短信的结尾。', '三个字母各自独立，却只有连在一起时才成立。']
      },
      {
        title: '「ILY」的意思与用法', url: 'www.essay.example/ily',
        snippet: 'ILY 是 I LOVE YOU 的首字母缩写。我爱你。我喜欢你。也用来传达道别时的爱意。',
        lead: 'ily 是什么的缩写？',
        list: ['ILY 是 I LOVE YOU 的首字母缩写。', '我爱你。', '我喜欢你。', '也用来传达道别时的爱意。']
      }
    ];
    let homePage = null, resultsPage = null, sitePage = null, siteArticle = null, phoneFooter = null, searchScreen = null;
    let addrBox = null, urlText = null, backBtn = null, currentPage = null, currentUrl = '';
    const trail = [];
    // 浏览器式翻页：地址栏随之变化，返回键按访问历史回退。
    function browserShow(page, url, push) {
      if (!page) return;
      if (push && currentPage && currentPage !== page && trail[trail.length - 1]?.[0] !== currentPage) trail.push([currentPage, currentUrl]);
      currentPage = page; currentUrl = url;
      [homePage, resultsPage, sitePage].forEach(view => { if (view) view.hidden = view !== page; });
      urlText.textContent = url;
      backBtn.disabled = !trail.length;
      page.scrollTop = 0;
      addrBox.classList.remove('is-loading'); void addrBox.offsetWidth; addrBox.classList.add('is-loading');
    }
    function browserBack() { const prev = trail.pop(); if (prev) browserShow(prev[0], prev[1], false); }
    // 点开一条搜索结果＝进入那个网站，正文按词条格式排。
    function openSite(site) {
      siteArticle.replaceChildren();
      siteArticle.append(el('h1', 'moment-site-title', site.title), el('p', 'moment-site-url', site.url));
      if (site.lead) siteArticle.append(el('p', 'moment-site-lead', site.lead));
      if (site.rows) {
        const rows = el('dl', 'moment-site-rows');
        site.rows.forEach(([key, value]) => rows.append(el('dt', '', key), el('dd', '', value)));
        siteArticle.append(rows);
      }
      if (site.list) {
        const list = el('div', 'moment-site-list');
        site.list.forEach(line => list.append(el('p', 'moment-site-line', line)));
        siteArticle.append(list);
      }
      (site.body || []).forEach(line => siteArticle.append(el('p', 'moment-site-copy', line)));
      const back = button('\u2039 返回搜索结果', () => browserShow(resultsPage, RESULTS_URL, false));
      back.className = 'moment-site-back';
      siteArticle.append(back);
      browserShow(sitePage, site.url, true);
    }
    function resultEntry(site, index) {
      const item = el('button', 'moment-result');
      item.type = 'button'; item.style.setProperty('--i', index);
      item.append(el('span', 'moment-result-url', site.url), el('span', 'moment-result-title', site.title), el('span', 'moment-result-snippet', site.snippet));
      item.addEventListener('click', () => openSite(site));
      return item;
    }
    let searchBtn = null;
    function search() {
      if (searchBtn) searchBtn.disabled = true;
      if (!done) {
        done = true; state.flags.G3_SEARCHED = true; unlock('ILY = I LOVE YOU');
        phoneFooter.hidden = false; searchScreen.classList.add('has-footer');
      }
      browserShow(resultsPage, RESULTS_URL, true);
    }
    if (node.type === 'search') {
      // 搜索弹窗：新款手机上的浏览器，首页搜索框里已填「ily」
      const screen = buildPhone('');
      searchScreen = screen;
      screen.classList.add('moment-screen-search');
      const browser = el('div', 'moment-browser');
      backBtn = button('\u2039', browserBack); backBtn.className = 'moment-browser-back'; backBtn.disabled = true;
      addrBox = el('div', 'moment-browser-address');
      urlText = el('span', 'moment-browser-url', HOME_URL);
      addrBox.append(el('span', 'moment-browser-lock'), urlText);
      const reload = button('\u21bb', () => browserShow(currentPage, currentUrl, false));
      reload.className = 'moment-browser-reload';
      browser.append(backBtn, addrBox, reload);
      const pages = el('div', 'moment-browser-pages');
      // 首页：搜索框（不点则 6 秒后自动展开结果）
      homePage = el('div', 'moment-page is-home');
      const logo = el('div', 'moment-home-logo');
      ['i', 'l', 'y'].forEach((char, index) => logo.append(el('span', 'moment-home-logo-char is-' + index, char)));
      logo.append(el('span', 'moment-home-logo-text', '搜索'));
      const bar = el('div', 'moment-search-bar');
      const query = el('input', 'moment-search-query');
      query.type = 'text'; query.value = 'ily'; query.readOnly = true; query.setAttribute('aria-label', '搜索词');
      searchBtn = button('搜索', search);
      bar.append(query, searchBtn);
      homePage.append(logo, bar, el('p', 'moment-home-hint', '点「搜索」开始检索'));
      // 结果页：多个网站，每条都能点开看具体内容
      resultsPage = el('div', 'moment-page is-results moment-search-results');
      const head = el('div', 'moment-results-head');
      head.append(el('span', 'moment-results-count', '约 1,240 条结果 · 用时 0.28 秒'), el('span', 'moment-results-tip', '点开标题看具体内容'));
      const list = el('div', 'moment-results-list');
      SEARCH_SITES.forEach((site, index) => list.append(resultEntry(site, index)));
      const related = el('div', 'moment-results-related');
      related.append(el('span', 'moment-related-label', '其他用户还搜索了'));
      [[0, 'ily 是什么意思？'], [4, 'ily 的意思与用法']].forEach(([index, text]) => {
        const chip = button(text, () => openSite(SEARCH_SITES[index]));
        chip.className = 'moment-results-chip';
        related.append(chip);
      });
      resultsPage.append(head, list, related);
      // 网站页：点链接后进入，正文在这里
      sitePage = el('div', 'moment-page is-site');
      siteArticle = el('article', 'moment-site-article');
      sitePage.append(siteArticle);
      pages.append(homePage, resultsPage, sitePage);
      // 底部「继续」：搜索出现过之后才出现（与旧版行为一致）
      phoneFooter = el('div', 'moment-phone-footer');
      phoneFooter.hidden = true;
      phoneFooter.append(button('继续', () => go(node.next)));
      screen.append(browser, pages, phoneFooter);
      browserShow(homePage, HOME_URL, false);
    }
    function fracture(timeout) {
      if (done) return; done = true; finishedAt = elapsed; state.flags.CRACK_CLICKS = clicks; state.flags.CRACK_TIMEOUT = timeout;
      // 收束帧：全屏纯图《ILY_无水印_1922x1080》（蓝底故障 ILY），不再显示文字
      const img = el('img', 'fracture-final-img');
      img.src = assets.image('ILY_无水印_1922x1080.png');
      img.alt = 'ILY';
      panel.replaceChildren(img);
    }
    // 终章 S02-X「崩坏」：初始 3 个「我喜欢你」居中三排摆放（模拟选项），
    // 每点一次 ×3 增殖（3→9→27→81→243），第 4 次点完铺满全屏，
    // 停顿一拍让画面定格，随后收束成 ILY 进入 boss 战（fin_s03）。
    // 铺满一代用「分层网格 + 抖动」：格子取按钮的 60%（相邻重叠四成、无死缝），
    // 抖动/旋转幅度收在覆盖余量内 → 任意分辨率下都盖满整个舞台（1922×1080 全覆盖）。
    const FILL_CLICKS = 4, FILL_HOLD = 650, FAILSAFE = 20;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    function place(b, i, W, H, bw, bh, fill, cols, rows) {
      let x, y;
      if (i < 3) { x = (W - bw) / 2; y = H * (0.26 + 0.24 * i) - bh / 2; b.style.transform = 'none'; }
      else if (fill) {
        const cell = (i - 3) % (cols * rows), col = cell % cols, row = Math.floor(cell / cols);
        const cx = (col + 0.5) * W / cols, cy = (row + 0.5) * H / rows;
        // 允许越出面板 30%：飞溅图实心区只占按钮中间 ~50%，四周是淡出透明边，
        // 必须让透明边挂到屏幕外裁掉、实心区压满边缘（overflow:hidden 兜底）
        x = clamp(cx - bw / 2 + (Math.random() - .5) * (bw - W / cols) * .9, -bw * .3, W - bw * .7);
        y = clamp(cy - bh / 2 + (Math.random() - .5) * (bh - H / rows) * .9, -bh * .3, H - bh * .7);
        // 最外圈格子再强制偏置：保证实心区越过屏幕边缘，边缘不留淡出黑缝
        if (col === 0) x = Math.min(x, -bw * .26);
        if (col === cols - 1) x = Math.max(x, W - bw * .74);
        if (row === 0) y = Math.min(y, -bh * .26);
        if (row === rows - 1) y = Math.max(y, H - bh * .74);
        b.style.transform = `rotate(${(Math.random() * 3 - 1.5).toFixed(1)}deg)`;
      }
      else {
        x = Math.random() * (W - bw); y = Math.random() * (H - bh);
        b.style.transform = `rotate(${(Math.random() * 6 - 3).toFixed(1)}deg)`;
      }
      b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.width = bw + 'px'; b.style.height = bh + 'px';
    }
    function populate() {
      panel.replaceChildren();
      const W = panel.clientWidth || 1922, H = panel.clientHeight || 1080;
      const bw = Math.max(180, Math.min(800, W * 0.4)), bh = bw / 3;
      const fill = clicks >= FILL_CLICKS;
      const cols = Math.ceil(W / (bw * 0.45)), rows = Math.ceil(H / (bh * 0.45));
      for (let i = 0; i < count; i++) {
        const b = button('我喜欢你', () => { if (blocked() || done) return; lastInteract = elapsed; autoStarted = false; lastAutoAt = elapsed; clicks++; count *= 3; populate(); if (clicks >= FILL_CLICKS) setTimeout(() => fracture(false), FILL_HOLD); });
        b.classList.add('fracture-choice');
        place(b, i, W, H, bw, bh, fill, cols, rows); panel.append(b);
      }
    }
    if (node.type === 'fracture') populate();
    function tick(now) {
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      if (!blocked()) {
        elapsed += dt;
        if (node.type === 'search' && elapsed >= 6 && !done) search();
        if (node.type === 'fracture') {
          if (!done) {
            /* 5 秒无点击 → 自动开始扩散：每 0.45s 补一次「×3」步进直到铺满；
               手动点击会重置闲置窗口（lastInteract），铺满后交给 FILL_HOLD 收束。 */
            if (!autoStarted && elapsed - lastInteract >= 5) autoStarted = true;
            if (autoStarted && clicks < FILL_CLICKS && elapsed - lastAutoAt >= 0.45) {
              lastAutoAt = elapsed;
              clicks++; count *= 3; populate();
              if (clicks >= FILL_CLICKS) fillHoldTimer = setTimeout(() => fracture(true), FILL_HOLD);
            }
            if (elapsed >= FAILSAFE) fracture(true);
          }
          if (done && elapsed - finishedAt >= .5) { go(node.next); return; }
        }
      }
      frame = requestAnimationFrame(tick);
    }
    if (node.type !== 'letter') frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); clearTimeout(fillHoldTimer); };
  }
  ILY.mountChapterMoment = mountChapterMoment;

  // A single image slot prevents overlapping battery states, including on slow loads.
  function mountBatteryMontage({ stage, node, assets, go }) {
    const panel = el('section', 'battery-montage');
    panel.setAttribute('aria-label', '八月，手机电量逐渐耗尽');
    const image = el('img', 'battery-montage-image');
    image.draggable = false;
    image.hidden = true;
    panel.append(image);
    stage.append(panel);
    const frames = node.frames || [];
    const phases = [-1];
    frames.forEach((entry, index) => phases.push(index, -1));
    let phase = 0, disposed = false;
    const preload = frames.map((entry, index) => {
      const img = new Image();
      const ready = () => {
        if (!disposed && phases[phase] === index) show();
      };
      img.onload = ready;
      img.onerror = ready; // A missing asset must never trap story progression.
      img.src = assets.image(entry.image);
      return img;
    });
    const blocked = () => document.hidden || !!document.querySelector('dialog[open]');
    function show() {
      const index = phases[phase];
      image.hidden = true;
      if (index < 0) return;
      image.alt = frames[index].label;
      image.src = preload[index].src;
      image.hidden = !preload[index].naturalWidth;
    }
    function advance() {
      if (disposed || blocked()) return;
      phase++;
      if (phase >= phases.length) {
        disposed = true;
        go(node.next);
        return;
      }
      show();
    }
    const click = event => {
      event.preventDefault();
      advance();
    };
    const key = event => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.target.closest('button, a, input, textarea, select')) return;
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        advance();
      }
    };
    stage.tabIndex = -1;
    stage.focus({ preventScroll: true });
    panel.addEventListener('click', click);
    window.addEventListener('keydown', key);
    return () => {
      disposed = true;
      panel.removeEventListener('click', click);
      window.removeEventListener('keydown', key);
      preload.forEach(img => { img.onload = img.onerror = null; });
    };
  }
  ILY.mountBatteryMontage = mountBatteryMontage;
})();
