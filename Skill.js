/* Skill_System.js */
const SkillSystem = {
    // [설정] 등급별 가중치 (숫자가 높을수록 잘 나오고, 낮을수록 안 나옴)
    // 1등급: 흔함(70), 2등급: 희귀(25), 3등급: 전설(5)
    GRADE_WEIGHTS: {
        '1': 70,
        '2': 25,
        '3': 5
    },

    // 1. 아이템에 스킬 부여
    attachSkill: (item, count) => {
        const pool = GameDatabase.SKILLS[item.type]; 
        
        if (!pool || pool.length === 0) return item;
        if (!item.skills) item.skills = [];

        for (let i = 0; i < count; i++) {
            // 중복 방지: 이미 장착된 스킬은 제외
            const available = pool.filter(p => !item.skills.some(s => s.id === p.id));
            if (available.length === 0) break;

            // --- 가중치 랜덤 선택 로직 시작 ---
            
            // 1) 현재 선택 가능한 스킬들의 총 가중치 합 계산
            let totalWeight = 0;
            available.forEach(s => {
                const grade = s.name.slice(-1); // 이름 마지막 글자 (1, 2, 3) 추출
                totalWeight += SkillSystem.GRADE_WEIGHTS[grade] || 10; // 등급 없으면 기본값 10
            });

            // 2) 0 ~ totalWeight 사이의 난수 생성
            let random = Math.random() * totalWeight;
            let currentSum = 0;
            let pick = available[0]; // 기본값

            // 3) 난수에 해당하는 스킬 찾기
            for (const s of available) {
                const grade = s.name.slice(-1);
                currentSum += SkillSystem.GRADE_WEIGHTS[grade] || 10;
                if (random <= currentSum) {
                    pick = s;
                    break;
                }
            }
            // --- 가중치 랜덤 선택 로직 끝 ---

            // 스킬 추가 및 이름 변경
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
