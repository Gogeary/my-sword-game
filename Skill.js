/* Skill_System.js */
const SkillSystem = {
    // 아이템에 확률적으로 스킬 부여 (drop 시 호출됨)
    attachSkill: (item) => {
        if (item.skill || !['weapon', 'armor', 'belt'].includes(item.type)) return item;

        // 드랍 아이템 스킬 부여 확률: 50% (테스트를 위해 높게 잡음)
        const chance = Math.random() * 100;
        if (chance < 50) { 
            const pool = GameDatabase.SKILLS[item.type];
            if (pool && pool.length > 0) {
                const pick = pool[Math.floor(Math.random() * pool.length)];
                item.skill = { ...pick }; 
                item.name = `${item.name} [${pick.name}]`; // 이름 뒤에 [스킬명] 붙임
            }
        }
        return item;
    },

    // 전투 중 발동 체크
    check: (item, turn) => {
        if (!item || !item.skill) return null;
        if (turn % item.skill.turn === 0) {
            return item.skill;
        }
        return null;
    }
};