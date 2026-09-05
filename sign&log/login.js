/* ============================================================
 * login.js —— 登录 / 注册页脚本
 *
 * 六大功能块：
 *   1. 多语言（中 / 英切换）
 *   2. 登录 / 注册表单切换
 *   3. 自定义提示框（替代浏览器原生 alert）
 *   4. 密码强度检测 + 4 格强度条
 *   5. 登录 / 注册逻辑（账号存到浏览器 localStorage）
 *   6. 登录成功后的开场视频 + 跳转下一页
 * ============================================================ */


/* ============================================================
 * 第 1 块：多语言
 *
 * 原理（Minecraft 风格）：
 *   页面里所有要显示的文字都不直接写死，而是给一个 key（比如 "login.title"），
 *   然后在下面的语言表里查"当前语言下这个 key 对应什么文字"。
 *   切换语言 = 换一张表重新查一遍，页面文字就全变了。
 * ============================================================ */

/* 语言表：chinese 存中文，english 存英文。
 * 两份表的 key 必须一模一样，只是值（文字）不同。
 * 想加新文案时，两边都要加同一个 key。 */
const LANG = {
  chinese: {
    "page.title":          "登录 / 注册",
    "login.title":         "登录",
    "login.button":        "登录",
    "login.toSignup":      "注册",
    "signup.title":        "注册",
    "signup.button":       "注册",
    "signup.toLogin":      "登录",
    "field.username":      "用户名",
    "field.password":      "密码",
    "field.passwordCheck": "确认密码",
    "tip.title":           "Tip",
    "tip.base":            "必须包含数字和字母且密码长度大于6",
    "tip.atLeastOne":      "以下规则至少满足一条",
    "tip.rule1":           "同时包含大小写字母",
    "tip.rule2":           "包含特殊符号",
    "tip.rule3":           "密码长度大于10",
    /* 密码强度文字 */
    "strength.invalid":    "无效",
    "strength.weak":       "弱",
    "strength.medium":     "中",
    "strength.strong":     "强",
    "strength.veryStrong": "很强",
    /* 提示框文案 */
    "alert.noUser":        "用户名不存在。",
    "alert.wrongPwd":      "密码错误。",
    "alert.loginOk":       "登录成功！",
    "alert.userExists":    "用户名已存在。",
    "alert.emptyUser":     "请输入用户名。",
    "alert.pwdTooWeak":    "密码不符合要求，请参照下方规则。",
    "alert.pwdNotSame":    "两次密码输入不相等。",
    "alert.signupOk":      "注册成功！请登录。",
    /* 开场视频 */
    "video.skip":          "跳过 ▶"
  },
  english: {
    "page.title":          "Login / Sign up",
    "login.title":         "Login",
    "login.button":        "Login",
    "login.toSignup":      "Sign up",
    "signup.title":        "Sign up",
    "signup.button":       "Sign up",
    "signup.toLogin":      "Login",
    "field.username":      "Username",
    "field.password":      "Password",
    "field.passwordCheck": "Confirm password",
    "tip.title":           "Tip",
    "tip.base":            "Must contain letters and digits, length > 6",
    "tip.atLeastOne":      "Meet at least ONE of the following",
    "tip.rule1":           "Both UPPER and lower case letters",
    "tip.rule2":           "Contains special symbols",
    "tip.rule3":           "Length > 10",
    "strength.invalid":    "Invalid",
    "strength.weak":       "Weak",
    "strength.medium":     "Medium",
    "strength.strong":     "Strong",
    "strength.veryStrong": "Very strong",
    "alert.noUser":        "Username does not exist.",
    "alert.wrongPwd":      "Wrong password.",
    "alert.loginOk":       "Login successful!",
    "alert.userExists":    "Username already taken.",
    "alert.emptyUser":     "Please enter a username.",
    "alert.pwdTooWeak":    "Password does not meet the rules below.",
    "alert.pwdNotSame":    "Passwords do not match.",
    "alert.signupOk":      "Sign up successful! Please login."
  }
};

/* 当前使用的语言，默认中文 */
let currentLang = 'chinese';

/* t(key)：查当前语言下 key 对应的文字。
 * 如果找不到这个 key，就原样返回 key 本身——这样页面上会直接露出 key 名，
 * 方便发现"哪里漏翻译了"。 */
function t(key) {
  return LANG[currentLang][key] || key;
}

/* applyDomLang()：扫描整个页面，把所有带 i18n 标记的元素文字换成当前语言。
 * 两种标记：
 *   data-i18n="key"              → 替换元素的内部文字（textContent）
 *   data-i18n-attr="属性:key"     → 替换元素的某个属性（比如 placeholder） */
function applyDomLang() {
  /* 处理 data-i18n：改元素内部文字（标题、按钮、列表项等） */
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  /* 处理 data-i18n-attr：改元素属性（输入框的 placeholder 提示） */
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    el.getAttribute('data-i18n-attr').split(',').forEach(pair => {
      const [attr, key] = pair.split(':');        /* 把 "placeholder:field.username" 拆开 */
      if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
    });
  });
  /* 顺便更新 <html lang> 属性，对搜索引擎和屏幕阅读器更友好 */
  document.documentElement.lang = (currentLang === 'chinese') ? 'zh-CN' : 'en';
}

/* setLang(name)：切换到指定语言，并把选择存进 localStorage（下次打开还记得） */
function setLang(name) {
  currentLang = name;
  localStorage.setItem('mygame-lang', name);   /* 记住用户选了哪种语言 */
  applyDomLang();                              /* 立刻刷新整页文字 */
  /* 语言按钮本身显示"对方语言"：当前中文显示 EN，当前英文显示 中文 */
  document.getElementById('langBtn').textContent =
    (name === 'chinese') ? 'EN' : '中文';
  /* 如果注册表单的强度条正在显示文字，也要用新语言刷新一遍 */
  const pwdInput = document.getElementById('signup-password');
  if (pwdInput && pwdInput.value) checkPasswordStrength(pwdInput.value);
}

/* 页面加载完后执行：读出上次选的语言并应用，再给切换按钮绑定点击事件 */
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('mygame-lang') || 'chinese';  /* 没存过就用默认中文 */
  setLang(saved);

  /* 点一下语言按钮：中 → 英 → 中 → 英 循环切换 */
  document.getElementById('langBtn').addEventListener('click', () => {
    setLang(currentLang === 'chinese' ? 'english' : 'chinese');
  });
});


/* ============================================================
 * 第 2 块：登录 / 注册表单切换
 * 原理：两个表单一开始都在 HTML 里，靠 hidden 类控制谁显示谁隐藏。
 * ============================================================ */

/* 显示登录表单，隐藏注册表单 */
function showLogin() {
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('signupForm').classList.add('hidden');
}

/* 显示注册表单，隐藏登录表单 */
function showSignup() {
  document.getElementById('signupForm').classList.remove('hidden');
  document.getElementById('loginForm').classList.add('hidden');
}


/* ============================================================
 * 第 3 块：自定义提示框
 * 浏览器原生 alert() 会冻结整个页面，样式也丑。
 * 这里用一个 div 代替：红色=错误，绿色=成功，3 秒后自动消失。
 * ============================================================ */

/* 记录"自动隐藏提示框"的定时器，方便连续提示时取消上一个 */
let alertTimer = null;

/* showAlert(message, isSuccess)
 *   message   —— 要显示的提示文字
 *   isSuccess —— true 显示绿色（成功）；false/省略 显示红色（失败） */
function showAlert(message, isSuccess = false) {
  /* 找到当前正在显示的那个表单（登录或注册），提示框要出现在它里面 */
  const form = document.getElementById('loginForm').classList.contains('hidden')
    ? document.getElementById('signupForm')
    : document.getElementById('loginForm');
  const alertBox = form.querySelector('.custom-alert');

  /* 写入提示文字并显示出来 */
  alertBox.querySelector('.message').textContent = message;
  alertBox.classList.remove('hidden');
  alertBox.classList.toggle('success', isSuccess);   /* true 就加绿色样式，false 就移除 */

  /* 3 秒后自动隐藏。如果上一个提示的定时器还在，先取消掉，
     否则新提示会被旧定时器提前关掉 */
  if (alertTimer) clearTimeout(alertTimer);
  alertTimer = setTimeout(() => alertBox.classList.add('hidden'), 3000);
}


/* ============================================================
 * 第 4 块：密码强度检测 + 4 格强度条
 *
 * 规则（和页面上 tips 块写的一致）：
 *   【基础条件】必须全部满足，否则"无效"：
 *     ① 至少含一个字母   ② 至少含一个数字   ③ 长度 > 6
 *   【高级规则】每多满足一条，强度 +1 格：
 *     A. 同时包含大小写字母
 *     B. 包含特殊符号
 *     C. 长度 > 10
 *
 *   强度格数 = 1（基础过） + 满足的高级规则条数 → 共 1~4 格
 *   注册要求：基础过 且 高级至少 1 条（也就是至少 2 格）
 * ============================================================ */

/* checkPasswordStrength(pwd)：用户每敲一个字符就被调用一次（oninput 触发），
 * 实时刷新强度文字和 4 个格子的颜色。 */
function checkPasswordStrength(pwd) {
  /* ----- 逐条规则判定：用正则表达式检测密码里有没有某类字符 ----- */
  const hasLetter  = /[a-zA-Z]/.test(pwd);      /* 含字母（大小写都行） */
  const hasDigit   = /\d/.test(pwd);            /* 含数字 */
  const hasLower   = /[a-z]/.test(pwd);         /* 含小写字母 */
  const hasUpper   = /[A-Z]/.test(pwd);         /* 含大写字母 */
  const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);  /* 含特殊符号（不是字母也不是数字的字符） */

  /* ----- 基础条件：三条必须全过 ----- */
  const baseOK = hasLetter && hasDigit && pwd.length > 6;

  /* ----- 高级规则：数数满足了几条（0~3 条） ----- */
  let advancedCount = 0;
  if (hasLower && hasUpper) advancedCount++;    /* 规则 A：大小写都有 */
  if (hasSpecial) advancedCount++;              /* 规则 B：有特殊符号 */
  if (pwd.length > 10) advancedCount++;         /* 规则 C：长度超 10 */

  /* ----- 算出"点亮几格"和"显示什么强度文字" ----- */
  let score;        /* 0~4：要点亮的格子数 */
  let textKey;      /* 强度文字在语言表里的 key */
  if (!baseOK) {
    score = 0;                          /* 基础没过 → 0 格，显示"无效" */
    textKey = 'strength.invalid';
  } else {
    score = 1 + advancedCount;          /* 基础过 = 1 格，每条高级规则再 +1 格 */
    if (score === 1)      textKey = 'strength.weak';
    else if (score === 2) textKey = 'strength.medium';
    else if (score === 3) textKey = 'strength.strong';
    else                  textKey = 'strength.veryStrong';
  }

  /* ----- 把结果显示到页面上 ----- */
  /* 1) 强度文字：输入框空了就不显示，避免空着也写个"无效" */
  document.getElementById('strength-text').textContent =
    pwd.length === 0 ? '' : t(textKey);

  /* 2) 4 个格子：点亮前 score 个，颜色跟随当前总强度等级 */
  for (let i = 0; i < 4; i++) {
    const cell = document.getElementById('cell' + i);
    cell.classList.remove('lv1', 'lv2', 'lv3', 'lv4');  /* 先清掉旧颜色 */
    if (i < score) {
      cell.classList.add('lv' + score);  /* 点亮的格子统一用当前强度对应的颜色 */
    }
  }
}

/* isPasswordValid(pwd)：注册时调用，判断密码是否满足注册要求。
 * 返回 true = 可以注册；false = 不符合规则。 */
function isPasswordValid(pwd) {
  /* 和上面相同的正则判定 */
  const hasLetter  = /[a-zA-Z]/.test(pwd);
  const hasDigit   = /\d/.test(pwd);
  const hasLower   = /[a-z]/.test(pwd);
  const hasUpper   = /[A-Z]/.test(pwd);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

  /* 基础条件必须全过 */
  const baseOK = hasLetter && hasDigit && pwd.length > 6;
  if (!baseOK) return false;

  /* 三条高级规则至少满足一条 */
  const advancedOK = (hasLower && hasUpper) || hasSpecial || (pwd.length > 10);
  return advancedOK;
}


/* ============================================================
 * 第 5 块：登录 / 注册逻辑
 *
 * 数据存哪？直接用浏览器自带的 localStorage（关掉浏览器也不会丢）：
 *   key   = 'mygame-user-' + 用户名
 *   value = 密码
 *
 * ⚠️ 注意：密码是明文存的，只适合课程 demo。
 *    真实项目必须加密（至少 btoa 混淆，正经项目要后端 + 哈希）。
 * ============================================================ */

/* login()：点"登录"按钮时调用 */
function login() {
  /* 读输入框的值；trim() 去掉用户名首尾的空格 */
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  /* 按用户名去 localStorage 查密码；查不到会返回 null */
  const stored = localStorage.getItem('mygame-user-' + username);

  if (stored === null) {
    showAlert(t('alert.noUser'));                    /* 没这个用户 */
  } else if (stored === password) {
    showAlert(t('alert.loginOk'), true);             /* 密码对上了，绿色提示 */
    localStorage.setItem('mygame-token', username);  /* 记下"谁登录了"（下一个页面可以读它做鉴权） */
    /* 登录成功 → 播放开场视频 → 播完自动跳转下一页（见第 6 块）。
       延迟 0.5 秒再播，让用户先看到"登录成功"的绿色提示 */
    setTimeout(playIntroThenGo, 500);
  } else {
    showAlert(t('alert.wrongPwd'));                  /* 密码不对 */
  }
}

/* signup()：点"注册"按钮时调用 */
function signup() {
  const username   = document.getElementById('signup-username').value.trim();
  const password   = document.getElementById('signup-password').value;
  const passwordCk = document.getElementById('signup-password-check').value;

  /* 按顺序逐条校验，任何一条不过就提示并终止（return） */
  if (username === '') {
    showAlert(t('alert.emptyUser')); return;
  }
  if (localStorage.getItem('mygame-user-' + username) !== null) {
    showAlert(t('alert.userExists')); return;        /* 这个用户名已经被注册了 */
  }
  if (!isPasswordValid(password)) {
    showAlert(t('alert.pwdTooWeak')); return;        /* 密码不符合规则 */
  }
  if (password !== passwordCk) {
    showAlert(t('alert.pwdNotSame')); return;        /* 两次输入的密码不一致 */
  }

  /* 全部通过：写入 localStorage，完成注册 */
  localStorage.setItem('mygame-user-' + username, password);
  showAlert(t('alert.signupOk'), true);

  /* 注册成功 → 自动跳回登录界面：
     1) 把刚注册的账号密码填进登录框，用户直接点"登录"就行，不用再手敲一遍；
     2) 清空注册表单（下次再点"注册"打开时是干净的）；
     3) 重置密码强度条（文字清空、4 个格子熄灭）；
     4) 延迟 0.8 秒再切换表单，让用户先看清"注册成功"提示 */
  document.getElementById('login-username').value = username;
  document.getElementById('login-password').value = password;
  document.getElementById('signup-username').value = '';
  document.getElementById('signup-password').value = '';
  document.getElementById('signup-password-check').value = '';
  checkPasswordStrength('');            /* 传空字符串 = 熄灭所有格子、清空强度文字 */
  setTimeout(showLogin, 800);
}


/* ============================================================
 * 第 6 块：登录成功后的开场视频 + 跳转下一页
 *
 * 完整流程：
 *   登录验证通过
 *     → 显示全屏视频层，播放 intro.mp4（人物发光扩散到全白）
 *     → 两种结局殊途同归，都走 goNextPage()：
 *         ① 视频自然播完（video 的 ended 事件）
 *         ② 用户点击右下角"跳过"按钮
 *     → goNextPage()：白屏过渡层淡入（0.6 秒）→ 跳转到 index.html
 *     → index.html 打开时也从全白淡入画面，和视频结尾的白色无缝衔接
 * ============================================================ */

/* 跳转目标页：登录成功、视频播完后要去哪个页面，改这一行就行 */
const NEXT_PAGE = './index.html';

/* 守卫标记：防止"播完自动跳"和"点跳过跳"同时触发，导致跳两次 */
let introJumped = false;

/* playIntroThenGo()：登录成功后调用，显示视频层并播放 */
function playIntroThenGo() {
  const overlay = document.getElementById('videoOverlay');
  const video   = document.getElementById('introVideo');

  overlay.classList.remove('hidden');   /* 去掉 hidden，视频层盖住整个页面 */
  video.currentTime = 0;                /* 保险起见从头播（防止重复登录时接着上次进度） */

  /* 监听"播放结束"事件：视频自然播完时自动跳转（once:true 表示只触发一次） */
  video.addEventListener('ended', goNextPage, { once: true });

  /* play() 返回一个 Promise：如果浏览器因为某些原因拒绝播放（比如视频文件丢了），
     .catch 会捕获失败，直接跳转下一页，不让用户卡在黑屏上 */
  video.play().catch(goNextPage);
}

/* goNextPage()：白屏淡入后跳转到下一页。
 * 视频播完（ended）和点"跳过"按钮都会调到这里。 */
function goNextPage() {
  if (introJumped) return;      /* 已经在跳转了，直接忽略重复触发 */
  introJumped = true;

  document.getElementById('introVideo').pause();               /* 停掉视频（跳过时视频可能还在播） */
  document.getElementById('whiteFade').classList.add('show');  /* 白屏 0.6 秒淡入 */

  /* 等白屏完全盖上来之后再跳页，视觉上是"白色 → 白色"，没有跳变 */
  setTimeout(() => {
    window.location.href = NEXT_PAGE;
  }, 600);
}
