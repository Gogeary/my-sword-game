/* ==========================================
   [Database.js]
   게임 내 모든 상수, 아이템, 몬스터, 광산 데이터 관리
   ========================================== */

const GameDatabase = {
    SYSTEM: {
        TITLE: "강화하기 v1.4",
        START_GOLD: 100000, // 테스트용 넉넉한 초기 자금
        EMERGENCY_GOLD: 1000,
        MAX_ENHANCE: 15, // 최대 강화 15강
        AUTO_ENHANCE_SPEED: 100,
        COMBAT_SPEED: 100,
        MAX_POTION_CAPACITY: 10,
        IMAGE_PATH: "image/"
    },

    USER_STATS: {
        BASE: { ATK: 10, DEF: 2, HP: 100 },
        // 레벨업 필요 경험치 공식
        GET_NEXT_EXP: (lv) => Math.floor(lv * 100 * 1.4),
        // 스탯 성장 공식
        CALC_ATK: (lv) => Math.floor(10 + 0.5 * Math.pow(lv - 1, 1.2)),
        CALC_DEF: (lv) => Math.floor(2 + 0.1 * Math.pow(lv - 1, 1.1)),
        CALC_HP: (lv) => Math.floor(100 + 5 * Math.pow(lv - 1, 1.3))
    },

    /* [가격 밸런스: 2배수 적용] */
    EQUIPMENT: [
        // Tier 1 (Lv.1) - 1,000 G
        { lv: 1, name: '나무 검', k: 1.1, p: 1000, type: 'weapon', img: 'wood_sword.png' },
        { lv: 1, name: '헐거운 옷', k: 1.0, p: 1000, type: 'armor', img: 'loose_clothes.png' },
        { lv: 1, name: '낡은 벨트', k: 1.0, p: 1000, type: 'belt', img: 'old_belt.png' },
        
        // Tier 2 (Lv.5) - 2,000 G
        { lv: 5, name: '낡은 검', k: 1.2, p: 2000, type: 'weapon' },
        { lv: 5, name: '천 옷', k: 1.1, p: 2000, type: 'armor' },
        { lv: 5, name: '천 벨트', k: 1.2, p: 2000, type: 'belt' },
        
        // Tier 3 (Lv.10) - 4,000 G
        { lv: 10, name: '철 검', k: 1.4, p: 4000, type: 'weapon' },
        { lv: 10, name: '질긴 옷', k: 1.3, p: 4000, type: 'armor' },
        { lv: 10, name: '질긴 벨트', k: 1.5, p: 4000, type: 'belt' },
        
        // Tier 4 (Lv.15) - 8,000 G
        { lv: 15, name: '강철 검', k: 1.7, p: 8000, type: 'weapon' },
        { lv: 15, name: '가죽 옷', k: 1.6, p: 8000, type: 'armor' },
        { lv: 15, name: '가죽 벨트', k: 1.9, p: 8000, type: 'belt' },
        
        // Tier 5 (Lv.20) - 16,000 G
        { lv: 20, name: '연마된 강철 검', k: 2.1, p: 16000, type: 'weapon' },
        { lv: 20, name: '강화 가죽 옷', k: 2.0, p: 16000, type: 'armor' },
        { lv: 20, name: '강화 가죽 벨트', k: 2.5, p: 16000, type: 'belt' },
        
        // Tier 6 (Lv.25) - 32,000 G
        { lv: 25, name: '은빛 강철 검', k: 2.7, p: 32000, type: 'weapon' },
        { lv: 25, name: '비늘 갑옷', k: 2.5, p: 32000, type: 'armor' },
        { lv: 25, name: '금속 장식 벨트', k: 3.3, p: 32000, type: 'belt' },
        
        // Tier 7 (Lv.30) - 64,000 G
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
        potions: [
            { id: 1, n: '최하급 포션', r: 100, p: 500, img: 'health_potion_1.png' },
            { id: 2, n: '하급 포션', r: 500, p: 2000, img: 'health_potion_2.png' },
            { id: 3, n: '중급 포션', r: 2000, p: 5000, img: 'health_potion_3.png' },
            { id: 4, n: '상급 포션', r: 5000, p: 10000, img: 'health_potion_4.png' },
            { id: 5, n: '최상급 포션', r: 10000, p: 20000, img: 'health_potion_5.png' }
        ],
        scrolls: [
            { id: 1, n: '하급 방지권', p: 50000, img: 'scroll_1.png' },
            { id: 2, n: '중급 방지권', p: 150000, img: 'scroll_2.png' },
            { id: 3, n: '상급 방지권', p: 500000, img: 'scroll_3.png' }
        ]
    },

    // 몬스터 기준 데이터 (구간별 기준점)
    MONSTER_STAGES: [
        { lv: 1,  hp: 280,  atk: 25,  def: 5,   gold: 100,   exp: 10 },
        { lv: 5,  hp: 380,  atk: 35,  def: 8,   gold: 300,   exp: 50 },
        { lv: 10, hp: 650,  atk: 55,  def: 15,  gold: 800,   exp: 100 },
        { lv: 15, hp: 1200, atk: 95,  def: 30,  gold: 2000,  exp: 150 },
        { lv: 20, hp: 2200, atk: 160, def: 55,  gold: 5000,  exp: 200 },
        { lv: 25, hp: 4200, atk: 300, def: 100, gold: 12000, exp: 300 },
        { lv: 30, hp: 7500, atk: 550, def: 180, gold: 30000, exp: 500 }
    ],

    MINES: [
        { name: '고갈된 광산', cost: 500, rates: [0.4, 0.4, 0.2, 0, 0, 0] },
        { name: '무너진 광산', cost: 2000, rates: [0.4, 0.2, 0.3, 0.1, 0, 0] },
        { name: '빛나는 광산', cost: 10000, rates: [0.4, 0.1, 0.2, 0.25, 0.05, 0] },
        { name: '찬란한 광산', cost: 50000, rates: [0.39, 0.1, 0.15, 0.2, 0.15, 0.01] }
    ],
    ORES: [
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

