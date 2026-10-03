# 三角函数

- 任意角与弧度制 ^angle
  - 任意角
    - { 正角：逆时针旋转
    - 负角：顺时针旋转
    - 零角：没有旋转
    - } 按旋转方向分类
    - 象限角：终边落在第几象限
    - 轴线角：终边在坐标轴上
    - 终边相同的角：$\beta=\alpha+k\cdot 360^\circ,k\in\mathbb{Z}$ 🔴
  - 弧度制 ^radian
    - 定义：弧长等于半径的弧所对圆心角为 1 rad
    - $180^\circ=\pi\ \text{rad}$
    - $1\ \text{rad}=\left(\frac{180}{\pi}\right)^\circ\approx 57.3^\circ$
    - 弧长公式 $l=|\alpha|r$
    - 扇形面积 $S=\frac{1}{2}lr=\frac{1}{2}|\alpha|r^2$
    - 角度与弧度不能混用 🔴
- 三角函数定义 ^def
  - 单位圆定义 🔵
    - $\sin\alpha=y$
    - $\cos\alpha=x$
    - $\tan\alpha=\frac{y}{x}\ (x\ne 0)$
  - 终边上任一点 $P(x,y)$，$r=\sqrt{x^2+y^2}$
    - $\sin\alpha=\frac{y}{r}$，$\cos\alpha=\frac{x}{r}$
  - 各象限符号 🟠
    - 口诀：一全正、二正弦、三正切、四余弦
  - 特殊角函数值 <!-- fold -->
    - $\sin 30^\circ=\frac{1}{2}$，$\cos 30^\circ=\frac{\sqrt{3}}{2}$
    - $\sin 45^\circ=\cos 45^\circ=\frac{\sqrt{2}}{2}$
    - $\sin 60^\circ=\frac{\sqrt{3}}{2}$，$\cos 60^\circ=\frac{1}{2}$
    - $\tan 30^\circ=\frac{\sqrt{3}}{3}$，$\tan 60^\circ=\sqrt{3}$
  - 三角函数线 <!-- fold -->
    - 正弦线、余弦线、正切线
    - 用于比较大小、解不等式
- 同角三角函数关系 ^same-angle
  - { 平方关系：$\sin^2\alpha+\cos^2\alpha=1$ 🔴 ^square
  - 商数关系：$\tan\alpha=\frac{\sin\alpha}{\cos\alpha}$
  - } 两个基本关系
    - 知一求二：注意象限定符号 🔴
    - 齐次式：分子分母同除 $\cos\alpha$
    - $1$ 的代换：$1=\sin^2\alpha+\cos^2\alpha$
  - $(\sin\alpha\pm\cos\alpha)^2=1\pm 2\sin\alpha\cos\alpha$
- 诱导公式 🟠 ^induce
  - 口诀：奇变偶不变，符号看象限 🔴
  - 公式 <!-- fold -->
    - $\sin(\alpha+2k\pi)=\sin\alpha$
    - $\sin(\pi+\alpha)=-\sin\alpha$，$\cos(\pi+\alpha)=-\cos\alpha$
    - $\sin(-\alpha)=-\sin\alpha$，$\cos(-\alpha)=\cos\alpha$
    - $\sin(\pi-\alpha)=\sin\alpha$，$\cos(\pi-\alpha)=-\cos\alpha$
    - $\sin(\frac{\pi}{2}-\alpha)=\cos\alpha$，$\cos(\frac{\pi}{2}-\alpha)=\sin\alpha$
    - $\sin(\frac{\pi}{2}+\alpha)=\cos\alpha$，$\cos(\frac{\pi}{2}+\alpha)=-\sin\alpha$
  - 化简步骤
    - { 负化正
    - 大化小
    - 化到锐角
    - } 化任意角为锐角
      - 把 $\alpha$ 看作锐角判断符号
- 图像与性质 ^graph
  - 正弦函数 $y=\sin x$ ^sin-graph
    - 定义域 $\mathbb{R}$，值域 $[-1,1]$
    - 周期 $T=2\pi$
    - 奇函数
    - 增区间 $[-\frac{\pi}{2}+2k\pi,\frac{\pi}{2}+2k\pi]$
    - 对称轴 $x=\frac{\pi}{2}+k\pi$
    - 对称中心 $(k\pi,0)$
  - 余弦函数 $y=\cos x$ <!-- fold -->
    - 值域 $[-1,1]$，周期 $2\pi$
    - 偶函数
    - 增区间 $[-\pi+2k\pi,2k\pi]$
    - 对称轴 $x=k\pi$
    - 对称中心 $(\frac{\pi}{2}+k\pi,0)$
  - 正切函数 $y=\tan x$ <!-- fold -->
    - 定义域 $x\ne\frac{\pi}{2}+k\pi$
    - 周期 $T=\pi$ 🔴
    - 奇函数
    - 在每个 $(-\frac{\pi}{2}+k\pi,\frac{\pi}{2}+k\pi)$ 内递增
    - 对称中心 $(\frac{k\pi}{2},0)$，无对称轴
  - 五点作图法
    - 取 $0,\frac{\pi}{2},\pi,\frac{3\pi}{2},2\pi$
  - $y=A\sin(\omega x+\varphi)$ 🔴 ^asin
    - 振幅 $A$
    - 周期 $T=\frac{2\pi}{|\omega|}$
    - 初相 $\varphi$
    - 图像变换 <!-- fold -->
      - 先平移后伸缩：平移 $|\varphi|$ 个单位
      - 先伸缩后平移：平移 $\frac{|\varphi|}{\omega}$ 个单位 🔴
      - 横坐标伸缩为原来的 $\frac{1}{\omega}$ 倍
      - 纵坐标伸缩为原来的 $A$ 倍
    - 由图像求解析式
      - $A$ 看最值，$\omega$ 看周期，$\varphi$ 代最值点
- 三角恒等变换 ^identity
  - 两角和差公式 🔵 ^sum-diff
    - $\sin(\alpha\pm\beta)=\sin\alpha\cos\beta\pm\cos\alpha\sin\beta$
    - $\cos(\alpha\pm\beta)=\cos\alpha\cos\beta\mp\sin\alpha\sin\beta$
    - $\tan(\alpha\pm\beta)=\frac{\tan\alpha\pm\tan\beta}{1\mp\tan\alpha\tan\beta}$
  - 二倍角公式 ^double
    - $\sin 2\alpha=2\sin\alpha\cos\alpha$
    - $\cos 2\alpha=\cos^2\alpha-\sin^2\alpha$
      - $=2\cos^2\alpha-1=1-2\sin^2\alpha$
    - $\tan 2\alpha=\frac{2\tan\alpha}{1-\tan^2\alpha}$
  - 降幂公式 <!-- fold -->
    - $\cos^2\alpha=\frac{1+\cos 2\alpha}{2}$
    - $\sin^2\alpha=\frac{1-\cos 2\alpha}{2}$
  - 辅助角公式 🔴 ^aux
    - $a\sin x+b\cos x=\sqrt{a^2+b^2}\sin(x+\varphi)$
    - $\tan\varphi=\frac{b}{a}$
  - 变换技巧 <!-- fold -->
    - { 角的变换：$\alpha=(\alpha+\beta)-\beta$
    - 函数名变换：切化弦
    - 次数变换：升幂、降幂
    - } 三变思想
      - 先看角、再看名、后看式
- 解三角形 ^triangle
  - 内角和 $A+B+C=\pi$
    - $\sin(A+B)=\sin C$
  - 正弦定理 ^sine-law
    - $\frac{a}{\sin A}=\frac{b}{\sin B}=\frac{c}{\sin C}=2R$
    - 适用：两角一边、两边一对角
    - 两边一对角可能两解 🔴
    - 边角互化 $a=2R\sin A$
  - 余弦定理 ^cos-law
    - $a^2=b^2+c^2-2bc\cos A$
    - $\cos A=\frac{b^2+c^2-a^2}{2bc}$
    - 适用：三边、两边一夹角
    - 判断三角形形状：看 $\cos A$ 符号
  - 面积公式
    - $S=\frac{1}{2}ab\sin C$
    - $S=\frac{1}{2}ah_a$
  - 实际应用 <!-- fold -->
    - 测距离
    - 测高度
    - 仰角、俯角、方位角
    - [[解三角形应用题]]

%%
radian -->|统一单位| def
def ==>|推出| square
def -->|单位圆对称| induce
square -.->|推出降幂| double
sum-diff ==>|令 β=α| double
sum-diff -->|推出| aux
aux -->|化为| asin
sin-graph -->|伸缩平移| asin
induce -.->|特例| sum-diff
sine-law -.->|对比| cos-law
identity -->|工具| triangle
%%
