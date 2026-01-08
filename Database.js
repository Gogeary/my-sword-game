/* ==========================================
   [Database.js] (문법 오류 수정본)
   ========================================== */
const GameDatabase = {
    SYSTEM: {
        TITLE: "강화하기 v2.3",
        START_GOLD: 100000,
        MAX_ENHANCE: 20,
        COMBAT_SPEED: 100,
        MAX_POTION_CAPACITY: 10,
        IMAGE_PATH: "image/",
        SCAN_COST: 20000
    },

    USER_STATS: {
        BASE: { ATK: 10, DEF: 2, HP: 100 },
        GET_NEXT_EXP: (lv) => Math.floor(lv * 100 * 1.4),
        CALC_ATK: (lv) => Math.floor(10 + 0.5 * Math.pow(lv - 1, 1.2)),
        CALC_DEF: (lv) => Math.floor(2 + 0.1 * Math.pow(lv - 1, 1.1)),
        CALC_HP: (lv) => Math.floor(100 + 5 * Math.pow(lv - 1, 1.3))
    },

    EQUIPMENT: [
    // --- [1티어 (Lv.1)] ---
    { lv: 1, tier: 1, name: '나무 검', k: 1.1, p: 1000, type: 'weapon', img: 'wood_sword.png', info: '주운 나뭇가지를 깎아서 만들었다.'},
    { lv: 1, tier: 1, name: '헐거운 옷', k: 1.0, p: 1000, type: 'armor', img: 'loose_clothes.png', info: '헌옷 수거함에서 주워왔다.'},
    { lv: 1, tier: 1, name: '낡은 벨트', k: 1.0, p: 1000, type: 'belt', img: 'old_belt.png', info: '봉투를 묶던 천이다.'},

    // --- [2티어 (Lv.5)] ---
    { lv: 5, tier: 2, name: '낡은 검', k: 1.2, p: 10000, type: 'weapon' , img: 'rusty_sword.png', info: '창고에 박혀있던 녹이 슨 검이다.'},
    { lv: 5, tier: 2, name: '천 옷', k: 1.1, p: 10000, type: 'armor', img: 'clothe.png', info: '전통시장에서 팔고있는 저렴한 천 옷이다.'},
    { lv: 5, tier: 2, name: '천 벨트', k: 1.2, p: 10000, type: 'belt', img: 'clothe_belt.png', info: '선물 포장용 천이다.'},

    // --- [3티어 (Lv.10)] ---
    { lv: 10, tier: 3, name: '철 검', k: 1.4, p: 50000, type: 'weapon', img: 'iron_sword.png', info: '평범한 철로 제작한 검이다.'},
    { lv: 10, tier: 3, name: '질긴 옷', k: 1.3, p: 50000, type: 'armor', img: 'durable_clothe.png', info: '질겨서 방어 기능이 조금 생긴 옷이다.'},
    { lv: 10, tier: 3, name: '질긴 벨트', k: 1.5, p: 50000, type: 'belt', img: 'durable_clothe_belt.png', info: '바지가 잘 안흘러내려서 좋다.'},

    // --- [4티어 (Lv.15)] ---
    { lv: 15, tier: 4, name: '강철 검', k: 1.7, p: 250000, type: 'weapon', img: 'steel_sword.png', info: '단단한 강철로 만들어져 날이 예리하다.' },
    { lv: 15, tier: 4, name: '가죽 옷', k: 1.6, p: 250000, type: 'armor', img: 'leather_armor.png', info: '동물의 가죽을 가공해 만든 활동적인 옷이다.' },
    { lv: 15, tier: 4, name: '가죽 벨트', k: 1.9, p: 250000, type: 'belt', img: 'leather_belt.png', info: '허리를 단단하게 잡아주는 가죽 벨트다.' },

    // --- [5티어 (Lv.20)] ---
    { lv: 20, tier: 5, name: '연마된 강철 검', k: 2.1, p: 1250000, type: 'weapon', img: 'polished_steel_sword.png', info: '장인의 손길로 연마되어 빛이 난다.' },
    { lv: 20, tier: 5, name: '강화 가죽 옷', k: 2.0, p: 1250000, type: 'armor', img: 'reinforced_leather_armor.png', info: '가죽을 여러 겹 덧대어 방어력을 높였다.' },
    { lv: 20, tier: 5, name: '강화 가죽 벨트', k: 2.5, p: 1250000, type: 'belt', img: 'reinforced_leather_belt.png', info: '도구 주머니가 달려 실용성이 늘어났다.' },

    // --- [6티어 (Lv.25)] ---
    { lv: 25, tier: 6, name: '은빛 강철 검', k: 2.7, p: 6000000, type: 'weapon', img: 'silvery_sword.png', info: '특수 합금으로 제작되어 은은한 빛을 낸다.' },
    { lv: 25, tier: 6, name: '비늘 갑옷', k: 2.5, p: 6000000, type: 'armor', img: 'scale_armor.png', info: '단단한 비늘을 엮어 만들어 충격 흡수에 탁월하다.' },
    { lv: 25, tier: 6, name: '금속 장식 벨트', k: 3.3, p: 6000000, type: 'belt', img: 'metal_deco_belt.png', info: '고가의 금속 장식이 박힌 고급 벨트.' },

    // --- [7티어 (Lv.30)] ---
    { lv: 30, tier: 7, name: '은 검', k: 3.5, p: 30000000, type: 'weapon', img: 'silver_sword.png', info: '순은과 마력으로 제련하여 사악한 기운을 벤다.' },
    { lv: 30, tier: 7, name: '강철 갑옷', k: 3.2, p: 30000000, type: 'armor', img: 'plate_armor.png', info: '전신을 완벽하게 보호하는 육중한 갑옷이다.' },
    { lv: 30, tier: 7, name: '용병 벨트', k: 4.5, p: 30000000, type: 'belt', img: 'mercenary_belt.png', info: '수많은 전장을 누빈 용병 대장의 벨트.' }
],

    ENHANCE_FORMULA: {
        weapon: (base, k, en) => base * k * (1 + 0.2 * Math.pow(en, 1.1)),
        armor:  (base, k, en) => base * k * (1 + 0.5 * en),
        belt:   (base, k, en) => base * k * (1 + 0.1 * Math.pow(en, 1.25))
    },

    CONSUMABLES: {
        potions: [
            { id: 1, name: '최하급 포션', val: 100, p: 5000, type: 'potion', img: 'health_potion_1.png', info: '회복력이 미미하다.'},
            { id: 2, name: '하급 포션', val: 1000, p: 50000, type: 'potion', img: 'health_potion_2.png', info: '좀 더 농축된 회복력을 느낄 수 있다.'},
            { id: 3, name: '중급 포션', val: 10000, p: 500000, type: 'potion', img: 'health_potion_3.png', info: '좀 걸쭉한것 같아서 기분은 나쁘지만 효과는 좋다.'},
            { id: 4, name: '상급 포션', val: 100000, p: 5000000, type: 'potion', img: 'health_potion_4.png', info: '손에 상처를 내봤는데 실시간으로 낫는게 신기하다.'},
            { id: 5, name: '최상급 포션', val: 1000000, p: 50000000, type: 'potion', img: 'health_potion_5.png', info: '돈만있으면 안되는게 없는데, 돈이 없어서 문제다.'}
        ],
        scrolls: [
            { id: 1, name: '하급 방지권', p: 50000, type: 'scroll', img: 'scroll_1.png', info: '장비의 파괴를 막아주지만 한계가 있다.'},
            { id: 2, name: '중급 방지권', p: 150000, type: 'scroll', img: 'scroll_2.png', info: '장비 파괴 한계를 조금 더 늘린 개선품이다.'},
            { id: 3, name: '상급 방지권', p: 500000, type: 'scroll', img: 'scroll_3.png', info: '조금 더 개선해서 품질을 더욱 끌어올렸다.'}
        ],
        tickets: [
            { id: 't5', name: '+5 강화권', val: 5, type: 'ticket', p: 20000, img: 'ticket5.png', info: '이건 왜 있는거야?'},
            { id: 't7', name: '+7 강화권', val: 7, type: 'ticket', p: 50000, img: 'ticket7.png', info: '그래도 좀 쓸만한 것 같다.'},
            { id: 't10', name: '+10 강화권', val: 10, type: 'ticket', p: 1000000, img: 'ticket10.png', info: '자동강화를 사용 한 것 같은 마법! 그러나 돈이 들진 않아서 좋다.'},
            { id: 't12', name: '+12 강화권', val: 12, type: 'ticket', p: 2000000, img: 'ticket12.png', info: '그래도 난 운이 좋은편인거지.'},
            { id: 't13', name: '+13 강화권', val: 13, type: 'ticket', p: 4000000, img: 'ticket13.png', info: '그래도 확실한 성능은 보장해 주는거지'},
            { id: 't14', name: '+14 강화권', val: 14, type: 'ticket', p: 10000000, img: 'ticket14.png', info: '이제 내 장비에서 빛을 나게 할 자신이 생긴다.'},
            { id: 't15', name: '+15 강화권', val: 15, type: 'ticket', p: 20000000, img: 'ticket15.png', info: '사냥터를 부수러 가자.'}
        ]
    },

   GEM_DROPS: {
        // [1티어] Lv.1~5 (1,000 G ~ 5,000 G)
        TIER_1: [
            { id: 101, name: '재스퍼', p: 1000, type: 'etc', img: 'gem_jasper.png', info: '알록달록한 무늬가 있는 흔한 돌.' },
            { id: 102, name: '아게이트', p: 5000, type: 'etc', img: 'gem_agate.png', info: '나이테 같은 띠무늬가 매력적인 마노.' }
        ],
        // [2티어] Lv.6~10 (10,000 G ~ 30,000 G)
        TIER_2: [
            { id: 103, name: '쿼츠', p: 10000, type: 'etc', img: 'gem_quartz.png', info: '투명하고 깨끗한 수정 조각.' },
            { id: 104, name: '시트린', p: 30000, type: 'etc', img: 'gem_citrine.png', info: '상큼한 노란 빛을 띠는 황수정.' }
        ],
        // [3티어] Lv.11~15 (50,000 G ~ 100,000 G)
        TIER_3: [
            { id: 105, name: '터키석', p: 50000, type: 'etc', img: 'gem_turquoise.png', info: '행운을 상징하는 불투명한 하늘색 보석.' },
            { id: 106, name: '자수정', p: 100000, type: 'etc', img: 'gem_amethyst.png', info: '신비로운 보라색이 감도는 수정.' }
        ],
        // [4티어] Lv.16~20 (200,000 G ~ 400,000 G)
        TIER_4: [
            { id: 107, name: '라피스 라줄리', p: 200000, type: 'etc', img: 'gem_lapis.png', info: '밤하늘 같은 짙은 푸른색에 금빛 점이 박혀있다.' },
            { id: 108, name: '호박', p: 400000, type: 'etc', img: 'gem_amber.png', info: '고대의 송진이 굳어 만들어진 황금빛 보석.' }
        ],
        // [5티어] Lv.21~25 (80만 G ~ 150만 G)
        TIER_5: [
            { id: 109, name: '페리도트', p: 800000, type: 'etc', img: 'gem_peridot.png', info: '싱그러운 올리브 녹색을 띠는 감람석.' },
            { id: 110, name: '토파즈', p: 1500000, type: 'etc', img: 'gem_topaz.png', info: '청명하고 시원한 파란색이 일품이다.' }
        ],
        // [6티어] Lv.26~30 (300만 G ~ 500만 G)
        TIER_6: [
            { id: 111, name: '오팔', p: 3000000, type: 'etc', img: 'gem_opal.png', info: '보는 각도에 따라 무지개색으로 변한다.' },
            { id: 112, name: '아쿠아마린', p: 5000000, type: 'etc', img: 'gem_aquamarine.png', info: '바다의 푸른 빛을 그대로 담은 듯하다.' }
        ],
        // [7티어] Lv.31~35 (750만 G ~ 1000만 G)
        TIER_7: [
            { id: 113, name: '스피넬', p: 7500000, type: 'etc', img: 'gem_spinel.png', info: '루비와 비슷해 보이지만 다른 매력을 가진 붉은 보석.' },
            { id: 114, name: '탄자나이트', p: 10000000, type: 'etc', img: 'gem_tanzanite.png', info: '아프리카의 푸른 밤하늘을 닮은 희귀한 보석.' }
        ],
        // [8티어] Lv.36~40 (1500만 G ~ 2000만 G)
        TIER_8: [
            { id: 115, name: '사파이어', p: 15000000, type: 'etc', img: 'gem_sapphire.png', info: '깊고 푸른색이 매혹적인 귀보석.' },
            { id: 116, name: '에메랄드', p: 20000000, type: 'etc', img: 'gem_emerald.png', info: '생명력이 느껴지는 짙은 녹색의 귀보석.' }
        ],
        // [9티어] Lv.41~45 (2500만 G ~ 5000만 G)
        TIER_9: [
            { id: 117, name: '루비', p: 25000000, type: 'etc', img: 'gem_ruby.png', info: '불타오르는 듯한 강렬한 붉은색의 보석의 왕.' },
            { id: 118, name: '다이아몬드', p: 50000000, type: 'etc', img: 'gem_diamond.png', info: '가장 단단하고 영원히 빛나는 보석.' }
        ],
        // [10티어] Lv.46~50 (7500만 G ~ 1억 G)
        TIER_10: [
            { id: 119, name: '핑크 다이아몬드', p: 75000000, type: 'etc', img: 'gem_pink_dia.png', info: '기적적인 확률로 발견되는 천연 분홍빛 다이아몬드.' },
            { id: 120, name: '레드 다이아몬드', p: 100000000, type: 'etc', img: 'gem_red_dia.png', info: '전 세계에 몇 개 없는 전설적인 붉은 다이아몬드.' }
        ],
        // [11티어] Lv.51~55 (2억 G ~ 3억 G)
        TIER_11: [
            { id: 121, name: '문스톤', p: 200000000, type: 'etc', img: 'gem_moonstone.png', info: '달빛을 머금어 은은하게 빛나는 신비한 돌.' },
            { id: 122, name: '썬스톤', p: 300000000, type: 'etc', img: 'gem_sunstone.png', info: '태양의 열기를 품고 있어 만지면 따뜻하다.' }
        ],
        // [12티어] Lv.56~60 (5억 G ~ 7억 G)
        TIER_12: [
            { id: 123, name: '스타더스트', p: 500000000, type: 'etc', img: 'gem_stardust.png', info: '떨어진 별똥별의 파편을 가공한 보석.' },
            { id: 124, name: '보이드 오팔', p: 700000000, type: 'etc', img: 'gem_void_opal.png', info: '공허의 기운이 감도는 검은 빛의 오팔.' }
        ],
        // [13티어] Lv.61~65 (10억 G ~ 15억 G)
        TIER_13: [
            { id: 125, name: '드래곤 아이', p: 1000000000, type: 'etc', img: 'gem_dragon_eye.png', info: '고룡의 눈동자를 닮은 맹렬한 붉은 보석.' },
            { id: 126, name: '피닉스 엠버', p: 1500000000, type: 'etc', img: 'gem_phoenix.png', info: '불사조의 깃털이 화석화되어 만들어진 호박.' }
        ],
        // [14티어] Lv.66~70 (25억 G ~ 40억 G)
        TIER_14: [
            { id: 127, name: '엔젤릭 쿼츠', p: 2500000000, type: 'etc', img: 'gem_angelic.png', info: '천사의 날개처럼 투명하고 성스러운 기운이 느껴진다.' },
            { id: 128, name: '데모닉 루비', p: 4000000000, type: 'etc', img: 'gem_demonic.png', info: '마계의 붉은 달빛을 받아 핏빛으로 빛난다.' }
        ],
        // [15티어] Lv.71~75 (60억 G ~ 90억 G)
        TIER_15: [
            { id: 129, name: '크로노스 젬', p: 6000000000, type: 'etc', img: 'gem_chronos.png', info: '시간의 흐름을 왜곡시킨다는 전설의 보석.' },
            { id: 130, name: '아이테르 결정', p: 9000000000, type: 'etc', img: 'gem_aether.png', info: '대기의 정수가 응축되어 공중에 살짝 떠 있다.' }
        ],
        // [16티어] Lv.76~80 (150억 G ~ 200억 G)
        TIER_16: [
            { id: 131, name: '카오스 에메랄드', p: 15000000000, type: 'etc', img: 'gem_chaos.png', info: '혼돈의 에너지가 소용돌이치는 녹색 보석.' },
            { id: 132, name: '코스믹 사파이어', p: 20000000000, type: 'etc', img: 'gem_cosmic.png', info: '우주의 성운이 보석 안에 들어있는 것 같다.' }
        ],
        // [17티어] Lv.81~85 (350억 G ~ 500억 G)
        TIER_17: [
            { id: 133, name: '갤럭시 펄', p: 35000000000, type: 'etc', img: 'gem_galaxy.png', info: '은하수 전체를 담고 있는 영롱한 진주.' },
            { id: 134, name: '네뷸라 스톤', p: 50000000000, type: 'etc', img: 'gem_nebula.png', info: '성운의 가스와 먼지가 압축되어 만들어진 보석.' }
        ],
        // [18티어] Lv.86~90 (800억 G ~ 1000억 G)
        TIER_18: [
            { id: 135, name: '신의 눈물', p: 80000000000, type: 'etc', img: 'gem_god_tear.png', info: '신이 흘린 눈물이 결정화되었다는 성유물.' },
            { id: 136, name: '심연의 심장', p: 100000000000, type: 'etc', img: 'gem_abyss.png', info: '깊은 심연 속에서만 발견되는 고동치는 보석.' }
        ],
        // [19티어] Lv.91~95 (2000억 G ~ 5000억 G)
        TIER_19: [
            { id: 137, name: '차원의 조각', p: 200000000000, type: 'etc', img: 'gem_dimension.png', info: '다른 차원으로 이동할 수 있을 것 같은 균열이 보인다.' },
            { id: 138, name: '영혼의 보석', p: 500000000000, type: 'etc', img: 'gem_soul.png', info: '강력한 영혼의 힘이 깃들어 있어 바라보기만 해도 압도된다.' }
        ],
        // [20티어] Lv.96~100 (1조 G ~ 5조 G) - 엔드 게임 아이템
        TIER_20: [
            { id: 139, name: '이터널 다이아몬드', p: 1000000000000, type: 'etc', img: 'gem_eternal.png', info: '영원한 시간 속에서도 절대 변하지 않는 불멸의 보석.' },
            { id: 140, name: '창조의 근원', p: 5000000000000, type: 'etc', img: 'gem_origin.png', info: '세상이 창조될 때 생겨난 최초의 물질. 부르는 것이 값일 것이다.' }
        ]
    },


   
   BOSS_DATA: {
        CHANCE: 5, // 보스 조우 확률 (%)
        STAGES: {
            0: { name: "👑 왕 꿈틀이", hpMult: 3, atkMult: 1.5, goldMult: 5, expMult: 5, img: 'Zirung.png' }, // 집 앞마당 보스
            1: { name: "👑 왕 뱀", hpMult: 3.5, atkMult: 1.6, goldMult: 6, expMult: 6, img: 'Bam.png' }, // 뒷산 보스
            2: { name: "👑 쑥 먹는 김용준", hpMult: 4, atkMult: 1.8, goldMult: 7, expMult: 7, img: 'YJ_1.png' }, // 뒷산 동굴 보스
            3: { name: "👑 야근 망령", hpMult: 4.5, atkMult: 2.0, goldMult: 8, expMult: 8, img: 'Overtime_ghost.png' }, // 동네 폐허 보스
            4: { name: "👑 이완기 (산스장 망령)", hpMult: 5, atkMult: 2.2, goldMult: 10, expMult: 10, img: 'LWG.png' }, // 사기막골 보스
            5: { name: "👑 소부장 (기술팀 흑막)", hpMult: 7, atkMult: 2.5, goldMult: 15, expMult: 15, img: 'SSM.png' }  // 회사 보스
        }
    },

    MONSTER_STAGES: [
        { lv: 1,  hp: 280,  atk: 25,  def: 5,   gold: 100,      exp: 10 },
        { lv: 5,  hp: 380,  atk: 35,  def: 8,   gold: 1000,     exp: 50 },
        { lv: 10, hp: 650,  atk: 55,  def: 15,  gold: 5000,     exp: 100 },
        { lv: 15, hp: 1200, atk: 95,  def: 30,  gold: 25000,    exp: 150 },
        { lv: 20, hp: 2200, atk: 160, def: 55,  gold: 100000,   exp: 200 },
        { lv: 25, hp: 4200, atk: 300, def: 100, gold: 400000,   exp: 300 },
        { lv: 30, hp: 7500, atk: 550, def: 180, gold: 1000000,  exp: 500 }
    ],

    HUNTING_ZONES: [
        { id: 0, name: "집 앞마당", minLv: 1, maxLv: 5, cost: 1000 },
        { id: 1, name: "뒷산", minLv: 6, maxLv: 10, cost: 2500 },
        { id: 2, name: "뒷산 동굴", minLv: 11, maxLv: 15, cost: 7500 },
        { id: 3, name: "우리동네 폐허", minLv: 16, maxLv: 20, cost: 15000 },
        { id: 4, name: "사기막골", minLv: 21, maxLv: 25, cost: 25000 },
        { id: 5, name: "회사", minLv: 26, maxLv: 30, cost: 50000 }
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
    ],

    SKILLS: {
        weapon: [
            { id: 'smash', name: '강타1', turn: 3, val: 2.0, desc: '3턴마다 2배 데미지' },
            { id: 'smash', name: '강타2', turn: 3, val: 2.5, desc: '3턴마다 2.5배 데미지' },
            { id: 'smash', name: '강타3', turn: 3, val: 3.0, desc: '3턴마다 3배 데미지' },
            { id: 'crit', name: '치명타1', turn: 4, val: 1.5, desc: '4턴마다 1.5배 데미지' },
            { id: 'crit', name: '치명타2', turn: 4, val: 2, desc: '4턴마다 2배 데미지' },
            { id: 'crit', name: '치명타3', turn: 4, val: 2.5, desc: '4턴마다 2.5배 데미지' }
        ],
        armor: [
            { id: 'iron', name: '철벽1', turn: 3, val: 0.3, desc: '3턴마다 받는 피해 30% 감소' },
            { id: 'iron', name: '철벽2', turn: 3, val: 0.4, desc: '3턴마다 받는 피해 40% 감소' },
            { id: 'iron', name: '철벽3', turn: 3, val: 0.5, desc: '3턴마다 받는 피해 50% 감소' },
            { id: 'evade', name: '회피1', turn: 5, val: 0.0, desc: '5턴마다 데미지 무효화' },
            { id: 'evade', name: '회피2', turn: 4, val: 0.0, desc: '4턴마다 데미지 무효화' },
            { id: 'evade', name: '회피3', turn: 3, val: 0.0, desc: '3턴마다 데미지 무효화' }
        ],
        belt: [
            { id: 'heal', name: '재생1', turn: 4, val: 0.1, desc: '4턴마다 최대 체력의 10% 회복' },
            { id: 'heal', name: '재생2', turn: 4, val: 0.15, desc: '4턴마다 최대 체력의 15% 회복' },
            { id: 'heal', name: '재생3', turn: 4, val: 0.2, desc: '4턴마다 최대 체력의 20% 회복' }
        ]
    },

    // [중요] 여기가 GACHA의 올바른 위치입니다. (GameDatabase 닫히기 전)
    GACHA: {
        ENHANCE_BOX: {
            COST: 100000,
            RATES: [
                { type: 'ticket', val: 5,  name: '+5 강화권', chance: 30, color: '#2ecc71' },
                { type: 'ticket', val: 7,  name: '+7 강화권', chance: 15, color: '#3498db' },
                { type: 'ticket', val: 10, name: '+10 강화권', chance: 10, color: '#9b59b6' },
                { type: 'ticket', val: 12, name: '+12 강화권', chance: 3,  color: '#f1c40f' },
                { type: 'scroll', id: 1,   name: '하급 방지권', chance: 20, color: '#bdc3c7' },
                { type: 'scroll', id: 2,   name: '중급 방지권', chance: 15, color: '#95a5a6' },
                { type: 'scroll', id: 3,   name: '상급 방지권', chance: 7,  color: '#e74c3c' }
            ]
        }
    }
};

/* 몬스터 자동 생성 */
(function generateFullMonsterData() {
    const fullStages = [];
    const stages = GameDatabase.MONSTER_STAGES;
    if(!stages) return;
    for (let i = 0; i < stages.length - 1; i++) {
        const start = stages[i];
        const end = stages[i+1];
        const steps = end.lv - start.lv;
        fullStages.push(start);
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
    fullStages.push(stages[stages.length - 1]);
    GameDatabase.MONSTER_TABLE = fullStages;
})();















