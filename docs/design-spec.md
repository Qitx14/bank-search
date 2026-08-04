# UI 设计规范

## 设计原则

- **简洁直观**：减少操作步骤，主功能一眼可见
- **大触控区域**：按钮最小 44x44pt（符合 iOS 人机交互指南）
- **容错设计**：加载状态明确，错误有提示，操作可撤销
- **一致性**：同类元素使用相同的视觉语言

---

## 色彩系统

| 角色 | 色值 | 用途 |
|------|------|------|
| 主色 Primary | `#1976D2` | 按钮、导航栏激活态、链接 |
| 主色浅 Light | `#42A5F5` | 悬停态、聚焦态 |
| 主色深 Dark | `#1565C0` | 按钮按下态 |
| 背景色 Background | `#F0F4F8` | 全局页面背景 |
| 卡片白 Surface | `#FFFFFF` | 卡片、列表项背景 |
| 文字主色 Text Primary | `#1A1A2E` | 标题、正文 |
| 文字次色 Text Secondary | `#6B7280` | 辅助说明、时间戳 |
| 成功 Success | `#10B981` | 匹配成功 |
| 警告 Warning | `#F59E0B` | 低匹配度提示 |
| 错误 Error | `#EF4444` | 导入失败、识别失败 |
| 分割线 Divider | `#E5E7EB` | 列表分隔 |

### 色彩使用规则
- 主按钮用 Primary 填充 + 白色文字
- 次要按钮用 Primary 描边 + 透明背景 + Primary 文字
- 卡片用 Surface 白底 + 8px 圆角 + 微弱阴影
- 不直接使用纯黑（#000）或纯白（#FFF），始终走色值表

---

## 字体排版

| 层级 | 字号 | 字重 | 用途 |
|------|------|------|------|
| H1 | 24px | 700 | 页面标题 |
| H2 | 20px | 600 | 区块标题 |
| H3 | 16px | 600 | 卡片标题、题目文本 |
| Body | 15px | 400 | 正文、选项内容 |
| Caption | 13px | 400 | 辅助说明、匹配分数 |
| Small | 11px | 400 | 标签、徽章 |

- 字体栈：`-apple-system, "PingFang SC", "Helvetica Neue", sans-serif`
- 行高：标题 1.3，正文 1.6
- 所有文字左对齐，中文不强制两端对齐

---

## 间距系统

基于 4px 网格：

| Token | 值 | 用途 |
|-------|------|------|
| xs | 4px | 图标与文字间距 |
| sm | 8px | 紧凑元素间距 |
| md | 12px | 卡片内边距 |
| lg | 16px | 页面水平边距、区块间距 |
| xl | 24px | 大区块间距 |
| 2xl | 32px | 页面顶部/底部留白 |

---

## 组件规范

### 底部导航栏
- 高度：56px + safe-area-inset-bottom
- 背景：Surface 白色 + 顶部分割线
- 3 个 tab：🔍搜题 / 📚题库 / 🕐历史
- 激活态：Primary 色图标+文字
- 未激活：Text Secondary 色

### 主按钮（Primary Button）
- 高度：48px，宽度撑满容器（最大 360px 居中）
- 圆角：12px
- 背景：Primary `#1976D2`
- 文字：白色，16px，600 字重
- 按下态：Dark `#1565C0`
- 禁用态：`#93C5FD` 背景 + 白色文字

### 卡片（Card）
- 圆角：12px
- 背景：Surface 白色
- 阴影：`0 1px 3px rgba(0,0,0,0.08)`
- 内边距：md (12px)
- 卡片间距：sm (8px)

### 图片缩略图
- 尺寸：80x80px 正方形
- 圆角：8px
- 边框：1px Divider
- 选中态：2px Primary 边框

### 进度条
- 高度：6px
- 圆角：3px
- 背景：Divider
- 填充：Primary
- 动画：ease-out 300ms

---

## iPhone 适配

### 安全区域
- 顶部：`env(safe-area-inset-top)`（刘海屏/灵动岛）
- 底部：`env(safe-area-inset-bottom)`（Home Indicator）
- 页面内容区避开安全区域

### 视口设置
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, 
  maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

### 触控目标
- 所有可交互元素至少 44x44px
- 按钮之间有足够间距防止误触

---

## 动画规范

| 类型 | 时长 | 缓动 | 用途 |
|------|------|------|------|
| 页面切换 | 200ms | ease-out | 路由切换 |
| 卡片出现 | 300ms | ease-out | 列表加载 |
| 进度更新 | 300ms | ease-out | OCR 进度条 |
| 按钮反馈 | 100ms | ease-in-out | 按下缩放 |
| 加载循环 | 1.2s | linear | 旋转加载图标 |

### 动画原则
- 不滥用动画，仅用于提供反馈和引导注意力
- 所有动画时长 ≤ 300ms（不拖慢操作节奏）
- 遵循 `prefers-reduced-motion` 媒体查询，尊重用户系统设置

---

## 图标

- 使用 SVG 内联图标（体积小、可着色）
- 从 Lucide Icons 选取（风格统一、MIT 协议）
- 常用尺寸：24x24（导航）、20x20（按钮内）、16x16（内联）

---

> 版本：v1.0 | 日期：2026-08-03
