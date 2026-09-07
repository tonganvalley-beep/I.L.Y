// 《I.L.Y.》序章 · 翻盖手机内容数据
// 文案取自《I.L.Y.》序章可执行剧本 v1.2「手机内容表」「手机系统模块」。
// 这里只放「数据」，交互逻辑在 src/modes/phone.js。
// 美术资源（头像/照片/UI）用 id 占位，真实图片请见素材清单后补到 assets/ 下。
window.ILY = window.ILY || { data: { stories: {}, maps: {}, levels: {} } };
ILY.data.phone = {
  // ---- 邮件 ----
  // 字段：from 寄信人 / time 时间 / subject 主题 / body 正文（支持数组=多段）
  mails: {
    A01: {
      from: "百合沢 爱理", time: "2009年夏", subject: "",
      body: "基生，你最近没什么精神呢，发生了什么？？你出什么事了吗？如果有什么我能帮上忙的，一定要跟我说哦！"
    },
    A02: {
      from: "百合沢 爱理", time: "2009年夏", subject: "",
      body: "今天也辛苦啦！本来觉得还能一起回去的。最近基生很忙呢，我有点担心你哦。"
    },
    A03: {
      from: "百合沢 爱理", time: "2009年夏", subject: "",
      body: "今天真开心啊！基生，等考完试以后，我们一起出去玩吧！"
    },
    A04: {
      from: "百合沢 爱理", time: "2009/07/20 20:36", subject: "",
      body: "好久没和基生一起出去玩了，今天真的好开心~！大海真的好漂亮！虽然我到最后都没敢下水，一直坐在岸边...但是浪的声音很好听。下次再一起去吧！"
    },
    F01: {
      from: "父亲", time: "2009/06/23 7:15", subject: "",
      body: "基生，等你上大学了以后，就自己出去住吧。爸爸以后要和另一个女人一起住在这里。"
    },
    K01: {
      from: "成田基生", time: "", subject: "（发件草稿）",
      body: "爱理，你还好吗？我是基生。虽然不知道爱理现在在哪里，在干什么，但我一直，在想着爱理哦。",
      isDraft: true
    },
    SYS01: {
      from: "系统", time: "", subject: "Mail System Error - Returned",
      body: "您向以下郵箱發送的郵件未能發送成功。airi_lily_6@docono.ne.jp。失敗原因可能是未找到收件地址、或是收件地址的服務器發生錯誤。請確認收件地址無誤後、再次發送。"
    },
    R01: {
      from: "百合沢 愛理", time: "20/07/23 19:40", subject: "Re:",
      // 回信正文；下方空白/省略号/隐藏链接由 scrollReveal 控制
      body: "我也一直、在想著基生哦。",
      scrollReveal: {
        afterDowns: 6,                 // 连续下滚多少次后出现链接（框架占位值，可调）
        ellipsis: ["", "……", "……", "……"], // 滚动过程中先后出现的留白/省略号
        link: "http://ily/kcta/ll/c...",
        linkLabel: "（一个蓝底白字的链接，字符在小屏幕上微微发亮）"
      }
    }
  },

  // ---- 通讯录 ----
  // 字段：name 显示名 / note 基生查看时的内心独白 / locked 是否剧情锁定
  contacts: {
    work:   { name: "打工（便利店同事）", note: "……（这是十年里来回替换过无数次的工作联系人之一）", tutorial: true },
    ando:   { name: "安藤", note: "安藤...是谁来着" },
    mother: { name: "妈妈", note: "自从他们离婚之后，我再也没有见过她" },
    father: { name: "爸爸", note: "他们离婚之后，我就搬去我的出租屋了。\n那个房子属于父亲和另一个女人。" },
    airi:   { name: "百合沢 爱理", note: "……爱理。", last: true }
  },

  // ---- 相册 ----
  // 字段：title / caption 基生介绍文本 / img 占位资源 id
  photos: {
    P01: {
      title: "2009/07/23 海边合影",
      img: "photo-seaside",
      caption: "爱理坐在沙滩上比着不熟练的剪刀手；深蓝短发被海风吹向一边，笑得眯起眼睛。少年基生表情僵硬，耳朵却是红的。这是两人最后一次一起去海边。"
    },
    ITEM01: {
      title: "银行存折",
      img: "bankbook",
      caption: "大学入学后每月固定入账60,000日元，备注栏一片空白。"
    }
  }
};
