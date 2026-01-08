/* Skill_System.js */
const SkillSystem = {
    // 1. 아이템에 스킬 부여
    attachSkill: (item, count) => {
        // DB에서 해당 장비 타입(weapon/armor/belt)의 스킬 목록 가져오기
        const pool = (GameDatabase.SKILLS && GameDatabase.SKILLS[item.type]) 
                     ? GameDatabase.SKILLS[item.type] 
                     : [];

        if (pool.length === 0) return item;
        if (!item.skills) item.skills = [];

        for (let i = 0; i < count; i++) {
            // [중복 방지] 이미 장착된 스킬 ID('smash' 등)는 제외하고
            // "가능한 스킬 ID 목록"만 먼저 뽑습니다.
            const currentIds = item.skills.map(s => s.id);
            // pool에서 ID만 추출 -> 중복제거 -> 이미 가진 ID 제외
            const availableIds = [...new Set(pool.map(s => s.id))]
                                 .filter(id => !currentIds.includes(id));

            if (availableIds.length === 0) break; // 더 이상 붙일 종류가 없음

            // 1) 스킬 종류(ID) 랜덤 선택 (예: 'smash' 당첨)
            const targetId = availableIds[Math.floor(Math.random() * availableIds.length)];

            // 2) 레벨 결정 (70% / 20% / 10%)
            const roll = Math.random() * 100;
            let targetLv = 1; // 기본 1레벨 ('1')
            
            if (roll < 70) {
                targetLv = 1;
            } else if (roll < 90) { // 70 ~ 89
                targetLv = 2;
            } else { // 90 ~ 99
                targetLv = 3;
            }

            // 3) DB에서 [ID가 같고] AND [이름 끝자리가 레벨과 같은] 스킬 찾기
            // 예: id가 'smash'이면서 이름이 '강타2' 인 것
            let selectedSkill = pool.find(s => s.id === targetId && s.name.endsWith(String(targetLv)));

            // [안전장치] 만약 운 좋게 3레벨이 떴는데 DB에 '강타3'이 없다면? -> 1레벨이라도 줌
            if (!selectedSkill) {
                selectedSkill = pool.find(s => s.id === targetId && s.name.endsWith('1'));
            }

            // 스킬 장착
            if (selectedSkill) {
                // 원본 훼손 방지를 위해 복사해서 추가
                item.skills.push({ ...selectedSkill });
                // 이름 장식 추가
                item.name = `${item.name} [${selectedSkill.name}]`;
            }
        }
        return item;
    },

    // 2. 전투 중 발동 체크 (DB에 turn이 있으므로 이를 활용)
    check: (item, turn) => {
        if (!item || !item.skills || item.skills.length === 0) return [];
        // 현재 턴이 스킬의 쿨타임(turn)으로 나누어 떨어질 때 발동
        return item.skills.filter(s => turn % s.turn === 0);
    }
};

/* ----------------------------------------------------
   [스킬 핸들러] DB의 desc(설명)와 val(수치)에 맞춰 동작 구현
   ---------------------------------------------------- */
const SkillHandlers = {
    // 1. 공격 턴 (무기, 글러브 등)
    OFFENSIVE: {
        // [기존 무기 스킬]
        'weapon': (val, pStats) => { return { mul: val, msg: `(x${val})` }; },
        'smash': (val, stats) => { return { mul: val, msg: `(강타 x${val})` }; },
        'crit': (val, stats) => { return { mul: val, msg: `⚡(치명타 x${val})` }; },

        // [글러브 기본 효과] (아이템 타입 'gloves'가 호출될 때)
        'gloves': (val, stats) => { 
            return { mul: val, msg: `(장갑 보너스 x${val.toFixed(2)})` }; 
        },

        // ★ [추가] 글러브 전용 스킬
        'combo': (val, stats) => {
            // 연타: 빠르고 경쾌한 느낌
            return { mul: val, msg: `🥊(연타 x${val})` };
        },
        'weakness': (val, stats) => {
            // 약점 포착: 묵직한 한방 느낌
            return { mul: val, msg: `🎯(약점 포착! x${val})` };
        }
    },

    // 2. 방어 턴 (갑옷, 신발 등)
    DEFENSIVE: {
        'armor': (val) => { return { mul: val, msg: `피해 감소` }; }, // 기본 방어
        'iron': (val) => { 
            return { mul: (1 - val), msg: `(철벽 -${val*100}%)` }; 
        },
        'evade': (val) => { 
            return { mul: 0, msg: "💨(완전 회피!)" }; 
        },
        'shoes': (val) => { return { mul: 0, msg: `완전 회피` }; }
    },

    // 3. 회복/기타 (벨트, 반지 등)
    RECOVERY: {
        'belt': (val, pStats) => {
            const heal = Math.floor(pStats.hp * val);
            return { heal: heal, msg: `체력 회복 +${heal}` };
        },
        'heal': (val, stats, currentHp) => {
            const amount = Math.floor(stats.hp * val);
            return { heal: amount, msg: `+${amount} (${val*100}%)` };
        },
        'ring': (val) => { return { heal: 0, msg: "마나 회복(미구현)" }; }
    }
};
