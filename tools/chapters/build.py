"""Build reviewed chapter 2/3/final transcripts; document notes never become dialogue.

Source TXT files are extracted from the supplied DOCX. Branches and staging below
are deliberate adaptations, not executable instructions read from those files.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent
TITLES = {'chapter2': '第二章 · 约定与夕阳', 'chapter3': '第三章 · 过去与现在', 'final': '最终章 · One Last Kiss'}
ART = {
 'stone': ('076f7c38c5f582d5189445f3c3f5396c', '夕阳石阶空景；栏杆在左、挡土墙在右', 'background'),
 'ice': ('0ba15042dc343443ebb56549acddf14b', '石阶上的冰淇淋特写；购买后使用', 'cg'),
 'vending': ('0c0b79deec7db838f757dc83bf08c1a7', '长楼梯右侧售货机；购买与十年独白', 'background'),
 'adult': ('17f5b5f773b5835caec419d2e42bfe47', '夕阳海边长发成年爱理；S08 揭晓及第三章重逢', 'cg'),
 'smile': ('1df1b6e44edb26dd497c17dafe91930d', '紫阳花前少女闭眼微笑；告白回应', 'cg'),
 'couple': ('1e19e6a90a3f9688fcff45072f27b4c6', '蓝发少女与基生牵手走向海边；旅行蒙太奇', 'cg'),
 'flowers': ('286bc2567a129e2d6a8cac395a37fbc9', '繁盛紫阳花弯曲小径空景；六月记忆，不作八月全盛实景', 'background'),
 'shop': ('446324d714d2d599f0a9019da01455fd', '石阶旁冰淇淋柜台及店员；购买对白', 'background'),
 'memory': ('74119dee6c7e066ac0f921496d0e40e1', '盛放紫阳花中的牵手背影；十年前六月回忆', 'cg'),
 'sunset': ('820c7cecef9ded8f2016b604e7838d53', '滨海步道与夕阳空景；等待、留下分支', 'background'),
 'hug': ('8858c166b1d93a2f4b7e36f93966bcb2', '室内突然拥抱；少女惊讶的正面中景', 'cg'),
 'talk': ('9f61b81165b5eaefb311d1bf5c72d77d', '紫阳花前两人交谈；六月照片闪回', 'cg'),
 'blush': ('aebdaca15c7e831bc0ec9fe584a77cf9', '紫阳花前少女睁眼羞涩；记忆肖像', 'cg'),
 'beach': ('b3dba4b2ad795552082daa3127400c10', '晴天无人物海滩；上岛与盛夏尾声', 'background'),
 'hug-close': ('bb9b4058c3747b93902130a0308d6944', '拥抱时少女侧脸近景；迟来的道歉', 'cg'),
 'hand': ('db60ed6c0b70c98a69d595f4a9dd6f68', '晴天海滩前伸出的手；牵手互动', 'cg'),
}

def write(path, data, prefix):
    path.write_text(prefix + json.dumps(data, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')

class Chapter:
    def __init__(self, key, filename):
        self.key = key
        self.prefix = {'chapter2':'ch2', 'chapter3':'ch3', 'final':'fin'}[key]
        self.lines = (HERE / filename).read_text(encoding='utf-8').splitlines()
        self.nodes = {}; self.sections = {}; self.seq = []; self.scene = ''; self.bg = ''; self.cg = None
        self.condition = None

    def add(self, text='', speaker='旁白', id=None, **kw):
        id = id or f'{self.prefix}_{len(self.nodes):03}'
        n = dict(type='dialogue', text=text, speaker=speaker, chapter=self.key,
                 chapterTitle=TITLES[self.key], scene=self.scene, background=self.bg)
        if self.cg: n['cg'] = self.cg; n['backgroundFit'] = 'contain'
        if self.condition: n['when'] = self.condition.copy()
        n.update(kw)
        if n.get('cg'): n['backgroundFit'] = 'contain'
        self.nodes[id] = n; self.seq.append(id)
        return id

    def choice(self, id, text, key, options, **kw):
        return self.add(text, '基生（内心）', id=id, type='choice', checkpoint=True,
                        choices=[dict(text=t, flag=dict(key=key, value=v), next=n) for t,v,n in options], **kw)

    def rpg(self, task, map, text, **kw):
        kw.setdefault('timeout',90)
        return self.add(text, id=f'{self.prefix}_{task.lower()}', type='rpg', task=f'{self.prefix.upper()}_{task}',
                        map=map, checkpoint=True, **kw)

    def build(self):
        active = False
        for line in self.lines:
            line = line.strip()
            if line.startswith('附录 A') or line.startswith('终章字幕'): break
            if re.match(r'S01 ｜', line): active = True
            if not active or not line: continue
            m = re.match(r'(S\d\d(?:-[EX]|[AB])?) ｜ (.*)', line)
            if m:
                self.scene = m[1]; self.condition = None; self.cg = None
                self.bg = self.background(self.scene)
                if self.key == 'chapter3' and self.scene == 'S01': self.cg = 'ch2-adult'
                self.sections[self.scene] = []
                self.seq = self.sections[self.scene]
                if self.key == 'final' and self.scene in ('S02-X','S03','S05'): continue
                self.add(m[2], TITLES[self.key].split(' · ')[0], id=f'{self.prefix}_{self.scene.lower()}', checkpoint=True)
                continue
            if self.special(line): continue
            if self.key == 'final' and self.scene in ('S02-X','S03','S05'): continue
            if line.startswith(('时间：','策划注','制作注','◆','【','选项','（以下','——','男主线 ·','END ｜')) or line == '完': continue
            speaker = '旁白'; text = line
            if line.startswith(('〔内心〕','〔心声〕')):
                speaker = 'ILY（内心）' if line.startswith('〔心声〕') and self.key == 'final' else '基生（内心）'; text = line[4:]
            elif re.match(r'^[^：]{1,22}：', line): speaker, text = line.split('：', 1)
            kw = {}
            if not self.cg and ('爱理' in speaker or speaker == 'ILY') and '声音' not in speaker and '回忆' not in speaker:
                kw['portrait'] = 'airi-crying' if self.key == 'final' else 'airi-blush' if self.scene == 'S05' else 'portrait-airi'
            if self.key == 'final' and self.scene == 'S02' and line in ('说喜欢我','能说你喜欢我吗'):
                kw['screenText'] = line; speaker = ''; text = ''
            self.add(text, speaker, **kw)
        self.wire()
        write(ROOT / f'game/data/story/{self.key}.js', dict(id=self.key, title=TITLES[self.key], start=f'{self.prefix}_s01', nodes=self.nodes),
              '// Generated by tools/chapters/build.py.\nILY.data.stories.' + self.key + ' = ')

    def background(self, scene):
        if self.key == 'chapter2':
            return {'S01':'bg-apartment-dusk','S02':'bg-apartment-dusk','S03':'ch2-beach','S04':'ch2-flowers','S05':'ch2-stone','S06':'ch2-sunset','S07':'ch2-sunset','S07-E':'ch2-sunset','S08':'ch2-sunset'}[scene]
        if self.key == 'chapter3':
            return {'S01':'ch2-sunset','S02':'bg-apartment-night','S03':'ch3-work','S04':'bg-apartment-night','S05':'ch3-mall','S06':'bg-apartment-night','S07A':'bg-coast-night','S07B':'bg-apartment-dusk'}[scene]
        return 'bg-apartment-dusk' if scene in ('S06','S07') else 'bg-coast-blue'

    def special(self, line):
        if '疑点 P' in line and line.startswith(('【','〔')):
            m = re.search(r'P\d+',line)
            if m and self.seq:
                self.nodes[self.seq[-1]].setdefault('clues', []).append(m[0])
            return True
        if self.key == 'chapter2':
            if line.startswith('◆ 分歧节点 2'):
                self.choice('ch2_choice2','要怎样回应她的“不能说”？','n2',[
                    ('……好。我不说了。','A','ch2_n2_a'),('为什么不能说？爱理。','B','ch2_n2_b')]); return True
            if line in ('【A 线】','【B 线】'):
                self.condition = dict(key='n2', value='A' if 'A' in line else 'B')
                self.add('……', id='ch2_n2_'+self.condition['value'].lower()); return True
            if line.startswith('◆ 合流'):
                self.condition = None; self.add('爱理突然站起身。',id='ch2_n2_merge'); return True
            if line.startswith('【分歧节点 3'):
                self.choice('ch2_choice3','买水，还是留下？','n3',[
                    ('还是去买点喝的吧——稍等我一下。','buy','ch2_buy'),
                    ('……算了，反正也不是很渴。就这样陪着她吧。','stay','ch2_s07-e')]);
                self.add('知道了。那么稍等我一下。','基生',id='ch2_buy'); return True
            if line.startswith('【Gameplay'):
                if 'G1 续' in line: self.cg = None; self.rpg('G1','ch2-island','沿着海岸走到紫阳花小路入口。',follower=True)
                elif 'G1' in line:
                    self.choice('ch2_hand','他向她伸出手。','CH2_HAND', [('牵住她的手',True,'ch2_hand_after'),('稍稍迟疑',False,'ch2_hand_hesitate')],cg='ch2-hand')
                    self.add('……基生？她轻轻握住了那只停在半空的手。','“爱理”',id='ch2_hand_hesitate',cg='ch2-hand')
                    self.add('手心的温度，随着海风传了过来。',id='ch2_hand_after',cg='ch2-couple')
                elif 'G2' in line:
                    self.cg = None; self.rpg('G2','ch2-flowers','调查三处花丛，找回六月的照片。',required=['memory1','memory2','memory3'],follower=True)
                elif 'G3' in line:
                    self.cg = None; self.bg='ch2-vending'; self.rpg('G3','ch2-stairs','沿石阶找到售货机，买一瓶冰水。',required=['water'])
                elif 'G4' in line:
                    self.bg='ch2-shop'; self.rpg('G4','ch2-shop','在柜台挑选冰淇淋，带回给爱理。',required=['ice'])
                return True
            if '一把将她拥入怀中' in line: self.cg = 'ch2-hug'
            if line.startswith('基生：对不起……'): self.cg = 'ch2-hug-close'
            if '照片里的爱理站在同一个地方' in line: self.cg = 'ch2-blush'
            if line.startswith('基生：紫阳花还大片大片地开着'): self.cg = 'ch2-flowers'
            if line.startswith('爱理伸手碰了碰眼前'): self.cg = None
            if line.startswith('“爱理”：这样啊'): self.cg = None
            if '听到基生的回答，爱理闭上眼睛' in line: self.cg = 'ch2-smile'
            if '两人牵着手走在江之岛' in line: self.cg = 'ch2-couple'
            if line.startswith('店员：请拿好'): self.cg = 'ch2-ice'
            if self.scene == 'S08' and line.startswith('基生带着冰淇淋'):
                self.rpg('G5','ch2-return','回到海边，寻找等候的身影。',required=['figure'],timeout=30)
            if '——毫无疑问，她，就是，爱理' in line: self.cg = 'ch2-adult'
            if self.scene == 'S04' and not self.cg: self.bg = 'ch2-path-summer'
        if self.key == 'chapter3':
            if line.startswith('◆ 关键转折节点'):
                self.choice('ch3_choice4','两部手机同时作响。','n4',[
                    ('去找“爱理”。','A','ch3_s07a'),('接通日日谷的电话。','B','ch3_s07b')]); return True
            if line.startswith('【Gameplay'):
                if 'G2' in line: self.rpg('G2','ch3-work','走到日日谷面前，听听她的邀约。',required=['hibiya'])
                if 'G4' in line: self.rpg('G4','ch3-coast','沿夜色海岸寻找那个声音。',required=['voice'],timeout=30)
                if 'G3' in line:
                    self.choice('ch3_model','挑选第一台智能手机。','G3_MODEL', [('日日谷推荐的款式','recommended','ch3_model_after'),('轻巧的小屏款','compact','ch3_model_after')])
                    self.add('这一台……以后也请多指教。','基生',id='ch3_model_after')
                return True
            if line.startswith('向着屋外明媚'): self.bg = 'ch2-beach'
        if self.key == 'final':
            if line.startswith('◆ 演出：一根手指'):
                self.add('一根手指，轻轻按在了他的嘴上。ILY 微微一笑，化作蓝色的光影，消失在深夜的大海里。',portrait=None,sceneEffect='farewell')
                return True
            if line.startswith('◆ 演出（全章高潮'):
                self.add('月下蓝海中，基生轻轻吻上了那个即将消失的身影。两个人的剪影，静静融在海光里。',sceneEffect='kiss'); return True
            if line.startswith('【成就解锁】'):
                if self.seq: self.nodes[self.seq[-1]]['achievement']='One Last Kiss'
                return True
            if line == '收信':
                self.add('我也一直，在想念着基生哦。', 'ILY', id='fin_mail', type='letter', date='20/07/23 19:40', subject='Re：'); return True
            if self.scene == 'S06' and line in ('20/07/23 19:40','发件人：ILY','Re：','我也一直，在想念着基生哦。'): return True
            if line.startswith('我会好好地活下去'): self.bg='ch2-beach'
        return False

    def wire(self):
        for seq in self.sections.values():
            for a,b in zip(seq,seq[1:]):
                if self.nodes[a]['type'] != 'choice': self.nodes[a]['next']=b
        def link(scene, next): self.nodes[self.sections[scene][-1]]['next'] = next
        def ending(id,title,flag,bg):
            self.nodes[id]=dict(type='end',chapter=self.key,chapterTitle=TITLES[self.key],scene='END',title=title,
                text='这一段故事，留在了这里。',background=bg,ending=flag,achievement=title,checkpoint=True)
        if self.key=='chapter2':
            for a,b in [('S01','S02'),('S02','S03'),('S03','S04'),('S04','S05'),('S05','S06'),('S06','S07')]: link(a,'ch2_'+b.lower())
            link('S07','ch2_s08'); link('S07-E','ending_just2'); link('S08','ch3_s01')
            ending('ending_just2','Just two of us','ENDING_JUST2','ch2-sunset')
            # Branch A jumps over B, with a shared exit; node-local guards also support old saves.
            a=self.sections['S02']; self.nodes[a[a.index('ch2_n2_b')-1]]['next']='ch2_n2_merge'
        elif self.key=='chapter3':
            for a,b in [('S01','S02'),('S02','S03'),('S03','S04'),('S04','S05'),('S05','S06')]: link(a,'ch3_'+b.lower())
            link('S07A','fin_s01'); link('S07B','ending_reality')
            self.nodes[self.sections['S07A'][-1]]['setFlags']={'ENDING_ILY':True}
            ending('ending_reality','十年之后','ENDING_REALITY','ch2-beach')
        else:
            self.scene='S02-X';self.bg='bg-coast-blue';self.seq=self.sections['S02-X']
            self.add('',id='fin_s02-x',type='fracture',checkpoint=True,next='fin_s03')
            self.scene='S03';self.seq=self.sections['S03']
            self.add('躲开她的执念，接住她的温柔。',id='fin_s03',type='boss',checkpoint=True,next='fin_s04')
            self.scene='S05';self.seq=self.sections['S05']
            self.add('',id='fin_s05',type='search',checkpoint=True,next='fin_s06')
            for a,b in [('S01','S02'),('S02','S02-X'),('S04','S05'),('S06','S07')]: link(a,'fin_'+b.lower())
            link('S07','ending_true'); ending('ending_true','One Last Kiss','ENDING_TRUE','ch2-beach')
            self.nodes['ending_true']['text']='我会好好地活下去，在 ILY 引领我到达的，这片光芒里。'

for key,file in [('chapter2','第二章游戏剧情脚本.txt'),('chapter3','第三章游戏剧情脚本.txt'),('final','最终章游戏剧情脚本.txt')]:
    c=Chapter(key,file);c.build();print(key,len(c.nodes))
assets={'ch2-'+k:'../第二章mg/'+v[0]+'.jpg' for k,v in ART.items()}
assets.update({'ch2-path-summer':'assets/images/maps/ch2-flowers.svg','ch3-work':'assets/images/maps/ch3-work.svg','ch3-mall':'assets/images/maps/ch3-mall.svg','ch2-follower':'assets/images/maps/airi-follower.svg'})
write(ROOT/'game/data/chapter-assets.js',assets,'Object.assign(ILY.data.assets.images, ')
# Object.assign needs a closing parenthesis.
p=ROOT/'game/data/chapter-assets.js';p.write_text(p.read_text(encoding='utf-8').replace('};\n','});\n'),encoding='utf-8')
(HERE/'素材对应.md').write_text('# 第二章图片逐张对照\n\n| 文件 | 资源 ID | 观察与使用位置 | 类型 |\n|---|---|---|---|\n'+''.join(f'| {v[0]}.jpg | ch2-{k} | {v[1]} | {v[2]} |\n' for k,v in ART.items())+'\n原始图片保留在第二章mg，未改动 ILY美工设计。紫阳花盛放图片用于六月回忆；八月小路由 JSON 地图绘制。\n',encoding='utf-8')
