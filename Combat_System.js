/* ==========================================
   [Combat_System.js] 
   1:1 전투, 몬스터 이미지 적용, 확장성 고려 구조
   ========================================== */

const CombatSystem = {
    // 1. 몬스터 탐색
    scanHunt: () => {
        const grid = document.getElementById('hunt-grid');
        if (!grid) return;
        
        // 1:1 전투용 레이아웃 설정
        grid.style.display = 'flex';
        grid.style.justifyContent = 'center';
        grid.style.flexDirection = 'column';
        grid.style.gap = '10px';
        grid.innerHTML = '';

        // 몬스터 레벨 설정 (현재 레벨 ~ +2레벨)
        let randomLv = data.level + Math.floor(Math.random() * 3);
        const mLv = Math.min(30, Math.max(1, randomLv));
        
        // 1. 기본 스탯 가져오기 (DB에서 수치만 가져옴)
        let monster = CombatSystem.getMonsterData(mLv);

        // 2. [확장] 몬스터의 외형(이름, 이미지) 결정
        // 나중에 DB에 name, img가 생기면 그걸 우선 쓰고, 없으면 여기서 배정
        monster = CombatSystem.setMonsterIdentity(monster);

        // 카드 생성
        const cell = document.createElement('div');
        cell.className = 'cell';
        
        cell.style.width = '100%';
        cell.style.height = '180px'; // 이미지 들어가서 높이 약간 증가
        cell.style.fontSize = '1.1em';
        cell.style.flexDirection = 'column';
        cell.style.cursor = 'pointer';
        cell.style.border = '2px solid var(--hunt)';
        
        // 레벨별 색상 (난이도 표시)
        let color = mLv > data.level ? '#e74c3c' : (mLv < data.level ? '#2ecc71' : '#f1c40f');
        
        // [이미지 처리]
        // 이미지가 있으면 <img> 태그, 로딩 실패시 텍스트 이모지(💧)로 대체
        const imgPath = `image/${monster.img}`;
        const imgTag = `
            <img src="${imgPath}" 
                style="width:80px; height:80px; object-fit:contain; margin-bottom:10px; filter:drop-shadow(2px 2px 2px rgba(0,0,0,0.5));"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div style="font-size:3.5em; margin-bottom:10px; display:none;">💧</div>
        `;

        cell.innerHTML = `
            ${imgTag}
            <div><strong style="font-size:1.2em;">${monster.name}</strong> <span style="color:${color}; font-weight:bold;">Lv.${mLv}</span></div>
            <div style="font-size:0.85em; color:#aaa; margin-top:5px;">
                ❤️ ${monster.hp.toLocaleString()} | ⚔️ ${monster.atk.toLocaleString()} | 🛡️ ${monster.def.toLocaleString()}
            </div>
            <div style="font-size:0.8em; color:var(--money); margin-top:3px;">
                보상: ${monster.gold.toLocaleString()} G
            </div>
            <div style="margin-top:8px; font-size:0.8em; color:#ddd; animation:blink 1s infinite;">[ 터치하여 전투 시작 ]</div>
        `;
        
        cell.onclick = () => CombatSystem.startBattle(monster);
        grid.appendChild(cell);

        const log = document.getElementById('battle-log');
        if(log) log.innerHTML = `야생의 <strong>${monster.name}</strong>(이)가 나타났습니다!`;
    },

    // [확장 기능] 몬스터 종류 결정 로직
    setMonsterIdentity: (m) => {
        // 이미 DB에 이름과 이미지가 있다면 그대로 반환 (나중을 위해)
        if(m.name && m.img) return m;

        // 아직 DB에 데이터가 없으므로 여기서 정의
        // 나중에 배열에 { minLv: 1, name: '고블린', img: 'goblin.png' } 등을 추가하면 됨
        const types = [
            { name: '슬라임', img: 'slime.png' } // 현재는 슬라임만 존재
        ];

        // 랜덤 또는 레벨에 맞춰 몬스터 선택 (지금은 무조건 0번 슬라임)
        const type = types[0];

        // 객체에 이름/이미지 주입
        m.name = type.name;
        m.img = type.type || type.img; // img 속성 연결
        return m;
    },

    getMonsterData: (lv) => {
        const table = GameDatabase.MONSTER_TABLE;
        if (!table || table.length === 0) return null;
        let idx = lv - 1;
        if (idx < 0) idx = 0;
        if (idx >= table.length) idx = table.length - 1;
        return { ...table[idx] }; // 복사본 반환
    },

    // 3. 물약 자동 사용 (실시간 반영 유지)
    tryAutoPotion: (pStats) => {
        if (typeof data.potionBuffer === 'undefined') data.potionBuffer = 0;
        const missingHp = pStats.hp - data.hp;
        if (missingHp <= 0) return; 

        const potions = data.inventory.filter(i => i.type === 'potion').sort((a, b) => a.val - b.val);
        if (potions.length === 0) return;

        const totalPotionsValue = potions.reduce((acc, cur) => acc + cur.val, 0);
        const realRemainingPool = totalPotionsValue - data.potionBuffer;

        if (realRemainingPool <= 0) return;

        const healAmount = Math.min(missingHp, realRemainingPool);
        data.hp += healAmount;
        data.potionBuffer += healAmount;

        while (potions.length > 0) {
            const smallestPotion = potions[0];
            if (data.potionBuffer >= smallestPotion.val) {
                data.potionBuffer -= smallestPotion.val;
                const realIdx = data.inventory.findIndex(i => i.id === smallestPotion.id);
                if (realIdx !== -1) {
                    data.inventory.splice(realIdx, 1);
                    potions.shift();
                    const log = document.getElementById('battle-log');
                    if (log) log.innerHTML = `<span style="color:#e67e22">🧪 ${smallestPotion.name} 소모됨</span><br>` + log.innerHTML;
                } else break;
            } else break;
        }
        if (window.MainEngine) MainEngine.updateUI();
    },

    // 4. 전투 실행
    startBattle: (m) => {
        if (!m) return alert("오류 발생");
        if (data.hp <= 1) return alert('체력이 부족합니다. 치료소나 물약을 사용하세요.');
        
        // 전투 화면 UI 변경 (이미지 포함)
        const grid = document.getElementById('hunt-grid');
        const imgPath = `image/${m.img}`;
        
        if(grid) grid.innerHTML = `
            <div style="padding:20px; text-align:center; border:2px solid #e74c3c; border-radius:10px; background:rgba(231, 76, 60, 0.1);">
                <img src="${imgPath}" 
                     style="width:100px; height:100px; object-fit:contain; animation: shake 0.5s infinite alternate;"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div style="font-size:3em; display:none;">⚔️</div>
                <h3 style="margin:10px 0; color:#e74c3c;">VS ${m.name}</h3>
                <div id="battle-status" style="font-size:0.9em; color:#ccc;">전투 진행 중...</div>
            </div>
        `;

        const log = document.getElementById('battle-log');
        if (log) log.innerHTML = `[전투 개시] ${m.name} Lv.${m.lv}과(와) 전투를 시작합니다!<br>`;
        
        const pStats = MainEngine.getFinalStats();
        let mHP = m.hp;

        if (autoTimer) clearInterval(autoTimer);

        autoTimer = setInterval(() => {
            const calcDmg = (atk, dfs) => (atk >= dfs) ? (atk * 2 - dfs) : (Math.pow(atk, 2) / dfs);
            
            // [유저 공격]
            const pDmg = Math.floor(calcDmg(pStats.atk, m.def));
            mHP -= pDmg;
            log.innerHTML = `유저 공격: ${pDmg} (적 HP: ${Math.max(0, Math.floor(mHP))})<br>` + log.innerHTML;
            
            // [승리]
            if (mHP <= 0) {
                clearInterval(autoTimer);
                autoTimer = null;
                
                data.gold += m.gold;
                data.exp += m.exp;
                
                log.innerHTML = `<span style="color:var(--money)">★ ${m.name} 처치! +${Math.floor(m.gold)}G, +${Math.floor(m.exp)}EXP</span><br>` + log.innerHTML;
                
                // 다음 버튼 생성
                if(grid) {
                    grid.innerHTML = ''; 
                    const nextBtn = document.createElement('button');
                    nextBtn.className = 'main-menu-btn';
                    nextBtn.style.background = 'var(--hunt)';
                    nextBtn.innerHTML = `<strong>🔍 다음 몬스터 찾기</strong>`;
                    nextBtn.onclick = () => CombatSystem.scanHunt();
                    grid.appendChild(nextBtn);
                }

                if (window.MainEngine) { 
                    MainEngine.checkLevelUp(); 
                    MainEngine.updateUI(); 
                }
                return;
            }

            // [몬스터 공격]
            let mDmg = Math.floor(calcDmg(m.atk, pStats.def));
            data.hp -= mDmg;
            
            CombatSystem.tryAutoPotion(pStats);

            log.innerHTML = `피격: ${mDmg} (내 HP: ${Math.max(0, Math.floor(data.hp))})<br>` + log.innerHTML;

            if (window.MainEngine) MainEngine.updateUI();

            // [패배]
            if (data.hp <= 0) {
                clearInterval(autoTimer);
                autoTimer = null;
                data.hp = 1;
                alert("패배했습니다... 마을로 귀환합니다.");
                
                if (window.MainEngine) { MainEngine.updateUI(); MainEngine.saveGame(); }
                showPage('page-main');
                if (log) log.innerHTML = "전투 대기 중...";
            }
        }, GameDatabase.SYSTEM.COMBAT_SPEED);
    }
};

// [CSS 추가] 전투 시 몬스터 흔들림 효과
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes shake {
  0% { transform: translateY(0); }
  100% { transform: translateY(-5px); }
}
@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
`;
document.head.appendChild(styleSheet);
