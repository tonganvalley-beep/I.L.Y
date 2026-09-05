// 《I.L.Y.》序章 · 节点图（可执行剧本 v1.2）
// 类型：dialogue / choice / phone / walk / finale / branch
// 资源 id 全部占位，真实美术请见「美术素材清单」。
ILY.data.stories.prologue = {
  id: "prologue",
  title: "序章 · 蓝色来电",
  start: "s01_intro",
  nodes: {
    // ===== 场景01 出租屋 黄昏 =====
    s01_intro:  { type:"dialogue", speaker:"旁白", background:"bg-apartment-dusk",
      text:"都内某处老旧公寓的一间出租屋。窗帘未拉严，橘灰色夕阳从缝隙切入，照亮缓慢浮动的灰尘。六叠大的房间里，床垫直接铺在地上；墙角堆着没拆封的便利店饭团与叠到第三层的工作制服；墙面发霉的水痕像年轮。",
      next:"s01_intro2" },
    s01_intro2: { type:"dialogue", speaker:"成田基生", portrait:"portrait-kio", background:"bg-apartment-dusk",
      text:"（麻木，呼吸很浅）……又到傍晚了啊。", next:"s01_intro3" },
    s01_intro3: { type:"dialogue", speaker:"系统", background:"bg-apartment-dusk",
      text:"（电子音，按键提示）滴——已保存的邮件。发件人：百合沢 爱理。时间：2009年，夏。", next:"s01_phone" },
    s01_phone:  { type:"phone", phone:{
        tab:"mail", lockClose:true,
        mails:["A01","A02","A03"],
        reveal:{ after:["A01","A02","A03"], id:"A04" },
        exitNext:"s01_photo" } },
    s01_photo:  { type:"dialogue", speaker:"成田基生", portrait:"photo-seaside", background:"bg-apartment-dusk",
      text:"（盯着最后一封，声音很低）爱理……", next:"s02a" },

    // ===== 场景02 主管来电 =====
    s02a: { type:"dialogue", speaker:"旁白", background:"bg-apartment-dusk",
      text:"手机突然震动，屏幕跳出主管来电。老旧单调和弦响起，和刚才安静的文字界面格格不入，基生肩膀轻轻一抖。", next:"s02b" },
    s02b: { type:"dialogue", speaker:"主管", background:"bg-apartment-dusk",
      text:"（电话音，压着火气）啊——终于打通了。成田、你今天有排班的，你记得吗？你已经迟到好久了、又睡过头了吗？", next:"s02c" },
    s02c: { type:"dialogue", speaker:"主管", background:"bg-apartment-dusk",
      text:"不是你道歉也没用啊。现在人手不足，你要是不能马上来，我们很困扰的啊。你知道你现在给其他员工添了很多麻烦吗？", next:"s02d" },
    s02d: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-dusk",
      text:"（沉默）……", next:"s02e" },
    s02e: { type:"dialogue", speaker:"主管", background:"bg-apartment-dusk",
      text:"（电话音）……请问、你在听吗？你都已经28了，已经不是学生了吧，不能再这样任意妄为了。下次再这样，我们真的要辞退你了。", next:"s02f" },
    s02f: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-dusk",
      text:"（突然决定）……我、今天就辞职。", next:"s02g" },
    s02g: { type:"dialogue", speaker:"旁白", background:"bg-apartment-dusk",
      text:"基生按下挂机键，忙音只响半声便被掐断。手机屏幕特写：2020/07/22 18:57。绿光映在基生脸上，他一动不动，仿佛时间没有走过。", next:"s03a" },

    // ===== 场景03 回忆 灰色的十年 =====
    s03a: { type:"dialogue", speaker:"成田基生（独白）", background:"bg-university",
      text:"十年前、高中毕业之后，我去了附近的大学。我没什么想做的事情，也无法融入他人之中。大二开始，我就没再去学校，然后直接退学了。", next:"s03a2" },
    s03a2:{ type:"dialogue", speaker:"成田基生（独白）", background:"bg-university",
      text:"那之后我就一直四处打工，让自己起码不会饿死。如果呆不下去了，就辞职。一直重复着这样的生活。", next:"s03_phone" },
    s03_phone:{ type:"phone", phone:{
        tab:"contacts", lockClose:true, manualExit:true,
        contacts:["work"], tutorialDelete:true,
        mails:["F01"],                 // 自由探索：父亲邮件
        exitNext:"s04a" } },

    // ===== 场景04 深夜 通讯录与发送失败的邮件 =====
    s04a: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night",
      text:"（疲惫）……都删掉吧。", next:"s04_phone" },
    s04_phone:{ type:"phone", phone:{
        tab:"contacts", lockClose:true,
        contacts:["ando","mother","father","airi"],
        forcedDelete:["ando","mother","father"],
        requireDeleteCount:3,
        allowSend:true,               // 删完三人后进入发信 K01 → 退信 SYS01
        exitNext:"s05a" } },

    // ===== 场景05 翌日 错送的快递 =====
    s05a: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night",
      text:"（熟练，麻木）爱理，你还好吗？我是基生。虽然不知道爱理现在在哪里……", next:"s05b" },
    s05b: { type:"dialogue", speaker:"快递员", background:"bg-apartment-night",
      text:"（门外，礼貌而急促）您好——您有一个快递！", next:"s05c" },
    s05c: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night",
      text:"……203，马场先生？这是楼下的快递吧。……是送错了啊。", next:"s05d" },
    s05d: { type:"dialogue", speaker:"快递员", background:"bg-apartment-night",
      text:"（门外，带歉意）不好意思——！是楼下203室的，地址弄错了！我这边还有下一单，拜托您了！", next:"s05e" },
    s05e: { type:"dialogue", speaker:"旁白", portrait:"parcel-label", background:"bg-apartment-night",
      text:"快递单：203室 马场先生 · 生鲜 · 要冷藏。基生盯着这张不属于自己的快递单。", next:"s05f" },
    s05f: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night",
      text:"（关门，小声嘟囔）搞什么啊，这个快递员……", next:"s05g" },
    s05g: { type:"dialogue", speaker:"成田基生（独白）", background:"bg-apartment-night",
      text:"海浪的铃声，蓝色的光……那是只属于爱理的来电设置。", next:"s06a" },

    // ===== 场景06 爱理的回信 =====
    s06a: { type:"phone", phone:{
        tab:"mail", lockClose:true, scrollReveal:false,
        mails:["R01"], exitNext:"br01" } },
    br01: { type:"choice", speaker:"成田基生", background:"bg-apartment-night",
      text:"（BR 01）把手机……",
      choices:[
        { text:"A · 把手机扔进垃圾桶", next:"s06_throw" },
        { text:"B · 把手机塞进口袋，走出房门", next:"s07" }
      ] },
    s06_throw: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night",
      text:"（选择A后，自嘲，手发抖）……果然，做不到啊。", next:"s07" },

    // ===== 场景07 昏暗幽长的隧道 =====
    s07: { type:"walk", walk:{
        bg:"bg-tunnel", length:2400, exitX:2200, playerStartX:60, speed:170,
        hotspots:[
          { id:"vending", x:600,  label:"故障自动贩卖机", text:"（调查自动贩卖机）……还在放着十年前的广告啊。" },
          { id:"poster",  x:1200, label:"褪色海岸海报",   text:"（调查海岸海报）蓝天白沙，与隧道黑暗形成刺眼对比。" },
          { id:"crack",   x:1700, label:"隧道墙缝",       text:"（调查墙缝）……快到了。" }
        ],
        exitNext:"s08a" } },

    // ===== 场景08 无边的海岸 =====
    s08a: { type:"dialogue", speaker:"成田基生（独白）", background:"bg-coast-night",
      text:"……这里是，我和爱理，最后一次一起去玩的地方。爱理……让我再、最后看一次……", next:"s08b" },
    s08b: { type:"dialogue", speaker:"旁白", background:"bg-coast-night",
      text:"基生站在沙滩上，从口袋摸出手机，打开回信；镜头由远景缓慢推进至手机屏幕。", next:"s09" },

    // ===== 场景09 邮件的下面 =====
    s09: { type:"phone", phone:{
        tab:"mail", lockClose:true, scrollReveal:true,
        mails:["R01"], onReveal:"br02" } },
    br02: { type:"choice", speaker:"成田基生", background:"bg-coast-night",
      text:"（BR 02）屏幕底部出现蓝底白字链接 http://ily/kcta/ll/c... 你——",
      choices:[
        { text:"A · 按下链接", next:"s10a" },
        { text:"B · 合上手机，回家", next:"ne_ending" }
      ] },

    // ===== 场景10 链接 蓝光 =====
    s10a: { type:"dialogue", speaker:"旁白", background:"bg-coast-night",
      text:"按下链接瞬间，手机蓝光溢出边框，像水一样淌满整个画面。", next:"s10b" },
    s10b: { type:"dialogue", speaker:"成田基生", background:"bg-coast-night",
      text:"（生理性恶心，急促喘息）——！……这是什么……好恶心……", next:"s10c" },
    s10c: { type:"dialogue", speaker:"旁白", background:"bg-coast-blue",
      text:"基生俯身准备捡起手机时，面前世界照来一片蓝光。它不是月光，比月光更冷、更纯、更安静。海浪声停止，风停止，连基生自己的呼吸声也消失。", next:"s11a" },

    // ===== 场景11 十年前的她 =====
    s11a: { type:"dialogue", speaker:"成田基生", background:"bg-coast-blue",
      text:"（不可置信，声音卡在喉咙）……爱理……？", next:"s11b" },
    s11b: { type:"dialogue", speaker:"成田基生（独白）", background:"bg-coast-blue",
      text:"怎么可能……爱理……为什么？这不可能……爱理？不可能会是她……这不可能……不可能……因为、因为爱理她——和我一样大啊。", next:"s11c" },
    s11c: { type:"dialogue", speaker:"旁白", background:"bg-room-white",
      text:"（黑屏白字）十年后的爱理，本该和他一样28岁了。可是眼前的少女，还穿着那身校服。", next:"s11d" },
    s11d: { type:"dialogue", speaker:"百合沢爱理", portrait:"portrait-airi", background:"bg-coast-blue",
      text:"（轻快，温柔，尾音上扬，与记忆分毫不差）最喜欢你了，基生。", next:"s11e" },
    s11e: { type:"dialogue", speaker:"字幕", background:"bg-coast-blue",
      text:"——在那里我遇到的，是十年前的那个她。", next:"finale" },

    // ===== 终幕 / 分支结局 =====
    finale: { type:"finale", title:"I.L.Y.", subtitle:"——在那里我遇到的，是十年前的那个她。",
      text:"序章主线结束。蓝光涨满全屏，标题 I.L.Y. 浮现，三个字母像被海水冲刷过的沙字。",
      enter:(state, notify) => {
        state.flags.FLAG_BLUE_CALL = "unlocked";
        if (!state.flags.achievements.includes("last-beach")) { state.flags.achievements.push("last-beach"); notify("成就解锁：最后一次海边"); }
      } },
    ne_ending: { type:"branch", title:"门内的回信", subtitle:"路线偏向怀疑与调查。",
      text:"有些故事，还没有开始就结束了。……真的，结束了吗？回房后那封邮件再未出现，海浪铃声也未再响。",
      enter:(state, notify) => {
        // FLAG BLUE CALL 保持未解锁
        if (!state.flags.achievements.includes("door-letter")) { state.flags.achievements.push("door-letter"); notify("成就解锁：门内的回信"); }
      } }
  }
};
