# 三角函数

- 任意角与弧度制 ^angle
  - 角的概念
    - 正角：逆时针旋转；负角：顺时针旋转；零角：不旋转
    - 象限角：始边与 $x$ 轴非负半轴重合，顶点在原点
    - 轴线角：终边落在坐标轴上，不属于任何象限
  - 终边相同的角：$\beta=\alpha+2k\pi,\ k\in\mathbb{Z}$
  - 弧度制
    - 1 弧度：长度等于半径的弧所对的圆心角
    - 换算：$180^\circ=\pi\ \text{rad}$
    - 弧长公式：$l=|\alpha|r$
    - 扇形面积：$S=\frac{1}{2}lr=\frac{1}{2}|\alpha|r^2$
    - 易错：用弧度制时 $\alpha$ 必须是弧度数，不能带度 🔴
  - { 象限角的范围：第一象限 $(2k\pi,2k\pi+\frac{\pi}{2})$
  - 第二象限 $(2k\pi+\frac{\pi}{2},2k\pi+\pi)$
  - 第三象限 $(2k\pi+\pi,2k\pi+\frac{3\pi}{2})$
  - 第四象限 $(2k\pi+\frac{3\pi}{2},2k\pi+2\pi)$
  - } 四个象限
    - 半角所在象限：用分类讨论或等分象限法判断
- 三角函数的定义 ^definition
  - 设 $P(x,y)$ 为终边上任意一点，$r=\sqrt{x^2+y^2}$
  - { $\sin\alpha=\frac{y}{r}$
  - $\cos\alpha=\frac{x}{r}$
  - $\tan\alpha=\frac{y}{x}$
  - } 三个基本定义
    - 单位圆上：$\sin\alpha=y,\ \cos\alpha=x$
    - 值只与角的大小有关，与点 $P$ 位置无关
  - 各象限符号：一全正、二正弦、三正切、四余弦 🔴
  - 特殊角的三角函数值 <!-- fold -->
    - $\sin 30^\circ=\frac{1}{2},\ \cos 30^\circ=\frac{\sqrt{3}}{2}$
    - $\sin 45^\circ=\cos 45^\circ=\frac{\sqrt{2}}{2}$
    - $\sin 60^\circ=\frac{\sqrt{3}}{2},\ \cos 60^\circ=\frac{1}{2}$
    - $\tan 30^\circ=\frac{\sqrt{3}}{3},\ \tan 45^\circ=1,\ \tan 60^\circ=\sqrt{3}$
  - 三角函数线
    - 正弦线、余弦线、正切线
    - 用于比较大小、解三角不等式
- 同角三角函数的基本关系 ^same
  - 平方关系：$\sin^2\alpha+\cos^2\alpha=1$ 🔴
  - 商数关系：$\tan\alpha=\frac{\sin\alpha}{\cos\alpha}$
  - 应用
    - 知一求二：开方时注意符号由象限确定
    - 齐次式化简：分子分母同除以 $\cos\alpha$ 化为 $\tan\alpha$
    - $\sin\alpha\pm\cos\alpha$ 与 $\sin\alpha\cos\alpha$ 的转化：$(\sin\alpha\pm\cos\alpha)^2=1\pm2\sin\alpha\cos\alpha$
- 诱导公式 ^induce
  - 口诀：奇变偶不变，符号看象限
  - { $\sin(\alpha+2k\pi)=\sin\alpha$
  - $\sin(-\alpha)=-\sin\alpha$
  - $\sin(\pi-\alpha)=\sin\alpha$
  - $\sin(\pi+\alpha)=-\sin\alpha$
  - } 正弦的四组
    - 余弦：$\cos(-\alpha)=\cos\alpha,\ \cos(\pi-\alpha)=-\cos\alpha$
    - 正切：$\tan(\pi+\alpha)=\tan\alpha$
  - $\sin(\frac{\pi}{2}-\alpha)=\cos\alpha$
  - $\cos(\frac{\pi}{2}-\alpha)=\sin\alpha$
  - $\sin(\frac{\pi}{2}+\alpha)=\cos\alpha$
  - 易错：把 $\alpha$ 看成锐角后再定符号，别漏掉符号 🔴
  - 化简步骤：负化正、大化小、化到锐角 <!-- fold -->
    - 先化负角为正角
    - 再去掉 $2\pi$ 的整数倍
    - 最后用诱导公式化为锐角
- 三角函数的图像与性质 ^graph
  - 正弦函数 $y=\sin x$
    - 定义域 $\mathbb{R}$，值域 $[-1,1]$
    - 周期 $T=2\pi$，奇函数
    - 增区间 $[2k\pi-\frac{\pi}{2},2k\pi+\frac{\pi}{2}]$
    - 对称轴 $x=k\pi+\frac{\pi}{2}$，对称中心 $(k\pi,0)$
  - 余弦函数 $y=\cos x$
    - 定义域 $\mathbb{R}$，值域 $[-1,1]$
    - 周期 $T=2\pi$，偶函数
    - 增区间 $[2k\pi-\pi,2k\pi]$
    - 对称轴 $x=k\pi$，对称中心 $(k\pi+\frac{\pi}{2},0)$
  - 正切函数 $y=\tan x$
    - 定义域 $\{x\mid x\ne k\pi+\frac{\pi}{2}\}$，值域 $\mathbb{R}$
    - 周期 $T=\pi$，奇函数
    - 在每个 $(k\pi-\frac{\pi}{2},k\pi+\frac{\pi}{2})$ 内单调递增
    - 对称中心 $(\frac{k\pi}{2},0)$
  - $y=A\sin(\omega x+\varphi)$ ^asin
    - $A$：振幅；$\omega$：决定周期 $T=\frac{2\pi}{\omega}$；$\varphi$：初相
    - 图像变换：先平移再伸缩，与先伸缩再平移的平移量不同 🔴
    - 由图像求解析式：先定 $A$，再由周期定 $\omega$，最后代点定 $\varphi$
    - 五点作图法 <!-- fold -->
      - 令 $\omega x+\varphi=0,\frac{\pi}{2},\pi,\frac{3\pi}{2},2\pi$
      - 列表、描点、连线
  - 周期性、单调性、对称性综合 <!-- fold -->
    - 求单调区间：整体代换 $\omega x+\varphi$，注意 $\omega<0$ 时先化正
    - 求值域：换元转化为 $\sin t$ 在给定区间上的最值
- 三角恒等变换 ^identity
  - 两角和与差
    - $\sin(\alpha\pm\beta)=\sin\alpha\cos\beta\pm\cos\alpha\sin\beta$
    - $\cos(\alpha\pm\beta)=\cos\alpha\cos\beta\mp\sin\alpha\sin\beta$
    - $\tan(\alpha\pm\beta)=\frac{\tan\alpha\pm\tan\beta}{1\mp\tan\alpha\tan\beta}$
  - 二倍角公式 ^double
    - $\sin 2\alpha=2\sin\alpha\cos\alpha$
    - $\cos 2\alpha=\cos^2\alpha-\sin^2\alpha=2\cos^2\alpha-1=1-2\sin^2\alpha$
    - $\tan 2\alpha=\frac{2\tan\alpha}{1-\tan^2\alpha}$
  - 降幂与半角
    - $\sin^2\alpha=\frac{1-\cos 2\alpha}{2}$
    - $\cos^2\alpha=\frac{1+\cos 2\alpha}{2}$
  - 辅助角公式 🔴 ^aux
    - $a\sin x+b\cos x=\sqrt{a^2+b^2}\sin(x+\varphi)$
    - 其中 $\tan\varphi=\frac{b}{a}$，$\varphi$ 所在象限由 $(a,b)$ 决定
    - 用途：化为 $A\sin(\omega x+\varphi)$ 求周期、最值、单调性
  - 变换技巧
    - 角的变换：$\alpha=(\alpha+\beta)-\beta$，$2\alpha=(\alpha+\beta)+(\alpha-\beta)$
    - 函数名变换：切化弦、弦化切
    - 常数代换：$1=\sin^2\alpha+\cos^2\alpha$ <!-- fold -->
- 解三角形 ^triangle
  - 正弦定理 ^sinelaw
    - $\frac{a}{\sin A}=\frac{b}{\sin B}=\frac{c}{\sin C}=2R$
    - 适用：已知两角一边；已知两边及其中一边的对角
    - 易错：已知两边及一边对角时，可能有两解、一解或无解 🔴
  - 余弦定理 ^cosinelaw
    - $a^2=b^2+c^2-2bc\cos A$
    - $\cos A=\frac{b^2+c^2-a^2}{2bc}$
    - 适用：已知三边；已知两边及夹角
  - 面积公式
    - $S=\frac{1}{2}ab\sin C=\frac{1}{2}bc\sin A=\frac{1}{2}ac\sin B$
    - $S=\frac{1}{2}(a+b+c)r$，$r$ 为内切圆半径
  - { 边化角：用正弦定理将 $a$ 换成 $2R\sin A$
  - 角化边：用余弦定理或正弦定理转化为边的关系
  - } 判断三角形形状的两种思路
    - 化为边：考察是否为等腰、直角
    - 化为角：考察 $A+B+C=\pi$ 下的角关系
  - 三角形内的隐含条件 <!-- fold -->
    - $A+B+C=\pi$，故 $\sin(A+B)=\sin C$
    - 大边对大角：$a>b\iff A>B\iff\sin A>\sin B$
    - 两边之和大于第三边
  - 应用问题
    - 测量距离、高度、角度
    - 仰角、俯角、方位角的概念

%%
angle -->|角的概念延伸| definition
definition -->|推出| same
definition -->|推出| induce
same -.->|化简用| induce
induce -->|化到锐角后看图像| graph
asin -->|化简后得到| aux
identity -->|推出| double
double -.->|特例| identity
aux -->|研究性质| graph
identity -->|工具| triangle
sinelaw -.->|对比| cosinelaw
%%
