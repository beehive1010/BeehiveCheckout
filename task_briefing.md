# 任务简介：创建插图和三三矩阵页面

## 任务目标
1. **安装动画组件**：已完成 react-spring, lottie-react, react-intersection-observer
2. **创建插图和动画组件**：为首页添加动感的视觉元素
3. **制作三三矩阵讲解页面**：基于 MarketingPlan.md 内容
4. **增强首页动画效果**：使用新安装的动画库
5. **添加路由配置**：确保新页面可访问

## 三三矩阵核心概念（来自 MarketingPlan.md）
- **19层矩阵系统**：每层3^n个成员
  - 第1层：3个成员
  - 第2层：9个成员
  - 第3层：27个成员
  - 直到第19层：3^19个成员
- **放置规则**：L → M → R 优先级
- **奖励系统**：基于层级和等级的收益分配
- **升级机制**：sequential NFT purchase (Level 1-19)
- **激活费用**：130 USDC (100 NFT + 30 activation fee)

## 当前项目结构
- 路由：wouter in App.tsx
- 现有页面：src/pages/
- Landing组件：src/components/landing/
- 已安装动画库：framer-motion, react-spring, lottie-react, react-intersection-observer

## 设计要求
- 深色主题，蜂蜜黄色accent (honey theme)
- 蜂巢几何图案设计元素
- 响应式设计 (mobile-first)
- 高级动画效果，60fps性能
- 多语言支持 (中文、英文、日文、韩文、马来文、泰文)