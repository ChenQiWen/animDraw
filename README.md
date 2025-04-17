# CSS曲线动画生成器

## 项目简介

这是一个可视化的CSS动画路径生成工具，旨在帮助前端开发者轻松创建自然流畅的动画效果。通过直观的交互方式，开发者可以绘制动画路径，系统会自动将鼠标移动轨迹和速度转换为CSS动画参数。

特别之处在于：此工具不仅生成timing-function，还能让元素**沿着您绘制的实际路径移动**，而不仅仅是从起点到终点的直线运动。

## 在线体验

访问 [CSS曲线动画生成器](https://chenqiwen.github.io/css-curve-animator/) 立即开始使用。

## 核心功能

- **轨迹绘制**：通过鼠标绘制元素移动路径
- **速度感知**：基于鼠标移动速度自动生成timing-function参数
- **路径跟随**：元素沿着实际绘制的曲线路径移动，而非简单的直线
- **实时预览**：即时查看动画效果
- **代码生成**：自动生成可用的CSS动画代码（包含Motion Path）

## 使用方法

1. 打开项目或在线演示页面
2. 可拖动调整蓝色起点和红色终点的位置
3. 按住鼠标左键在画布上绘制期望的动画路径（注意移动速度）
4. 点击"预览动画"按钮查看效果
5. 点击"复制CSS代码"获取生成的CSS代码
6. 点击"重置路径"可重新开始

## 技术实现

- 原生JavaScript捕获鼠标轨迹和时间
- Canvas绘制路径可视化
- 算法将鼠标轨迹转换为cubic-bezier参数
- CSS Motion Path (offset-path)实现元素沿曲线运动
- 内置兼容性回退机制

## 本地部署

1. 克隆项目
   ```
   git clone https://github.com/ChenQiWen/css-curve-animator.git
   ```

2. 直接打开index.html文件即可使用，无需构建或安装依赖

## 浏览器兼容性

- 完整功能（沿曲线路径移动）：
  - Chrome 64+
  - Firefox 72+
  - Edge 79+
  - Safari 16.4+

- 基础功能（直线移动+timing-function）：
  - 所有现代浏览器

## 项目结构

- `index.html`: 页面结构
- `style.css`: 样式定义
- `script-new.js`: 功能实现（含Motion Path支持）
- `script.js`: 旧版功能（仅支持timing-function）

## 未来扩展

- 支持多元素动画链式编排
- 添加预设动画模板库
- 实现路径编辑功能
- 支持导出为React/Vue动画组件
- 集成AI辅助优化动画参数

## 贡献指南

欢迎提交Issue或Pull Request来完善此项目。

## 开源协议

MIT