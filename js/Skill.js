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
        'pierce': (val) => {
            return { ignoreDef: val, msg: `🔪(방어 ${val*100}% 관통)` };
        },
        'crit': (val, stats) => { return { mul: val, msg: `⚡(치명타 x${val})` }; },
        'bleed': (val, stats, enemyStats) => {
            const dmg = Math.floor(enemyStats.hp * val);
            return { fixed: dmg, msg: `🩸(출혈 ${dmg})` };
        },

        // [글러브 기본 효과] (아이템 타입 'gloves'가 호출될 때)
        'gloves': (val, stats) => {
            return { mul: val, msg: `(장갑 보너스 x${val.toFixed(2)})` };
        },

        // ★ [추가] 글러브 전용 스킬
        'drain': (val, dealtDmg) => {
            const heal = Math.floor(dealtDmg * val);
            return { heal: heal, msg: `🩸흡혈 +${heal}` };
        },
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
        'reflect': (val, takenDmg) => {
            const reflect = Math.floor(takenDmg * val);
            return { reflect: reflect, msg: `🔁(반사 ${reflect})` };
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
    },






    //몬스터 스킬

    MONSTER_ACTION: {
    // 1. m_smash: 강력한 한방 (데미지 2배)
    'm_smash': (val) => { 
        return { mul: val, msg: `💥거대한 일격! (데미지 ${val}배)` }; 
    },
    // 2. m_frenzy: 광분 (데미지 1.5배)
    'm_frenzy': (val) => { 
        return { mul: val, msg: `😡광분에 휩싸여 공격력이 상승합니다!` }; 
    },
    // 3. m_crit: 급소 찌르기 (치명타)
    'm_crit': (val) => { 
        return { mul: val, msg: `🎯급소를 정확히 노려쳤습니다! (x${val})` }; 
    },
    // 4. m_double: 연속 베기 (연속 공격 시뮬레이션)
    'm_double': (val) => { 
        return { mul: val, msg: `⚔️슈슉! 빠르게 두 번 베어 넘깁니다.` }; 
    },
    // 5. m_execute: 처형 (매우 강력한 공격)
    'm_execute': (val) => { 
        return { mul: val, msg: `💀단숨에 끝내기 위해 무기를 크게 휘두릅니다!` }; 
    },
    // 6. m_stomp: 지면 강타
    'm_stomp': (val) => { 
        return { mul: val, msg: `🦶지면을 강타하여 충격파가 전달됩니다.` }; 
    },
    // 7. m_bite: 피의 물어뜯기
    'm_bite': (val) => { 
        return { mul: val, msg: `🦷날카로운 이빨이 살점을 파고듭니다.` }; 
    },
    // 8. m_charge: 돌진
    'm_charge': (val) => { 
        return { mul: val, msg: `🏃강한 추진력으로 들이받습니다!` }; 
    },
    // 9. m_pierce: 방어구 관통 (방어력 무시 배율)
    'm_pierce': (val) => { 
        return { ignoreDef: 0.5, mul: val, msg: `🗡️갑옷의 틈새를 찔러 피해를 줍니다.` }; 
    },
    // 10. m_headbutt: 박치기
    'm_headbutt': (val) => { 
        return { mul: val, msg: `🤕단단한 머리로 정면을 가격합니다.` }; 
    },

// MONSTER_ACTION 계속
    // 11. m_heal: 재생 (최대 체력의 10% 회복)
    'm_heal': (val, mStats) => { 
        const amount = Math.floor(mStats.hp * val);
        return { heal: amount, msg: `💚상처가 아물며 체력을 ${amount} 회복합니다.` }; 
    },
    // 12. m_iron: 껍질 강화 (받는 피해 50% 감소)
    'm_iron': (val) => { 
        return { mul: (1 - val), msg: `🛡️껍질이 단단해져 공격이 잘 박히지 않습니다.` }; 
    },
    // 13. m_barrier: 마력 보호막
    'm_barrier': (val) => { 
        return { mul: (1 - val), msg: `🔮푸른 마력막이 피해를 흡수합니다.` }; 
    },
    // 14. m_evasion: 민첩한 움직임 (회피율 상승 또는 피해 무효화)
    'm_evasion': (val) => { 
        return { mul: (1 - val), msg: `💨공격을 가볍게 흘려보냅니다.` }; 
    },
    // 15. m_counter: 반격 태세 (피해 감소 및 반사)
    'm_counter': (val, takenDmg) => { 
        const reflect = Math.floor(takenDmg * val);
        return { mul: 0.5, reflect: reflect, msg: `🔁공격을 막아내고 ${reflect}만큼 반격합니다!` }; 
    },
    // 16. m_great_heal: 대회복
    'm_great_heal': (val, mStats) => { 
        const amount = Math.floor(mStats.hp * val);
        return { heal: amount, msg: `✨강력한 빛과 함께 체력이 ${amount} 회복됩니다!` }; 
    },
    // 17. m_absorb: 생명력 흡수 (준 피해의 일부만큼 회복)
    'm_absorb': (val, dealtDmg) => { 
        const heal = Math.floor(dealtDmg * val);
        return { heal: heal, msg: `💉상대의 생명력을 빨아들여 ${heal} 회복합니다.` }; 
    },
    // 18. m_hide: 은신
    'm_hide': (val) => { 
        return { mul: (1 - val), msg: `🌫️어둠 속으로 사라져 형태가 흐릿해집니다.` }; 
    },
    // 19. m_stone: 석화화 (방어 극대화)
    'm_stone': (val) => { 
        return { mul: val, msg: `🗿몸이 바위처럼 굳어 움직임은 없지만 매우 단단해집니다.` }; 
    },
    // 20. m_prayer: 치유의 기도
    'm_prayer': (val, mStats) => { 
        const amount = Math.floor(mStats.hp * val);
        return { heal: amount, msg: `🙏간절한 기도로 생명 에너지를 끌어모읍니다.` }; 
    },

// MONSTER_ACTION 계속
    // 21. m_roar: 위협의 포효 (공격력 감소)
    'm_roar': (val) => { 
        return { debuff: { target: 'atk', mul: val }, msg: `🦁포효에 위축되어 공격력이 ${val*100}%로 감소합니다!` }; 
    },
    // 22. m_curse: 저주
    'm_curse': (val) => { 
        return { debuff: { target: 'all', mul: val }, msg: `💀불길한 저주가 온몸을 휘감아 약해집니다.` }; 
    },
    // 23. m_poison: 독침
    'm_poison': (val) => { 
        return { dot: val, msg: `🤢독이 혈관을 타고 흐르며 매 턴 피해를 줍니다.` }; 
    },
    // 24. m_slow: 둔화
    'm_slow': (val) => { 
        return { debuff: { target: 'spd', mul: val }, msg: `🕸️몸이 무거워져 행동이 느려집니다.` }; 
    },
    // 25. m_blind: 모래 뿌리기
    'm_blind': (val) => { 
        return { debuff: { target: 'acc', mul: val }, msg: `👁️눈이 따가워 앞이 제대로 보이지 않습니다!` }; 
    },
    // 26. m_weak: 허약 가루
    'm_weak': (val) => { 
        return { debuff: { target: 'def', mul: val }, msg: `🍂갑옷이 종잇장처럼 느껴질 정도로 약해집니다.` }; 
    },
    // 27. m_fear: 공포
    'm_fear': (val) => { 
        return { skipTurnChance: val, msg: `😱공포에 질려 몸이 마음대로 움직이지 않습니다.` }; 
    },
    // 28. m_rust: 장비 부식
    'm_rust': (val) => { 
        return { equipmentDebuff: val, msg: `⚒️장비가 부식되어 성능이 일시적으로 하락합니다.` }; 
    },
    // 29. m_smoke: 연막탄
    'm_smoke': (val) => { 
        return { missChance: val, msg: `☁️연기 때문에 공격이 빗나갈 확률이 높아집니다.` }; 
    },
    // 30. m_stun: 충격 (기절)
    'm_stun': (val) => { 
        return { stun: true, msg: `💫머리에 강한 충격을 받아 정신을 차릴 수 없습니다!` }; 
    },

    // MONSTER_ACTION 계속
    // 31. m_fireball: 화염구
    'm_fireball': (val) => { 
        return { mul: val, msg: `🔥거대한 화염구가 폭발하며 대지를 불태웁니다!` }; 
    },
    // 32. m_ice: 얼음 화살
    'm_ice': (val) => { 
        return { mul: val, frozenChance: 0.2, msg: `❄️날카로운 냉기가 살을 파고듭니다.` }; 
    },
    // 33. m_bolt: 번개 낙하
    'm_bolt': (val) => { 
        return { mul: val, msg: `⚡하늘에서 내리친 번개가 온몸을 관통합니다!` }; 
    },
    // 34. m_earth: 대지의 분노
    'm_earth': (val) => { 
        return { mul: val, msg: `⛰️땅이 갈라지며 솟구친 암석들이 당신을 덮칩니다.` }; 
    },
    // 35. m_wind: 진공파
    'm_wind': (val) => { 
        return { mul: val, msg: `🌪️진공의 칼날이 보이지 않는 속도로 스쳐 지나갑니다.` }; 
    },
    // 36. m_dark: 암흑의 구체
    'm_dark': (val) => { 
        return { mul: val, lifeSteal: 0.2, msg: `🌑모든 빛을 삼키는 구체가 생명력을 갉아먹습니다.` }; 
    },
    // 37. m_light: 심판의 빛
    'm_light': (val) => { 
        return { mul: val, ignoreDef: 0.3, msg: `☀️하늘에서 쏟아지는 빛의 세례가 죄를 심판합니다.` }; 
    },
    // 38. m_acid: 산성 침
    'm_acid': (val) => { 
        return { mul: val, armorBreak: true, msg: `🧪치익- 산성 액체가 장비를 녹여버립니다.` }; 
    },
    // 39. m_meteor: 운석 낙하 (초강력)
    'm_meteor': (val) => { 
        return { mul: val, areaDamage: true, msg: `☄️대기권을 뚫고 내려온 운석이 폭발합니다!!` }; 
    },
    // 40. m_gravity: 중력 붕괴
    'm_gravity': (val) => { 
        return { mul: val, spdDebuff: 0.5, msg: `🌀엄청난 중력이 전신을 짓눌러 압착합니다.` }; 
    },

    // MONSTER_ACTION 계속
    // 41. m_sacrifice: 생명력 연소 (자폭성 공격)
    'm_sacrifice': (val, mStats) => { 
        return { mul: val, selfDamage: 0.2, msg: `🩸자신의 생명을 제물로 파괴적인 힘을 끌어냅니다!` }; 
    },
    // 42. m_copy: 복제
    'm_copy': (val) => { 
        return { evadeNext: true, msg: `👥어느 쪽이 진짜인지 분간할 수 없습니다.` }; 
    },
    // 43. m_drain: 마나 드레인
    'm_drain': (val) => { 
        return { mpDamage: val, msg: `🌀당신의 정신 에너지가 빠져나가는 것이 느껴집니다.` }; 
    },
    // 44. m_gravity_w: 무중력
    'm_gravity_w': (val) => { 
        return { shuffleSkills: true, msg: `☁️중력이 사라져 자세를 잡기가 매우 힘들어집니다.` }; 
    },
    // 45. m_time_stop: 시간 왜곡
    'm_time_stop': (val) => { 
        return { extraTurn: true, msg: `⏳시간이 멈춘 사이 몬스터가 다시 한번 움직입니다!` }; 
    },
    // 46. m_reborn: 불사조의 불꽃
    'm_reborn': (val, mStats) => { 
        return { heal: Math.floor(mStats.hp * val), invincibility: 1, msg: `🔥죽음을 거부하고 불꽃 속에서 부활합니다!` }; 
    },
    // 47. m_chaos: 혼돈의 파동
    'm_chaos': (val) => { 
        const randomMul = (Math.random() * val).toFixed(1);
        return { mul: randomMul, msg: `🌀무작위 에너지가 폭발합니다! (위력: ${randomMul})` }; 
    },
    // 48. m_apocalypse: 멸망의 전조
    'm_apocalypse': (val) => { 
        return { mul: val, destroyBuff: true, msg: `🌠세상의 종말이 눈앞에 다가왔습니다. 피할 수 없습니다.` }; 
    },
    // 49. m_mirage: 신기루
    'm_mirage': (val) => { 
        return { mul: 0, msg: `👻허상을 공격했습니다! 피해를 전혀 주지 못합니다.` }; 
    },
    // 50. m_requiem: 진혼곡
    'm_requiem': (val) => { 
        return { debuff: { target: 'all', mul: val }, msg: `🎵죽음을 노래하는 선율이 당신의 영혼을 갉아먹습니다.` }; 
    }
}






};