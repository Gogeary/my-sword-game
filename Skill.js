/* Skill_System.js */
const SkillSystem = {
    // 1. 아이템에 스킬 부여 (확장성 개선)
    attachSkill: (item, count) => {
        // [수정] 하드코딩 제거: DB에 해당 타입의 스킬 목록이 있는지 확인
        const pool = GameDatabase.SKILLS[item.type]; 
        
        // 스킬 목록이 없거나 장비가 아니면 패스
        if (!pool || pool.length === 0) return item;
        
        // 스킬 목록 초기화
        if (!item.skills) item.skills = [];

        // 요청한 개수만큼 스킬 추가
        for (let i = 0; i < count; i++) {
            // 중복 방지
            const available = pool.filter(p => !item.skills.some(s => s.id === p.id));
            if (available.length === 0) break;

            const pick = available[Math.floor(Math.random() * available.length)];
            
            // 스킬 추가
            item.skills.push({ ...pick });
            item.name = `${item.name} [${pick.name}]`; 
        }
        return item;
    },

    // 2. 전투 중 발동 체크 (기존 유지)
    check: (item, turn) => {
        if (!item || !item.skills || item.skills.length === 0) return [];
        return item.skills.filter(s => turn % s.turn === 0);
    }
};
