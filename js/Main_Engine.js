/* ==========================================
   [Main_Engine.js] Firebase 온라인 통합 버전
   ========================================== */

// 1. Firebase 설정 (캡처 화면의 본인 설정값 적용)
const firebaseConfig = {
  apiKey: "AIzaSyAxR-oBND3fWbHUuq_LgjfgIayiFRrKGO8", // 보내주신 원본 키
  authDomain: "orbisrpg-962b3.firebaseapp.com",
  projectId: "orbisrpg-962b3", // orbisrpg123이 아니라 이 값이어야 합니다!
  storageBucket: "orbisrpg-962b3.firebasestorage.app",
  messagingSenderId: "164223155724",
  appId: "1:164223155724:web:4408795def32952eac7829",
  measurementId: "G-6J3M1T531B"
};

// 2. Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();    // Cloud Firestore (유저 데이터 및 초대코드)
const rtdb = firebase.database();  // Realtime Database (실시간 채팅)

var currentUser = null, data = null, upIdx = -1, autoTimer = null;


const MainEngine = {

    isDirty: false,
    invCurrentTab: 'equip', 
    isAutoHunting: false,
    

    // [수정] 화살표 함수(()=>) 대신 function()을 사용하세요.
    init: function() {
        console.log("🎮 오르비스는 오늘도 영업합니다.");
        
        // ★ 반드시 이 중괄호 { } 안쪽에 넣어야 실행됩니다! ★
        this.startRegenSystem(); 
    },


    invCurrentTab: 'equip', 
    isAutoHunting: false,

    handleLogin: async () => {
        const id = document.getElementById('login-id').value;
        const pw = document.getElementById('login-pw').value;
        const code = document.getElementById('invite-code').value;

        if(!id || !pw) return alert("아이디와 비밀번호를 입력해주세요.");

        const userRef = db.collection('users').doc(id);
        const userDoc = await userRef.get();

        if(userDoc.exists) {
            const userData = userDoc.data();
            if(userData.pw !== pw) return alert("비밀번호가 틀립니다.");
            data = userData.gameData;
            currentUser = id;
        } else {
            if(!code) return alert("신규 가입을 위해 초대코드가 필요합니다.");
            const codeRef = db.collection('inviteCodes').doc(code);
            const codeDoc = await codeRef.get();

            if(codeDoc.exists && !codeDoc.data().used) {
                await codeRef.update({ used: true, usedBy: id });
                data = { 
                    level:1, exp:0, gold:100, hp:100,
                    inventory:[], 
                    equipment:{weapon:null, armor:null, belt:null, gloves:null, shoes:null}, 
                    potionBuffer: 0, mineGrid: [],
                    stocks: {} // ★ 이 줄을 추가하여 주식 지갑을 생성합니다.
                };
                await userRef.set({ pw: pw, gameData: data });
                currentUser = id;
                alert("🎉 가입 성공! 온라인 서버에 등록되었습니다.");
            } else {
                return alert("❌ 유효하지 않거나 이미 사용된 초대코드입니다.");
            }
        }

        // 자동 로그인 저장
        const autoCheck = document.getElementById('auto-login');
        if (autoCheck && autoCheck.checked) {
            localStorage.setItem('orbis_auto_id', id);
            localStorage.setItem('orbis_auto_pw', pw);
            localStorage.setItem('orbis_auto_enabled', 'true');
        } else {
            localStorage.removeItem('orbis_auto_id');
            localStorage.removeItem('orbis_auto_pw');
            localStorage.setItem('orbis_auto_enabled', 'false');
        }

        MainEngine.enterGame();
    },

    saveGame: async () => {
        // 1. 변경 사항이 없으면 아예 Firestore 호출을 차단 (쓰기 할당량 보존)
        if(!currentUser || !data || !MainEngine.isDirty) return;

        // 2. 서버 전송 전 로컬에 먼저 백업 (서버 실패 대비 및 조작 완충)
        localStorage.setItem(`orbis_backup_${currentUser}`, JSON.stringify(data));

        try {
            await db.collection('users').doc(currentUser).update({
                gameData: data,
                lastSeen: new Date()
            });

            // 3. 저장 완료 후 플래그 초기화 (다음 변화가 있을 때까지 저장 차단)
            MainEngine.isDirty = false;
            console.log("%c☁️ 서버 저장 완료.", "color: #2ecc71; font-weight: bold;");

        } catch (e) {
            if (e.message.includes("quota")) {
                console.error("❌ Firebase 할당량 초과! 할당량이 리셋될 때까지 로컬에만 저장됩니다.");
            } else {
                console.error("저장 실패:", e);
            }
            }
    },


// 로그인 성공 후 게임 화면으로 전환하는 함수
enterGame: () => {
    const loginCont = document.getElementById('login-container');
    const gameCont = document.getElementById('game-container');
    const topBar = document.getElementById('top-bar'); // 상단 바 가져오기

    if(loginCont) loginCont.style.display = 'none';
    if(gameCont) gameCont.style.display = 'block';

    // 이 부분을 추가하세요! 상단 바를 보이게 합니다.
    if(topBar) topBar.style.display = 'block';

    MainEngine.updateUI();
    if (typeof ChatSystem !== 'undefined') {
        ChatSystem.listen();
    }

    showPage('page-main');
    console.log(`${currentUser}님, 환영합니다!`);
},

    logout: () => {
        if(confirm("로그아웃 하시겠습니까?")) {
            localStorage.removeItem('orbis_auto_id');
            localStorage.removeItem('orbis_auto_pw');
            localStorage.setItem('orbis_auto_enabled', 'false');
            location.reload(); 
        }
    },
    openMining: function() {
        console.log("⛏️ 광산 열기 시도...");
        // showPage 함수 호출 (MainEngine 내부에 있다면 this.showPage 또는 window.showPage)
        if (typeof window.showPage === 'function') {
            window.showPage('page-mine-select');
            
            // 페이지 전환 후 MiningSystem이 로드되어 있다면 렌더링 실행
            setTimeout(() => {
                if (window.MiningSystem && typeof window.MiningSystem.renderMineList === 'function') {
                    window.MiningSystem.renderMineList();
                } else {
                    console.error("❌ MiningSystem을 찾을 수 없습니다.");
                }
            }, 50);
        } else {
            console.error("❌ showPage 함수를 찾을 수 없습니다.");
        }
    },
startRegenSystem: function() {
    // 1. 기존 타이머 제거
    if (this.regenTimer) clearInterval(this.regenTimer);

    console.log("✅ [System] 휴식 시스템이 아티팩트 효과와 연동되었습니다.");

    // 2. 1초마다 실행
    this.regenTimer = setInterval(() => {
        
        // [체크 1] 데이터 존재 여부
        if (typeof data === 'undefined' || !data) return;

        // [체크 2] 전투 및 자동사냥 상태 확인
        const isAuto = (typeof MainEngine !== 'undefined' && MainEngine.isAutoHunting);
        
        // 전투 중이거나 자동사냥 중이면 회복 로직을 실행하지 않고 종료
        if (this.isFighting || isAuto) {
            return;
        }

        // [체크 3] 최신 스탯 및 최대 체력 가져오기
        // getFinalStats를 통해 아티팩트의 restBonus를 실시간으로 반영합니다.
        const stats = MainEngine.getFinalStats();
        const realMaxHp = stats.hp;

        // [체크 4] 사망 확인 및 풀피 확인
        if (data.hp <= 0 || data.hp >= realMaxHp) return;

        // === 회복 로직 실행 ===
        // 사용자의 요청대로 기본 3% 회복에 아티팩트 보너스(restBonus)를 합산합니다.
        // 예: 아티팩트 보너스가 2%라면 총 5% 회복
        const regenRate = (3 + (stats.restBonus || 0)) / 100;
        const healAmount = Math.floor(realMaxHp * regenRate);
        const finalHeal = healAmount < 1 ? 1 : healAmount;

        data.hp += finalHeal;
        
        // 최대 체력 초과 방지
        if (data.hp > realMaxHp) data.hp = realMaxHp;

        // UI 갱신
        if (typeof this.updateUI === 'function') {
            this.updateUI();
        }

    }, 1000); 
},
    formatNumber: (num) => {
        if (isNaN(num) || num === null || num === undefined) return "0"; // 방어 코드 추가
        num = Math.floor(num);
        if (num < 10000) return num.toLocaleString();
        if (num >= 1000000000000) {
            const jo = Math.floor(num / 1000000000000);
            const remain = Math.floor((num % 1000000000000) / 100000000);
            return `${jo}조` + (remain > 0 ? ` ${remain}억` : '');
        }
        if (num >= 100000000) {
            const eok = Math.floor(num / 100000000);
            const remain = Math.floor((num % 100000000) / 10000);
            return `${eok}억` + (remain > 0 ? ` ${remain}만` : '');
        }
        const man = Math.floor(num / 10000);
        const remain = num % 10000;
        return `${man}만` + (remain > 0 ? ` ${remain}` : '');
    },

    updateUI: function() {
            // 데이터가 로드되지 않았으면 중단
            if (typeof data === 'undefined' || !data) return;

            try {
                // 안전하게 텍스트 넣는 헬퍼 함수
                const setSafeText = (id, text) => {
                    const el = document.getElementById(id);
                    if (el) el.innerText = text;
                };

                // =========================
                // [1] 스탯 계산 (가장 먼저 수행)
                // =========================
                const stats = MainEngine.getFinalStats();

                // =========================
                // [2] 종합 전투력(CP) 및 랭크 표시
                // =========================
                setSafeText('ui-cp-value', MainEngine.formatNumber(stats.cp));

                const rankEl = document.getElementById('ui-cp-rank');
                if (rankEl) {
                    rankEl.innerText = stats.rank;
                    rankEl.style.color = stats.rankColor;

                    // SSS급이면 텍스트 발광 효과
                    if (stats.rank === 'SSS') {
                        rankEl.style.textShadow = "0 0 10px #e056fd";
                    } else {
                        rankEl.style.textShadow = "none";
                    }
                }

                // =========================
                // [3] 기본 정보 UI 업데이트
                // =========================

                // [내 정보 페이지] 공격력, 방어력, 최대체력
                setSafeText('info-atk', MainEngine.formatNumber(stats.atk));
                setSafeText('info-def', MainEngine.formatNumber(stats.def));
                setSafeText('info-hp', MainEngine.formatNumber(stats.hp));

                // [상단바] 골드, 현재체력, 최대체력, 레벨
                setSafeText('gold', MainEngine.formatNumber(data.gold));
                setSafeText('hp-val', MainEngine.formatNumber(Math.max(0, data.hp)));
                setSafeText('hp-max', MainEngine.formatNumber(stats.hp));
                setSafeText('user-lv', data.level); // data.lv 대신 data.level 사용 (변수명 주의)

                // [애니메이션바] HP
                const hpFill = document.getElementById('hp-fill');
                const maxHp = stats.hp > 0 ? stats.hp : 1;
                if (hpFill) hpFill.style.width = (data.hp / maxHp * 100) + '%';

                // [애니메이션바] 경험치
                if (typeof GameDatabase !== 'undefined' && GameDatabase.USER_STATS) {
                    // 레벨업 직후 등 data.level이 없을 경우 1로 보정
                    const currentLv = data.level || 1;
                    const nextExp = GameDatabase.USER_STATS.GET_NEXT_EXP(currentLv);

                    // 경험치 퍼센트 계산 (0으로 나누기 방지)
                    const safeNextExp = nextExp > 0 ? nextExp : 1;
                    const expPer = ((data.exp || 0) / safeNextExp * 100).toFixed(1);

                    const expFill = document.getElementById('exp-fill');
                    if (expFill) expFill.style.width = expPer + '%';

                    setSafeText('exp-text', `${MainEngine.formatNumber(data.exp || 0)} / ${MainEngine.formatNumber(safeNextExp)} (${expPer}%)`);
                }

                // =========================
                // [4] 포션 및 회복량 계산
                // =========================
                let totalRecoveryValue = 0;
                const inventory = data.inventory || [];
                const potionItems = inventory.filter(it => it.type === 'potion');
                const totalPotionCount = potionItems.reduce((acc, cur) => acc + (cur.count || 1), 0);

                if (typeof GameDatabase !== 'undefined' && GameDatabase.CONSUMABLES && GameDatabase.CONSUMABLES.potions) {
                    potionItems.forEach(it => {
                        const dbInfo = GameDatabase.CONSUMABLES.potions.find(p => p.id == it.id);
                        if (dbInfo) {
                            const healVal = Number(dbInfo.val) || 0;
                            const count = Number(it.count) || 1;
                            totalRecoveryValue += (healVal * count);
                        }
                    });
                }

                // [포션 버퍼 자동 보정]
                if ((data.potionBuffer || 0) > totalRecoveryValue) {
                    data.potionBuffer = totalRecoveryValue;
                }

                // 실제 가용 회복량 표시
                const availableHealing = totalRecoveryValue - (data.potionBuffer || 0);
                setSafeText('potion-val', MainEngine.formatNumber(availableHealing));
                setSafeText('potion-max', `(${totalPotionCount}/10)`);

                // =========================
                // [5] 기타 화면 갱신
                // =========================

                // 인벤토리 화면 갱신 (열려있을 때만 하는 것이 좋지만, 구조상 매번 해도 무방)
                if (typeof MainEngine.renderInventory === 'function') {
                    MainEngine.renderInventory();
                }

                // 사냥터 목록 갱신 (레벨업 시 잠금 해제 반영)
                const huntPage = document.getElementById('page-hunt-select');
                if (huntPage && huntPage.style.display === 'block') {
                    if (typeof CombatSystem !== 'undefined' && typeof CombatSystem.renderZoneList === 'function') {
                        CombatSystem.renderZoneList();
                    }
                }

            } catch (e) {
                console.warn("UI 업데이트 중 오류 발생:", e);
            }
        },

getFinalStats: function() {
    // 1. 데이터베이스 및 기본 변수 안전하게 로드
    const db = window.GameDatabase;
    if (!db || !db.USER_STATS) return { atk: 10, def: 10, hp: 100, cp: 0, rank: 'F', rankColor: '#fff', goldBonus: 0, expBonus: 0, restBonus: 0 };

    const stats = db.USER_STATS;
    const formulas = db.ENHANCE_FORMULA || {};

    // 사용자 레벨 (data.level)
    const lv = Number(data.level) || 1;

    // 2. 캐릭터 기본 스탯 초기화
    let final = {
        atk: stats.CALC_ATK(lv),
        def: stats.CALC_DEF(lv),
        hp: stats.CALC_HP(lv),
        goldBonus: 0, // 아티팩트 골드 보너스 %
        expBonus: 0,  // 아티팩트 경험치 보너스 %
        restBonus: 0  // 아티팩트 휴식 회복 추가 %
    };

    // 3. 일반 장착 장비(무기, 갑옷 등) 스탯 적용
    const equipment = data.equipped || data.equipment || {};

    Object.keys(equipment).forEach(slot => {
        const item = equipment[slot];
        if (item) {
            const k = Number(item.k) || 1;
            const en = Number(item.en) || 0;

            // [무기]
            if (slot === 'weapon') {
                if (formulas.weapon) final.atk = Math.floor(formulas.weapon(final.atk, k, en));
                else final.atk += Math.floor(k * 10 * (1 + en * 0.1));
            }
            // [갑옷]
            else if (slot === 'armor') {
                if (formulas.armor) final.def = Math.floor(formulas.armor(final.def, k, en));
                else final.def += Math.floor(k * 5 * (1 + en * 0.1));
            }
            // [벨트]
            else if (slot === 'belt') {
                if (formulas.belt) final.hp = Math.floor(formulas.belt(final.hp, k, en));
                else final.hp += Math.floor(k * 50 * (1 + en * 0.1));
            }
            // [장갑]
            else if (slot === 'gloves') {
                let multiplier = formulas.gloves ? formulas.gloves(k, en) : (1 + (k * 0.05) + (en * 0.01));
                final.atk = Math.floor(final.atk * multiplier);
            }
            // [신발]
            else if (slot === 'shoes') {
                let multiplier = k * (1 + en * 0.02);
                final.def = Math.floor(final.def * multiplier);
            }
        }
    });

    // 4. 아티팩트(Artifact) 효과 적용 (최종 % 증폭)
    if (data.equippedArtifacts) {
        data.equippedArtifacts.forEach(uid => {
            if (!uid) return;
            const art = data.artifacts.find(a => a.uid === uid);
            if (!art) return;

            // 성급 보너스: 성급당 기본 수치의 50%만큼 효과 증폭
            const starMult = 1 + (art.star * 0.5);
            const val = art.baseVal * starMult;

            // 아티팩트 종류별 효과 처리
            if (art.effect === 'ATK_PER') {
                final.atk *= (1 + val / 100); // 공격력 % 증가
            } else if (art.effect === 'DEF_PER') {
                final.def *= (1 + val / 100); // 방어력 % 증가
            } else if (art.effect === 'HP_PER') {
                final.hp *= (1 + val / 100); // 최대 체력 % 증가
            } else if (art.effect === 'GOLD_BONUS_PER') {
                final.goldBonus += val; // 골드 획득 보너스 합산
            } else if (art.effect === 'EXP_BONUS_PER') {
                final.expBonus += val; // 경험치 획득 보너스 합산
            } else if (art.effect === 'REST_PER') {
                final.restBonus += val; // 비전투 회복량 보너스 합산
            }
        });
    }

    // 최종 스탯 소수점 처리
    final.atk = Math.floor(final.atk);
    final.def = Math.floor(final.def);
    final.hp = Math.floor(final.hp);

    // 5. 종합 전투력(CP) 및 랭크 재계산
    if (stats.CALC_CP && stats.GET_CP_RANK) {
        final.cp = stats.CALC_CP(final.atk, final.def, final.hp);
        const rankInfo = stats.GET_CP_RANK(final.cp);
        final.rank = rankInfo.rank;
        final.rankColor = rankInfo.color;
    } else {
        final.cp = final.atk + final.def + Math.floor(final.hp * 0.1);
        final.rank = 'F';
        final.rankColor = '#fff';
    }

    return final;
},

   // 1. 이 함수가 MainEngine 안에 있는지 확인
    exportSaveFile: () => {
        const saveStr = localStorage.getItem('game_users');
        if(!saveStr) return alert("데이터 없음");
        const blob = new Blob([saveStr], {type: "text/plain;charset=utf-8"});
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `강화하기_Save.txt`;
        link.click();
    },

    // 2. 이 함수도 MainEngine 안에 있는지 확인
    importSaveFile: (input) => {
        const file = input.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const loadedStr = e.target.result;
                const testParse = MainEngine.decrypt(loadedStr);
                if (testParse && typeof testParse === 'object') {
                    localStorage.setItem('game_users', loadedStr);
                    alert("복구 완료!");
                    location.reload();
                } else { throw new Error(); }
            } catch(err) { alert("유효하지 않은 파일입니다."); }
        };
        reader.readAsText(file);
    },

    addItem: (newItem) => {
        // [1] 장비 아이템인지 확인 (타입 검사)
        const equipTypes = ['weapon', 'armor', 'belt', 'gloves', 'shoes'];
        // 1. 'material' 타입을 목록에 추가했습니다.
        const stackableTypes = ['etc', 'potion', 'scroll', 'ticket', 'material'];

        // newItem.type이 장비 타입 중 하나라면
        if (equipTypes.includes(newItem.type)) {
            
            // 현재 인벤토리에 있는 장비 개수 카운트
            const currentEquipCount = data.inventory.filter(it => equipTypes.includes(it.type)).length;
            
            // Database에 설정된 제한값 가져오기 (없으면 기본 50)
            const maxLimit = (GameDatabase.SYSTEM && GameDatabase.SYSTEM.MAX_EQUIP_CAPACITY) || 50;

            // [2] 공간 부족 체크
            if (currentEquipCount >= maxLimit) {
                MainEngine.showNotification(`🚫 장비 칸이 가득 찼습니다! (${currentEquipCount}/${maxLimit})`, "#e74c3c");
                return false; // 아이템 획득 실패 처리
            }
        }

        // 2. 조건문에 'OR (||) newItem.stackable'을 추가했습니다.
        // 이제 타입이 목록에 있거나, 아이템 데이터 자체에 stackable: true가 있으면 겹쳐집니다.
        if (stackableTypes.includes(newItem.type) || newItem.stackable) {

            // 기존 스택 로직 유지
            const existing = data.inventory.find(i => i.type === newItem.type && i.id === newItem.id);

            if (existing) {
                existing.count = (existing.count || 1) + (newItem.count || 1);
            } else {
                data.inventory.push({ ...newItem, count: newItem.count || 1 });
            }

        } else {
            // 장비 등 스택 불가능한 아이템 (UID 부여)
            data.inventory.push({ ...newItem, en: newItem.en || 0, uid: Date.now() + Math.random() });
        }

        MainEngine.updateUI();
    },

    setInvTab: (tab) => { MainEngine.invCurrentTab = tab; MainEngine.renderInventory(); },

// [추가] 팝업 닫기(템정보)
    closeModal: () => {
        document.getElementById('item-modal').style.display = 'none';
    },

    // [추가] 아이템 상세 정보 보기
    showItemInfo: (idx) => {
        const item = data.inventory[idx];
        if (!item) return;

        // 1. DB 정보 매칭 (이미지, 기본 설명용)
        let dbInfo = null;
        if (typeof GameDatabase !== 'undefined') {
            if (item.type === 'potion' && GameDatabase.CONSUMABLES) {
                dbInfo = GameDatabase.CONSUMABLES.potions.find(p => p.id == item.id);
            } else if (GameDatabase.WEAPONS && item.type === 'weapon') {
                 dbInfo = GameDatabase.WEAPONS.find(p => p.id == item.id);
            }
            // 필요시 방어구 등 추가
        }


        // 2. HTML 요소 연결
        const modal = document.getElementById('item-modal');
        const mTitle = document.getElementById('modal-title');
        const mImg = document.getElementById('modal-img-area');
        const mDesc = document.getElementById('modal-desc');
        const mStats = document.getElementById('modal-stats');
        const mSkillArea = document.getElementById('modal-skill-area');

        if(!modal) return;

        // 3. 기본 정보 채우기
        mTitle.innerText = item.name; // 이름에 이미 (+강화)나 [스킬명]이 붙어있을 수 있음
        
        const imgName = item.img || (dbInfo ? dbInfo.img : 'default.png');
        mImg.innerHTML = `<img src="image/${imgName}" style="width:80px; height:80px; border:2px solid #777; border-radius:10px; background:rgba(0,0,0,0.5);">`;
        
        mDesc.innerText = (dbInfo && dbInfo.info) ? dbInfo.info : (item.info || "설명이 없는 아이템입니다.");

        // 4. 스탯 정보
        let statHtml = `<div style="margin-bottom:5px;">💰 판매가: <span style="color:#f1c40f">${MainEngine.formatNumber(Math.floor((item.p || 0) * 0.3))} G</span></div>`;
        if (item.atk) statHtml += `<div>⚔️ 공격력: ${item.atk} ${item.en > 0 ? `(+${item.en * 2})` : ''}</div>`;
        if (item.def) statHtml += `<div>🛡️ 방어력: ${item.def} ${item.en > 0 ? `(+${item.en * 1})` : ''}</div>`;
        if (item.type === 'potion' && dbInfo) statHtml += `<div>🧪 회복량: ${MainEngine.formatNumber(dbInfo.val)}</div>`;
        
        mStats.innerHTML = statHtml;

        // 5. [핵심 수정] 스킬 정보 표시 (배열 순회)
        let skillHtml = "";

        // (A) Skill.js에 의해 부여된 동적 스킬들 (item.skills 배열)
        if (item.skills && item.skills.length > 0) {
            item.skills.forEach(skill => {
                // DB에 'desc'라는 이름으로 설명이 있다고 가정
                const sName = skill.name;
                const sDesc = skill.desc || skill.info || "스킬 설명이 없습니다."; 
                
                skillHtml += `
                    <div style="margin-top:10px; padding-top:8px; border-top:1px dashed rgba(255,255,255,0.2);">
                        <div style="color:#e74c3c; font-weight:bold; font-size:1em;">⚡ ${sName}</div>
                        <div style="color:#ecf0f1; font-size:0.85em; margin-top:3px; line-height:1.4;">${sDesc}</div>
                    </div>
                `;
            });
        } 
        // (B) 고정 스킬 (DB 자체에 박혀있는 경우 - 예비용)
        else if (dbInfo && dbInfo.skill_name) {
             skillHtml = `
                <div style="margin-top:10px; padding-top:8px; border-top:1px dashed rgba(255,255,255,0.2);">
                    <div style="color:#e74c3c; font-weight:bold;">⚡ ${dbInfo.skill_name}</div>
                    <div style="color:#ecf0f1; font-size:0.85em; margin-top:3px;">${dbInfo.skill_desc || ""}</div>
                </div>
             `;
        }

        // 스킬 영역 표시/숨김
        if (mSkillArea) {
            if (skillHtml) {
                mSkillArea.innerHTML = skillHtml;
                mSkillArea.style.display = 'block';
            } else {
                mSkillArea.style.display = 'none';
            }
        }

        modal.style.display = 'flex';
    },

    // ============================================================
    // [리메이크] 인벤토리 렌더링 시스템 (투명화 방지 & 디자인 통합)
    // ============================================================
    
    // 1. 인벤토리 목록 그리기
    renderInventory: () => {
        const invList = document.getElementById('inventory-list');
        const eqList = document.getElementById('equipped-list');
        
        // HTML 요소가 없으면 실행 중단 (에러 방지)
        if (!invList) return;
        
        // 목록 초기화
        invList.innerHTML = ''; 
        if (eqList) eqList.innerHTML = '';

        // 데이터가 없으면 중단
        if (!data || !data.inventory) return;
        // ▼ [추가] 장비 탭일 경우 상단에 개수 표시 기능
        if (MainEngine.invCurrentTab === 'equip') {
            const equipTypes = ['weapon', 'armor', 'belt', 'gloves', 'shoes'];
            const cur = data.inventory.filter(it => equipTypes.includes(it.type)).length;
            const max = (GameDatabase.SYSTEM && GameDatabase.SYSTEM.MAX_EQUIP_CAPACITY) || 50;
            
            // 인벤토리 리스트 맨 위에 통계 표시 (HTML에 미리 공간을 만들어두는 것이 좋으나, 여기선 동적 추가)
            const infoDiv = document.createElement('div');
            infoDiv.style.cssText = "width:100%; text-align:right; color:#bdc3c7; font-size:0.9em; padding:5px 10px; margin-bottom:5px;";
            infoDiv.innerHTML = `장비 슬롯: <span style="color:${cur >= max ? '#e74c3c' : '#f1c40f'}">${cur}</span> / ${max}`;
            invList.appendChild(infoDiv);
        }
        let hasItemInTab = false; // 현재 탭에 아이템이 있는지 확인용

        data.inventory.forEach((it, idx) => {
            // [장착 여부 확인] UID가 일치해야 본인 아이템임
            const isEquipped = data.equipment && data.equipment[it.type] && data.equipment[it.type].uid === it.uid;

            // [타입 정리] 소문자로 변환
            const itemType = (it.type || "").toLowerCase().trim();
            
            // [탭 분류]
            let category = 'etc';
            if (['weapon', 'armor', 'belt', 'gloves', 'shoes'].includes(itemType)) {
                category = 'equip';
            } else if (['potion', 'ticket', 'scroll'].includes(itemType)) {
                category = 'consume';
            }

            // HTML 생성 함수 호출
            const html = MainEngine.createItemHTML(it, idx, isEquipped);
            
            if (isEquipped) {
                // 장착 중이면 -> 장착 리스트(eqList)에 추가
                if (eqList) eqList.appendChild(html);
            } else {
                // 장착 안 했으면 -> 현재 탭(equip/consume/etc)과 맞을 때만 인벤토리(invList)에 추가
                if (MainEngine.invCurrentTab === category) {
                    invList.appendChild(html);
                    hasItemInTab = true;
                }
            }
        });

        // [빈 화면 처리] 아이템이 하나도 없을 때 메시지 표시
        if (!hasItemInTab) {
             invList.innerHTML = `
                <div style="padding:50px 20px; text-align:center; color:#666; width:100%;">
                    <div style="font-size:3em; opacity:0.3; margin-bottom:10px;">🎒</div>
                    <div style="font-weight:bold;">비어있음</div>
                    <div style="font-size:0.9em; margin-top:5px;">이 카테고리에는 아이템이 없습니다.</div>
                </div>`;
        }
    },

    // 2. 아이템 카드 HTML 생성 (핵심 디자인 로직)
    createItemHTML: (it, idx, isEquipped) => {
        const div = document.createElement('div');
        div.className = 'item-card'; // Style.js의 스타일 클래스 적용
        
        // ★ [중요] 투명화 버그 방지 코드 (강제 불투명 설정)
        div.style.opacity = "1";
        div.style.animation = "none"; 
        div.style.visibility = "visible";

        // 장착 중일 때 테두리 초록색 강조
        if (isEquipped) {
            div.style.border = '2px solid #2ecc71';
            div.style.background = 'rgba(46, 204, 113, 0.08)';
        }

        // 등급(강화수치)별 왼쪽 테두리 색상
        let rarityColor = '#7f8c8d'; // 기본 회색
        if (it.en >= 15) rarityColor = '#e74c3c';      // 빨강 (전설)
        else if (it.en >= 10) rarityColor = '#9b59b6'; // 보라 (영웅)
        else if (it.en >= 5) rarityColor = '#3498db';  // 파랑 (희귀)
        else if (it.en >= 1) rarityColor = '#2ecc71';  // 초록 (고급)
        
        div.style.borderLeft = `5px solid ${rarityColor}`;

        // [이미지 처리] 이미지가 깨지면 이모티콘으로 대체
        let fallbackIcon = '📦';
        if (['weapon'].includes(it.type)) fallbackIcon = '⚔️';
        else if (['armor', 'gloves', 'shoes', 'belt'].includes(it.type)) fallbackIcon = '🛡️';
        else if (['potion'].includes(it.type)) fallbackIcon = '🧪';
        else if (['scroll', 'ticket'].includes(it.type)) fallbackIcon = '📜';

        // DB 경로 설정 (Database.js 참조)
        const imgPath = (window.GameDatabase && GameDatabase.SYSTEM && GameDatabase.SYSTEM.IMAGE_PATH) 
                        ? GameDatabase.SYSTEM.IMAGE_PATH : 'image/';
        
        // 데이터베이스의 img 속성 혹은 s 속성(광물 등) 사용
        const imgFile = it.img || it.s;

        const imgTag = imgFile 
            ? `<img src="${imgPath}${imgFile}" style="width:100%; height:100%; object-fit:contain;" onerror="this.parentElement.innerHTML='<span style=\\'font-size:2em\\'>${fallbackIcon}</span>'">` 
            : `<span style="font-size:2em">${fallbackIcon}</span>`;

        // [텍스트 처리] 설명 및 강화 수치
        let nameHtml = `<span style="color:#fff; font-weight:bold;">${it.name}</span>`;
        if (it.en > 0) nameHtml += ` <span style="color:#f1c40f; font-size:0.9em;">(+${it.en})</span>`;
        
        let descText = it.info || "설명 없음";
        
        // 장비 아이템은 스탯 배율 표시
        if (['weapon', 'armor', 'belt', 'gloves', 'shoes'].includes(it.type)) {
            const k = it.k || 1.0;
            // 간단하게 '성능 x0.00' 형태로 표시
            let totalMult = k * (1 + (it.en||0) * 0.1); // 대략적인 계산
            descText = `<span style="color:#aaa;">성능 x${totalMult.toFixed(2)}</span>`;
        }

        // 수량 표시 (2개 이상일 때만)
        const countBadge = (it.count > 1) 
            ? `<span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:0.8em; margin-right:5px;">x${it.count}</span>` 
            : '';

        // [버튼 처리] 장비와 소비템 구분
        let btnHtml = '';

// 1. 장비 아이템 (무기, 갑옷, 벨트, 장갑, 신발)
if (['weapon', 'armor', 'belt', 'gloves', 'shoes'].includes(it.type)) {
    btnHtml = `
        <div style="display: flex; gap: 4px; width: 100%;">
            <button class="btn-action" style="flex: 0.8; background: linear-gradient(to bottom, #34495e, #2c3e50);" 
                onclick="event.stopPropagation(); MainEngine.goToUpgrade(${idx})">강화</button>
            
            <button class="btn-action" style="flex: 0.8; background: ${isEquipped ? 'linear-gradient(to bottom, #e74c3c, #c0392b)' : 'linear-gradient(to bottom, #3498db, #2980b9)'};" 
                onclick="event.stopPropagation(); MainEngine.toggleEquip(${idx})">
                ${isEquipped ? '해제' : '장착'}
            </button>

            <button class="btn-action" style="flex: 0.8; background: #c0392b;" 
                onclick="event.stopPropagation(); MainEngine.confirmSell(${idx})">판매</button>
        </div>
    `;
} 
// 2. 기타 아이템 (재료, 보석, 정수 등)
else {
    btnHtml = `
        <button class="btn-action" style="background: linear-gradient(to bottom, #c0392b, #a93226); width: 100%; font-weight: bold;" 
            onclick="event.stopPropagation(); MainEngine.confirmSell(${idx})">
            💰 아이템 판매
        </button>
    `;
}

        // HTML 조립 (Style.js 클래스 구조 준수)
        div.innerHTML = `
            <div class="item-image-box">
                ${imgTag}
            </div>
            <div class="item-info" onclick="MainEngine.showItemInfo(${idx})" style="cursor:pointer;" title="상세 정보">
                <div class="item-name">${nameHtml}</div>
                <div class="item-desc">${countBadge} ${descText}</div>
            </div>
            <div class="card-actions" style="gap:5px;">
                ${btnHtml}
            </div>
        `;
        
        return div;
    },

    // 3. 아이템 장착/해제 로직
    toggleEquip: (idx) => {
        const it = data.inventory[idx];
        if (!it) return;

        // 현재 해당 슬롯에 장착된 아이템 확인 (UID 비교)
        const currentEquipped = data.equipment[it.type];
        const isAlreadyEquipped = currentEquipped && currentEquipped.uid === it.uid;

        if (isAlreadyEquipped) {
            // 이미 장착 중이면 해제 (null 처리)
            data.equipment[it.type] = null;
            MainEngine.showNotification(`🛡️ ${it.name} 장착 해제`, "#bdc3c7");
        } else {
            // 장착 (기존 것은 자동으로 덮어씌워짐)
            data.equipment[it.type] = it;
            MainEngine.showNotification(`⚔️ ${it.name} 장착 완료!`, "#2ecc71");
        }

        // UI 갱신 (스탯 재계산 -> 인벤토리 다시 그리기)
        MainEngine.updateUI();
        MainEngine.renderInventory();
    },

    // 4. 아이템 판매 로직
    confirmSell: (idx) => {
        const it = data.inventory[idx];
        if (!it) return;

        // 장착 중인 아이템은 판매 불가 안전장치
        if (data.equipment[it.type] && data.equipment[it.type].uid === it.uid) {
            return alert("장착 중인 아이템은 판매할 수 없습니다.\n먼저 장착을 해제해주세요.");
        }

        // 가격 계산 (기본값 100G)
        const unitPrice = Math.floor((it.p || 100) * 0.5); // 판매가는 원가의 50%
        const maxCount = it.count || 1;
        let sellCount = 1;

        // 수량이 많으면 몇 개 팔지 물어봄
        if (maxCount > 1) {
            const input = prompt(`${it.name}을(를) 몇 개 판매하시겠습니까?\n(보유: ${maxCount}개 / 개당: ${unitPrice}G)`, maxCount);
            if (input === null) return; // 취소 누름
            sellCount = parseInt(input);
            
            if (isNaN(sellCount) || sellCount <= 0) return alert("올바른 수량을 입력해주세요.");
            if (sellCount > maxCount) return alert("가진 것보다 많이 팔 수 없습니다.");
        } else {
            // 1개면 바로 확인
            if (!confirm(`${it.name}을(를) ${unitPrice}G에 판매하시겠습니까?`)) return;
        }

        // 판매 처리
        const totalPrice = unitPrice * sellCount;
        data.gold += totalPrice;

        if (it.count && it.count > sellCount) {
            it.count -= sellCount; // 수량 감소
        } else {
            data.inventory.splice(idx, 1); // 아이템 삭제
        }

        MainEngine.showNotification(`💰 판매 완료! (+${MainEngine.formatNumber(totalPrice)}G)`, "#f1c40f");
        
        // 즉시 저장 및 갱신
        MainEngine.isDirty = true;
        MainEngine.saveGame();
        MainEngine.renderInventory();
        MainEngine.updateUI();
    },

createMonster: function(baseMonster) {
        // 1. 원본 데이터 오염 방지를 위한 깊은 복사
        let mob = JSON.parse(JSON.stringify(baseMonster));

        // ============================================================
        // [확률 계산 로직]
        // 1. 기본 확률 5%
        // 2. 30레벨이 되면 30% 도달 (점진적 증가)
        // 3. 30레벨 넘으면 30% 고정
        // ============================================================
        let chance = 0.05; // 기본 5%

        if (mob.lv >= 30) {
            chance = 0.3; // 30레벨 이상은 30% 고정
        } else {
            // 1~29레벨 구간: 레벨에 비례해서 확률 상승
            // 공식: 5% + (현재레벨 / 30) * 25% 
            // 예: 15레벨이면 5% + 12.5% = 17.5%
            chance = 0.05 + ((mob.lv / 30) * 0.25);
        }

        if (Math.random() < chance && GameDatabase.MONSTER_MODIFIERS) {
            // 3. 수식어 목록에서 랜덤 선택
            const mods = GameDatabase.MONSTER_MODIFIERS;
            const mod = mods[Math.floor(Math.random() * mods.length)];

            // 4. 이름 변경 (예: [난폭한] 슬라임)
            mob.name = `[${mod.name}] ${mob.name}`;
            
            // 5. 스탯 배율 적용 (소수점 버림 처리)
            // 체력의 경우 현재 체력과 최대 체력을 모두 늘려야 함
            const newMaxHp = Math.floor(mob.hp * mod.hp);
            mob.maxHp = newMaxHp; 
            mob.hp = newMaxHp; 

            mob.atk  = Math.floor(mob.atk * mod.atk);
            mob.def  = Math.floor(mob.def * mod.def);
            mob.gold = Math.floor(mob.gold * mod.gold);
            mob.exp  = Math.floor(mob.exp * mod.exp);

            // 6. UI 표시용 색상 및 태그 저장
            mob.color = mod.color;
            mob.isElite = true; 

            // (선택) 대박 몬스터 알림
            if (mod.gold >= 5.0 || mod.exp >= 5.0) {
                 MainEngine.showNotification(`✨ 희귀한 몬스터 [${mod.name}] 등장!`, mod.color);
            }

        } else {
            // 일반 몬스터 처리
            mob.maxHp = mob.hp; // 일반 몹도 maxHp 초기화
            mob.color = "#fff"; 
            mob.isElite = false;
        }
        // =========================================================
        // [몬스터 스킬 부여 로직]
        // 조건: 30레벨 이상 AND 20% 확률
        // =========================================================
        if (mob.lv >= 30 && Math.random() < 0.2) {
            
            // 스킬 개수 결정 (80% 확률로 1개, 20% 확률로 2개)
            const count = (Math.random() < 0.8) ? 1 : 2;

            // DB에서 스킬 목록 가져오기
            const pool = GameDatabase.MONSTER_SKILLS || [];
            
            if (pool.length > 0) {
                mob.skills = [];
                // 중복 없이 랜덤 선택
                const shuffled = [...pool].sort(() => 0.5 - Math.random());
                const selected = shuffled.slice(0, count);

                mob.skills = selected;

                // 이름에 스킬 표시 (예: [재생] [광분] 슬라임)
                const skillTags = selected.map(s => `[${s.name}]`).join(' ');
                mob.name = `${skillTags} ${mob.name}`;
                
                // 스킬 보유 몬스터는 색상 강조 (선택사항)
                if (!mob.isElite) {
                    mob.color = "#ff9f43"; // 주황색
                    mob.isElite = true;
                }
            }
        }

        return mob;
    },
    // ==============================================
    // [인벤토리 모달] 아이템 선택용 (강화, 합성 등)
    // ==============================================
    openInventoryModal: (mode = 'normal') => {
        const modal = document.getElementById('modal-inventory');
        const list = document.getElementById('modal-item-list');
        if (!modal || !list) return;

        list.innerHTML = ''; // 초기화
        let hasItem = false;

        data.inventory.forEach((item, idx) => {
            let show = true;

            // 모드별 필터링
            if (mode === 'upgrade') {
                if (['weapon','armor','belt','gloves','shoes'].indexOf(item.type) === -1) show = false;
            } else if (mode === 'support') {
                if (item.type !== 'scroll' && item.type !== 'ticket' && item.type !== 'material') show = false;
            }

            if (show) {
                hasItem = true;
                const div = document.createElement('div');
                div.className = 'inven-item'; // Style.js 클래스 사용
                
                // ★ [투명화 방지] 강제 보이기
                div.style.opacity = "1";
                div.style.animation = "none";
                div.style.visibility = "visible";

                // 등급별 색상
                let rarityColor = '#7f8c8d';
                if (item.en >= 15) rarityColor = '#e74c3c';
                else if (item.en >= 10) rarityColor = '#9b59b6';
                else if (item.en >= 5) rarityColor = '#3498db';
                else if (item.en >= 1) rarityColor = '#2ecc71';
                div.style.borderLeft = `5px solid ${rarityColor}`;

                // 이미지 처리
                let fallbackIcon = '📦';
                if (['weapon'].includes(item.type)) fallbackIcon = '⚔️';
                else if (['armor', 'gloves', 'shoes', 'belt'].includes(item.type)) fallbackIcon = '🛡️';
                else if (['potion'].includes(item.type)) fallbackIcon = '🧪';
                else if (['scroll', 'ticket'].includes(item.type)) fallbackIcon = '📜';

                const imgPath = (window.GameDatabase && GameDatabase.SYSTEM && GameDatabase.SYSTEM.IMAGE_PATH) 
                                ? GameDatabase.SYSTEM.IMAGE_PATH : 'image/';
                
                const imgFile = item.img || item.s;
                const imgHtml = imgFile ?
                    `<img src="${imgPath}${imgFile}" style="width:100%; height:100%; object-fit:contain;" 
                          onerror="this.parentElement.innerHTML='<span style=\\'font-size:2em\\'>${fallbackIcon}</span>'">`
                    : `<span style="font-size:2em">${fallbackIcon}</span>`;

                // 텍스트
                let nameHtml = `<span style="color:#fff; font-weight:bold;">${item.name}</span>`;
                if (item.en > 0) nameHtml += ` <span style="color:#f1c40f">(+${item.en})</span>`;
                if (item.count > 1) nameHtml += ` <span style="color:#aaa">x${item.count}</span>`;

                let descText = item.info || "설명 없음";
                if (item.skills && item.skills.length > 0) {
                    descText = `⚡ ${item.skills[0].name} 보유`;
                }

                // HTML 구조 조립 (Style.js 호환)
                div.innerHTML = `
                    <div class="inven-item-icon">${imgHtml}</div>
                    <div class="inven-item-info">
                        <div class="inven-item-name">${nameHtml}</div>
                        <div class="inven-item-desc">${descText}</div>
                    </div>
                    <button class="inven-select-btn">선택</button>
                `;

                // 클릭 이벤트
                div.onclick = () => {
                    if (mode === 'upgrade' && typeof UpgradeSystem !== 'undefined') {
                        UpgradeSystem.selectUpgrade(idx);
                    } else if (mode === 'support' && typeof UpgradeSystem !== 'undefined') {
                        UpgradeSystem.selectSupport(idx);
                    }
                    MainEngine.closeModal();
                };

                list.appendChild(div);
            }
        });

        if (!hasItem) {
            list.innerHTML = `<div style="padding:40px; color:#777; text-align:center;">표시할 아이템이 없습니다.</div>`;
        }

        modal.style.display = 'flex';
    },

    // ==============================================
    // [일괄 판매] 팝업 열기
    // ==============================================
    openBatchSell: () => {
        const modal = document.getElementById('modal-batch-sell');
        if (!modal) return;
        
        // 내용을 새로 그릴 때 CSS 클래스를 활용하여 디자인 통일
        const contentDiv = modal.querySelector('.modal-body') || modal.querySelector('.modal-content');
        
        // 만약 기존 구조가 modal-body가 없다면 직접 주입
        if(contentDiv) {
             contentDiv.innerHTML = `
                <div style="background:rgba(0,0,0,0.3); padding:20px; border-radius:12px; text-align:left; margin-bottom:15px;">
                    <div style="margin-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px; color:#f1c40f; font-weight:bold;">
                        판매 옵션 선택
                    </div>
                    <label style="display:block; margin-bottom:10px; cursor:pointer;">
                        <input type="checkbox" id="sell-no-skill" style="transform:scale(1.2); margin-right:8px;"> 
                        <span style="color:#ecf0f1;">스킬 없는 0강 장비 판매</span>
                    </label>
                    <label style="display:block; margin-bottom:10px; cursor:pointer;">
                        <input type="checkbox" id="sell-with-skill" style="transform:scale(1.2); margin-right:8px;"> 
                        <span style="color:#ecf0f1;">스킬 있는 0강 장비 판매</span>
                    </label>
                    <label style="display:block; margin-bottom:5px; cursor:pointer;">
                        <input type="checkbox" id="sell-gems" checked style="transform:scale(1.2); margin-right:8px;"> 
                        <span style="color:#3498db; font-weight:bold;">💎 보석(재료) 전체 판매</span>
                    </label>
                    <p style="font-size:0.85em; color:#7f8c8d; margin-left:25px; margin-top:5px;">
                        * 잠금 상태이거나 강화된 장비는 판매되지 않습니다.
                    </p>
                </div>
            `;
        }
        
        modal.style.display = 'flex';
    },

    // ==============================================
    // [일괄 판매] 실행 로직 (수정됨)
    // ==============================================
    executeBatchSell: () => {
        // 1. 체크박스 값 가져오기 (요소가 없을 경우 false 처리)
        const elNoSkill = document.getElementById('sell-no-skill');
        const elWithSkill = document.getElementById('sell-with-skill');
        const elGems = document.getElementById('sell-gems');

        const sellNoSkill = elNoSkill ? elNoSkill.checked : false;
        const sellWithSkill = elWithSkill ? elWithSkill.checked : false;
        const sellGems = elGems ? elGems.checked : false;

        // 2. 판매 대상 필터링
        const targets = data.inventory.filter(it => {
            // 데이터 안전 장치
            if (!it || !it.type) return false;

            const type = it.type.toLowerCase().trim();

            // [A] 기타/재료/보석류 필터링
            if (type === 'etc' || type === 'gem' || type === 'material') {
                // (중요) 변수명 수정: item -> it
                // (중요) id가 숫자일 수 있으므로 String()으로 변환 후 체크
                const idStr = String(it.id || "");
                const nameStr = it.name || "";

                // 1. 열쇠(key)는 판매 제외
                const isKey = idStr.includes('key') || nameStr.includes('열쇠');
                
                // 2. 정수(essence)는 판매 제외
                const isEssence = idStr.includes('essence') || nameStr.includes('정수');

                // 열쇠나 정수라면 절대 판매하지 않음
                if (isKey || isEssence) {
                    return false; 
                }

                // 그 외 잡동사니는 체크박스 여부에 따름
                return sellGems;
            }

            // [B] 장비 아이템 필터링
            const gearTypes = ['weapon', 'armor', 'belt', 'gloves', 'shoes'];
            if (gearTypes.includes(type)) {
                // 장착 중인지 확인 (UID 비교)
                const currentEquip = data.equipment[type];
                const isEquipped = currentEquip && currentEquip.uid === it.uid;
                
                // 장착 중이면 판매 제외
                if (isEquipped) return false;

                // 0강 장비만 판매 대상
                if ((it.en || 0) === 0) {
                    const hasSkill = Array.isArray(it.skills) && it.skills.length > 0;
                    
                    // 스킬 없는 장비 판매 체크 시
                    if (!hasSkill && sellNoSkill) return true;
                    // 스킬 있는 장비 판매 체크 시
                    if (hasSkill && sellWithSkill) return true;
                }
            }

            // 그 외(포션, 주문서 등)는 판매 대상 아님
            return false;
        });

        // 3. 결과 처리
        if (targets.length === 0) {
            return alert("조건에 맞는 판매할 아이템이 없습니다.\n옵션을 확인해주세요.");
        }

        let totalGold = 0;
        targets.forEach(t => {
            const count = t.count || 1;
            // 가격 정보가 없으면 기본값 100G, 판매가는 원가의 50%
            totalGold += Math.floor((t.p || 100) * 0.5) * count;
        });

        // 4. 사용자 확인 및 판매 실행
        if (confirm(`총 ${targets.length}종의 아이템을 정리하시겠습니까?\n예상 수익: ${MainEngine.formatNumber(totalGold)} G`)) {
            
            // 인벤토리에서 대상 아이템 제거 (targets에 포함되지 않은 것만 남김)
            data.inventory = data.inventory.filter(item => !targets.includes(item));
            
            // 골드 지급
            data.gold += totalGold;

            // 저장 및 UI 갱신
            MainEngine.showNotification(`💰 ${MainEngine.formatNumber(totalGold)} G 획득!`, "#f1c40f");
            MainEngine.closeModal();       // 팝업 닫기
            MainEngine.renderInventory();  // 인벤토리 다시 그리기
            MainEngine.updateUI();         // 상단 바 갱신
            MainEngine.isDirty = true;     // 변경사항 플래그
            MainEngine.saveGame();         // 저장
        }
    },


    // 1. 모든 모달을 안전하게 닫는 함수
    closeModal: function() {
        // [공통] 오버레이 클래스를 가진 모든 요소 숨기기
        const overlays = document.querySelectorAll('.modal-overlay');
        overlays.forEach(m => {
            if (m) m.style.display = 'none';
        });

        // [치료의 샘] 전용 오버레이 닫기
        const customOverlay = document.getElementById('custom-modal-overlay');
        if (customOverlay) customOverlay.style.display = 'none';

        // [아이템 정보] 상세 창 닫기
        const itemModal = document.getElementById('item-modal');
        if (itemModal) itemModal.style.display = 'none';

        console.log("✨ 모든 팝업이 닫혔습니다.");
    },

    checkLevelUp: () => {
        let leveled = false;
        let next = GameDatabase.USER_STATS.GET_NEXT_EXP(data.level);
        while(data.exp >= next) { data.exp -= next; data.level++; leveled = true; next = GameDatabase.USER_STATS.GET_NEXT_EXP(data.level); }
        if(leveled) {
            const log = document.getElementById('battle-log');
            if(log) log.innerHTML = `<div style="color:#ffd700; font-weight:bold; border:2px solid #ffd700; padding:10px; margin:10px 0;">🎉 LEVEL UP! - Lv.${data.level} 🎉</div>` + log.innerHTML;
            data.hp = MainEngine.getFinalStats().hp;
            MainEngine.updateUI();
        }
    },

    toggleAutoHunt: function() {
        this.isAutoHunting = !this.isAutoHunting;
        const btn = document.getElementById('btn-auto-hunt'); // 버튼 ID 확인 필요
        if(btn) {
            btn.innerText = this.isAutoHunting ? "자동 사냥 중..." : "자동 사냥 시작";
            btn.style.background = this.isAutoHunting ? "#e74c3c" : "#2ecc71";
        }

        // 켜졌는데 현재 전투중이 아니면 바로 탐색 시작
        if (this.isAutoHunting && !CombatSystem.isEncounter) {
            CombatSystem.scanHunt();
        }
    },

    goToUpgrade: (idx) => { showPage('page-upgrade'); UpgradeSystem.selectUpgrade(idx); },

    confirmSell: (idx) => {
        const it = data.inventory[idx];
        if (!it) return;

        // 1. 장착 여부 확인 (기존 로직 유지)
        if (data.equipment[it.type] && data.equipment[it.type].uid === it.uid) {
            return alert("장착 중인 아이템은 팔 수 없습니다.");
        }

        // 2. 기본 정보 설정
        const unitPrice = Math.floor((it.p || 0) * 0.5); // 개당 판매가
        const maxCount = it.count || 1;                // 보유 수량
        let sellCount = 1;                             // 팔려는 수량 초기값

        // 3. 수량에 따른 판매 방식 분기
        if (maxCount > 1) {
            // 수량이 2개 이상이면 입력창 표시
            const input = prompt(`${it.name}을 몇 개 파시겠습니까?\n(최대 ${maxCount}개 / 개당 ${unitPrice}G)`, maxCount);
            sellCount = parseInt(input);

            // 입력값 검증
            if (isNaN(sellCount) || sellCount <= 0) return;
            if (sellCount > maxCount) {
                alert("보유 수량보다 많이 팔 수 없습니다.");
                return;
            }
        } else {
            // 1개일 때는 확인창만 표시
            if (!confirm(`${it.name}을(를) 판매하여 ${unitPrice}G를 받으시겠습니까?`)) return;
        }

        // 4. 골드 정산 및 데이터 반영
        const totalPrice = unitPrice * sellCount;
        data.gold += totalPrice;

        if (it.count && it.count > sellCount) {
            // 일부만 판매 시 수량 차감
            it.count -= sellCount;
        } else {
            // 전체 판매 시 인벤토리에서 삭제
            data.inventory.splice(idx, 1);
        }

        // 5. UI 업데이트 및 강제 저장
        MainEngine.showNotification(`${it.name} ${sellCount}개 판매 완료 (+${MainEngine.formatNumber(totalPrice)}G)`, "#3498db");

        MainEngine.updateUI();
        MainEngine.renderInventory();
        MainEngine.saveGame(); // 판매 즉시 서버 저장
    },

    begging: () => {
            const lv = Number(data.level) || 1;

            // [1] 기준 골드 산출
            let baseMonster = GameDatabase.MONSTER_STAGES[0];
            for (let i = GameDatabase.MONSTER_STAGES.length - 1; i >= 0; i--) {
                if (GameDatabase.MONSTER_STAGES[i].lv <= lv) {
                    baseMonster = GameDatabase.MONSTER_STAGES[i];
                    break;
                }
            }
            const monsterGold = baseMonster.gold;

            // [2] 레벨별 정밀 배율 적용
            let ratio;
            if (lv <= 1) ratio = 2.0;
            else if (lv <= 10) ratio = 2.0 - (0.2 * (lv - 1) / 9);
            else if (lv <= 20) ratio = 1.8 - (0.3 * (lv - 10) / 10);
            else if (lv <= 30) ratio = 1.5 - (0.3 * (lv - 20) / 10);
            else if (lv <= 40) ratio = 1.2 - (0.2 * (lv - 30) / 10);
            else if (lv <= 50) ratio = 1.0 - (0.3 * (lv - 40) / 10);
            else if (lv <= 60) ratio = 0.7 - (0.3 * (lv - 50) / 10);
            else if (lv <= 70) ratio = 0.4 - (0.2 * (lv - 60) / 10);
            else if (lv <= 80) ratio = 0.2 - (0.1 * (lv - 70) / 10);
            else if (lv <= 90) ratio = 0.1 - (0.05 * (lv - 80) / 10);
            else if (lv <= 99) ratio = 0.05 - (0.04 * (lv - 90) / 9);
            else ratio = 0.005;

            const maxAmt = Math.floor(monsterGold * ratio);
            const minAmt = Math.floor(maxAmt * 0.5);
            const amt = Math.max(1, Math.floor(Math.random() * (maxAmt - minAmt + 1)) + minAmt);

            // [3] 레벨별 등장 NPC 및 대사 처리
            let npcAction = "";
            const lvGroup = Math.floor(lv / 10);

            // (NPC 대사 목록은 그대로 유지)
            switch(lvGroup) {
                case 0: npcAction = `지나가던 행인이 불쌍한 표정으로 <span style="color:#f1c40f; font-weight:bold;">${MainEngine.formatNumber(amt)}G</span>를 주었습니다.`; break;
                case 1: npcAction = `친절한 여행자가 힘내라며 <span style="color:#f1c40f; font-weight:bold;">${MainEngine.formatNumber(amt)}G</span>를 건네고 갑니다.`; break;
                case 2: npcAction = `상단 마차가 지나가다 실수인 척 <span style="color:#f1c40f; font-weight:bold;">${MainEngine.formatNumber(amt)}G</span>를 떨어뜨렸습니다.`; break;
                case 3: npcAction = `은퇴한 용병이 옛 생각이 난다며 <span style="color:#f1c40f; font-weight:bold;">${MainEngine.formatNumber(amt)}G</span>를 적선했습니다.`; break;
                case 4: npcAction = `지나가던 귀족이 콧방귀를 뀌며 <span style="color:#f1c40f; font-weight:bold;">${MainEngine.formatNumber(amt)}G</span>를 던져주었습니다.`; break;
                case 5: npcAction = `대륙의 부호가 적선함에 <span style="color:#f1c40f; font-weight:bold;">${MainEngine.formatNumber(amt)}G</span>를 쏟아붓고 떠납니다.`; break;
                case 6: npcAction = `인근 마을의 촌장이 존경의 의미(?)로 <span style="color:#f1c40f; font-weight:bold;">${MainEngine.formatNumber(amt)}G</span>를 보탰습니다.`; break;
                case 7: npcAction = `고위 사제가 축복과 함께 <span style="color:#f1c40f; font-weight:bold;">${MainEngine.formatNumber(amt)}G</span>를 쾌척했습니다.`; break;
                case 8: npcAction = `국왕의 전령이 국고 지원금이라며 <span style="color:#f1c40f; font-weight:bold;">${MainEngine.formatNumber(amt)}G</span>를 전달했습니다.`; break;
                case 9:
                default: npcAction = `전설의 용사가 불쌍한 눈으로 쳐다보며 <span style="color:#f1c40f; font-weight:bold;">${MainEngine.formatNumber(amt)}G</span>를 적선했습니다.`; break;
            }

            // [4] 데이터 반영
            data.gold += amt;
            MainEngine.isDirty = true;

            // [5] UI 알림 실행 (글자 크기 가독성 확보)
            if (typeof MainEngine !== 'undefined' && MainEngine.showNotification) {
                MainEngine.showNotification(`🤲 동냥 결과<br><div style="font-size:0.95em; color:#ecf0f1; margin-top:5px;">${npcAction}</div>`, "#f1c40f");
            }
            MainEngine.updateUI();

            // [6] 버튼 쿨타임 처리 (★ UI 깨짐 방지 수정됨)
            const btn = document.getElementById('btn-beg');
            if (btn) {
                btn.disabled = true;

                // 버튼 전체 텍스트가 아니라, 내부의 텍스트 태그(.btn-label)만 변경해야 아이콘이 유지됨
                const btnLabel = btn.querySelector('.btn-label');

                let left = 5;

                // 초기 텍스트 변경
                if(btnLabel) btnLabel.innerText = `⏳ ${left}초...`;

                const t = setInterval(() => {
                    left--;
                    if (left > 0) {
                        if(btnLabel) btnLabel.innerText = `⏳ ${left}초...`;
                    } else {
                        clearInterval(t);
                        btn.disabled = false;
                        // 원래 텍스트로 복구
                        if(btnLabel) btnLabel.innerText = "동냥하기";
                    }
                }, 1000);
            }
        },

        fullHeal: function() {
            const stats = this.getFinalStats();
            const currentHp = data.hp || 0;
            const maxHp = stats.hp;
            const missing = Math.floor(Math.max(0, maxHp - currentHp));

            if (missing <= 0) {
                return this.showNotification("❤️ 이미 체력이 가득 차 있습니다.", "#3498db");
            }
            if (overlay.parentElement !== document.body) {
           document.body.appendChild(overlay);    }

            const lv = Number(data.level) || 1;
            const cost = (lv <= 5) ? 0 : Math.floor(missing * lv);

            const overlay = document.getElementById('custom-modal-overlay');
            const modalBody = document.getElementById('modal-body');
            const confirmBtn = document.getElementById('modal-confirm-btn');

            if (!overlay || !modalBody || !confirmBtn) return;

            // ★ [수정됨] 글자 크기를 키우고 레이아웃을 시원하게 변경
            modalBody.innerHTML = `
    <div style="margin-bottom:12px; color:#2ecc71; font-weight:900; font-size:1.4em; text-shadow:0 0 8px rgba(46,204,113,0.3);">
        회복량: +${this.formatNumber(missing)}
    </div>
    <div style="font-size:1.2em; color:#fff; font-weight:bold; margin-bottom: 18px;">
        비용: <span style="color:#f1c40f;">${cost === 0 ? "무료" : this.formatNumber(cost) + " G"}</span>
    </div>
    <div style="font-size:0.95em; color:rgba(255,255,255,0.7); line-height:1.4;">
        성스러운 샘물로<br>치료하시겠습니까?
    </div>
`;

            overlay.style.display = 'flex';

            confirmBtn.onclick = null;
            confirmBtn.onclick = () => {
                if (data.gold < cost) {
                    this.closeModal();
                    return this.showNotification(`💰 골드가 부족합니다!`, "#e74c3c");
                }
                data.gold -= cost;
                data.hp = maxHp;
                this.updateUI();
                this.closeModal();
                this.showNotification("💖 체력이 완전히 회복되었습니다!", "#2ecc71");
            };
        },
    
    recalculateStats: function() {
            // 1. 기본 스탯 (레벨 기반) 가져오기
            let baseAtk = GameDatabase.USER_STATS.CALC_ATK(data.level);
            let baseDef = GameDatabase.USER_STATS.CALC_DEF(data.level);
            let baseHp = GameDatabase.USER_STATS.CALC_HP(data.level);

            // 2. 장착 장비 스탯 더하기
            // data.equipped: 현재 장착중인 아이템 객체 (weapon, armor, belt, gloves)
            if (data.equipped) {
                for (const [part, item] of Object.entries(data.equipped)) {
                    if (item) {
                        // 아이템의 기본 능력치 (k값 등)와 강화 수치(en)를 가져옴
                        const formula = GameDatabase.ENHANCE_FORMULA[part];
                        const en = item.en || 0;

                        // 공식에 대입하여 현재 장비의 능력치 계산
                        // weapon, armor, belt는 base(공격력/방어력)가 있고, gloves는 k(계수)만 있음
                        // Database.js의 공식 파라미터 순서: (base, k, en) 혹은 (k, en)

                        let itemVal = 0;

                        // 무기, 갑옷, 벨트는 item.k가 배율이고 item.val 같은게 있어야 하는데
                        // Database.js를 보니 'k' 자체가 공격력/방어력 수치인 것으로 보임 (설계에 따라 다름)
                        // 여기서는 작성해주신 Database.js 구조에 맞춰 계산합니다.

                        /* Database.js 공식:
                           weapon: (base, k, en) => base * k * ...
                           여기서 base가 캐릭터 기본공인지, 아이템 깡통 스탯인지 확인 필요.
                           보통은 아이템 고유 스탯을 k라고 두고 계산합니다.
                        */

                        // 간단하게 처리: 공식 불러와서 적용
                        if (typeof formula === 'function') {
                            // 아이템 타입별로 적용되는 수치가 공격력인지 방어력인지 구분
                            // Database.js의 EQUIPMENT 데이터를 보면 'k'가 기본 성능 수치 역할을 함

                            // 계산된 수치 (Database.js 공식 활용)
                            // 주의: 공식의 인자가 (base, k, en)인데 base가 무엇인지 정의해야 함.
                            // 여기서는 편의상 k를 base로 보고 계산하거나,
                            // Database.js의 공식이 (base, k, en) 이라면 -> formula(1, item.k, en) 처럼 호출

                            // ★ 가장 확실한 방법: 아이템 객체에 저장된 능력치를 갱신

                            if (part === 'weapon') {
                                // 무기 공식 적용 (공격력 추가)
                                const val = formula(1, item.k, en); // base를 1로 두고 k를 곱함
                                baseAtk += val;
                            }
                            else if (part === 'armor') {
                                // 갑옷 공식 적용 (방어력 추가)
                                const val = formula(1, item.k, en);
                                baseDef += val;
                            }
                            else if (part === 'belt') {
                                // 벨트 공식 적용 (체력 추가)
                                const val = formula(1, item.k, en);
                                baseHp += val;
                            }
                            else if (part === 'gloves') {
                                // 장갑 (보통 공격력% 증가 혹은 치명타 등) - 여기선 공격력 단순 합산으로 가정
                                const val = formula(item.k, en); // 장갑 공식은 인자가 2개였음
                                baseAtk += val; // 혹은 별도 로직
                            }
                        }
                    }
                }
            }

            // 3. 결과 반영
            data.atk = Math.floor(baseAtk);
            data.def = Math.floor(baseDef);
            data.maxHp = Math.floor(baseHp);

            // 현재 체력이 최대 체력을 넘지 않도록 조정
            if (data.hp > data.maxHp) data.hp = data.maxHp;

            // UI 갱신
            MainEngine.updateUI();
        },
};
// ... MainEngine = { ... } 객체가 여기서 끝남

/* --- 여기서부터는 MainEngine 바깥 (파일 하단) --- */

// 1. 페이지 이동 함수 (수정본)
/* [common.js] 혹은 해당 함수가 있는 파일 */

// 0. 페이지 전환 기록을 위한 변수
let lastPageId = null;

// 페이지별로 실행할 전용 로직을 따로 분리 (함수 내 if문을 줄여줌)
const pageInitHandlers = {
    'page-hunt-select': () => {
        if (typeof CombatSystem !== 'undefined' && CombatSystem.renderZoneList) {
            CombatSystem.renderZoneList();
        }
    },
    'page-info': () => {
        if (typeof MainEngine !== 'undefined') {
            MainEngine.renderInventory();
        }
    },
    // 나중에 상점이 생기면 여기에 추가만 하면 됨
    // 'page-shop': () => ShopSystem.updateItemList()
};

// [전역 변수] 히스토리 관리를 위한 스택 초기화
if (typeof window.pageHistory === 'undefined') window.pageHistory = [];

function showPage(id) {
    // 1. 상태 정리 (기존 코드 유지)
    if (typeof UpgradeSystem !== 'undefined' && typeof UpgradeSystem.stopAuto === 'function') {
        UpgradeSystem.stopAuto();
    }
    
    // 2. 자동 사냥 중지 (사냥터가 아닐 경우)
    if (id !== 'page-hunt-play' && typeof MainEngine !== 'undefined' && MainEngine.isAutoHunting) {
        MainEngine.toggleAutoHunt();
    }

    // -----------------------------------------------------------
    // [NEW] 2.5 히스토리 기록 (뒤로 가기 기능을 위해 추가됨)
    // -----------------------------------------------------------
    const activePage = document.querySelector('.page.active');

    // (1) 메인 메뉴로 이동하면 히스토리 싹 비우기 (네비게이션 꼬임 방지)
    if (id === 'page-main') {
        window.pageHistory = [];
    }
    // (2) 다른 페이지로 이동할 때, 현재 페이지를 기록
    else if (activePage && activePage.id && activePage.id !== id) {
        // 마지막 기록과 중복되지 않을 때만 저장 (불필요한 중복 방지)
        const lastRecorded = window.pageHistory[window.pageHistory.length - 1];
        if (lastRecorded !== activePage.id) {
            window.pageHistory.push(activePage.id);
        }
    }
    // -----------------------------------------------------------

    // 3. 페이지 전환 (CSS 기반)
    const target = document.getElementById(id);
    if (!target) {
        console.error(`이동하려는 페이지 ID [${id}]를 찾을 수 없습니다.`);
        return; 
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    target.classList.add('active');

    // 4. 페이지 전용 로직 실행
    if (typeof pageInitHandlers !== 'undefined' && pageInitHandlers[id]) {
        pageInitHandlers[id]();
    }

    // 5. 공통 UI 업데이트
    if (typeof MainEngine !== 'undefined' && MainEngine.updateUI) {
        MainEngine.updateUI();
    }

    // 6. 히스토리 기록 (기존 변수 유지 - 필요 시 사용)
    if (typeof lastPageId !== 'undefined') lastPageId = id;
}

// [NEW] 뒤로 가기 함수 (하단 왼쪽 버튼용)
function goBack() {
    if (window.pageHistory.length > 0) {
        const prevPageId = window.pageHistory.pop(); // 가장 최근 페이지 꺼내기
        
        // showPage를 부르면 히스토리가 또 쌓이므로, 직접 클래스만 변경
        const target = document.getElementById(prevPageId);
        if (target) {
            // 자동 사냥 중지 등 안전 장치
            if (typeof UpgradeSystem !== 'undefined') UpgradeSystem.stopAuto();
            if (typeof MainEngine !== 'undefined' && MainEngine.isAutoHunting) MainEngine.toggleAutoHunt();

            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            target.classList.add('active');

            // UI 갱신
            if (typeof MainEngine !== 'undefined' && MainEngine.updateUI) MainEngine.updateUI();
        }
    } else {
        // 기록이 없으면 메인으로 이동
        showPage('page-main');
    }
}


const GamblingSystem = {
    init: () => {
        const display = document.getElementById('gamble-gold-display');
        if(display) display.innerText = MainEngine.formatNumber(data.gold);
        const input = document.getElementById('gamble-amount');
        if(input) input.value = '';
    },
    play: (type) => {
        const amtInput = document.getElementById('gamble-amount');
        const amt = parseInt(amtInput ? amtInput.value : 0);
        if(isNaN(amt) || amt <= 0 || data.gold < amt) return alert("금액을 확인해주세요.");

        data.gold -= amt;
        const dice = Math.floor(Math.random() * 100) + 1;
        const isOdd = dice % 2 !== 0;
        const win = (type === 'odd' && isOdd) || (type === 'even' && !isOdd);

        if(win) {
            data.gold += amt * 2;
            alert(`🎉 승리! (주사위: ${dice})\n${MainEngine.formatNumber(amt * 2)} G를 획득했습니다!`);
        } else {
            alert(`💀 패배... (주사위: ${dice})\n${MainEngine.formatNumber(amt)} G를 잃었습니다.`);
        }
        MainEngine.isDirty = true;
        GamblingSystem.init();
        MainEngine.updateUI();
    } // 👈 여기서 중괄호가 잘 닫혔는지 확인하세요!
}; //

// [수정] updateUI 에러 방지용 안전 장치 추가
const originalUpdateUI = MainEngine.updateUI;
MainEngine.updateUI = function() {
    try {
        if (typeof originalUpdateUI === 'function') originalUpdateUI();
    } catch (e) {
        console.warn("UI 요소 누락 무시"); // 여기서 에러가 나도 그냥 넘어가버림
    }
};



// [추가] 실시간 채팅 시스템 로직
const ChatSystem = {
    listen: function() {
        const log = document.getElementById('chat-log');
        if(!log) return;
        rtdb.ref('chats').limitToLast(20).on('child_added', (snap) => {
            const d = snap.val();
            const div = document.createElement('div');
            div.innerHTML = `<b style="color:#3498db">[${d.user}]</b>: ${d.msg}`;
            log.appendChild(div);
            log.scrollTop = log.scrollHeight;
        });
    },
    send: function() {
        const input = document.getElementById('chat-input');
        if(input && input.value.trim() && currentUser) {
            rtdb.ref('chats').push({ user: currentUser, msg: input.value.trim(), time: Date.now() });
            input.value = '';
        }
    }
};

    // 3. 자동 로그인 로직
window.onload = async () => {
    // 1. 엔진 및 시스템 초기화
    if (typeof MainEngine !== 'undefined') MainEngine.init();
    if (typeof StockSystem !== 'undefined') StockSystem.init();

    // 2. 통합 타이머 관리
    // [핵심] 타이머 하나에서 모든 것을 관리하여 서버 부하를 줄임
        setInterval(() => {
            // 1. 주식 시세 확인 (창이 열려있을 때만)
            const stockPage = document.getElementById("page-stock");
            if (stockPage && stockPage.classList.contains("active")) {
                StockSystem.refreshMarket();
            }

            // 2. 자동 저장 (30초마다 딱 한 번만!)
            if (currentUser && data) {
                MainEngine.saveGame();
            }
        }, 60000);

    // 2. 자동 로그인 정보 가져오기
        const autoEnabled = localStorage.getItem('orbis_auto_enabled') === 'true';
        const savedId = localStorage.getItem('orbis_auto_id');
        const savedPw = localStorage.getItem('orbis_auto_pw');

        // 3. 자동 로그인 실행
        if (autoEnabled && savedId && savedPw) {
            const idInput = document.getElementById('login-id');
            const pwInput = document.getElementById('login-pw');
            const autoCheck = document.getElementById('auto-login');

            // 입력창에 값 채우기
            if (idInput) idInput.value = savedId;
            if (pwInput) pwInput.value = savedPw;
            if (autoCheck) autoCheck.checked = true;

            console.log("🚀 자동 로그인 정보를 확인했습니다. 접속을 시도합니다...");

            // ★ 핵심: 값이 채워진 후 handleLogin을 호출하여 실제 로그인을 진행합니다.
            await MainEngine.handleLogin();
        }

};



MainEngine.showNotification = (msg, color = "#f1c40f") => {
    const notify = document.createElement("div");
    notify.style.cssText = `
        position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.85); color: ${color}; padding: 20px 40px;
        border-radius: 15px; border: 2px solid ${color}; z-index: 10000;
        font-size: 1.2em; font-weight: bold; text-align: center;
        box-shadow: 0 0 20px rgba(0,0,0,0.5); pointer-events: none;
        animation: toastFade 2s forwards;
    `;
    notify.innerHTML = `✨ ${msg} ✨`;
    document.body.appendChild(notify);
    setTimeout(() => notify.remove(), 2000);
};
