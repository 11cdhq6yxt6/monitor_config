// 重要日子倒计时小组件
// 支持添加多个日期，自动显示最近的未过期事件
// 过期后自动切换到下一个最近的事件
// 支持显示农历日期，支持农历日期输入
//
// 环境变量：
//   EVENTS - JSON 数组，每个元素包含:
//     title:  事件标题
//     date:   目标日期，格式 "2026-05-01"（只需年月日）
//     lunar:  是否为农历日期（可选，默认 false）
//             为 true 时 date 按农历解析，如 "2026-01-01" = 农历正月初一
//     repeat: 是否每年重复（可选，默认 false）
//             为 true 时若今年该日期已过，自动滚动到明年
//     icon:   SF Symbol 图标名（可选，默认 "calendar"）
//     color1: 渐变起始色（可选）
//     color2: 渐变结束色（可选）
//
// 示例：
//   EVENTS: '[{"title":"春节","date":"01-01","lunar":true,"repeat":true,"icon":"party.popper"},{"title":"生日","date":"08-15","repeat":true,"icon":"gift"}]'
// 注： repeat:true 时 date 可省略年份，格式 "MM-DD"（公历）或 "MM-DD"（农历）

// ==================== 农历转换 ====================
// 农历数据表 (1900-2100)
// 每个元素编码了该年的农历信息：
//   bits[0-3]:  闰月月份（0 表示无闰月）
//   bits[4-15]: 12 个月的大小月（1=30天, 0=29天）
//   bit[16]:    闰月大小（1=30天, 0=29天）
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x16a95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06aa0, 0x1a6c4, 0x0aae0,
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520,
];

const LUNAR_MONTHS = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
const LUNAR_DAYS = [
  "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
];

// 获取某农历年的闰月月份（0 表示无闰月）
function leapMonth(y) {
  return LUNAR_INFO[y - 1900] & 0xf;
}

// 获取某农历年闰月的天数（0 或 29 或 30）
function leapDays(y) {
  if (leapMonth(y)) {
    return LUNAR_INFO[y - 1900] & 0x10000 ? 30 : 29;
  }
  return 0;
}

// 获取某农历年某月的天数
function monthDays(y, m) {
  return LUNAR_INFO[y - 1900] & (0x10000 >> m) ? 30 : 29;
}

// 获取某农历年的总天数
function yearDays(y) {
  let sum = 348; // 12 * 29
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    if (LUNAR_INFO[y - 1900] & i) sum++;
  }
  return sum + leapDays(y);
}

// 公历转农历
function solarToLunar(year, month, day) {
  // 基准：1900年1月31日 = 农历正月初一
  const baseDate = new Date(1900, 0, 31);
  const targetDate = new Date(year, month - 1, day);
  let offset = Math.floor((targetDate - baseDate) / 86400000);

  let lunarYear, lunarMonth, lunarDay;
  let isLeap = false;

  // 计算农历年
  for (lunarYear = 1900; lunarYear < 2101 && offset > 0; lunarYear++) {
    let daysInYear = yearDays(lunarYear);
    offset -= daysInYear;
  }
  if (offset < 0) {
    offset += yearDays(--lunarYear);
  }

  // 计算农历月
  let leap = leapMonth(lunarYear);
  for (lunarMonth = 1; lunarMonth < 13 && offset > 0; lunarMonth++) {
    // 闰月
    if (leap > 0 && lunarMonth === leap + 1 && !isLeap) {
      --lunarMonth;
      isLeap = true;
      let daysInMonth = leapDays(lunarYear);
      offset -= daysInMonth;
    } else {
      let daysInMonth = monthDays(lunarYear, lunarMonth);
      offset -= daysInMonth;
    }
    if (isLeap && lunarMonth === leap + 1) isLeap = false;
  }

  if (offset === 0 && leap > 0 && lunarMonth === leap + 1) {
    if (isLeap) {
      isLeap = false;
    } else {
      isLeap = true;
      --lunarMonth;
    }
  }
  if (offset < 0) {
    offset += isLeap ? leapDays(lunarYear) : monthDays(lunarYear, lunarMonth);
    --lunarMonth;
  }

  lunarDay = offset + 1;

  const monthStr = (isLeap ? "闰" : "") + LUNAR_MONTHS[lunarMonth - 1] + "月";
  const dayStr = LUNAR_DAYS[lunarDay - 1];

  return { year: lunarYear, month: lunarMonth, day: lunarDay, isLeap, monthStr, dayStr };
}

// 农历转公历
function lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeapMonth) {
  if (lunarYear < 1900 || lunarYear > 2100) return null;

  // 从基准日期 1900-01-31（农历 1900 年正月初一）开始累加天数
  let offset = 0;

  // 累加从 1900 到目标农历年之前的所有天数
  for (let y = 1900; y < lunarYear; y++) {
    offset += yearDays(y);
  }

  // 累加目标年中，目标月之前的所有月份天数
  let leap = leapMonth(lunarYear);
  let isAdd = false;

  for (let m = 1; m < lunarMonth; m++) {
    // 如果该年有闰月且在当前月之前或等于当前月
    if (leap > 0 && m === leap && !isAdd) {
      // 先加上正常月
      // 再额外加上闰月
      offset += leapDays(lunarYear);
      isAdd = true;
    }
    offset += monthDays(lunarYear, m);
  }

  // 如果目标月本身就是闰月
  if (isLeapMonth) {
    offset += monthDays(lunarYear, lunarMonth);
  } else if (leap > 0 && leap === lunarMonth && !isAdd) {
    // 如果闰月在目标月之后，不需要额外处理
    // 如果闰月等于目标月且不是闰月输入，也不需要处理
  }

  // 加上当月的天数
  offset += lunarDay - 1;

  // 基准日期 + 偏移
  const base = new Date(1900, 0, 31);
  base.setDate(base.getDate() + offset);
  return base;
}

// 格式化农历日期为简洁字符串
function formatLunar(year, month, day) {
  const lunar = solarToLunar(year, month, day);
  return `${lunar.monthStr}${lunar.dayStr}`;
}

// ==================== 小组件主逻辑 ====================

// 默认事件列表（用户未配置时使用）
const DEFAULT_EVENTS = [
  { title: "元旦", date: "01-01", repeat: true, icon: "sparkles" },
  { title: "春节", date: "01-01", lunar: true, repeat: true, icon: "party.popper" },
];

// 预设配色方案
const COLOR_PRESETS = [
  { color1: "#6366F1", color2: "#8B5CF6" },
  { color1: "#F43F5E", color2: "#FB7185" },
  { color1: "#0EA5E9", color2: "#38BDF8" },
  { color1: "#10B981", color2: "#34D399" },
  { color1: "#F59E0B", color2: "#FBBF24" },
  { color1: "#8B5CF6", color2: "#A78BFA" },
];

// 将日期字符串 + 指定年份 → Date 对象
// dateStr: "YYYY-MM-DD" 或 "MM-DD"（repeat 模式）
// year: 目标年份
// isLunar: 是否农历
function dateForYear(dateStr, year, isLunar) {
  const s = dateStr.trim();
  // 补全年份
  const full = s.split("-").length === 2 ? `${year}-${s}` : s.replace(/^\d{4}/, String(year));
  const parts = full.split("-").map(Number);
  if (isLunar) {
    const d = lunarToSolar(parts[0], parts[1], parts[2], false);
    return d || new Date(full + "T00:00:00+08:00");
  }
  return new Date(full + "T00:00:00+08:00");
}

// 解析事件的目标日期，支持 repeat（每年重复）
// repeat:true 时：先试今年，若已过则用明年
function resolveDate(event, now) {
  if (event.repeat) {
    const thisYear = now.getFullYear();
    const d = dateForYear(event.date, thisYear, event.lunar);
    if (d > now) return d;
    return dateForYear(event.date, thisYear + 1, event.lunar);
  }
  // 非重复：直接解析完整日期
  const s = event.date.trim();
  if (event.lunar) {
    const parts = s.split("-").map(Number);
    if (parts.length === 3) {
      const d = lunarToSolar(parts[0], parts[1], parts[2], false);
      if (d) return d;
    }
    return new Date(s + "T00:00:00+08:00");
  }
  if (s.includes("T")) return new Date(s);
  return new Date(s + "T00:00:00+08:00");
}

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

  // 解析所有事件的目标日期（repeat 事件自动选今年/明年）
  const resolved = events.map((e, i) => ({ ...e, _index: i, _target: resolveDate(e, now) }));

  // 选最近的未来事件
  const upcoming = resolved.filter((e) => e._target > now).sort((a, b) => a._target - b._target);

  // 选取要显示的事件
  let event;
  if (upcoming.length > 0) {
    event = upcoming[0];
  } else {
    // 全部已过：显示最近过去的一个
    event = resolved.sort((a, b) => b._target - a._target)[0]
      || { title: "无事件", date: now.toISOString().slice(0, 10), icon: "calendar" };
  }

  const target = event._target || resolveDate(event, now);
  const diffMs = target - now;
  const totalDays = Math.max(0, Math.ceil(diffMs / 86400000));

  const title = event.title || "目标日";
  const icon = event.icon || "calendar";

  // 配色
  const preset = COLOR_PRESETS[(event._index || 0) % COLOR_PRESETS.length];
  const color1 = event.color1 || preset.color1;
  const color2 = event.color2 || preset.color2;

  // 进度
  const totalSpan = 365;
  const progress = Math.min(1, Math.max(0, 1 - totalDays / totalSpan));
  const progressPercent = Math.round(progress * 100);

  // 农历日期：如果输入就是农历，直接显示原始农历月日；否则从公历转换
  let lunarStr;
  if (event.lunar) {
    const parts = event.date.trim().split("-").map(Number);
    lunarStr = LUNAR_MONTHS[parts[1] - 1] + "月" + LUNAR_DAYS[parts[2] - 1];
  } else {
    lunarStr = formatLunar(target.getFullYear(), target.getMonth() + 1, target.getDate());
  }

  // 目标日期的公历 ISO 字符串（用于 date 元素显示）
  const solarDateStr = target.getFullYear() + "-" +
    String(target.getMonth() + 1).padStart(2, "0") + "-" +
    String(target.getDate()).padStart(2, "0") + "T00:00:00+08:00";

  // ---- 锁屏 accessoryRectangular ----
  if (ctx.widgetFamily === "accessoryRectangular") {
    return {
      type: "widget",
      padding: [4, 0],
      children: [
        {
          type: "text",
          text: title,
          font: { size: "headline", weight: "semibold" },
        },
        {
          type: "text",
          text: totalDays > 0 ? `还有 ${totalDays} 天 · ${lunarStr}` : `就是今天！ · ${lunarStr}`,
          font: { size: "body" },
        },
      ],
    };
  }

  // ---- 锁屏 accessoryInline ----
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

  // ---- 锁屏 accessoryCircular ----
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

  // ---- 主屏小组件 ----
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
      // 标题行
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
          // 农历日期
          {
            type: "text",
            text: lunarStr,
            font: { size: "caption1" },
            textColor: "#FFFFFFAA",
          },
        ],
      },

      { type: "spacer" },

      // 剩余天数
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
          {
            type: "stack",
            direction: "row",
            children: [
              {
                type: "date",
                date: solarDateStr,
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
