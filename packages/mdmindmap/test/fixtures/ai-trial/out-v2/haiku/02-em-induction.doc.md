# 电磁感应

- 法拉第电磁感应定律 ^faraday
  - 定律内容：磁通量变化产生感应电动势
  - $\varepsilon = -n \frac{\Delta \Phi_B}{\Delta t}$
  - 磁通量：$\Phi_B = BS\cos\theta$
  - 产生条件：闭合回路中磁通量变化
- 楞次定律 🔴 ^lenz
  - 感应电流方向规则
  - 阻碍磁通量变化：增大则反向，减小则同向
  - 判断方向：左手定则结合磁场方向
  - 能量守恒体现：对变化的反抗
- 自感与互感 <!-- fold --> ^induction
  - 自感 ^self-ind
    - 线圈内磁通量变化，产生自感电动势
    - $\varepsilon = -L \frac{\Delta I}{\Delta t}$
    - 线圈自身系数：自感系数 $L$
    - 惯性效应：开关启闭时产生反向电动势
  - 互感 ^mutual-ind
    - 一个线圈电流变化，影响临近线圈
    - 两线圈间的耦合效应
    - 变压器工作原理基础

%%
faraday -->|描述现象| lenz
lenz -->|决定方向| self-ind
self-ind -.->|相关概念| mutual-ind
%%