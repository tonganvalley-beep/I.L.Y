// 《I.L.Y.》序章 · 节点图（可执行剧本 v1.2）
// 类型：dialogue / choice / phone / walk / finale / branch
// 已有正式图片直接使用；缺少的图片由资源清单提供对应类型的占位图。
ILY.data.stories.prologue = {
  id: "prologue",
  title: "序章 · 蓝色来电",
  start: "s01_intro",
  nodes: {
    // ===== 场景01 出租屋 黄昏 =====
    s01_intro: { type:"dialogue", speaker:"旁白", background:"bg-apartment-dusk",
      text:"都内某处老旧公寓的一间出租屋。窗帘未拉严，橘灰色夕阳从缝隙切入，照亮缓慢浮动的灰尘。六叠大的房间里，床垫直接铺在地上；墙角堆着没拆封的便利店饭团与叠到第三层的工作制服；墙面发霉的水痕像年轮。", next:"s01_intro2" },
    s01_intro2: { type:"dialogue", speaker:"成田基生", portrait:"portrait-kio", background:"bg-apartment-dusk",
      text:"（麻木，呼吸很浅）……又到傍晚了啊。", next:"s01_intro3" },
    s01_intro3: { type:"dialogue", speaker:"系统", background:"bg-apartment-dusk",
      text:"一部十年前购买的翻盖手机摊开在床头。转轴缠着透明胶带，外壳布满划痕。滴——已保存的邮件。发件人：百合沢 爱理。时间：2009年，夏。", next:"s01_phone" },
    s01_phone: { type:"phone", background:"bg-apartment-dusk", phone:{
      tab:"mail", lockClose:true, mails:["A01","A02","A03"],
      reveal:{ after:["A01","A02","A03"], id:"A04" }, exitNext:"s01_photo"
    } },
    s01_photo: { type:"dialogue", speaker:"成田基生", overlay:"photo-seaside", background:"bg-apartment-dusk",
      text:"最后一封邮件附着一张2009年的海边合影。爱理坐在沙滩上比着不熟练的剪刀手，少年基生表情僵硬，耳朵却是红的。（盯着最后一封，声音很低）爱理……", next:"s02a" },

    // ===== 场景02 主管来电 =====
    s02a: { type:"dialogue", speaker:"旁白", background:"bg-apartment-dusk",
      text:"手机突然震动，屏幕跳出主管来电。老旧单调和弦响起，和刚才安静的文字界面格格不入，基生肩膀轻轻一抖。", next:"s02a2" },
    s02a2: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-dusk", text:"（沉默了一下）……你好。", next:"s02b" },
    s02b: { type:"dialogue", speaker:"主管", background:"bg-apartment-dusk",
      text:"（电话音，压着火气）啊——终于打通了。成田、你今天有排班的，你记得吗？你已经迟到好久了、又睡过头了吗？", next:"s02b2" },
    s02b2: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-dusk", text:"（迟钝，望着天花板）啊、是的……非常抱歉。", next:"s02c" },
    s02c: { type:"dialogue", speaker:"主管", background:"bg-apartment-dusk",
      text:"（电话音，不耐烦，语速加快）不是你道歉也没用啊。现在人手不足，你要是不能马上来，我们很困扰的啊。你知道你现在给其他员工添了很多麻烦吗？", next:"s02d" },
    s02d: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-dusk", text:"（沉默）……", next:"s02e" },
    s02e: { type:"dialogue", speaker:"主管", background:"bg-apartment-dusk",
      text:"（电话音）……请问、你在听吗？你都已经28了，已经不是学生了吧，不能再这样任意妄为了。下次再这样，我们真的要辞退你了。", next:"s02f" },
    s02f: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-dusk", text:"（突然决定）……我、今天就辞职。", next:"s02f2" },
    s02f2: { type:"dialogue", speaker:"主管", background:"bg-apartment-dusk", text:"（错愕，提高音量）哈？等下——", next:"s02g" },
    s02g: { type:"dialogue", speaker:"旁白", background:"bg-apartment-dusk",
      text:"基生按下挂机键，忙音只响半声便被掐断。房间里重新只剩老旧风扇的声音——叶片每转一圈，发出“咔”的一声轻响。", next:"s02h" },
    s02h: { type:"dialogue", speaker:"成田基生", portrait:"portrait-kio", background:"bg-apartment-dusk", text:"（自言自语，轻微颤抖）“都已经28了”啊……", next:"s02i" },
    s02i: { type:"dialogue", speaker:"旁白", background:"bg-apartment-dusk",
      text:"手机待机画面显示2020/07/22 18:57。绿光映在基生脸上，他一动不动地看着那串数字，仿佛时间从刚才起就没有走过。", next:"s03a" },

    // ===== 场景03 回忆 灰色的十年 =====
    s03a: { type:"dialogue", speaker:"成田基生（独白）", background:"bg-university",
      text:"十年前、高中毕业之后，我去了附近的大学。我没什么想做的事情，也无法融入他人之中。大二开始，我就没再去学校，然后直接退学了。", next:"s03a2" },
    s03a2: { type:"dialogue", speaker:"成田基生（独白）", background:"bg-university",
      text:"那之后我就一直四处打工，让自己起码不会饿死。如果呆不下去了，就辞职。一直重复着这样的生活。", next:"s03_phone" },
    s03_phone: { type:"phone", background:"bg-university", phone:{
      tab:"contacts", lockClose:true, manualExit:true, contacts:["work"], tutorialDelete:true,
      mails:["F01"], exitNext:"s03_family"
    } },
    s03_family: { type:"dialogue", speaker:"成田基生（独白）", background:"bg-apartment-dusk",
      text:"对我来说早已不存在什么能称之为朋友的人了。连家人也早就……进了大学以后，爸爸和妈妈再也没有联系过我。", next:"s03_bankbook" },
    s03_bankbook: { type:"dialogue", speaker:"旁白", background:"bg-apartment-dusk",
      text:"一本银行存折上，大学入学后每月固定入账60,000日元，备注栏一片空白。", next:"s03_family2" },
    s03_family2: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-dusk",
      text:"（冷静得近乎异常）只剩下每个月若无其事汇入我账户的6万日元。", next:"s04a" },

    // ===== 场景04 深夜 通讯录与发送失败的邮件 =====
    s04a: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night", text:"（疲惫）……都删掉吧。", next:"s04_phone" },
    s04_phone: { type:"phone", background:"bg-apartment-night", phone:{
      tab:"contacts", lockClose:true, contacts:["ando","mother","father","airi"],
      forcedDelete:["ando","mother","father"], lockDeleteCancel:["ando"], requireDeleteCount:3,
      allowSend:true, exitNext:"s04_sent"
    } },
    s04_sent: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night",
      text:"（早已习惯，平静得可怕）……嗯。今天也是，发送失败。", next:"s04_cycle1" },
    s04_cycle1: { type:"dialogue", speaker:"成田基生（独白）", background:"bg-apartment-night",
      text:"高中毕业以后，我就再也没能和她联系上。不知道从什么时候开始，我每天都会给爱理发这些无法发送成功的邮件。甚至每天，我都会等系统提示我发送失败。就这样，一遍，又一遍。", next:"s04_cycle2" },
    s04_cycle2: { type:"dialogue", speaker:"成田基生（独白）", background:"bg-apartment-night",
      text:"一开始我还想，没准只是爱理没看到——她总是少根筋嘛。没准是手机掉了，或者，只是没存我的联系方式……", next:"s04_empty" },
    s04_empty: { type:"dialogue", speaker:"成田基生（独白）", background:"bg-empty-apartment",
      text:"但是，等我彻底和她失去联络之后，我马上就找去了她家里。那里只剩下这样一个空壳。门上挂着一块崭新的塑料牌——“入居者招募 0A-93MC-10N4”。", next:"s04_doubt1" },
    s04_doubt1: { type:"dialogue", speaker:"成田基生（独白）", background:"bg-empty-apartment",
      text:"爱理真的曾经存在过吗？……还是说，她这个人，其实是我的妄想？还是说，我和爱理曾交往过这件事本身，才是我的妄想呢？", next:"s04_doubt2" },
    s04_doubt2: { type:"dialogue", speaker:"成田基生（独白）", background:"bg-apartment-night",
      text:"但是……我和爱理的回忆，确实存在于这部手机里。那些疑惑仿佛是那么愚蠢，但我又别无办法。", next:"s04_prayer" },
    s04_prayer: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night",
      text:"（闭上眼，几乎是祈求）……倒不如，全都是我的妄想，可能还好一点。墙上的表针转过一圈又一圈，迎接他的仍是不变的日常。", next:"s05a" },

    // ===== 场景05 翌日 错送的快递 =====
    s05a: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night",
      text:"第二日夜晚，手机显示2020年7月23日星期四19:30。（熟练，麻木）爱理，你还好吗？我是基生。虽然不知道爱理现在在哪里……", next:"s05b" },
    s05b: { type:"dialogue", speaker:"旁白", background:"bg-apartment-night",
      text:"手机还显示着“发送中……”——咚、咚、咚。敲门声在安静的房间里格外响，基生的手指僵在按键上。", next:"s05c" },
    s05c: { type:"dialogue", speaker:"快递员", background:"bg-apartment-night", text:"（门外，礼貌而急促）您好——您有一个快递！", next:"s05c2" },
    s05c2: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night", text:"（迟疑，望着房门）……啊好的，马上就来。", next:"s05d" },
    s05d: { type:"dialogue", speaker:"旁白", background:"bg-apartment-night", text:"基生打开门。年轻快递员拎着保温袋，没等他说话便把袋子递到手里。", next:"s05e" },
    s05e: { type:"dialogue", speaker:"旁白", overlay:"parcel-label", background:"bg-apartment-night",
      text:"查看快递单：203室　马场先生　生鲜·要冷藏。不是这间房的门牌号。", next:"s05f" },
    s05f: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night", text:"（疑惑，盯着快递单）……203，马场先生？这是楼下的快递吧。", next:"s05f2" },
    s05f2: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night", text:"（无语）……是送错了啊。", next:"s05g" },
    s05g: { type:"dialogue", speaker:"快递员", background:"bg-apartment-night",
      text:"（门外，带歉意）不好意思——！是楼下203室的，地址弄错了！我这边还有下一单，拜托您了！", next:"s05h" },
    s05h: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night", text:"（关门，小声嘟囔）搞什么啊，这个快递员……", next:"s05i" },
    s05i: { type:"dialogue", speaker:"旁白", background:"bg-apartment-night",
      text:"门锁咔哒扣上。就在基生转过身的一瞬间——手机响了。不是单调的和弦，是海浪的声音。哗——哗——由远及近，像涨潮一样漫进整个房间。", next:"s05j" },
    s05j: { type:"dialogue", speaker:"旁白", background:"bg-apartment-night",
      text:"翻盖手机的屏幕从幽绿变成清澈的蓝光。整个房间的色调在一秒内从灰橙变为深蓝，连基生脸上的阴影都变成了海的颜色。", next:"s05k" },
    s05k: { type:"dialogue", speaker:"成田基生（独白）", background:"bg-apartment-night", text:"海浪的铃声，蓝色的光……", next:"s05l" },
    s05l: { type:"dialogue", speaker:"成田基生（独白）", background:"bg-apartment-night", text:"那是只属于爱理的来电设置。", next:"s05m" },
    s05m: { type:"dialogue", speaker:"旁白", background:"bg-apartment-night", text:"他手微微发颤，点开了那封回信。", next:"s06a" },

    // ===== 场景06 爱理的回信 =====
    s06a: { type:"phone", background:"bg-apartment-night", phone:{
      tab:"mail", lockClose:true, scrollReveal:false, mails:["R01"], exitNext:"s06_react1"
    } },
    s06_react1: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night", text:"（死死盯着屏幕）为什么……不可能……怎么会……", next:"s06_react2" },
    s06_react2: { type:"dialogue", speaker:"成田基生（内心独白）", background:"bg-apartment-night",
      text:"到刚才为止、一次都没有发出去过的邮件。我一直、一直发了十年的邮件……", next:"s06_white_airi" },
    s06_white_airi: { type:"dialogue", speaker:"回信", background:"bg-room-white", text:"我也一直、在想着基生哦。", next:"s06_white_kio1" },
    s06_white_kio1: { type:"dialogue", speaker:"成田基生（内心独白）", background:"bg-room-white", text:"也许我终于疯了吧。", next:"s06_white_kio2" },
    s06_white_kio2: { type:"dialogue", speaker:"成田基生（内心独白）", background:"bg-room-white",
      text:"一定是这样的。这全部都是一场噩梦。全都是妄想。等醒来以后……", next:"s06_memory" },
    s06_memory: { type:"dialogue", speaker:"成田基生（内心独白）", background:"bg-apartment-dusk",
      text:"等我醒来以后，也许会发现我还是个高中生，爱理又约我去海边玩……", next:"s06_break1" },
    s06_break1: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night", text:"（喃喃自语）我一直……", next:"s06_break2" },
    s06_break2: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night",
      text:"（崩溃中自嘲）哈哈……把这些、全部都扔了吧，手机也好、其他也好……", next:"br01" },
    br01: { type:"choice", speaker:"成田基生", background:"bg-apartment-night", text:"把手机……",
      choices:[
        { text:"A · 把手机扔进垃圾桶", next:"s06_throw", flag:{ key:"BR01_CHOICE", value:"THROW" } },
        { text:"B · 把手机塞进口袋，走出房门", next:"s07", flag:{ key:"BR01_CHOICE", value:"KEEP" } }
      ] },
    s06_throw: { type:"dialogue", speaker:"旁白", background:"bg-apartment-night",
      text:"手机落进垃圾袋，蓝光在袋内闷闷地亮着。黑暗中传来翻找垃圾袋的声音。再亮起时，基生把手机重新攥回手心，指节发白。", next:"s06_throw2" },
    s06_throw2: { type:"dialogue", speaker:"成田基生", background:"bg-apartment-night", text:"（自嘲，手发抖）……果然，做不到啊。", next:"s07" },

    // ===== 场景07 昏暗幽长的隧道 =====
    s07: { type:"dialogue", speaker:"旁白", background:"bg-hallway",
      text:"出租屋外的走廊里，声控灯一盏接一盏亮起又熄灭。通往附近海岸，要穿过一条昏暗幽长的隧道。", next:"s07b" },
    s07b: { type:"dialogue", speaker:"旁白", background:"bg-tunnel",
      text:"入口处只有一盏路灯亮着，再往里，黑暗像水一样浓。墙面贴满褪色的租房广告，一张翘起的纸角在风里反复拍墙。隧道深处隐约传来海浪。", next:"s07c" },
    s07c: { type:"dialogue", speaker:"成田基生（独白）", background:"bg-tunnel",
      text:"穿过这个隧道，就能到附近的海岸。……什么都不会有的。谁也不会来。", next:"s07_walk" },
    s07_walk: { type:"walk", walk:{
      bg:"bg-tunnel", player:"kio-walk", length:2400, exitX:2200, playerStartX:60, speed:170,
      hotspots:[
        { id:"vending", x:600, label:"故障自动贩卖机", text:"……还在放着十年前的广告啊。所有商品都显示“售罄”。" },
        { id:"poster", x:1200, label:"褪色海岸海报", text:"海报上的蓝天白沙，与隧道里的黑暗形成刺眼的对比。" },
        { id:"crack", x:1700, label:"隧道墙缝", text:"海风从裂缝穿过，发出很细的哨音。……快到了。" }
      ], exitNext:"s07_exit"
    } },
    s07_exit: { type:"dialogue", speaker:"旁白", background:"bg-coast-night",
      text:"走出隧道出口的一瞬间，风忽然变大，带着咸味。月光下的海岸在眼前铺开。云层很薄，月光落在海面上碎成一条长长的银路；海浪缓缓涌上沙滩，又缓缓退去。", next:"s08a" },

    // ===== 场景08 无边的海岸 =====
    s08a: { type:"dialogue", speaker:"成田基生", background:"bg-coast-night",
      text:"（孤独，声音被海风吹散）……这里是，我和爱理，最后一次一起去玩的地方。", next:"s08b" },
    s08b: { type:"dialogue", speaker:"成田基生", background:"bg-coast-night", text:"（默默）爱理……让我再、最后看一次……", next:"s08c" },
    s08c: { type:"dialogue", speaker:"旁白", background:"bg-coast-night",
      text:"整片海岸只有基生，以及被月光拉得很长的、他一个人的影子。他从口袋摸出手机，再次打开那封回信。", next:"s08d" },
    s08d: { type:"dialogue", speaker:"成田基生", background:"bg-coast-night", text:"（疑惑，自言自语）奇怪……这封邮件，怎么下面还有……", next:"s09" },

    // ===== 场景09 邮件的下面 =====
    s09: { type:"phone", background:"bg-coast-night", phone:{
      tab:"mail", lockClose:true, scrollReveal:true, mails:["R01"], onReveal:"s09_found"
    } },
    s09_found: { type:"dialogue", speaker:"成田基生", background:"bg-coast-night", text:"（盯着屏幕，声音发干）这是什么……？", next:"br02" },
    br02: { type:"choice", speaker:"成田基生", background:"bg-coast-night",
      text:"屏幕底部，一行蓝底白字的链接微微发亮： http://ily/kcta/ll/c...",
      choices:[
        { text:"A · 按下链接", next:"s10a", flag:{ key:"BR02_CHOICE", value:"OPEN" } },
        { text:"B · 合上手机，回家", next:"s09_close", flag:{ key:"BR02_CHOICE", value:"CLOSE" } }
      ] },
    s09_close: { type:"dialogue", speaker:"旁白", background:"bg-coast-night",
      text:"基生合上手机，蓝光熄灭，海浪声恢复正常。他在原地坐了很久，然后起身，穿过隧道回家。", next:"s09_home" },
    s09_home: { type:"dialogue", speaker:"成田基生", background:"bg-coast-night",
      text:"（背影，很低）……果然，什么都不会有的。谁也不会来。", next:"ne_ending" },

    // ===== 场景10 链接 蓝光 =====
    s10a: { type:"dialogue", speaker:"旁白", background:"bg-coast-night", text:"基生按下链接。瞬间，手机蓝光溢出边框，像水一样淌满整个画面。", next:"s10b" },
    s10b: { type:"dialogue", speaker:"旁白", background:"bg-coast-night",
      text:"一股令人厌恶的触感从心底升起——仿佛无数细小的蠕虫，正从指尖沿着血管向上爬。", next:"s10c" },
    s10c: { type:"dialogue", speaker:"成田基生", background:"bg-coast-night", text:"（生理性恶心，急促喘息）——！……这是什么……好恶心……", next:"s10d" },
    s10d: { type:"dialogue", speaker:"旁白", background:"bg-coast-night", text:"他手一软，手机掉在湿沙里。基生俯下身，刚准备把它捡起来——", next:"s10e" },
    s10e: { type:"dialogue", speaker:"旁白", background:"bg-coast-blue", text:"面前的世界照来一片蓝光。它不是月光，比月光更冷、更纯、更安静。", next:"s10f" },
    s10f: { type:"dialogue", speaker:"旁白", background:"bg-coast-blue", text:"海浪声停止了。风停止了。连基生自己的呼吸声也消失了。", next:"s10g" },
    s10g: { type:"dialogue", speaker:"成田基生", background:"bg-coast-blue", text:"（僵在原地，瞳孔收缩）……", next:"s11a" },

    // ===== 场景11 十年前的她 =====
    s11a: { type:"dialogue", speaker:"旁白", background:"bg-coast-blue",
      text:"无边海岸的蓝光中央站着一个人影——穿校服的短发少女。深蓝短发被无形光流轻轻托起，蔚蓝发卡在额侧闪着微光，水手服裙摆静止在无风的空气里，像一张从十年前剪下的照片，被贴进这个夜晚。", next:"s11a2" },
    s11a2: { type:"dialogue", speaker:"成田基生", background:"bg-coast-blue", text:"（不可置信，声音卡在喉咙）……爱理……？", next:"s11_turn" },
    s11_turn: { type:"dialogue", speaker:"旁白", background:"bg-coast-blue",
      text:"少女缓缓转过头，睫毛轻抬。她睁着酒红色的双眸，看向基生，露出与十年前一模一样、自然又明亮的微笑。", next:"s11b" },
    s11b: { type:"dialogue", speaker:"成田基生（内心独白）", background:"bg-coast-blue",
      text:"怎么可能……爱理……为什么？这不可能……爱理？不可能会是她……这不可能……不可能是爱理……这不可能……不可能……", next:"s11b2" },
    s11b2: { type:"dialogue", speaker:"成田基生（内心独白）", background:"bg-coast-blue", text:"（抓住唯一的理由，声音发颤）因为、因为爱理她——", next:"s11b3" },
    s11b3: { type:"dialogue", speaker:"成田基生（内心独白）", background:"bg-coast-blue", text:"（几乎耳语）和我一样大啊。", next:"s11c" },
    s11c: { type:"dialogue", speaker:"字幕", background:"bg-room-white", text:"十年后的爱理，本该和他一样28岁了。可是眼前的少女，还穿着那身校服。", next:"s11d" },
    s11d: { type:"dialogue", speaker:"百合沢爱理", portrait:"portrait-airi", background:"bg-coast-blue",
      text:"她微笑着朝基生伸出双手，掌心向上，既像邀请，也像等待被握住。（轻快，温柔，尾音上扬，与记忆分毫不差）最喜欢你了，基生。", next:"s11d2" },
    s11d2: { type:"dialogue", speaker:"成田基生", background:"bg-coast-blue", text:"（失神，几乎听不见）……爱理。", next:"s11e" },
    s11e: { type:"dialogue", speaker:"字幕", background:"bg-coast-blue",
      text:"蓝光涨满整个屏幕。标题 I.L.Y. 浮现，三个字母像被海水冲刷过的沙字，先被浪抹平，又重新浮现。——在那里我遇到的，是十年前的那个她。", next:"finale" },

    // ===== 终幕 / 分支结局 =====
    finale: { type:"finale", background:"bg-coast-blue", title:"I.L.Y.", subtitle:"——在那里我遇到的，是十年前的那个她。",
      text:"序章主线结束。主线存档名：蓝色来电。",
      enter:(state, notify) => {
        state.flags.FLAG_BLUE_CALL = "unlocked";
        if (!state.flags.achievements.includes("last-beach")) {
          state.flags.achievements.push("last-beach"); notify("成就解锁：最后一次海边");
        }
      } },
    ne_ending: { type:"branch", background:"bg-apartment-night", title:"门内的回信", subtitle:"路线偏向怀疑与调查。",
      text:"回房后，那封邮件再也没有出现过，海浪铃声也再没有响起。第一章将从此后的日常开始：基生带着空壳旧公寓、招租牌 0A-93MC-10N4 与十年断讯的疑问，在现实中追查爱理是否真的存在过。分支存档名：门内的回信。",
      enter:(state, notify) => {
        if (!state.flags.achievements.includes("door-letter")) {
          state.flags.achievements.push("door-letter"); notify("成就解锁：门内的回信");
        }
      } }
  }
};
