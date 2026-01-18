/* ==========================================
   [Combat_System.js] 몬스터 스킬 시스템 통합됨
   ========================================== */
const CombatSystem = {
    currentZone: null,
    isEncounter: false,
    tempMonster: null,

    applyHitEffect: function() {
        // 기존 .monster-image-area img 대신 실제 생성되는 .stage-monster-visual img 사용
        const mobImg = document.querySelector('.stage-monster-visual img');
        if (mobImg) {
            mobImg.classList.remove('monster-hit');
            void mobImg.offsetWidth; // 리플로우 강제 발생
            mobImg.classList.add('monster-hit');
            setTimeout(() => mobImg.classList.remove('monster-hit'), 200);
        }
    },

    // [1] 사냥터 목록 렌더링
    renderZoneList: function() {
    // 1. 데이터 검증 및 초기화
    const listContainer = document.getElementById('hunting-zone-list');
    if (!listContainer) return;

    // 2. 내 최신 전투력(CP) 데이터를 대시보드에 반영 (HTML의 새 대시보드 활용)
    const stats = (typeof MainEngine !== 'undefined') ? MainEngine.getFinalStats() : { cp: 0, rank: 'F', rankColor: '#fff' };
    
    const cpDisplay = document.getElementById('select-page-my-cp');
    const rankDisplay = document.getElementById('select-page-my-rank');
    
    if (cpDisplay) cpDisplay.innerText = MainEngine.formatNumber(stats.cp);
    if (rankDisplay) {
        rankDisplay.innerText = stats.rank;
        rankDisplay.style.background = stats.rankColor; // 랭크별 색상 적용
        rankDisplay.style.boxShadow = `0 0 15px ${stats.rankColor}`; 
    }
        listContainer.innerHTML = '';
        const zones = window.GameDatabase ? window.GameDatabase.HUNTING_ZONES : [];
        const userLv = (typeof data !== 'undefined') ? (data.level || data.lv || 1) : 1;

        if (!zones || zones.length === 0) return;

        const getRecommendedCP = (zoneLv) => {
            if (!window.GameDatabase || !window.GameDatabase.MONSTER_TABLE) return 0;
            let monster = window.GameDatabase.MONSTER_TABLE.find(m => m.lv === zoneLv);
            if (!monster) {
                monster = window.GameDatabase.MONSTER_TABLE.reduce((prev, curr) =>
                    Math.abs(curr.lv - zoneLv) < Math.abs(prev.lv - zoneLv) ? curr : prev
                );
            }
            if (!monster) return 0;
            return Math.floor(monster.atk + (monster.def * 0.8) + (monster.hp * 0.1));
        };

        const formatCost = (num) => {
            if (num >= 100000000) return (num / 100000000).toFixed(1).replace(/\.0$/, '') + '억';
            if (num >= 10000) return (num / 10000).toFixed(1).replace(/\.0$/, '') + '만';
            return num.toLocaleString();
        };

        const getDifficulty = (lv) => {
            if (lv < 10) return "BEGINNER";
            if (lv < 20) return "NORMAL";
            if (lv < 30) return "HARD";
            if (lv < 40) return "ELITE";
            if (lv < 50) return "MASTER";
            if (lv < 60) return "NIGHTMARE";
            if (lv < 70) return "HELL";
            if (lv < 80) return "CHAOS";
            if (lv < 90) return "ABYSS";
            if (lv < 100) return "LEGEND";
            return "GOD";
        };
        

        zones.forEach((zone) => {
            const isLocked = userLv < zone.reqLv;
            const difficulty = getDifficulty(zone.reqLv);
            const themeClass = zone.id == -1 ? 'zone-theme-newbie' : `zone-theme-${zone.id}`;

            let targetLv = zone.maxLv - 1;
            if (targetLv < zone.minLv) targetLv = zone.minLv;

            const recCP = getRecommendedCP(Math.max(1, targetLv));
            const cpColor = (stats.cp >= recCP) ? '#2ecc71' : '#e74c3c';

            const div = document.createElement('div');
            div.className = `hunt-card ${themeClass} ${isLocked ? 'locked' : ''}`;

            div.innerHTML = `
                <div class="hunt-card-header">
                    <div class="hunt-header-text">
                        <span class="hunt-name">${isLocked ? '🔒 ' : ''}${zone.name}</span>
                        <span class="hunt-difficulty">${difficulty} AREA</span>
                    </div>
                    <div class="hunt-lv-badge">Lv.${zone.minLv} ~ ${zone.maxLv}</div>
                </div>
                <div style="flex: 1;"></div>
                <div class="hunt-card-footer" style="display: flex; justify-content: space-between; align-items: center; width: 100%; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; margin-top: auto;">
                    <div class="hunt-cost" style="font-size: 0.85em;">
                        <span>💰</span> ${formatCost(zone.cost)} G
                    </div>
                    <div class="hunt-rec-box-mini" style="display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(2px);">
                        <span style="font-size: 0.75em; color: #aaa; font-weight:bold;">⚔️ 권장</span>
                        <span class="${stats.cp < recCP ? 'cp-warning' : ''}" style="color:${cpColor}; font-weight: 900; font-size: 0.95em;">
                            ${MainEngine.formatNumber(recCP)}
                        </span>
                    </div>
                </div>
                ${isLocked ? '<div class="lock-overlay">🔒</div>' : ''}
            `;

            div.onclick = (e) => {
                if (isLocked) {
                    const msg = `🚫 레벨 ${zone.reqLv}부터 입장 가능합니다!`;
                    if (typeof MainEngine !== 'undefined' && MainEngine.showNotification) {
                        MainEngine.showNotification(msg, '#e74c3c');
                    } else {
                        alert(msg);
                    }
                    return;
                }
                if (typeof CombatSystem !== 'undefined') {
                    CombatSystem.enterZone(zone.id);
                }
            };
            listContainer.appendChild(div);
        });
    },

    // [2] 사냥터 입장
    enterZone: function(zoneId) {
        if (this.isFighting) return;
        const zone = window.GameDatabase.HUNTING_ZONES.find(z => z.id === zoneId);
        if (!zone) return;
        if (data.gold < zone.cost) {
            MainEngine.showNotification("💰 골드가 부족합니다!", "#e74c3c");
            return;
        }
        data.gold -= zone.cost;
        this.currentZone = zone;
        this.startCombatTransition(zone);
    },

    startCombatTransition: function(zone) {
        if (typeof showPage === 'function') showPage('page-hunt-play');
        const titleEl = document.getElementById('hunt-title');
        if (titleEl) titleEl.innerText = zone.name;
        this.resetBattleUI();
        if (typeof MainEngine !== 'undefined' && MainEngine.isAutoHunting) {
            this.scanHunt();
        }
    },

    // [3] 몬스터 탐색
    scanHunt: function() {
        if (this.isEncounter) return alert("이미 몬스터와 조우 중입니다!");
        const z = this.currentZone;
        if (!z) return alert("사냥터를 먼저 선택해주세요.");
        const cost = z.cost;

        if (data.gold < cost) {
            if (typeof MainEngine !== 'undefined' && MainEngine.isAutoHunting) {
                MainEngine.toggleAutoHunt();
                alert("골드가 부족하여 자동 사냥이 중단되었습니다.");
            } else {
                alert(`탐색 비용이 부족합니다. (${cost.toLocaleString()}G 필요)`);
            }
            return;
        }

        data.gold -= cost;
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();

        const randomLv = Math.floor(Math.random() * (z.maxLv - z.minLv + 1)) + z.minLv;
        let protoMonster = GameDatabase.MONSTER_TABLE.find(m => m.lv === randomLv);
        if (!protoMonster) {
            protoMonster = GameDatabase.MONSTER_TABLE.reduce((prev, curr) => 
                Math.abs(curr.lv - randomLv) < Math.abs(prev.lv - randomLv) ? curr : prev
            );
        }

        let monster = { ...protoMonster };
        monster.maxHp = monster.hp;
        monster = this.setMonsterIdentity(monster);

        // [수식어 몬스터 생성] (보스가 아닐 때만)
        const isBossCheck = Math.random() * 100 < GameDatabase.BOSS_DATA.CHANCE;
        if (!isBossCheck && typeof MainEngine !== 'undefined' && typeof MainEngine.createMonster === 'function') {
            monster = MainEngine.createMonster(monster);
        }

        const bossInfo = GameDatabase.BOSS_DATA.STAGES[z.id];
        if (isBossCheck && bossInfo) {
            monster.name = bossInfo.name;
            monster.img = bossInfo.img;
            monster.hp = Math.floor(monster.hp * bossInfo.hpMult);
            monster.maxHp = monster.hp;
            monster.atk = Math.floor(monster.atk * bossInfo.atkMult);
            monster.gold = Math.floor(monster.gold * bossInfo.goldMult);
            monster.exp = Math.floor(monster.exp * bossInfo.expMult);
            monster.isBoss = true;
            monster.quote = bossInfo.quote;
            monster.tier = Math.ceil(monster.lv / 5);
            monster.color = "#e056fd"; 
        }

        this.tempMonster = monster;
        this.isEncounter = true;
        this.toggleBattleButtons();

        if (typeof MainEngine !== 'undefined' && MainEngine.isAutoHunting) {
            this.startBattle();
        } else {
            this.renderEncounterUI(monster);
        }
    },

// Combat_System.js 내 renderEncounterUI 함수 수정본
renderEncounterUI: function(m) {
    const grid = document.getElementById('hunt-grid');
    if (!grid) return;
    this.toggleBattleButtons();

    // 1. 데이터 안전 처리 및 변수 설정
    const imgPath = `image/${m.img}`;
    const maxHp = m.maxHp || m.hp || 1; // 0 나누기 방지
    const currentHp = m.hp || 0;
    const hpPercent = Math.min(100, Math.max(0, (currentHp / maxHp) * 100));
    
    // 2. 몬스터 등급 및 테마 설정
    const isBoss = m.isBoss || false;
    // 플레이어 레벨보다 5 이상 높으면 빨강(위험), 아니면 초록(노말)
    const themeColor = m.color ? m.color : 
    (isBoss ? '#e056fd' : 
    (m.lv >= (data.level || 1) + 5 ? '#e74c3c' : '#10b981'));
    const nameGlow = `text-shadow: 0 0 10px ${themeColor}, 0 0 20px rgba(0,0,0,0.5);`;
    
    // 3. 위협 수준(Threat Analysis) 텍스트 생성
    let threatLabel = "HOSTILE ENTITY";
    let threatClass = "normal";
    if (isBoss) {
        threatLabel = "⚠️ CRITICAL THREAT";
        threatClass = "boss";
    } else if (m.lv >= (data.level || 1) + 5) {
        threatLabel = "HIGH DANGER";
        threatClass = "danger";
    }

    // 4. 스킬 태그 생성 (없으면 'NO DATA')
    const skillTags = (m.skills && m.skills.length > 0) 
        ? m.skills.map(s => `<span class="hud-tag-item" style="border-color:${themeColor}">[${s.name}]</span>`).join('') 
        : '<span class="hud-tag-item inactive">NO SPECIAL ABILITY</span>';

    // 5. 애니메이션 클래스
    const animWrapperClass = isBoss ? 'enter-boss' : 'enter-normal';

    grid.innerHTML = `
    <div class="immersive-stage">
        <div class="stage-scan-overlay"></div>

        <div class="stage-hud-top compact-hud">
            <div class="hud-header-meta">
                <span class="hud-status-tag ${threatClass}">${threatLabel}</span>
                <span class="hud-scanner-id">ID: ${Math.random().toString(36).substr(2, 6).toUpperCase()} // DIST: ${(Math.random()*10).toFixed(1)}m</span>
            </div>
            
            <div class="hud-target-main" style="border-left-color: ${themeColor};">
                <div class="hud-lv-box">
                    <span class="lv-label">LV</span>
                    <span class="lv-val" style="color:${themeColor}">${m.lv}</span>
                </div>
                <div class="hud-info-col">
                    <div class="hud-name-row">
                        <h3 class="hud-name" style="color:${themeColor}; ${nameGlow}">${m.name}</h3>
                    </div>
                    <div class="hud-stat-preview">
                        <span class="mini-stat">⚔️ ${MainEngine.formatNumber(m.atk)}</span>
                        <span class="mini-stat">🛡️ ${MainEngine.formatNumber(m.def)}</span>
                    </div>
                    <div class="hud-tags-scroll">${skillTags}</div>
                </div>
            </div>
        </div>

        <div class="stage-monster-visual">
            <div class="monster-platform"></div>
            <div class="visual-anim-wrapper ${animWrapperClass}">
                <img src="${imgPath}" 
                     class="${isBoss ? 'is-boss-img' : ''}" 
                     alt="${m.name}"
                     onerror="this.src='image/unknown.png'; this.onerror=null;">
            </div>
        </div>

        <div class="stage-hud-bottom tactical-panel">
            ${isBoss && m.quote ? `<div class="boss-combat-quote" style="color:${themeColor}">"${m.quote}"</div>` : ''}
            
            <div class="vital-signs-header">
                <div class="vital-label">
                    <span class="dot-pulse" style="background:${hpPercent > 30 ? '#2ecc71' : '#e74c3c'}"></span>
                    <span>VITAL SIGNS</span>
                    <span class="hp-percent-big">${Math.floor(hpPercent)}%</span>
                </div>
                <div class="vital-status-text" style="color:${hpPercent > 30 ? '#3b82f6' : '#e74c3c'}">
                    ${hpPercent > 30 ? 'STABLE' : 'CRITICAL'}
                </div>
            </div>

            <div class="hud-hp-container">
                <div class="hud-hp-fill" style="width: ${hpPercent}%; background: linear-gradient(90deg, ${themeColor}, #444);"></div>
                <div class="hud-hp-text">${MainEngine.formatNumber(currentHp)} / ${MainEngine.formatNumber(maxHp)}</div>
                <div class="hud-hp-grid-overlay"></div>
            </div>
        </div>
    </div>`;
},



    // [5] 도망
    runAway: function() {
        if (!this.isEncounter) return;
        // ★ [추가] 버튼 비활성화 (결과 나올 때까지 막음)
        const btnAttack = document.getElementById('btn-manual-attack');
        const btnRun = document.getElementById('btn-manual-run');
        if (btnAttack) btnAttack.disabled = true;
        if (btnRun) btnRun.disabled = true;
        if (Math.random() * 100 < 80) {
            Toast.show("🏃 무사히 도망쳤습니다!");
            this.resetBattleUI();
            if (typeof MainEngine !== 'undefined') {
                MainEngine.isFighting = false;
                MainEngine.updateUI();
            }
        } else {
            Toast.show("😱 도망에 실패했습니다! 전투가 시작됩니다!");
            this.startBattle();
        }
    },

    // [6] 전투 시작
    startBattle: function() {
        // ★ [추가] 이미 전투 중이면 중단
        if (typeof MainEngine !== 'undefined' && MainEngine.isFighting) return;

        const m = this.tempMonster;
        if (!m) return alert("몬스터 정보가 없습니다.");
        
        // ★ [추가] 버튼 비활성화 처리 (중복 클릭 방지)
        const btnAttack = document.getElementById('btn-manual-attack');
        const btnRun = document.getElementById('btn-manual-run');
        
        if (btnAttack) {
            btnAttack.disabled = true;
            btnAttack.innerText = "⚔️ 전투중...";
            btnAttack.style.opacity = "0.6";
            btnAttack.style.cursor = "not-allowed";
        }
        if (btnRun) {
            btnRun.disabled = true;
            btnRun.style.opacity = "0.6";
            btnRun.style.cursor = "not-allowed";
        }

        if (!m) return alert("몬스터 정보가 없습니다.");
        
        // 1. 초기 변수 선언
        let mHP = m.hp; 
        if (!m.maxHp) m.maxHp = m.hp;
        const maxHp = m.maxHp;
        
        let turn = 0;
        const imgPath = `image/${m.img}`;

        // 2. 엔진 상태 및 UI 초기화
        if (window.autoTimer) { 
            clearInterval(window.autoTimer); 
            window.autoTimer = null; 
        }
        if (typeof MainEngine !== 'undefined') MainEngine.isFighting = true;
        this.toggleBattleButtons();
        
        const healBtn = document.getElementById('btn-battle-heal');
        if (healBtn) {
            healBtn.disabled = true;
            healBtn.style.opacity = "0.5";
            healBtn.innerHTML = "🚫 전투중";
        }

        const grid = document.getElementById('hunt-grid'); 
        const log = document.getElementById('battle-log');

        // 3. 테마 컬러 및 태그 설정
        const isBoss = m.isBoss || false;
        const pLv = (typeof data !== 'undefined' && data.level) ? data.level : 1;
        
        // 색상 및 라벨 결정
        const themeColor = m.color ? m.color : (isBoss ? '#e056fd' : (m.lv >= pLv + 5 ? '#e74c3c' : '#10b981')); 
        const threatLabel = isBoss ? "⚠️ BOSS ENGAGED" : (m.lv >= pLv + 5 ? "HIGH RISK" : "HOSTILE ENTITY");
        const threatClass = isBoss ? "boss" : (m.lv >= pLv + 5 ? "danger" : "normal");
        const nameGlow = `text-shadow: 0 0 10px ${themeColor}, 0 0 20px rgba(0,0,0,0.5);`;

        const skillTags = (m.skills && m.skills.length > 0) 
            ? m.skills.map(s => `<span class="hud-tag-item" style="border-color:${themeColor}">[${s.name}]</span>`).join('') 
            : '<span class="hud-tag-item inactive">NO DATA</span>';

        // 4. [렌더링 함수] 전투 화면 그리기
        const updateRender = () => {
            if (!grid) return;
            const hpPercent = (mHP / maxHp) * 100;
            
            // 인카운트 화면 (붉은 박스 영역)
            grid.innerHTML = `
                <div class="immersive-stage">
                    <div class="stage-scan-overlay"></div>
                    
                    <div class="stage-hud-top compact-hud">
                        <div class="hud-header-meta">
                            <span class="hud-status-tag ${threatClass}">${threatLabel}</span>
                            <span class="hud-scanner-id">SEQ: <span id="battle-seq-turn">${turn}</span> // ENGAGING</span>
                        </div>
                        
                        <div class="hud-target-main" style="border-left-color: ${themeColor};">
                            <div class="hud-lv-box">
                                <span class="lv-label">LV</span>
                                <span class="lv-val" style="color:${themeColor}">${m.lv}</span>
                            </div>
                            <div class="hud-info-col">
                                <div class="hud-name-row">
                                    <h3 class="hud-name" style="color:${themeColor}; ${nameGlow}">${m.name}</h3>
                                </div>
                                <div class="hud-stat-preview">
                                    <span class="mini-stat">⚔️ ${MainEngine.formatNumber(m.atk)}</span>
                                    <span class="mini-stat">🛡️ ${MainEngine.formatNumber(m.def)}</span>
                                </div>
                                <div class="hud-tags-scroll">${skillTags}</div>
                            </div>
                        </div>
                    </div>

                    <div class="stage-monster-visual">
                        <div class="monster-platform"></div>
                        <div class="visual-anim-wrapper">
                            <img src="${imgPath}" class="${isBoss ? 'is-boss-img' : ''}" 
                                 style="animation: monsterFloat 3s ease-in-out infinite;" 
                                 onerror="this.src='image/unknown.png'">
                        </div>
                    </div>

                    <div class="stage-hud-bottom tactical-panel">
                        ${isBoss && m.quote ? `<div class="boss-combat-quote" style="color:${themeColor}">"${m.quote}"</div>` : ''}
                        
                        <div class="vital-signs-header">
                            <div class="vital-label">
                                <span class="dot-pulse" style="background:${hpPercent > 30 ? '#2ecc71' : '#e74c3c'}"></span>
                                <span>TARGET INTEGRITY</span>
                                <span id="mob-hp-percent-text" class="hp-percent-big">${Math.floor(hpPercent)}%</span>
                            </div>
                            <div id="mob-status-text" class="vital-status-text" style="color:${hpPercent > 30 ? '#3b82f6' : '#e74c3c'}">
                                ${hpPercent > 30 ? 'STABLE' : 'CRITICAL'}
                            </div>
                        </div>

                        <div class="hud-hp-container">
                            <div id="mob-hp-bar" class="hud-hp-fill" style="width: ${hpPercent}%; background: linear-gradient(90deg, ${themeColor}, #444);"></div>
                            <div id="mob-hp-text" class="hud-hp-text">${MainEngine.formatNumber(mHP)} / ${MainEngine.formatNumber(maxHp)}</div>
                            <div class="hud-hp-grid-overlay"></div>
                        </div>
                    </div>
                </div>`;
        };

        updateRender();

        const calculateDmg = function(atk, def, lv) {
            const _atk = Number(atk) || 0;
            const _def = Number(def) || 0;
            const _lv = Number(lv) || 1;
            const k = _lv * 25 + 75;
            const reduction = _def / (_def + k);
            return Math.floor(Math.max(_atk * (1 - reduction), _atk * 0.02));
        };

        const self = this;

        // ★ 전투 루프 시작
        window.autoTimer = setInterval(function() {
            turn++;
            const turnEl = document.getElementById('battle-seq-turn');
            if(turnEl) turnEl.innerText = turn;

            const pStats = MainEngine.getFinalStats();
            const equippedItems = Object.values(data.equipment).filter(e => e !== null);

            // [Phase 0-1] 로직 처리 (생략 없이 기존 로직 그대로 사용)
            let mobFinalAtk = m.atk;
            let mobDefMult = 1.0;
            let mobSkillMsg = "";

            if (m.skills && m.skills.length > 0) {
                m.skills.forEach(s => {
                    if (turn % s.turn === 0 && typeof SkillHandlers !== 'undefined' && SkillHandlers.MONSTER_ACTION[s.id]) {
                        const res = SkillHandlers.MONSTER_ACTION[s.id](s.val, m);
                        if (s.type === 'atk') {
                            if (res.mul) mobFinalAtk = Math.floor(mobFinalAtk * res.mul);
                            if (res.msg) mobSkillMsg += `<br><span style="color:#e74c3c; font-weight:bold;">⚠️ ${m.name}: ${res.msg}</span>`;
                        } else if (s.type === 'def') {
                            if (res.mul) mobDefMult *= res.mul;
                            if (res.msg) mobSkillMsg += `<br><span style="color:#3498db; font-weight:bold;">🛡️ ${m.name}: ${res.msg}</span>`;
                        } else if (s.type === 'heal') {
                            if (res.heal) { mHP += res.heal; if (mHP > m.maxHp) mHP = m.maxHp; }
                            if (res.msg) mobSkillMsg += `<br><span style="color:#2ecc71; font-weight:bold;">💚 ${m.name}: ${res.msg}</span>`;
                        } else {
                            if (res.mul && res.mul > 1) mobFinalAtk = Math.floor(mobFinalAtk * res.mul);
                            if (res.msg) mobSkillMsg += `<br><span style="color:#f39c12; font-weight:bold;">⚡ ${m.name}: ${res.msg}</span>`;
                        }
                    }
                });
            }

            let finalAtk = pStats.atk;
            let playerMsg = "";

            equippedItems.forEach(function(item) {
                if (typeof SkillSystem !== 'undefined') {
                    const triggered = SkillSystem.check(item, turn);
                    triggered.forEach(function(s) {
                        if (typeof SkillHandlers !== 'undefined' && SkillHandlers.OFFENSIVE[s.id]) {
                            const res = SkillHandlers.OFFENSIVE[s.id](s.val, pStats, m);
                            if (res.mul) finalAtk *= res.mul;
                            if (res.fixed) { mHP -= res.fixed; playerMsg += `<br><span style="color:#ff0000">${res.msg}</span>`; }
                            else { playerMsg += `<br><span style="color:#f1c40f">⚡ [${s.name}] 발동!</span>`; }
                        }
                        if (typeof SkillHandlers !== 'undefined' && SkillHandlers.RECOVERY[s.id]) {
                            const res = SkillHandlers.RECOVERY[s.id](s.val, pStats, data.hp);
                            if (res.heal) { data.hp += res.heal; if (data.hp > pStats.hp) data.hp = pStats.hp; playerMsg += `<br><span style="color:#2ecc71">💚 ${res.msg}</span>`; }
                        }
                    });
                }
            });

            let pDmg = calculateDmg(finalAtk, m.def, m.lv);
            if (mobDefMult < 1.0) {
                const reducedDmg = Math.floor(pDmg * mobDefMult);
                playerMsg += ` <span style="color:#aaa; font-size:0.8em;">(🛡️방어됨 ${MainEngine.formatNumber(pDmg)}→${MainEngine.formatNumber(reducedDmg)})</span>`;
                pDmg = reducedDmg;
            }

            mHP -= pDmg;
            if (mHP < 0) mHP = 0;

            const hpPercent = (mHP / maxHp) * 100;
            const hpBar = document.getElementById('mob-hp-bar');
            const hpText = document.getElementById('mob-hp-text');
            const hpBig = document.getElementById('mob-hp-percent-text');
            const statusText = document.getElementById('mob-status-text');
            
            if(hpBar) hpBar.style.width = `${hpPercent}%`;
            if(hpText) hpText.innerText = `${MainEngine.formatNumber(mHP)} / ${MainEngine.formatNumber(maxHp)}`;
            if(hpBig) hpBig.innerText = `${Math.floor(hpPercent)}%`;
            if(statusText) {
                statusText.innerText = hpPercent > 30 ? 'STABLE' : 'CRITICAL';
                statusText.style.color = hpPercent > 30 ? '#3b82f6' : '#e74c3c';
            }

            if (typeof self.applyHitEffect === 'function') self.applyHitEffect();

            equippedItems.forEach(item => {
                const triggered = SkillSystem.check(item, turn);
                triggered.forEach(s => {
                    if (s.id === 'drain' && SkillHandlers.OFFENSIVE.drain) {
                        const res = SkillHandlers.OFFENSIVE.drain(s.val, pDmg);
                        if (res.heal) { data.hp += res.heal; if (data.hp > pStats.hp) data.hp = pStats.hp; playerMsg += `<br><span style="color:#e91e63">${res.msg}</span>`; }
                    }
                });
            });

            if (log) log.innerHTML = `[Turn ${turn}] 유저 공격: ${MainEngine.formatNumber(pDmg)}${playerMsg}<br>` + log.innerHTML;

           // [승리 체크 및 화면 전환]
            // [승리 체크 및 화면 전환]
            if (mHP <= 0) {
                clearInterval(window.autoTimer);
                window.autoTimer = null;

                let lootMsg = "";
                let rewardHtmlList = "";
                let lootCount = 0; // ★ 애니메이션 딜레이용 카운터

                // 1. 골드 및 경험치 정산
                const goldMult = 1 + (pStats.goldBonus / 100);
                const expMult = 1 + (pStats.expBonus / 100);
                const finalGold = Math.floor(m.gold * goldMult);
                
                const lvDiff = (data.level || 1) - m.lv;
                let penaltyRatio = 1.0;
                if (lvDiff > 5) {
                    if (lvDiff >= 10) penaltyRatio = 0;
                    else penaltyRatio = Math.pow((10 - lvDiff) / 5, 2); 
                }
                const finalExp = Math.floor(m.exp * penaltyRatio * expMult);

                data.gold += finalGold;
                data.exp += finalExp;
                MainEngine.isDirty = true;
                MainEngine.isFighting = false;

                if (healBtn) {
                    healBtn.disabled = false;
                    healBtn.style.opacity = "1";
                    healBtn.innerHTML = "🏥 치료";
                }

                // ============================================================
                // [드랍 로직]
                // ============================================================
                const targetTier = Math.max(1, Math.ceil(m.lv / 5));

                // 1. 장비 드랍 (5%)
                if (Math.random() * 100 < 5) {
                    let finalTier = targetTier;
                    if (Math.random() * 100 < 20) finalTier += 1;
                    
                    const validEquips = GameDatabase.EQUIPMENT.filter(e => e.tier === finalTier);
                    
                    if (validEquips.length > 0) {
                        const baseItem = validEquips[Math.floor(Math.random() * validEquips.length)];
                        let newItem = JSON.parse(JSON.stringify(baseItem));
                        newItem.uid = Date.now() + Math.random();
                        newItem.en = 0;
                        if (newItem.lv >= 10 && typeof SkillSystem !== 'undefined') newItem = SkillSystem.attachSkill(newItem, 1);
                        
                        MainEngine.addItem(newItem);

                        const tierColor = finalTier > targetTier ? '#f1c40f' : '#aaddff';
                        // ★ 애니메이션 클래스(loot-entry-anim) 및 딜레이 적용
                        rewardHtmlList += `
                            <div class="loot-entry loot-entry-anim" style="display:flex; align-items:center; gap:10px; padding:6px; background:rgba(255,255,255,0.05); border-radius:6px; margin-bottom:4px; border-left:3px solid ${tierColor}; animation-delay: ${0.4 + (lootCount * 0.1)}s;">
                                <div style="width:32px; height:32px; background:rgba(0,0,0,0.3); border-radius:4px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                                    <img src="image/${newItem.img}" style="max-width:100%; max-height:100%;" onerror="this.src='image/unknown.png'">
                                </div>
                                <div style="display:flex; flex-direction:column;">
                                    <span style="color:${tierColor}; font-weight:bold; font-size:0.9em;">${newItem.name}</span>
                                    <span style="color:#aaa; font-size:0.75em;">[장비] Tier ${finalTier}</span>
                                </div>
                            </div>`;
                        lootCount++; // 카운터 증가
                    }
                }

                // 2. 열쇠 드랍 (3%)
                if (Math.random() * 100 < 3 && GameDatabase.KEY_DROPS) {
                    const validKeys = GameDatabase.KEY_DROPS.filter(k => k.tier === targetTier);
                    if (validKeys.length > 0) {
                        const keyItem = validKeys[0];
                        MainEngine.addItem({ ...keyItem, count: 1 });
                        
                        rewardHtmlList += `
                            <div class="loot-entry loot-entry-anim" style="display:flex; align-items:center; gap:10px; padding:6px; background:rgba(255,255,255,0.05); border-radius:6px; margin-bottom:4px; border-left:3px solid #ff9f43; animation-delay: ${0.4 + (lootCount * 0.1)}s;">
                                <div style="width:32px; height:32px; background:rgba(0,0,0,0.3); border-radius:4px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                                    <img src="image/${keyItem.s || keyItem.img}" style="max-width:100%; max-height:100%;" onerror="this.src='image/unknown.png'">
                                </div>
                                <div style="display:flex; flex-direction:column;">
                                    <span style="color:#ff9f43; font-weight:bold; font-size:0.9em;">${keyItem.n || keyItem.name}</span>
                                    <span style="color:#aaa; font-size:0.75em;">[재료] 열쇠</span>
                                </div>
                            </div>`;
                        lootCount++;
                    }
                }

                // 3. 아티팩트 드랍 (보스 조건)
                if (m.isBoss) {
                    const currentZoneId = self.currentZone ? self.currentZone.id : -999;
                    const dropArtifactInfo = GameDatabase.ELITE_ARTIFACTS.find(a => a.zoneId === currentZoneId);

                    if (dropArtifactInfo && Math.random() < 0.1) { // 확률 10%
                        if (!data.artifacts) data.artifacts = [];
                        
                        const newArt = {
                            ...dropArtifactInfo,
                            uid: Date.now() + Math.random(),
                            star: 0
                        };
                        data.artifacts.push(newArt);
                        
                        rewardHtmlList += `
                            <div class="loot-entry loot-entry-anim" style="display:flex; align-items:center; gap:10px; padding:6px; background:rgba(224, 86, 253, 0.1); border-radius:6px; margin-bottom:4px; border:1px solid #e056fd; animation-delay: ${0.4 + (lootCount * 0.1)}s;">
                                <div style="width:32px; height:32px; background:rgba(0,0,0,0.3); border-radius:4px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                                    <img src="image/${newArt.img}" style="max-width:100%; max-height:100%;" onerror="this.src='image/unknown.png'">
                                </div>
                                <div style="display:flex; flex-direction:column;">
                                    <span style="color:#e056fd; font-weight:bold; font-size:0.9em;">${newArt.name}</span>
                                    <span style="color:#aaa; font-size:0.75em;">[유물] ★0</span>
                                </div>
                            </div>`;
                        lootCount++;
                        lootMsg += `<br><span style="color:#e056fd; font-weight:bold; animation:victoryPopIn 0.5s;">✨ 희귀 유물 획득!</span>`;
                        MainEngine.showNotification(`✨ 유물 [${newArt.name}]을 획득했습니다!`, "#e056fd");
                    }
                }

                const lootContent = rewardHtmlList 
                    ? `<div class="loot-scroll-area custom-scroll" style="max-height:150px; overflow-y:auto; padding-right:5px;">${rewardHtmlList}</div>` 
                    : `<div class="no-loot-msg" style="color:#64748b; font-size:0.8rem; text-align:center; padding:10px; opacity:0.7;">획득한 아이템이 없습니다.</div>`;
                
                let rank = 'B';
                let rankColor = '#f1c40f';
                if (turn <= 3) { rank = 'S'; rankColor = '#e056fd'; }
                else if (turn <= 7) { rank = 'A'; rankColor = '#2ecc71'; }

                if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
                self.isEncounter = false;
                self.tempMonster = null;

                // 4. 결과 화면 렌더링 (애니메이션 클래스 적용됨)
                if (grid) {
                    grid.innerHTML = `
                    <div class="immersive-stage">
                        <div class="stage-scan-overlay"></div>
                        
                        <div class="stage-hud-top compact-hud victory-anim-container">
                            <div class="hud-header-meta">
                                <span class="hud-status-tag safe" style="background:#2ecc71; box-shadow:0 0 10px #2ecc71;">COMBAT COMPLETE</span>
                                <span class="hud-scanner-id">TURN: ${turn} // RANK: ${rank}</span>
                            </div>
                            
                            <div class="hud-target-main" style="border-left-color: ${rankColor};">
                                <div class="hud-lv-box">
                                    <span class="lv-label">RANK</span>
                                    <span class="lv-val victory-rank-stamp" style="color:${rankColor}">${rank}</span>
                                </div>
                                <div class="hud-info-col">
                                    <div class="hud-name-row">
                                        <h3 class="hud-name" style="color:${rankColor}; text-shadow:0 0 10px ${rankColor}">MISSION SUCCESS</h3>
                                    </div>
                                    <div class="hud-stat-preview">
                                        <span class="mini-stat" style="color:#f1c40f">💰 +${MainEngine.formatNumber(finalGold)}</span>
                                        <span class="mini-stat" style="color:#2ecc71">✨ +${MainEngine.formatNumber(finalExp)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="stage-monster-visual" style="flex-direction:column; justify-content:center;">
                            <div class="victory-loot-container victory-anim-container" style="width: 85%; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:15px; backdrop-filter:blur(5px); animation-delay: 0.2s; opacity:0; animation-fill-mode:forwards;">
                                <div class="victory-glow-bg"></div>
                                <div class="loot-header" style="font-size:0.8rem; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.1); margin-bottom:10px; padding-bottom:5px; font-weight:bold;">
                                    📦 획득한 전리품 (BATTLE LOOT)
                                </div>
                                ${lootContent}
                            </div>
                            <div style="margin-top:5px; font-size:0.8em; text-align:center;">${lootMsg}</div>
                        </div>

                        <div class="stage-hud-bottom tactical-panel victory-anim-container" style="animation-delay: 0.4s; opacity:0; animation-fill-mode:forwards;">
                            <div class="vital-signs-header">
                                <div class="vital-label">
                                    <span class="dot-pulse" style="background:${rankColor}"></span>
                                    <span>STATUS</span>
                                </div>
                                <div class="vital-status-text" style="color:${rankColor}">SECURED</div>
                            </div>
                            <div class="hud-hp-container" style="opacity:0.8;">
                                <div class="hud-hp-fill" style="width: 100%; background: ${rankColor};"></div>
                                <div class="hud-hp-text">READY TO RETURN</div>
                                <div class="hud-hp-grid-overlay"></div>
                            </div>
                        </div>
                    </div>`;
                }

                if (typeof MainEngine !== 'undefined' && MainEngine.isAutoHunting) {
                     if (data.hp > 0) setTimeout(() => { if(MainEngine.isAutoHunting) self.scanHunt(); }, 1000);
                     else MainEngine.toggleAutoHunt();
                } else {
                    self.toggleBattleButtons();
                }
                return;
            }

            // [Phase 2] 반격 로직
            const uLv = (typeof data !== 'undefined' && data.level) ? data.level : 1;
            let finalIncDmg = calculateDmg(mobFinalAtk, pStats.def, uLv); 
            let defMsg = "";

            equippedItems.forEach(function(item) {
                 if (typeof SkillSystem !== 'undefined') {
                    const triggered = SkillSystem.check(item, turn);
                    triggered.forEach(function(s) {
                        if (typeof SkillHandlers !== 'undefined' && SkillHandlers.DEFENSIVE[s.id]) {
                            const res = SkillHandlers.DEFENSIVE[s.id](s.val, finalIncDmg);
                            if (res.mul !== undefined) { finalIncDmg = Math.floor(finalIncDmg * res.mul); defMsg += `<br><span style="color:#3498db">🛡️ ${res.msg}</span>`; }
                        }
                    });
                }
            });

            data.hp -= finalIncDmg;

            if (log) {
                const logMsg = `<span style="color:#e74c3c">피격: ${MainEngine.formatNumber(finalIncDmg)} (남은 HP: ${MainEngine.formatNumber(data.hp)})</span>${mobSkillMsg}${defMsg}<br>`;
                log.innerHTML = logMsg + log.innerHTML;
            }

            self.tryAutoPotion(pStats);
            if (typeof MainEngine !== 'undefined') MainEngine.updateUI();

            if (data.hp <= 0) {
                clearInterval(window.autoTimer);
                window.autoTimer = null;
                if (typeof MainEngine !== 'undefined') MainEngine.isFighting = false;
                if (typeof MainEngine !== 'undefined' && MainEngine.isAutoHunting) MainEngine.toggleAutoHunt();
                
                self.toggleBattleButtons();
                if (healBtn) {
                    healBtn.disabled = false;
                    healBtn.style.opacity = "1";
                    healBtn.innerHTML = "🏥 치료";
                }
                data.hp = 1;
                setTimeout(function() {
                    alert("패배했습니다... 마을로 이송됩니다.");
                    self.resetBattleUI();
                    if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
                    if (typeof showPage === 'function') showPage('page-main');
                }, 500);
            }

        }, GameDatabase.SYSTEM.COMBAT_SPEED);
    },

    


    updateBattleUI: function(mHP, maxHp) {
        const hpPercent = (mHP / maxHp) * 100;
        const hpBar = document.getElementById('mob-hp-bar');
        const hpText = document.getElementById('mob-hp-text');
        
        if (hpBar) {
            hpBar.style.width = `${Math.max(0, hpPercent)}%`;
            hpBar.style.filter = hpPercent < 30 ? "brightness(1.3)" : "none";
        }
        if (hpText) {
            hpText.innerText = `${MainEngine.formatNumber(Math.floor(Math.max(0, mHP)))} / ${MainEngine.formatNumber(maxHp)}`;
        }
        this.applyHitEffect(); // 피격 효과 실행
    },


    resetBattleUI: function() {
    // 1. 타이머 및 전투 플래그 초기화
    if (window.autoTimer) {
        clearInterval(window.autoTimer);
        window.autoTimer = null;
    }
    if (typeof MainEngine !== 'undefined') MainEngine.isFighting = false;
    
    this.isEncounter = false;
    this.tempMonster = null;
    
    // 2. 버튼 상태를 탐색 모드로 전환
    this.toggleBattleButtons();

    // 3. 상단 상태 배지 업데이트
    const statusBadge = document.querySelector('.hunt-status-badge');
    if (statusBadge) {
        statusBadge.innerText = "SYSTEM STANDBY";
        statusBadge.style.color = "#3b82f6"; // 대기 상태 블루
    }

    // 4. 치료 버튼 활성화
    const healBtn = document.getElementById('btn-battle-heal');
    if (healBtn) {
        healBtn.disabled = false;
        healBtn.style.opacity = "1";
        healBtn.innerHTML = "🏥 치료";
    }

    // 5. 스테이지 영역 레이더 스캔 연출로 복구
    const grid = document.getElementById('hunt-grid');
    if (grid) {
        grid.innerHTML = `
            <div class="empty-stage-state">
                <div class="radar-circle">
                    <div class="radar-sweep"></div>
                </div>
                <p class="radar-text">SCANNING FOR ENTITIES...</p>
            </div>`;
    }

    // 6. 전투 로그 초기화
    const log = document.getElementById('battle-log');
    if (log) {
        log.innerHTML = `<span style="color: #64748b;">> READY FOR ENCOUNTER...</span>`;
    }
},

    // [8] 몬스터 데이터 호출
    getMonsterData: function(lv) {
        const table = GameDatabase.MONSTER_TABLE;
        if (!table || table.length === 0) return { lv: 1, hp: 100, atk: 10, def: 5, gold: 10, exp: 10 };
        let idx = Math.max(0, Math.min(lv - 1, table.length - 1));
        return { ...table[idx] };
    },

    // [9] 이미지 설정
    setMonsterIdentity: function(m) {
        if (m.name && m.img) return m;
        const zoneId = this.currentZone ? this.currentZone.id : 0;
        let targetMonsters = [];
        // (기존 몬스터 이미지 매핑 로직 유지)
        if (zoneId === -1) targetMonsters = [{ name: '연습용 슬라임', img: 'slime.png' }];
        else if (zoneId === 0) targetMonsters = [{ name: '쥐', img: 'rat.png' },{ name: '참새', img: 'sparrow.png' },{ name: '비둘기', img: 'pigeon.png' }];
        else if (zoneId === 1) targetMonsters = [{ name: '화가난 등산객', img: 'hiker.png' }, { name: '고라니', img: 'Elk.png' }];
        else if (zoneId === 2) targetMonsters = [{ name: '곰', img: 'bear.png' }, { name: '호랑이', img: 'tiger.png' }];
        else if (zoneId === 3) targetMonsters = [{ name: '슬리퍼 신은 아저씨', img: 'Mr._Slipper.png' }, { name: '짜증난 편의점 알바', img: 'Convenience_store.png' }];
        else if (zoneId === 4) targetMonsters = [{ name: '빌런 택시 기사', img: 'taxi_driver.png' }, { name: '비상금 들킨 아줌마', img: 'supermarket_lady.png' }];
        else if (zoneId === 5) targetMonsters = [{ name: '고장난 노트북망령', img: 'Broken_Laptop_Ghost.png' }, { name: '고장난 전화기망령', img: 'Broken_Phone_Ghost.png' }];
        else if (zoneId === 6) targetMonsters = [{ name: '도둑맞은 양파', img: 'onion.png' }, { name: '알수없는 파편', img: 'Unknown_brokenitem.png' }];
        else if (zoneId === 7) targetMonsters = [{ name: '꿈틀대는 케이블', img: 'Ribbon_cable.png' }, { name: '과전압 팬', img: 'overchargeinnerfan.png' }];
        else if (zoneId === 8) targetMonsters = [{ name: '깨진 퓨즈', img: 'Broken_fuse.png' }, { name: '고장난 메탈본센서', img: 'Metalborne.png' }, { name: '고장난 에어본센서', img: 'Airborne.png' }];
        else if (zoneId === 9) targetMonsters = [{ name: '상큼한 구미의 원혼', img: 'gumi1.png' }, { name: '평온한 구미의 원혼', img: 'gumi2.png' },{ name: '분노한 구미의 원혼', img: 'gumi3.png' }];
        else targetMonsters = [{ name: '알 수 없는 적', img: 'unknown.png' }];

        const pick = targetMonsters[Math.floor(Math.random() * targetMonsters.length)];
        m.name = pick.name; m.img = pick.img;
        return m;
    },

    // [10] 자동 포션
    tryAutoPotion: function(pStats) {
        if (typeof data.potionBuffer === 'undefined') data.potionBuffer = 0;
        const missingHp = pStats.hp - data.hp;
        if (missingHp <= 0) return;

        const potions = data.inventory.filter(i => i.type === 'potion')
            .map(i => {
                const dbInfo = GameDatabase.CONSUMABLES.potions.find(p => p.id == i.id);
                return dbInfo ? { ...i, ...dbInfo } : null;
            })
            .filter(i => i !== null)
            .sort((a, b) => a.val - b.val);

        if (potions.length === 0) return;

        const totalPotionsValue = potions.reduce((acc, cur) => acc + (Number(cur.val) * (Number(cur.count) || 1)), 0);
        const realRemainingPool = totalPotionsValue - data.potionBuffer;

        if (realRemainingPool <= 0) {
            data.potionBuffer = totalPotionsValue;
            return;
        }

        const maxHealLimitPerTurn = Math.floor(pStats.hp * 0.1);
        const healAmount = Math.min(missingHp, realRemainingPool, maxHealLimitPerTurn);
        if (healAmount <= 0) return;

        data.hp += healAmount;
        data.potionBuffer += healAmount;

        while (potions.length > 0) {
            const smallestPotion = potions[0];
            const potionVal = Number(smallestPotion.val);
            if (data.potionBuffer >= potionVal) {
                data.potionBuffer -= potionVal;
                const idx = data.inventory.findIndex(i => i.uid === smallestPotion.uid || i.id === smallestPotion.id);
                if (idx !== -1) {
                    if (data.inventory[idx].count > 1) data.inventory[idx].count--;
                    else data.inventory.splice(idx, 1);
                }
                potions.shift();
            } else {
                break;
            }
        }
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
    },

    // [11] 버튼 모드 교체
    // [11] 버튼 모드 교체
    toggleBattleButtons: function() {
        const exploreBox = document.getElementById('controls-explore');
        const battleBox = document.getElementById('controls-battle');
        
        const manualAttackBtn = document.getElementById('btn-manual-attack');
        const manualRunBtn = document.getElementById('btn-manual-run');
        const autoStopBtn = document.getElementById('btn-auto-stop');

        if (!exploreBox || !battleBox) return;

        const isAuto = (typeof MainEngine !== 'undefined' && MainEngine.isAutoHunting);
        const isEnc = this.isEncounter;

        // ★ [추가] 버튼 상태 초기화 (다시 활성화 및 텍스트/스타일 복구)
        if (manualAttackBtn) {
            manualAttackBtn.disabled = false;
            manualAttackBtn.innerText = "⚔️ ENGAGE"; // 원래 텍스트로 복구
            manualAttackBtn.style.opacity = "1";
            manualAttackBtn.style.cursor = "pointer";
        }
        if (manualRunBtn) {
            manualRunBtn.disabled = false;
            manualRunBtn.style.opacity = "1";
            manualRunBtn.style.cursor = "pointer";
        }

        if (isAuto) {
            exploreBox.style.display = 'none';
            battleBox.style.display = 'flex';
            if (manualAttackBtn) manualAttackBtn.style.display = 'none';
            if (manualRunBtn) manualRunBtn.style.display = 'none';
            if (autoStopBtn) {
                autoStopBtn.style.display = 'block';
                autoStopBtn.style.width = '100%';
            }
        } else if (isEnc) {
            exploreBox.style.display = 'none';
            battleBox.style.display = 'flex';
            if (manualAttackBtn) manualAttackBtn.style.display = 'block';
            if (manualRunBtn) manualRunBtn.style.display = 'block';
            if (autoStopBtn) autoStopBtn.style.display = 'none';
        } else {
            exploreBox.style.display = 'flex';
            battleBox.style.display = 'none';
        }
    }
};