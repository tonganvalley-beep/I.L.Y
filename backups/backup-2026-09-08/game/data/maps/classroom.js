// 独立数据文件：修改下面的内容即可，无需构建或启动服务。
ILY.data.maps.classroom = {
  "id":"classroom","name":"旧教室","tileSize":48,
  "legend":{"#":"墙壁",".":"地面"},
  "tiles":["############","#..........#","#..##......#","#..##......#","#......##..#","#..........#","#..........#","############"],
  "spawn":{"x":2,"y":6},
  "hotspots":[
    {"id":"letter","x":2,"y":1,"label":"窗边的信","clue":"letter","description":"信纸上写着：钟声响起时，在那里见。"},
    {"id":"record","x":9,"y":5,"label":"值日记录","clue":"record","description":"值日记录：四点十分，他独自往北面的钟楼走去。"}
  ],
  "deduction":{"question":"综合这两条证据，他去了哪里？","requiredClues":["letter","record"],"choices":[{"id":"garden","text":"南侧花园"},{"id":"tower","text":"北侧钟楼"},{"id":"library","text":"图书馆"}],"answer":"tower","flag":"destination-known"}
};
