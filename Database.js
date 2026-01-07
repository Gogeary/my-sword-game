/* ==========================================
   [Database.js]
   게임 내 모든 상수, 아이템, 몬스터, 광산 데이터 관리
   ========================================== */

const GameDatabase = {
    SYSTEM: {
        TITLE: "강화하기 v1.8",
        START_GOLD: 100000,
        MAX_ENHANCE: 20,
        COMBAT_SPEED: 100,
        MAX_POTION_CAPACITY: 10,
        IMAGE_PATH: "image/",
        SCAN_COST: 20000 // 탐색 비용
    },

    USER_STATS: {
        BASE: { ATK: 10, DEF: 2, HP: 100 },
        GET_NEXT_EXP: (lv) => Math.floor(lv * 100 * 1.4),
        CALC_ATK: (lv) => Math.floor(10 + 0.5 * Math.pow(lv - 1, 1.2)),
        CALC_DEF: (lv) => Math.floor(2 + 0.1 * Math.pow(lv - 1, 1.1)),
        CALC_HP: (lv) => Math.floor(100 + 5 * Math.pow(lv - 1, 1.3))
    },

    /* [장비 가격: 티어별 가격 적용] */
    EQUIPMENT: [
        // Tier 1 (1,000 G)
        { lv: 1, name: '나무 검', k: 1.1, p: 1000, type: 'weapon', img: 'wood_sword.png' },
        { lv: 1, name: '헐거운 옷', k: 1.0, p: 1000, type: 'armor', img: 'loose_clothes.png' },
        { lv: 1, name: '낡은 벨트', k: 1.0, p: 1000, type: 'belt', img: 'old_belt.png' },
        
        // Tier 2 (10,000 G)
        { lv: 5, name: '낡은 검', k: 1.2, p: 10000, type: 'weapon' , img: 'rusty_sword.png' },
        { lv: 5, name: '천 옷', k: 1.1, p: 10000, type: 'armor' },
        { lv: 5, name: '천 벨트', k: 1.2, p: 10000, type: 'belt' },
        
        // Tier 3 (50,000 G)
        { lv: 10, name: '철 검', k: 1.4, p: 50000, type: 'weapon' },
        { lv: 10, name: '질긴 옷', k: 1.3, p: 50000, type: 'armor' },
        { lv: 10, name: '질긴 벨트', k: 1.5, p: 50000, type: 'belt' },
        
        // Tier 4 (250,000 G)
        { lv: 15, name: '강철 검', k: 1.7, p: 250000, type: 'weapon' },
        { lv: 15, name: '가죽 옷', k: 1.6, p: 250000, type: 'armor' },
        { lv: 15, name: '가죽 벨트', k: 1.9, p: 250000, type: 'belt' },
        
        // Tier 5 (1,250,000 G)
        { lv: 20, name: '연마된 강철 검', k: 2.1, p: 1250000, type: 'weapon' },
        { lv: 20, name: '강화 가죽 옷', k: 2.0, p: 1250000, type: 'armor' },
        { lv: 20, name: '강화 가죽 벨트', k: 2.5, p: 1250000, type: 'belt' },
        
        // Tier 6 (6,000,000 G)
        { lv: 25, name: '은빛 강철 검', k: 2.7, p: 6000000, type: 'weapon' },
        { lv: 25, name: '비늘 갑옷', k: 2.5, p: 6000000, type: 'armor' },
        { lv: 25, name: '금속 장식 벨트', k: 3.3, p: 6000000, type: 'belt' },
        
        // Tier 7 (30,000,000 G)
        { lv: 30, name: '은 검', k: 3.5, p: 30000000, type: 'weapon' },
        { lv: 30, name: '강철 갑옷', k: 3.2, p: 30000000, type: 'armor' },
        { lv: 30, name: '용병 벨트', k: 4.5, p: 30000000, type: 'belt' }
    ],

    ENHANCE_FORMULA: {
        weapon: (base, k, en) => base * k * (1 + 0.2 * Math.pow(en, 1.1)),
        armor:  (base, k, en) => base * k * (1 + 0.5 * en),
        belt:   (base, k, en) => base * k * (1 + 0.1 * Math.pow(en, 1.25))
    },

    CONSUMABLES: {
        potions: [
            { id: 1, name: '최하급 포션', val: 100, p: 5000, type: 'potion', img: 'health_potion_1.png' },
            { id: 2, name: '하급 포션', val: 400, p: 20000, type: 'potion', img: 'health_potion_2.png' },
            { id: 3, name: '중급 포션', val: 1000, p: 50000, type: 'potion', img: 'health_potion_3.png' },
            { id: 4, name: '상급 포션', val: 2000, p: 100000, type: 'potion', img: 'health_potion_4.png' },
            { id: 5, name: '최상급 포션', val: 4000, p: 200000, type: 'potion', img: 'health_potion_5.png' }
        ],
        scrolls: [
            { id: 1, name: '하급 방지권', p: 50000, type: 'scroll', img: 'scroll_1.png' },
            { id: 2, name: '중급 방지권', p: 150000, type: 'scroll', img: 'scroll_2.png' },
            { id: 3, name: '상급 방지권', p: 500000, type: 'scroll', img: 'scroll_3.png' }
        ]
    },

    // [몬스터 골드 수정]
    MONSTER_STAGES: [
        { lv: 1,  hp: 280,  atk: 25,  def: 5,   gold: 100,      exp: 10 },
        { lv: 5,  hp: 380,  atk: 35,  def: 8,   gold: 1000,     exp: 50 },
        { lv: 10, hp: 650,  atk: 55,  def: 15,  gold: 5000,     exp: 100 },
        { lv: 15, hp: 1200, atk: 95,  def: 30,  gold: 25000,    exp: 150 },
        { lv: 20, hp: 2200, atk: 160, def: 55,  gold: 100000,   exp: 200 },
        { lv: 25, hp: 4200, atk: 300, def: 100, gold: 400000,   exp: 300 },
        { lv: 30, hp: 7500, atk: 550, def: 180, gold: 1000000,  exp: 500 }
    ],
    
   // [사냥터 목록: cost(탐색 비용) 추가]
    HUNTING_ZONES: [
        { id: 0, name: "집 앞마당", minLv: 1, maxLv: 5, cost: 1000 },
        { id: 1, name: "뒷산", minLv: 6, maxLv: 10, cost: 5000 },
        { id: 2, name: "뒷산 동굴", minLv: 11, maxLv: 15, cost: 15000 },
        { id: 3, name: "우리동네 폐허", minLv: 16, maxLv: 20, cost: 30000 },
        { id: 4, name: "회사 근처", minLv: 21, maxLv: 25, cost: 50000 },
        { id: 5, name: "회사", minLv: 26, maxLv: 30, cost: 100000 }
    ],

    MINES: [
        { name: '고갈된 광산', cost: 2000, rates: [0.4, 0.4, 0.2, 0, 0, 0] },
        { name: '무너진 광산', cost: 10000, rates: [0.4, 0.2, 0.3, 0.1, 0, 0] },
        { name: '빛나는 광산', cost: 100000, rates: [0.4, 0.1, 0.2, 0.25, 0.05, 0] },
        { name: '찬란한 광산', cost: 500000, rates: [0.39, 0.1, 0.15, 0.2, 0.15, 0.01] }
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
   [몬스터 데이터 자동 생성 로직 (수정됨)]
   - 중복된 코드를 제거하고 하나로 통합했습니다.
   ============================================================ */
(function generateFullMonsterData() {
    const fullStages = [];
    const stages = GameDatabase.MONSTER_STAGES;

    if(!stages) return;

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
   // [추가] 장비 부위별 패시브 스킬 목록
    SKILLS: {
        weapon: [
            { id: 'smash', name: '강타', turn: 3, val: 2.0, desc: '3턴마다 2배 데미지' },
            { id: 'crit', name: '치명타', turn: 4, val: 1.5, desc: '4턴마다 1.5배 데미지' }
        ],
        armor: [
            { id: 'iron', name: '철벽', turn: 3, val: 0.5, desc: '3턴마다 받는 피해 50% 감소' },
            { id: 'evade', name: '회피', turn: 5, val: 0.0, desc: '5턴마다 데미지 무효화' }
        ],
        belt: [
            { id: 'heal', name: '재생', turn: 4, val: 0.1, desc: '4턴마다 최대 체력의 10% 회복' }
        ]
    }
    // 마지막 30레벨 추가
    fullStages.push(stages[stages.length - 1]);

    // 생성된 데이터를 GameDatabase에 'MONSTER_TABLE'로 저장
    GameDatabase.MONSTER_TABLE = fullStages;
})();





