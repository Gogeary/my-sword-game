/* ==========================================
   [강화하기 vx.x] 시스템 통합 데이터베이스 (최종 보완본)
   ========================================== */

const GameDatabase = {
    // 1. 초기 시스템 설정 및 경제 밸런스
    SYSTEM: {
        TITLE: "강화하기 vx.x",
        START_GOLD: 10000,
        EMERGENCY_GOLD: 1000,
        MAX_ENHANCE: 10,
        AUTO_ENHANCE_SPEED: 100, // 0.1초
        COMBAT_SPEED: 100,       // 0.1초
        MAX_POTION_CAPACITY: 10, // 최대 소지 개수
        IMAGE_PATH: "image/"
    },

    // 2. 유저 성장 공식
    USER_STATS: {
        BASE: { ATK: 10, DEF: 2, HP: 100 },
        GET_NEXT_EXP: (lv) => lv * 100 * 1.4,
        CALC_ATK: (lv) => 10 + 0.5 * Math.pow(lv - 1, 1.2),
        CALC_DEF: (lv) => 2 + 0.1 * Math.pow(lv - 1, 1.1),
        CALC_HP: (lv) => 100 + 5 * Math.pow(lv - 1, 1.3)
    },

    // 3. 장비 데이터 테이블
    EQUIPMENT: [
        { lv: 1, name: '나무 검', k: 1.1, p: 1000, type: 'weapon', img: 'wood_sword.png' },
        { lv: 1, name: '헐거운 옷', k: 1.0, p: 1000, type: 'armor', img: 'loose_clothes.png' },
        { lv: 1, name: '낡은 벨트', k: 1.0, p: 1000, type: 'belt', img: 'old_belt.png' },
        { lv: 5, name: '낡은 검', k: 1.2, p: 10000, type: 'weapon' },
        { lv: 5, name: '천 옷', k: 1.1, p: 10000, type: 'armor' },
        { lv: 5, name: '천 벨트', k: 1.2, p: 10000, type: 'belt' },
        { lv: 10, name: '철 검', k: 1.4, p: 100000, type: 'weapon' },
        { lv: 10, name: '질긴 옷', k: 1.3, p: 100000, type: 'armor' },
        { lv: 10, name: '질긴 벨트', k: 1.5, p: 100000, type: 'belt' },
        { lv: 15, name: '강철 검', k: 1.7, p: 500000, type: 'weapon' },
        { lv: 15, name: '가죽 옷', k: 1.6, p: 500000, type: 'armor' },
        { lv: 15, name: '가죽 벨트', k: 1.9, p: 500000, type: 'belt' },
        { lv: 20, name: '연마된 강철 검', k: 2.1, p: 1500000, type: 'weapon' },
        { lv: 20, name: '강화 가죽 옷', k: 2.0, p: 1500000, type: 'armor' },
        { lv: 20, name: '강화 가죽 벨트', k: 2.5, p: 1500000, type: 'belt' },
        { lv: 25, name: '은빛 강철 검', k: 2.7, p: 3500000, type: 'weapon' },
        { lv: 25, name: '비늘 갑옷', k: 2.5, p: 3500000, type: 'armor' },
        { lv: 25, name: '금속 장식 벨트', k: 3.3, p: 3500000, type: 'belt' },
        { lv: 30, name: '은 검', k: 3.5, p: 8000000, type: 'weapon' },
        { lv: 30, name: '강철 갑옷', k: 3.2, p: 8000000, type: 'armor' },
        { lv: 30, name: '용병 벨트', k: 4.5, p: 8000000, type: 'belt' }
    ],

    // 강화 수치 적용 공식
    ENHANCE_FORMULA: {
        weapon: (base, k, en) => base * k * (1 + 0.2 * Math.pow(en, 1.1)),
        armor:  (base, k, en) => base * k * (1 + 0.5 * en),
        belt:   (base, k, en) => base * k * (1 + 0.1 * Math.pow(en, 1.25))
    },

    // 4. 소비 아이템
    CONSUMABLES: {
        potions: [
            { id: 1, n: '최하급 포션', r: 100, p: 2000, img: 'health_potion_1.png' },
            { id: 2, n: '하급 포션', r: 1000, p: 20000, img: 'health_potion_2.png' },
            { id: 3, n: '중급 포션', r: 5000, p: 100000, img: 'health_potion_3.png' },
            { id: 4, n: '상급 포션', r: 10000, p: 200000, img: 'health_potion_4.png' },
            { id: 5, n: '최상급 포션', r: 50000, p: 1000000, img: 'health_potion_5.png' }
        ],
        scrolls: [
            { id: 1, n: '하급 방지권', p: 100000, img: 'scroll_1.png' },
            { id: 2, n: '중급 방지권', p: 500000, img: 'scroll_2.png' },
            { id: 3, n: '상급 방지권', p: 2000000, img: 'scroll_3.png' }
        ]
    },

    // 5. 몬스터 스펙 기준표
    MONSTER_STAGES: [
        { lv: 1,  hp: 280,  atk: 25,  def: 5,   gold: 100,   exp: 10 },
        { lv: 5,  hp: 380,  atk: 35,  def: 8,   gold: 1000,  exp: 50 },
        { lv: 10, hp: 650,  atk: 55,  def: 15,  gold: 7000,  exp: 100 },
        { lv: 15, hp: 1200, atk: 95,  def: 30,  gold: 10000, exp: 150 },
        { lv: 20, hp: 2200, atk: 160, def: 55,  gold: 15000, exp: 200 },
        { lv: 25, hp: 4200, atk: 300, def: 100, gold: 30000, exp: 300 },
        { lv: 30, hp: 7500, atk: 550, def: 180, gold: 50000, exp: 500 }
    ],

    // 6. 광산 시스템 설정
    MINES: [
        { name: '고갈된 광산', cost: 1000, rates: [0.4, 0.4, 0.2, 0, 0, 0] },
        { name: '무너진 광산', cost: 10000, rates: [0.4, 0.2, 0.3, 0.1, 0, 0] },
        { name: '빛나는 광산', cost: 100000, rates: [0.4, 0.1, 0.2, 0.25, 0.05, 0] },
        { name: '찬란한 광산', cost: 500000, rates: [0.39, 0.1, 0.15, 0.2, 0.15, 0.01] }
    ],
    ORES: [
        { n: '빈공간', v: 0, s: '' },
        { n: '돌', v: 1000, s: '🪨' },
        { n: '구리', v: 2000, s: '🥉' },
        { n: '은', v: 20000, s: '🥈' },
        { n: '금', v: 100000, s: '🥇' },
        { n: '다이아몬드', v: 2000000, s: '💎' }
    ]
};
