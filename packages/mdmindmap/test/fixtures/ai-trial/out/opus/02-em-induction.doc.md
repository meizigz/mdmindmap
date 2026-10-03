# 电磁感应

- 基础概念 ^basic
  - 磁通量 $\Phi=BS\cos\theta$
  - 产生感应电流条件：闭合回路 + $\Phi$ 变化 ^cond
  - 有 $\Phi$ 不一定有感应电流 🔴
- 法拉第电磁感应定律 ^faraday
  - $E=n\frac{\Delta\Phi}{\Delta t}$
  - $E$ 取决于 $\Phi$ 的变化率，不是 $\Phi$ 大小 🔴
  - 导体切割 $E=BLv$ ^blv
    - $B$、$L$、$v$ 两两垂直
    - $L$ 为有效长度 🔴
  - 转动切割 $E=\frac{1}{2}BL^2\omega$
  - 电荷量 $q=n\frac{\Delta\Phi}{R}$ ^charge
    - 与时间无关
- 楞次定律 🔴 ^lenz
  - 内容：感应电流磁场**阻碍**原磁通量变化
  - 「阻碍」不是「阻止」 🔴
  - { 增反减同
  - 来拒去留
  - 增缩减扩
  - } 推论：阻碍的几种表现
    - 本质：能量守恒 ^energy
  - 右手定则：切割时判方向 ^right-hand
  - 判断步骤 <!-- fold -->
    - 明确原磁场方向
    - 判断 $\Phi$ 增大还是减小
    - 确定感应电流磁场方向
    - 安培定则判电流方向
- 自感与互感 ^self-ind
  - 自感：线圈自身电流变化引起
    - $E=L\frac{\Delta I}{\Delta t}$
    - 自感系数 $L$：与匝数、长度、横截面积、铁芯有关
  - 通电自感：灯泡逐渐变亮
  - 断电自感 🟠 ^off
    - 灯泡闪亮条件：$I_L>I_灯$ 🔴
    - 电流方向可能反向
  - 互感：变压器原理
    - [[变压器]]
  - 应用与防止 <!-- fold -->
    - 日光灯镇流器
    - 双线绕法消除自感
- 综合问题 <!-- fold --> ^comp
  - 电路问题：等效电源 + 内阻
  - 动力学：安培力 $F=\frac{B^2L^2v}{R}$
  - 能量：克服安培力做功 = 电能
  - 图像问题：$\Phi$-$t$、$E$-$t$、$I$-$t$

%%
cond -->|定量| faraday
lenz -->|决定方向| faraday
blv -.->|特例| faraday
right-hand -.->|等价| lenz
self-ind -->|方向遵循| lenz
energy ==> comp
charge -.-> comp
off -.->|阻碍电流减小| lenz
%%
