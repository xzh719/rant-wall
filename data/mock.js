/**
 * mock.js — 模拟数据模块（数据来源：Content T-01 rant-content.md）
 * 首次加载时自动初始化 localStorage
 */
const MOCK_RANTS = [
  {
    id: "rant-001",
    emotion: "angry",
    title: "今天在公交上被踩了三脚，一句对不起都没有",
    content: "早高峰本来就挤，一个大姐穿着细高跟连踩我三脚，第一脚我忍了，第二脚我说了句"小心点"，第三脚她回头瞪了我一眼说"嫌挤别坐公交啊"。我？？？气得我打字手都在抖。文明社会文明人，怎么就长了一张嘴不会说对不起呢？",
    author: "愤怒的小鸟",
    isAnonymous: false,
    likes: 128,
    dislikes: 3,
    comments: [
      { id: "cmt-001", rantId: "rant-001", author: "公交老司机", isAnonymous: false, content: "同款遭遇！上回在地铁上被踩了一脚，对方白了我一眼说"谁让你脚放那儿的"。我当时都怀疑人生了，我的脚不在地上难道在头顶吗？？", createdAt: "2026-05-08T09:00:00" },
      { id: "cmt-002", rantId: "rant-001", author: "", isAnonymous: true, content: "有一说一，穿细高跟挤公交属于公共交通工具使用不当，建议交警扣她12分", createdAt: "2026-05-08T09:30:00" },
      { id: "cmt-003", rantId: "rant-001", author: "理智型选手", isAnonymous: false, content: "下次直接大声说"没关系，你也不是故意没家教的"，杀伤力更大且不失礼貌 😊", createdAt: "2026-05-08T10:00:00" }
    ],
    createdAt: 1746693000000
  },
  {
    id: "rant-002",
    emotion: "speechless",
    title: "室友用我的洗发水就算了，还兑水用完了给我放回去",
    content: "出差三天回来，发现新买的洗发水只剩一个底儿，摇一摇还有水声。问室友是不是用了，她说"我看快没了帮你兑了点水，还能再用几次"。我真的谢谢您全家，我缺的是那两滴水吗？我缺的是一个有边界感的室友。",
    author: "",
    isAnonymous: true,
    likes: 256,
    dislikes: 1,
    comments: [],
    createdAt: 1746735300000
  },
  {
    id: "rant-003",
    emotion: "funny",
    title: "我爸学用智能马桶，研究了半小时最后手动冲的",
    content: "家里换了个智能马桶盖，有加热、冲水、烘干各种按钮。我爸上完厕所半小时没出来，我以为出事了，敲门问咋了。他说"这玩意儿按钮太多了，我怕按错了滋我一脸水，算了还是手动冲吧。"然后站起来按了水箱按钮潇洒离去。笑死我了。",
    author: "孝顺但不多的好大儿",
    isAnonymous: false,
    likes: 489,
    dislikes: 0,
    comments: [],
    createdAt: 1746633600000
  },
  {
    id: "rant-004",
    emotion: "embarrassed",
    title: "在群里吐槽老板，结果发到了有老板的群",
    content: "公司有两个群，一个有老板一个没老板。昨天加班到九点，想在小群里发"老板又画大饼了，这破项目我是真干不动了"。发完才发现——发到了大群。撤回已经来不及了，老板回了一句"辛苦了，明天聊"。我连夜下载了BOSS直聘，兄弟们江湖再见。",
    author: "",
    isAnonymous: true,
    likes: 666,
    dislikes: 0,
    comments: [
      { id: "cmt-004", rantId: "rant-004", author: "曾经社死过的前辈", isAnonymous: false, content: "兄弟别怕，我当年把吐槽我妈的微信发给了我妈本人，现在坟头草都两米高了。BOSS直聘我帮你内推，简历发我。", createdAt: "2026-05-08T22:00:00" },
      { id: "cmt-005", rantId: "rant-004", author: "", isAnonymous: true, content: ""明天聊"这三个字才是真正的恐怖片，比任何鬼片都吓人。楼主今晚还睡得着吗", createdAt: "2026-05-08T22:15:00" }
    ],
    createdAt: 1746735900000
  },
  {
    id: "rant-005",
    emotion: "work",
    title: "面试造火箭，入职拧螺丝，薪资扣得比螺丝还细",
    content: "面试的时候问我微服务架构、高并发方案、分布式事务，面了四轮。入职第一周，让我帮忙修打印机。第二周，主要工作是帮领导做PPT。第三周，发现工资条上有个"团队建设费"扣了200，问HR说上个月团建AA制，我没去也扣了。造火箭？我这连自行车链条都够不着。",
    author: "不想拧螺丝的螺丝钉",
    isAnonymous: false,
    likes: 312,
    dislikes: 5,
    comments: [],
    createdAt: 1746534600000
  },
  {
    id: "rant-006",
    emotion: "work",
    title: "周报写了三千字，领导只看了标题还问"这周干嘛了"",
    content: "每周五写周报是我最痛苦的时刻，比写代码还累。这周我洋洋洒洒写了三千字，把每个需求的背景、方案、进展、风险都列得明明白白。周一开周会，领导翻了两秒问："你这周主要干嘛了？"我当场石化。合着我写的是《职场版三体》，您只看封面是吧？",
    author: "",
    isAnonymous: true,
    likes: 198,
    dislikes: 2,
    comments: [],
    createdAt: 1746435600000
  },
  {
    id: "rant-007",
    emotion: "life",
    title: "租的房子马桶坏了，房东让我"先克服一下"",
    content: "租的房子马桶水箱坏了，冲不了水。给房东发微信，他回了句"年轻人要学会克服困难，我年轻时住地下室连厕所都没有"。我谢谢你啊房东大叔，要不我克服一下直接不冲了，等您下次来收租的时候顺便感受一下？当代租房青年的生存现状：交租时是上帝，修东西时是孙子。",
    author: "租房难民",
    isAnonymous: false,
    likes: 387,
    dislikes: 1,
    comments: [],
    createdAt: 1746776700000
  },
  {
    id: "rant-008",
    emotion: "life",
    title: "外卖等了80分钟，骑手说"你的饭在另一个城市"",
    content: "中午11点点了个黄焖鸡，预计12点到。12点半还没来，一看骑手位置，离我15公里而且越来越远。打电话问，骑手大哥说："不好意思啊兄弟，我接了个顺路单去城西了，你的饭跟我一起走的，一会儿再给你送回来。" 我的黄焖鸡经历了一场说走就走的旅行，比我周末过得都精彩。",
    author: "",
    isAnonymous: true,
    likes: 445,
    dislikes: 2,
    comments: [],
    createdAt: 1746795000000
  },
  {
    id: "rant-009",
    emotion: "love",
    title: "相亲对象说"你条件挺好的，就是长得有点让人记不住"",
    content: "家里介绍的相亲，聊了半小时感觉还行。临走前对方突然来了一句："你各方面条件都挺好的，就是长得有点……怎么形容呢，让人记不住。就像小区门口每天路过的保安那种感觉。" 我当场破防了。什么叫记不住？我这张脸是Ctrl+Z了吗？谢谢您让我意识到了自己的核心竞争力——隐身术。",
    author: "记不住脸的保安",
    isAnonymous: false,
    likes: 521,
    dislikes: 3,
    comments: [],
    createdAt: 1746399600000
  },
  {
    id: "rant-010",
    emotion: "rant",
    title: "我发现我的手机比我更了解我自己，但它只会用来推送广告",
    content: "跟朋友聊天说最近睡眠不好，下一秒购物APP给我推褪黑素。跟同事吐槽颈椎疼，浏览器马上推荐人体工学椅。这些APP如此精准地了解我的身体状况和心理需求，但它们从不关心我，只关心我能不能点进那个链接。大数据时代最讽刺的事：我的隐私一览无余，但我的工资一毛不涨。",
    author: "",
    isAnonymous: true,
    likes: 278,
    dislikes: 1,
    comments: [],
    createdAt: 1746747000000
  }
];

// 初始化：首次加载时将 mock 数据写入 localStorage
(function initMockData() {
  if (!localStorage.getItem('rant_wall_data') || JSON.parse(localStorage.getItem('rant_wall_data')).length === 0) {
    localStorage.setItem('rant_wall_data', JSON.stringify(MOCK_RANTS));
  }
})();
