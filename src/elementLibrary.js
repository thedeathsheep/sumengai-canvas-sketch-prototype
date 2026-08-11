import { assetUrl } from "./assetUrl";

const makeLineAsset = (markup) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <g fill="none" stroke="#34363a" stroke-width="1.4" stroke-linecap="round"
        stroke-linejoin="round" opacity=".2" transform="translate(.8 .5)">
        ${markup}
      </g>
      <g fill="none" stroke="#34363a" stroke-width="2.25" stroke-linecap="round"
        stroke-linejoin="round">
        ${markup}
      </g>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const elementCategories = [
  { id: "all", label: "全部" },
  { id: "people", label: "人物" },
  { id: "building", label: "建筑" },
  { id: "street", label: "街道" },
  { id: "interior", label: "室内" },
  { id: "nature", label: "自然" },
  { id: "transport", label: "交通" },
  { id: "symbol", label: "符号" },
];

export const elementTemplates = [
  {
    id: "person-standing",
    category: "people",
    label: "站立人物",
    keywords: "人物 人 角色 站立 正面 person people",
    asset: assetUrl("assets/character-stand.png"),
    width: 78,
    height: 106,
  },
  {
    id: "person-side",
    category: "people",
    label: "侧身人物",
    keywords: "人物 人 角色 侧身 行走 person walk",
    asset: assetUrl("assets/character-side.png"),
    width: 78,
    height: 106,
  },
  {
    id: "person-duo",
    category: "people",
    label: "双人",
    keywords: "人物 两人 双人 对话 关系 group people",
    asset: assetUrl("assets/character-duo.png"),
    width: 112,
    height: 106,
  },
  {
    id: "house",
    category: "building",
    label: "房子",
    keywords: "房子 房屋 住宅 家 建筑 house home",
    asset: makeLineAsset(`
      <path d="M12 43 48 14l36 29" />
      <path d="M19 39v43h58V39" />
      <path d="M40 82V59h16v23" />
      <rect x="25" y="49" width="12" height="12" />
      <rect x="60" y="49" width="11" height="12" />
      <path d="M68 28V17h8v18" />
    `),
    width: 132,
    height: 102,
  },
  {
    id: "apartment",
    category: "building",
    label: "楼房",
    keywords: "楼房 公寓 高楼 建筑 办公楼 apartment building",
    asset: makeLineAsset(`
      <path d="M23 84V13h50v71" />
      <path d="M16 84h64" />
      <path d="M31 22h10v10H31zM55 22h10v10H55z" />
      <path d="M31 40h10v10H31zM55 40h10v10H55z" />
      <path d="M31 58h10v10H31zM55 58h10v10H55z" />
      <path d="M43 84V70h11v14" />
    `),
    width: 98,
    height: 126,
  },
  {
    id: "storefront",
    category: "building",
    label: "商店",
    keywords: "商店 店铺 门店 咖啡馆 建筑 shop store",
    asset: makeLineAsset(`
      <path d="M15 38h66v45H15z" />
      <path d="M12 38 18 19h60l6 19" />
      <path d="M12 38c4 7 10 7 14 0 4 7 10 7 14 0 4 7 10 7 14 0 4 7 10 7 14 0 4 7 10 7 16 0" />
      <path d="M25 83V54h20v29M54 54h18v17H54z" />
    `),
    width: 136,
    height: 104,
  },
  {
    id: "street-lamp",
    category: "street",
    label: "路灯",
    keywords: "路灯 灯杆 街灯 灯光 街道 lamp streetlight",
    asset: makeLineAsset(`
      <path d="M42 84h27M55 84V28c0-10 7-16 17-16" />
      <path d="M68 12h13l4 9H66z" />
      <path d="M48 84h14M51 76h8" />
      <path d="M73 25c2 5 6 5 8 0" />
    `),
    width: 76,
    height: 126,
  },
  {
    id: "bench",
    category: "street",
    label: "长椅",
    keywords: "长椅 公园椅 椅子 街道 座椅 bench seat",
    asset: makeLineAsset(`
      <path d="M17 44h62v14H17zM20 25h56v14H20z" />
      <path d="M24 58 20 82M72 58l4 24M20 68h56" />
      <path d="M28 25v14M41 25v14M55 25v14M68 25v14" />
    `),
    width: 132,
    height: 88,
  },
  {
    id: "signpost",
    category: "street",
    label: "指示牌",
    keywords: "路牌 指示牌 标牌 街道 方向 sign signpost",
    asset: makeLineAsset(`
      <path d="M48 84V17M37 84h22" />
      <path d="M21 23h48l9 10-9 10H21z" />
      <path d="M75 49H35L25 59l10 10h40z" />
      <path d="M31 33h32M39 59h28" />
    `),
    width: 98,
    height: 120,
  },
  {
    id: "trash-bin",
    category: "street",
    label: "垃圾桶",
    keywords: "垃圾桶 果皮箱 街道 设施 bin trash",
    asset: makeLineAsset(`
      <path d="M29 29h39l-4 54H33zM25 22h47M39 14h19l4 8H35z" />
      <path d="M43 38v34M55 38v34" />
    `),
    width: 78,
    height: 112,
  },
  {
    id: "chair",
    category: "interior",
    label: "椅子",
    keywords: "椅子 座椅 靠背椅 家具 chair seat",
    asset: makeLineAsset(`
      <path d="M29 15h38v39H29zM25 54h46v12H25z" />
      <path d="M31 66 27 84M65 66l4 18" />
      <path d="M29 24h38" />
    `),
    width: 86,
    height: 112,
  },
  {
    id: "stool",
    category: "interior",
    label: "凳子",
    keywords: "凳子 圆凳 座椅 家具 stool",
    asset: makeLineAsset(`
      <ellipse cx="48" cy="30" rx="27" ry="10" />
      <path d="M23 31v10c0 6 11 10 25 10s25-4 25-10V31" />
      <path d="M31 48 26 83M65 48l5 35M29 70h39" />
    `),
    width: 92,
    height: 106,
  },
  {
    id: "table",
    category: "interior",
    label: "桌子",
    keywords: "桌子 餐桌 书桌 家具 table desk",
    asset: makeLineAsset(`
      <path d="M14 35h68v14H14zM22 49l-4 35M74 49l4 35" />
      <path d="M20 64h58" />
    `),
    width: 136,
    height: 82,
  },
  {
    id: "sofa",
    category: "interior",
    label: "沙发",
    keywords: "沙发 家具 客厅 座椅 sofa couch",
    asset: makeLineAsset(`
      <path d="M21 51V31c0-8 7-14 15-14h24c8 0 15 6 15 14v20" />
      <path d="M20 43c-7 0-10 5-10 11v22h76V54c0-6-3-11-10-11" />
      <path d="M25 52h46v24M48 52v24M18 76v9M78 76v9" />
    `),
    width: 142,
    height: 92,
  },
  {
    id: "tree",
    category: "nature",
    label: "树",
    keywords: "树 木 植物 自然 tree plant",
    asset: makeLineAsset(`
      <path d="M42 84c3-18 4-32 1-45M54 84c-2-17-2-31 2-45" />
      <path d="M47 53 31 38M51 47l15-13" />
      <path d="M23 38c-9-11 0-25 12-23 5-12 24-12 28 1 13-3 21 12 14 22 9 10-2 23-13 20-5 10-20 10-26 1-13 5-25-9-15-21z" />
      <path d="M33 84h31" />
    `),
    width: 116,
    height: 126,
  },
  {
    id: "bush",
    category: "nature",
    label: "灌木",
    keywords: "灌木 草丛 植物 自然 bush shrub",
    asset: makeLineAsset(`
      <path d="M12 73c-4-12 7-21 17-17-1-12 13-18 21-9 7-11 24-5 23 8 12-3 19 10 12 19" />
      <path d="M11 74h75M24 74l-5 10M72 74l5 10" />
      <path d="M33 61c4 4 7 8 8 13M63 60c-5 4-8 8-10 14" />
    `),
    width: 138,
    height: 76,
  },
  {
    id: "mountain",
    category: "nature",
    label: "山",
    keywords: "山 山峰 远山 自然 风景 mountain",
    asset: makeLineAsset(`
      <path d="M7 79 35 27l15 25 10-16 29 43z" />
      <path d="M27 42l8-15 9 15-6-3-5 5-3-5zM54 46l6-10 7 10" />
      <path d="M8 79h80" />
    `),
    width: 144,
    height: 92,
  },
  {
    id: "cloud",
    category: "nature",
    label: "云",
    keywords: "云 云朵 天空 天气 自然 cloud",
    asset: makeLineAsset(`
      <path d="M21 67c-12 0-15-17-5-22 2-13 18-18 27-9 8-15 32-8 31 9 15-2 18 22 3 22z" />
      <path d="M26 76h35M40 84h29" />
    `),
    width: 130,
    height: 76,
  },
  {
    id: "car",
    category: "transport",
    label: "汽车",
    keywords: "汽车 轿车 车辆 交通 car vehicle",
    asset: makeLineAsset(`
      <path d="M13 57 21 39c2-5 6-8 12-8h30c6 0 10 3 13 8l8 18v16H13z" />
      <path d="M27 57 35 38h26l9 19M13 57h71M32 57v16M65 57v16" />
      <circle cx="28" cy="73" r="8" /><circle cx="69" cy="73" r="8" />
      <path d="M18 49h9M70 49h9" />
    `),
    width: 146,
    height: 82,
  },
  {
    id: "bicycle",
    category: "transport",
    label: "自行车",
    keywords: "自行车 单车 骑行 交通 bicycle bike",
    asset: makeLineAsset(`
      <circle cx="24" cy="67" r="17" /><circle cx="73" cy="67" r="17" />
      <path d="m24 67 16-29 13 29H24l18-17h20l11 17M37 38h14M58 32h11M63 32l10 35" />
      <circle cx="52" cy="67" r="4" />
    `),
    width: 144,
    height: 90,
  },
  {
    id: "bus",
    category: "transport",
    label: "公交车",
    keywords: "公交车 巴士 大巴 交通 bus",
    asset: makeLineAsset(`
      <path d="M12 23h72v52H12zM20 31h18v21H20zM43 31h17v21H43zM65 31h11v21H65z" />
      <path d="M12 58h72M21 75v8M75 75v8" />
      <circle cx="27" cy="73" r="8" /><circle cx="70" cy="73" r="8" />
    `),
    width: 148,
    height: 90,
  },
  {
    id: "direction-arrow",
    category: "symbol",
    label: "方向箭头",
    keywords: "箭头 方向 指向 移动 符号 arrow direction",
    asset: makeLineAsset(`
      <path d="M12 48h65M58 25l23 23-23 23" />
      <path d="M14 44h37" opacity=".35" />
    `),
    width: 138,
    height: 70,
  },
  {
    id: "speech-bubble",
    category: "symbol",
    label: "对话框",
    keywords: "对话框 气泡 台词 文字 符号 speech bubble",
    asset: makeLineAsset(`
      <path d="M15 19h66v46H44L27 80l4-15H15z" />
      <path d="M28 38h40M28 49h27" />
    `),
    width: 126,
    height: 96,
  },
  {
    id: "shot-frame",
    category: "symbol",
    label: "取景框",
    keywords: "取景框 镜头 构图 画框 分镜 符号 frame shot",
    asset: makeLineAsset(`
      <path d="M13 34V15h19M64 15h19v19M83 62v19H64M32 81H13V62" />
      <path d="M24 48h48M48 24v48" opacity=".55" />
      <circle cx="48" cy="48" r="12" />
    `),
    width: 116,
    height: 116,
  },
];
