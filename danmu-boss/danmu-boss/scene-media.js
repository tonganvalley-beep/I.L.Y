// 可选：将生成的视频放入 media/，把对应 null 改为 'media/act1.mp4' 等。
// 素材缺失、解码失败或自动播放受限时自动回退到原图微动。无需视频也能运行。
window.BOSS_MEDIA = {1:null,2:null,3:null,4:null,5:null,6:null,7:null};
// 最终胜利动画：将 ending.mp4 放到 media/ 下，通关即全屏播放。
// 文件缺失 / 解码失败 / 自动播放受限时，自动回退为「挑战成功」文字界面。
window.BOSS_ENDING = 'media/ending.mp4';
