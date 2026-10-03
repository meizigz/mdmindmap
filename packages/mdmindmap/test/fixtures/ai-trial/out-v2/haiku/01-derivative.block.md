好的，帮你整理一下导数的知识点：

```mdmindmap
# 导数与函数的单调性、极值、最值

- 导数的定义 ^deriv-def
  - $f'(x) = \lim_{\Delta x \to 0} \frac{\Delta y}{\Delta x}$
  - 几何意义：切线的斜率
  - 物理意义：瞬时变化率
- 导数与单调性 ^monotonic
  - 若 $f'(x) > 0$，则 $f(x)$ 在该区间递增
  - 若 $f'(x) < 0$，则 $f(x)$ 在该区间递减
  - 若 $f'(x) = 0$，该点可能是极值点
- 极值 🔴 ^extrema
  - 极大值：$f'(x)$ 从正变负
  - 极小值：$f'(x)$ 从负变正
  - 判断方法：二阶导数或导数变号法
- 最值 ^max-min
  - 在闭区间 $[a, b]$ 上：比较端点与极值点
  - 最大值：所有候选点中的最大值
  - 最小值：所有候选点中的最小值

%%
deriv-def -->|决定| monotonic
monotonic -->|包含| extrema
extrema -->|求出后| max-min
%%
```