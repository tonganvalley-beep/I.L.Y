// 独立数据文件：修改下面的内容即可，无需构建或启动服务。
ILY.data.stories.prologue = {
  "id": "prologue", "title": "序章 · 雨后的教室", "start": "arrival",
  "nodes": {
    "arrival": {"type":"dialogue","speaker":"旁白","text":"雨停了。你推开教室的门，窗边只剩下一封没有署名的信。","background":null,"portrait":null,"bgm":null,"next":"invitation"},
    "invitation": {"type":"dialogue","speaker":"遥","text":"有人把钟停在了四点十分。找到留下的线索，我们就能知道他去了哪里。","next":"choice"},
    "choice": {"type":"choice","speaker":"我","text":"先从哪里开始？","choices":[{"text":"仔细调查教室","next":"classroom"},{"text":"再问问遥","next":"hint"}]},
    "hint": {"type":"dialogue","speaker":"遥","text":"看看窗边的信，还有讲台上的记录。不要只凭一个线索下结论。","next":"classroom"},
    "classroom": {"type":"exploration","map":"classroom","next":"truth"},
    "truth": {"type":"dialogue","speaker":"我","text":"信中约定了钟声响起的地点，值日记录又证实他向北走了。他去了钟楼！","next":"resolve"},
    "resolve": {"type":"battle","level":"first-trial","next":"ending"},
    "ending": {"type":"dialogue","speaker":"遥","text":"你穿过了纷乱的回声。钟楼的门，就在前面。","next":"complete"},
    "complete": {"type":"end","text":"序章完成。新的故事，等待你来续写。"}
  }
};
