// 重要日子倒计时小组件
// 支持添加多个日期，自动显示最近的未过期事件
// 过期后自动切换到下一个最近的事件
//
// 环境变量：
//   EVENTS - JSON 数组，每个元素包含:
//     title: 事件标题
//     date:  目标日期，ISO 8601 格式
//     icon:  SF Symbol 图标名（可选，默认 "calendar"）
//     color1: 渐变起始色（可选）
//     color2: 渐变结束色（可选）
//
// 示例：
//   EVENTS: '[{"title":"春节","date":"2027-01-25T00:00:00+08:00","icon":"party.popper"},{"title":"生日","date":"2026-08-15T00:00:00+08:00","icon":"gift"}]'

// 默认事件列表（用户未配置时使用）
const DEFAULT_EVENTS = [
  { title: "元旦", date: "2027-01-01T00:00:00+08:00", icon: "sparkles" },
  { title: "春节", date: "2027-01-25T00:00:00+08:00", icon: "party.popper" },
];

// 预设配色方案，按顺序轮换
const COLOR_PRESETS = [
  { color1: "#6366F1", color2: "#8B5CF6" }, // 靛蓝紫
  { color1: "#F43F5E", color2: "#FB7185" }, // 玫瑰红
  { color1: "#0EA5E9", color2: "#38BDF8" }, // 天空蓝
  { color1: "#10B981", color2: "#34D399" }, // 翡翠绿
  { color1: "#F59E0B", color2: "#FBBF24" }, // 琥珀黄
  { color1: "#8B5CF6", color2: "#A78BFA" }, // 紫罗兰
];

export default async function (ctx) {
  const env = ctx.env;

  // 解析事件列表
  let events;
  try {
    events = env.EVENTS ? JSON.parse(env.EVENTS) : DEFAULT_EVENTS;
  } catch (e) {
    events = DEFAULT_EVENTS;
  }

  const now = new Date();

  // 过滤未过期事件并按日期排序
  const upcoming = events
    .map((e, i) => ({ ...e, _index: i, _target: new Date(e.date) }))
    .filter((e) => e._target > now)
    .sort((a, b) => a._target - b._target);

  // 如果所有事件都已过期，显示最近过去的那个（倒计时为 0）
  let event;
  if (upcoming.length > 0) {
    event = upcoming[0];
  } else {
    const past = events
      .map((e, i) => ({ ...e, _index: i, _target: new Date(e.date) }))
      .sort((a, b) => b._target - a._target);
    event = past[0] || { title: "无事件", date: now.toISOString(), icon: "calendar" };
  }

  const target = event._target || new Date(event.date);
  const diffMs = target - now;
  const totalDays = Math.max(0, Math.ceil(diffMs / 86400000));

  const title = event.title || "目标日";
  const icon = event.icon || "calendar";

  // 配色：优先使用事件自定义色，否则按索引轮换预设
  const preset = COLOR_PRESETS[(event._index || 0) % COLOR_PRESETS.length];
  const color1 = event.color1 || preset.color1;
  const color2 = event.color2 || preset.color2;

  // 进度计算（假设从 365 天前开始）
  const totalSpan = 365;
  const progress = Math.min(1, Math.max(0, 1 - totalDays / totalSpan));
  const progressPercent = Math.round(progress * 100);

  // 锁屏小组件（accessoryRectangular）
  if (ctx.widgetFamily === "accessoryRectangular") {
    return {
      type: "widget",
      padding: [4, 0],
      children: [
        {
          type: "text",
          text: `${icon === "calendar" ? "📅" : "⏳"} ${title}`,
          font: { size: "headline", weight: "semibold" },
        },
        {
          type: "text",
          text: totalDays > 0 ? `还有 ${totalDays} 天` : "就是今天！",
          font: { size: "body" },
        },
      ],
    };
  }

  // accessoryInline（锁屏单行）
  if (ctx.widgetFamily === "accessoryInline") {
    return {
      type: "widget",
      children: [
        {
          type: "text",
          text: totalDays > 0 ? `${title} · ${totalDays}天` : `${title} · 今天`,
          font: { size: "body" },
        },
      ],
    };
  }

  // accessoryCircular（锁屏圆形）
  if (ctx.widgetFamily === "accessoryCircular") {
    return {
      type: "widget",
      padding: 4,
      children: [
        {
          type: "text",
          text: `${totalDays}`,
          font: { size: "title2", weight: "bold" },
          textAlign: "center",
        },
        {
          type: "text",
          text: "天",
          font: { size: "caption2" },
          textAlign: "center",
        },
      ],
    };
  }

  // 主屏小组件 (systemSmall / systemMedium / systemLarge)
  return {
    type: "widget",
    padding: 16,
    gap: 12,
    backgroundGradient: {
      type: "linear",
      colors: [color1, color2],
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 1, y: 1 },
    },
    children: [
      // 标题行：图标 + 标题
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        gap: 6,
        children: [
          {
            type: "image",
            src: `sf-symbol:${icon}`,
            width: 16,
            height: 16,
            color: "#FFFFFFCC",
          },
          {
            type: "text",
            text: title,
            font: { size: "subheadline", weight: "semibold" },
            textColor: "#FFFFFFCC",
          },
          { type: "spacer" },
          // 显示还有多少个待倒计时事件
          upcoming.length > 1
            ? {
                type: "text",
                text: `共 ${upcoming.length} 个`,
                font: { size: "caption2" },
                textColor: "#FFFFFF80",
              }
            : { type: "spacer", length: 0 },
        ],
      },

      { type: "spacer" },

      // 剩余天数（大字）
      {
        type: "stack",
        direction: "row",
        alignItems: "end",
        gap: 4,
        children: [
          {
            type: "text",
            text: `${totalDays}`,
            font: { size: 42, weight: "bold" },
            textColor: "#FFFFFF",
          },
          {
            type: "stack",
            padding: [0, 0, 6, 0],
            children: [
              {
                type: "text",
                text: totalDays === 0 ? "🎉" : "天",
                font: { size: "title3", weight: "medium" },
                textColor: "#FFFFFFBB",
              },
            ],
          },
        ],
      },

      // 进度条 + 日期信息
      {
        type: "stack",
        direction: "column",
        gap: 4,
        children: [
          // 进度条
          {
            type: "stack",
            direction: "row",
            height: 4,
            borderRadius: 2,
            backgroundColor: "#FFFFFF33",
            children: [
              {
                type: "stack",
                flex: Math.max(0.01, progress),
                height: 4,
                borderRadius: 2,
                backgroundColor: "#FFFFFF",
                children: [],
              },
              {
                type: "stack",
                flex: Math.max(0.01, 1 - progress),
                children: [],
              },
            ],
          },
          // 目标日期 + 进度百分比
          {
            type: "stack",
            direction: "row",
            children: [
              {
                type: "date",
                date: event.date,
                format: "date",
                font: { size: "caption2" },
                textColor: "#FFFFFF99",
              },
              { type: "spacer" },
              {
                type: "text",
                text: `${progressPercent}%`,
                font: { size: "caption2", weight: "medium" },
                textColor: "#FFFFFF99",
              },
            ],
          },
        ],
      },
    ],
  };
}
