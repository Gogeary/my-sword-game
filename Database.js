/* ==========================================
   [Database.js]
   물약 시스템 개편: type: 'potion' 추가
   ========================================== */
const GameDatabase = {
    SYSTEM: {
        TITLE: "강화하기 v1.4",
        START_GOLD: 100000,
        MAX_ENHANCE: 15,
        COMBAT_SPEED: 100,
        MAX_POTION_CAPACITY: 10, // 물약 최대 소지 개수
        IMAGE_PATH: "image/"
    },

    USER_STATS: {
        BASE: { ATK: 10, DEF: 2, HP: 100 },
        GET_NEXT_EXP: (lv) => Math.floor(lv * 100 * 1.4),
        CALC_ATK: (lv) => Math.floor(10 + 0.5 * Math.pow(lv - 1, 1.2)),
        CALC_DEF: (lv) => Math.floor(2 + 0.1 * Math.pow(lv - 1, 1.1)),
        CALC_HP: (lv) => Math.floor(100 + 5 * Math.pow(lv - 1, 1.3))
    },

    EQUIPMENT: [
        /* ... 기존 장비 데이터 유지 ... */
        { lv: 1, name: '나무 검', k: 1.1, p: 1000, type: 'weapon', img: 'wood_sword.png' },
        { lv: 1, name: '헐거운 옷', k: 1.0, p: 1000, type: 'armor', img: 'loose_clothes.png' },
        { lv: 1, name: '낡은 벨트', k: 1.0, p: 1000, type: 'belt', img: 'old_belt.png' },
        { lv: 5, name: '낡은 검', k: 1.2, p: 2000, type: 'weapon' },
        { lv: 5, name: '천 옷', k: 1.1, p: 2000, type: 'armor' },
        { lv: 5, name: '천 벨트', k: 1.2, p: 2000, type: 'belt' },
        { lv: 10, name: '철 검', k: 1.4, p: 4000, type: 'weapon' },
        { lv: 10, name: '질긴 옷', k: 1.3, p: 4000, type: 'armor' },
        { lv: 10, name: '질긴 벨트', k: 1.5, p: 4000, type: 'belt' },
        { lv: 15, name: '강철 검', k: 1.7, p: 8000, type: 'weapon' },
        { lv: 15, name: '가죽 옷', k: 1.6, p: 8000, type: 'armor' },
        { lv: 15, name: '가죽 벨트', k: 1.9, p: 8000, type: 'belt' },
        { lv: 20, name: '연마된 강철 검', k: 2.1, p: 16000, type: 'weapon' },
        { lv: 20, name: '강화 가죽 옷', k: 2.0, p: 16000, type: 'armor' },
        { lv: 20, name: '강화 가죽 벨트', k: 2.5, p: 16000, type: 'belt' },
        { lv: 25, name: '은빛 강철 검', k: 2.7, p: 32000, type: 'weapon' },
        { lv: 25, name: '비늘 갑옷', k: 2.5, p: 32000, type: 'armor' },
        { lv: 25, name: '금속 장식 벨트', k: 3.3, p: 32000, type: 'belt' },
        { lv: 30, name: '은 검', k: 3.5, p: 64000, type: 'weapon' },
        { lv: 30, name: '강철 갑옷', k: 3.2, p: 64000, type: 'armor' },
        { lv: 30, name: '용병 벨트', k: 4.5, p: 64000, type: 'belt' }
    ],

    ENHANCE_FORMULA: {
        weapon: (base, k, en) => base * k * (1 + 0.2 * Math.pow(en, 1.1)),
        armor:  (base, k, en) => base * k * (1 + 0.5 * en),
        belt:   (base, k, en) => base * k * (1 + 0.1 * Math.pow(en, 1.25))
    },

    CONSUMABLES: {
        // [수정] type: 'potion' 추가, 회복량 val 통일
        potions: [
            { id: 1, name: '최하급 포션', val: 100, p: 500, type: 'potion', img: 'potion_s.png' },
            { id: 2, name: '하급 포션', val: 500, p: 2000, type: 'potion', img: 'potion_m.png' },
            { id: 3, name: '중급 포션', val: 2000, p: 5000, type: 'potion', img: 'potion_l.png' },
            { id: 4, name: '상급 포션', val: 5000, p: 10000, type: 'potion', img: 'potion_xl.png' },
            { id: 5, name: '최상급 포션', val: 10000, p: 20000, type: 'potion', img: 'potion_max.png' }
        ],
        scrolls: [
            { id: 1, name: '하급 방지권', p: 50000, type: 'scroll', img: 'scroll_1.png' },
            { id: 2, name: '중급 방지권', p: 150000, type: 'scroll', img: 'scroll_2.png' },
            { id: 3, name: '상급 방지권', p: 500000, type: 'scroll', img: 'scroll_3.png' }
        ]
    },

    MONSTER_STAGES: [ /* 기존 데이터 유지 (자동 생성 로직 사용) */ 
        { lv: 1,  hp: 280,  atk: 25,  def: 5,   gold: 100,   exp: 10 },
        { lv: 30, hp: 7500, atk: 550, def: 180, gold: 30000, exp: 500 }
    ],

    MINES: [ /* 기존 데이터 유지 */
        { name: '고갈된 광산', cost: 500, rates: [0.4, 0.4, 0.2, 0, 0, 0] },
        { name: '무너진 광산', cost: 2000, rates: [0.4, 0.2, 0.3, 0.1, 0, 0] },
        { name: '빛나는 광산', cost: 10000, rates: [0.4, 0.1, 0.2, 0.25, 0.05, 0] },
        { name: '찬란한 광산', cost: 50000, rates: [0.39, 0.1, 0.15, 0.2, 0.15, 0.01] }
    ],
    ORES: [ /* 기존 데이터 유지 */
        { n: '빈공간', v: 0, s: '' },
        { n: '돌', v: 500, s: '🪨' },
        { n: '구리', v: 2000, s: '🥉' },
        { n: '은', v: 20000, s: '🥈' },
        { n: '금', v: 100000, s: '🥇' },
        { n: '다이아', v: 3000000, s: '💎' }
    ]
};

/* ============================================================
   [몬스터 데이터 보간 로직]
   MONSTER_STAGES를 바탕으로 1~30레벨 전체 데이터를 생성합니다.
   ============================================================ */
(function generateFullMonsterData() {
    const fullStages = [];
    const stages = GameDatabase.MONSTER_STAGES;

    for (let i = 0; i < stages.length - 1; i++) {
        const start = stages[i];
        const end = stages[i+1];
        const steps = end.lv - start.lv;

        // 시작 레벨 추가
        fullStages.push(start);

        // 중간 레벨 계산 (선형 보간법)
        for (let j = 1; j < steps; j++) {
            const ratio = j / steps;
            fullStages.push({
                lv: start.lv + j,
                hp: Math.floor(start.hp + (end.hp - start.hp) * ratio),
                atk: Math.floor(start.atk + (end.atk - start.atk) * ratio),
                def: Math.floor(start.def + (end.def - start.def) * ratio),
                gold: Math.floor(start.gold + (end.gold - start.gold) * ratio),
                exp: Math.floor(start.exp + (end.exp - start.exp) * ratio)
            });
        }
    }
    // 마지막 30레벨 추가
    fullStages.push(stages[stages.length - 1]);

    // 생성된 데이터를 GameDatabase에 'MONSTER_TABLE'로 저장
    GameDatabase.MONSTER_TABLE = fullStages;
})();



