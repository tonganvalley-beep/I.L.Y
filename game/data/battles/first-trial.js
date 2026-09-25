// 独立数据文件：修改下面的内容即可，无需构建或启动服务。
ILY.data.levels['first-trial'] = {"id":"first-trial","name":"钟声的回响","duration":20,"hp":3,"playerSpeed":240,"slowSpeed":110,"bulletSpeed":105,"spawnInterval":0.65,"bulletCount":7,"playerRadius":5,"bulletRadius":5,"invulnerability":1.2};
// 教学模式（training:true）由 src/engines/danmu.js 里的脚本课程驱动，
// 红心 8 关 / 蓝心 5 关，duration 只作非教学模式的兜底计时。
ILY.data.levels['ch1-tutorial'] = {id:'ch1-tutorial',name:'红心与蓝心 · 基础教学',engine:'danmutest',training:true,redTutorial:true,blueTutorial:true,duration:60,hp:20};


