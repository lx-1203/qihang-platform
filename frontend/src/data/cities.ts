export interface CityGroup {
  label: string;
  cities: string[];
}

export const HOT_CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉', '西安', '苏州', '重庆', '天津'];

export const CITY_GROUPS: CityGroup[] = [
  {
    label: '华东',
    cities: ['上海', '南京', '杭州', '苏州', '无锡', '宁波', '合肥', '济南', '青岛', '福州', '厦门', '南昌', '温州', '常州', '徐州', '绍兴'],
  },
  {
    label: '华北',
    cities: ['北京', '天津', '石家庄', '太原', '呼和浩特', '大连', '沈阳', '长春', '哈尔滨'],
  },
  {
    label: '华南',
    cities: ['广州', '深圳', '珠海', '东莞', '佛山', '中山', '惠州', '海口', '三亚', '南宁', '桂林'],
  },
  {
    label: '华中',
    cities: ['武汉', '长沙', '郑州', '洛阳', '宜昌', '襄阳', '岳阳', '株洲'],
  },
  {
    label: '西南',
    cities: ['成都', '重庆', '昆明', '贵阳', '拉萨', '绵阳', '南充'],
  },
  {
    label: '西北',
    cities: ['西安', '兰州', '西宁', '银川', '乌鲁木齐', '咸阳', '宝鸡'],
  },
  {
    label: '东北',
    cities: ['沈阳', '大连', '长春', '哈尔滨', '吉林', '齐齐哈尔', '鞍山'],
  },
];

export const ALL_CITIES = Array.from(new Set([...HOT_CITIES, ...CITY_GROUPS.flatMap(g => g.cities)]));
