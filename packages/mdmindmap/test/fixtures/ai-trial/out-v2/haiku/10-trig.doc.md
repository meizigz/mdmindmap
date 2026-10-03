# 三角函数

- 任意角与弧度制 ^angle-radian
  - 任意角 ^arbitrary-angle <!-- fold -->
    - 定义：在平面内，一条射线绕顶点旋转
    - 正角：逆时针旋转
    - 负角：顺时针旋转
    - 零角：射线不旋转
    - 终边相同的角 ^coterminal
      - $\alpha + 2k\pi$（$k \in \mathbb{Z}$）
      - 形式统一：描述角的集合
  - 弧度制 ^radian <!-- fold -->
    - { 定义
    - 弧长等于半径的圆心角为 1 弧度
    - $\theta = \frac{l}{r}$（$l$ 弧长，$r$ 半径）
    - } 弧度定义
    - { 换算关系
    - $\pi$ 弧度 $= 180°$
    - $1° = \frac{\pi}{180}$ 弧度
    - $1$ 弧度 $= \frac{180°}{\pi} \approx 57.3°$
    - } 角度互化
    - 优点：使计算简化，自然单位
- 三角函数的定义 ^definition <!-- fold -->
  - 直角坐标定义 ^definition-rect
    - 设 $P(x, y)$ 在单位圆上，$\angle AOP = \alpha$
    - $\sin\alpha = y$
    - $\cos\alpha = x$
    - $\tan\alpha = \frac{y}{x} = \frac{\sin\alpha}{\cos\alpha}$
  - 余割、割线、余切 ^reciprocal
    - $\csc\alpha = \frac{1}{\sin\alpha}$
    - $\sec\alpha = \frac{1}{\cos\alpha}$
    - $\cot\alpha = \frac{1}{\tan\alpha} = \frac{\cos\alpha}{\sin\alpha}$
  - 象限角的符号 🔴
    - 第一象限：都为正
    - 第二象限：$\sin > 0$，$\cos < 0$，$\tan < 0$
    - 第三象限：都为负
    - 第四象限：$\cos > 0$，$\sin < 0$，$\tan < 0$
    - 简记：一全正，二正弦，三正切，四余弦
- 诱导公式 ^induction-formula <!-- fold -->
  - { 终边相同的角
  - $\sin(\alpha + 2k\pi) = \sin\alpha$
  - $\cos(\alpha + 2k\pi) = \cos\alpha$
  - } 周期性
  - { 关于原点对称
  - $\sin(-\alpha) = -\sin\alpha$
  - $\cos(-\alpha) = \cos\alpha$
  - } 奇偶性
  - { 关于 $x$ 轴对称
  - $\sin(\pi - \alpha) = \sin\alpha$
  - $\cos(\pi - \alpha) = -\cos\alpha$
  - } 补角关系
  - { 关于 $y$ 轴对称
  - $\sin(\pi + \alpha) = -\sin\alpha$
  - $\cos(\pi + \alpha) = -\cos\alpha$
  - } 终边在相反方向
  - { 关于直线 $y = x$ 对称
  - $\sin(\frac{\pi}{2} - \alpha) = \cos\alpha$
  - $\cos(\frac{\pi}{2} - \alpha) = \sin\alpha$
  - } 余函数关系
  - { 综合应用
  - $\sin(\frac{\pi}{2} + \alpha) = \cos\alpha$
  - $\cos(\frac{\pi}{2} + \alpha) = -\sin\alpha$
  - } 扩展公式
- 同角三角函数关系 ^same-angle
  - { 平方关系
  - $\sin^2\alpha + \cos^2\alpha = 1$
  - 应用：已知一个可求另一个
  - } 基本恒等式
  - { 商数关系
  - $\tan\alpha = \frac{\sin\alpha}{\cos\alpha}$
  - 联系三个函数
  - } 商关系
  - { 倒数关系
  - $\sin\alpha \cdot \csc\alpha = 1$
  - $\cos\alpha \cdot \sec\alpha = 1$
  - } 倒数恒等式
  - 常见技巧 ^same-angle-skill <!-- fold -->
    - 变形：$\sin^2\alpha = 1 - \cos^2\alpha$
    - 齐次化：分子分母同除 $\cos^2\alpha$
    - 已知 $\tan\alpha$，求 $\sin\alpha$、$\cos\alpha$
- 图像与性质 ^graph-property <!-- fold -->
  - 正弦函数 $y = \sin x$ ^sine
    - 定义域：$\mathbb{R}$
    - 值域：$[-1, 1]$
    - 周期：$2\pi$
    - 单调性：$[-\frac{\pi}{2} + 2k\pi, \frac{\pi}{2} + 2k\pi]$ 递增
    - 对称中心：$(k\pi, 0)$
    - 对称轴：$x = \frac{\pi}{2} + k\pi$
  - 余弦函数 $y = \cos x$ ^cosine
    - 定义域：$\mathbb{R}$
    - 值域：$[-1, 1]$
    - 周期：$2\pi$
    - 单调性：$[2k\pi - \pi, 2k\pi]$ 递减，$[2k\pi, 2k\pi + \pi]$ 递增
    - 对称中心：$(\frac{\pi}{2} + k\pi, 0)$
    - 对称轴：$x = k\pi$
  - 正切函数 $y = \tan x$ ^tangent
    - 定义域：$x \neq \frac{\pi}{2} + k\pi$
    - 值域：$\mathbb{R}$
    - 周期：$\pi$（半周期）
    - 单调性：$(-\frac{\pi}{2} + k\pi, \frac{\pi}{2} + k\pi)$ 递增
    - 对称中心：$(k\frac{\pi}{2}, 0)$
  - 函数变换 ^function-transform <!-- fold -->
    - $y = A\sin(Bx + C) + D$ 的参数
      - $A$：振幅，$|A|$
      - $B$：角频率，周期 $T = \frac{2\pi}{|B|}$
      - $C$：初相位，平移 $-\frac{C}{B}$
      - $D$：竖直平移
    - 对称轴：令 $Bx + C = \frac{\pi}{2} + k\pi$
    - 对称中心：令 $Bx + C = k\pi$
    - 最值：$A > 0$ 时，最大值 $A + D$，最小值 $-A + D$
- 两角和与差的三角函数 ^sum-diff
  - { 和角公式
  - $\sin(\alpha + \beta) = \sin\alpha\cos\beta + \cos\alpha\sin\beta$
  - $\cos(\alpha + \beta) = \cos\alpha\cos\beta - \sin\alpha\sin\beta$
  - $\tan(\alpha + \beta) = \frac{\tan\alpha + \tan\beta}{1 - \tan\alpha\tan\beta}$
  - } 和角公式
  - { 差角公式
  - $\sin(\alpha - \beta) = \sin\alpha\cos\beta - \cos\alpha\sin\beta$
  - $\cos(\alpha - \beta) = \cos\alpha\cos\beta + \sin\alpha\sin\beta$
  - $\tan(\alpha - \beta) = \frac{\tan\alpha - \tan\beta}{1 + \tan\alpha\tan\beta}$
  - } 差角公式
  - 应用 ^sum-diff-apply <!-- fold -->
    - 已知两个角求和差的三角函数值
    - 化简三角式
    - 解三角方程
- 二倍角公式 🔴 ^double-angle
  - { 正弦二倍角
  - $\sin 2\alpha = 2\sin\alpha\cos\alpha$
  - } 正弦
  - { 余弦二倍角
  - $\cos 2\alpha = \cos^2\alpha - \sin^2\alpha$
  - $\cos 2\alpha = 2\cos^2\alpha - 1$
  - $\cos 2\alpha = 1 - 2\sin^2\alpha$
  - } 余弦
  - { 正切二倍角
  - $\tan 2\alpha = \frac{2\tan\alpha}{1 - \tan^2\alpha}$
  - } 正切
  - 降幂公式 ^power-reduction
    - $\sin^2\alpha = \frac{1 - \cos 2\alpha}{2}$
    - $\cos^2\alpha = \frac{1 + \cos 2\alpha}{2}$
    - $\sin\alpha\cos\alpha = \frac{\sin 2\alpha}{2}$
  - 半角公式 ^half-angle
    - $\sin\frac{\alpha}{2} = \pm\sqrt{\frac{1 - \cos\alpha}{2}}$
    - $\cos\frac{\alpha}{2} = \pm\sqrt{\frac{1 + \cos\alpha}{2}}$
    - $\tan\frac{\alpha}{2} = \frac{\sin\alpha}{1 + \cos\alpha} = \frac{1 - \cos\alpha}{\sin\alpha}$
- 恒等变换 ^identity-transform <!-- fold -->
  - { 积化和差
  - $\sin\alpha\cos\beta = \frac{1}{2}[\sin(\alpha + \beta) + \sin(\alpha - \beta)]$
  - $\cos\alpha\cos\beta = \frac{1}{2}[\cos(\alpha + \beta) + \cos(\alpha - \beta)]$
  - } 积化和差公式
  - { 和差化积
  - $\sin A + \sin B = 2\sin\frac{A+B}{2}\cos\frac{A-B}{2}$
  - $\cos A + \cos B = 2\cos\frac{A+B}{2}\cos\frac{A-B}{2}$
  - } 和差化积公式
  - 辅助角公式 ^auxiliary-angle
    - $a\sin x + b\cos x = \sqrt{a^2 + b^2}\sin(x + \phi)$
    - $\tan\phi = \frac{b}{a}$
    - 用于求最值和化简
- 解三角形 ^solve-triangle
  - { 正弦定理
  - $\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C} = 2R$
  - $R$ 为外接圆半径
  - } 正弦定理应用
    - 已知两角一边 → 求第三边
    - 已知两边一对角 → 求另一边或角
  - { 余弦定理
  - $a^2 = b^2 + c^2 - 2bc\cos A$
  - $\cos A = \frac{b^2 + c^2 - a^2}{2bc}$
  - } 余弦定理应用
    - 已知三边 → 求角
    - 已知两边及夹角 → 求第三边
  - 面积公式 ^triangle-area
    - $S = \frac{1}{2}ab\sin C$
    - $S = \frac{1}{2}bc\sin A$
    - $S = \frac{1}{2}ac\sin B$
  - 解三角形步骤 ^solve-steps <!-- fold -->
    - 明确已知条件：SSS、SAS、ASA、AAS、SSA
    - 选择定理：正弦定理或余弦定理
    - 列方程求解
    - 检验答案合理性（三角形内角和 180°）

%%
angle-radian -->|用于| definition
definition -->|应用| induction-formula
induction-formula -->|配合| same-angle
same-angle ==>|决定| graph-property
graph-property -->|进阶| sum-diff
sum-diff -->|特例| double-angle
double-angle -->|综合| identity-transform
identity-transform -->|应用于| solve-triangle
coterminal -.->|概念相关| arbitrary-angle
sine -.->|对应| cosine
sine -.->|对比| tangent
function-transform -->|改变| graph-property
power-reduction -.->|来自| double-angle
half-angle -.->|衍生| double-angle
auxiliary-angle -->|化简用| identity-transform
%%