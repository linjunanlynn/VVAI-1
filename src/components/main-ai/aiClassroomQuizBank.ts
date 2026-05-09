/**
 * 随堂练习题题库（demo · 物理「力的合成与分解」）
 *
 * - 3 道单选题，覆盖：基础概念 / 关键工具 / 变式应用
 * - 每题都有 `pitfalls`（易错诊断）+ `reviewSlideIndex`（卡点对应的课件页）
 * - 老师 push sheet 直接选用其一即可秒推；后续可扩展为"AI 出题"
 */

import type { AiClassroomQuizQuestion } from "./aiClassroomQuizBus"

export const QUIZ_BANK: AiClassroomQuizQuestion[] = [
  {
    id: "q-vec-perp-5n",
    type: "single",
    stem: "F₁ = 3N、F₂ = 4N，二者垂直时合力 F 等于？",
    options: ["7 N", "5 N", "1 N", "12 N"],
    correctIndex: 1,
    explanation:
      "两力垂直时合力 = √(F₁² + F₂²) = √(9 + 16) = 5 N。先勾股，再开方。",
    pitfalls: {
      0: "把矢量加法当成了标量加法（直接 3+4=7）",
      2: "把垂直合成误用成了反向相减",
      3: "把矢量当成乘法 / 没有用勾股，看到 3 和 4 就联想到 12",
    },
    deadlineSec: 60,
    knowledgeTag: "矢量合成 · 勾股",
    reviewSlideIndex: 3,
  },
  {
    id: "q-direction-judge",
    type: "single",
    stem: "两力大小相等、方向相反，合力 F 是多少？",
    options: ["2 倍单力", "等于单力", "0", "无法确定"],
    correctIndex: 2,
    explanation:
      "等大反向 = 互相抵消，合力为 0。这就是矢量加法和数量加法最大的不同——方向是关键。",
    pitfalls: {
      0: "忽略了方向，直接做标量加法（×2）",
      1: "记成了「等大同向」的情形",
      3: "对反向合成原理不熟",
    },
    deadlineSec: 60,
    knowledgeTag: "矢量方向判断",
    reviewSlideIndex: 2,
  },
  {
    id: "q-parallelogram-rule",
    type: "single",
    stem: "用平行四边形法则求合力时，下列哪一步是必须的？",
    options: [
      "把两力起点重合作邻边",
      "把两力首尾相接作三角形",
      "把两力平行平移到原点上方",
      "先求两力数量和再画方向",
    ],
    correctIndex: 0,
    explanation:
      "平行四边形法则的核心是「起点重合、以两力为邻边、对角线为合力」。三角形法则也对，但不是平行四边形法则的步骤。",
    pitfalls: {
      1: "混淆了三角形法则与平行四边形法则",
      2: "省略了「邻边」这个关键约束，画法不规范",
      3: "把矢量误当成标量先求和",
    },
    deadlineSec: 60,
    knowledgeTag: "平行四边形法则",
    reviewSlideIndex: 3,
  },
]
