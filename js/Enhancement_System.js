/* ==========================================
   [Upgrade_System.js] 
   강화 시스템 (장갑/신발 인식 및 UI 활성화 수정본)
   ========================================== */

const UpgradeSystem = {
    targetIdx: -1,         
    selectedScroll: -1,    
    selectedTicket: -1, 
    isAuto: false,
    autoTimer: null,
    
    // 비용 계산 (장갑, 신발 포함 모든 장비 공통)
    calcCost: (item) => {
        // 1. item이 없거나 가격 데이터가 없는 경우를 위한 방어 코드
        if (!item) return 0;

        // item.p가 없으면 기본값 0, item.en이 없으면 0강으로 간주
        const p = Number(item.p) || 0;
        const en = Number(item.en) || 0;

        // 2. 기본 비용: 장비 원가의 5%
        let baseCost = Math.floor(p * 0.1);

        // 3. 강화 단계별 가중치 계산
        let multiplier = 1;

        if (en < 10) {
            // 0~9강 구간
            multiplier = 1 + (en * 0.3);
        } else if (en < 15) {
            // 10~14강 구간 (파괴 위험 시작)
            multiplier = 4 * Math.pow(1.5, (en - 10));
        } else {
            // 15강 이상 (엔드 게임)
            multiplier = 30 * Math.pow(1.8, (en - 15));
        }

        let finalCost = baseCost * multiplier;

        // 4. 최소 비용 보장 (초반 150G 장비 등 저가 아이템 대응)
        // 수천만 골드를 버는 후반에도 최소한의 수수료는 나오도록 함
        const minCost = (en + 1) * 10;

        // 5. 최종 결과 반환 (숫자가 아닌 경우 대비 0 보장)
        const result = Math.floor(Math.max(finalCost, minCost));
        return isNaN(result) ? 0 : result;
    },

    // [1] 장비 선택
    selectUpgrade: (idx) => {
        if (typeof idx === 'undefined' || idx === null || idx < 0) return;
        UpgradeSystem.targetIdx = idx;
        UpgradeSystem.selectedScroll = -1; 
        UpgradeSystem.selectedTicket = -1;
        UpgradeSystem.renderUI();
    },

    // [2] 보조 아이템 선택
    selectSupport: (idx) => {
        const item = data.inventory[idx];
        if (!item) return;

        if (item.type === 'scroll') {
            UpgradeSystem.selectedScroll = idx;
            UpgradeSystem.selectedTicket = -1;
        } else if (item.type === 'ticket') {
            UpgradeSystem.selectedTicket = idx;
            UpgradeSystem.selectedScroll = -1;
        }
        UpgradeSystem.renderUI();
    },

    // [3] 보조 아이템 해제
    clearSupport: () => {
        UpgradeSystem.selectedScroll = -1;
        UpgradeSystem.selectedTicket = -1;
        UpgradeSystem.renderUI();
    },

    // UI 렌더링 (장갑/신발 인식 로직 추가)
    renderUI: () => {
            const display = document.getElementById('upgrade-target-display');
            const supportDisplay = document.getElementById('support-selected-display');
            const btnExec = document.getElementById('btn-up-exec');
            const btnSell = document.getElementById('btn-up-sell');
            const costDisplay = document.getElementById('up-cost-display');

            // [1] 대상 아이템이 선택되지 않았을 때 (빈 화면 처리)
            if (UpgradeSystem.targetIdx === -1 || !data.inventory[UpgradeSystem.targetIdx]) {

                // 메인 화면: 텅 빈 슬롯 디자인 적용
                if (display) {
                    display.innerHTML = `
                        <div style="
                            display: flex; flex-direction: column; align-items: center; justify-content: center;
                            height: 100%; width: 100%; min-height: 120px;
                            background: rgba(0,0,0,0.2); border: 2px dashed rgba(255,255,255,0.1); border-radius: 10px;
                            color: rgba(255,255,255,0.3); font-weight: bold;
                        ">
                            <div style="font-size: 2.5em; margin-bottom: 8px;">🛡️</div>
                            <div style="font-size: 0.9em;">강화할 장비를 선택해주세요</div>
                        </div>
                    `;
                }

                // 보조 아이템 화면: 심플한 텍스트 처리
                if (supportDisplay) {
                    supportDisplay.innerHTML = `<span style="color:#7f8c8d; font-size:0.9em;">(선택된 보조 아이템 없음)</span>`;
                }

                // 버튼 및 기타 UI 초기화
                if (btnExec) {
                    btnExec.disabled = true;
                    btnExec.innerText = "강화하기";
                    btnExec.style.background = "#bdc3c7"; // 비활성 회색
                    btnExec.style.color = "#7f8c8d";
                    btnExec.style.cursor = "not-allowed";
                    btnExec.style.boxShadow = "none";
                }

                if (btnSell) btnSell.style.display = 'none';
                if (costDisplay) costDisplay.innerHTML = `<span style="color:#7f8c8d;">0 G</span>`;

                // 확률 및 파괴 확률 초기화
                const chanceEl = document.getElementById('up-chance');
                if (chanceEl) chanceEl.innerText = '0%';

                const breakEl = document.getElementById('up-break');
                if (breakEl) breakEl.innerText = '0%';

                return;
            }

        const item = data.inventory[UpgradeSystem.targetIdx];

                // ★ [핵심 수정] 강화 가능한 장비 타입 리스트
                const gearTypes = ['weapon', 'armor', 'belt', 'gloves', 'shoes'];
                const isGear = gearTypes.includes(item.type);

                // 1. 강화 불가능 아이템일 때 (디자인 적용)
                if (!isGear) {
                    if(display) {
                        display.innerHTML = `
                            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#e74c3c; gap:10px;">
                                <span style="font-size:2em;">🚫</span>
                                <span style="font-weight:bold;">강화할 수 없는 아이템입니다.</span>
                            </div>`;
                    }
                    if(btnExec) {
                        btnExec.disabled = true;
                        btnExec.innerText = "강화 불가";
                        btnExec.style.background = "#333";
                        btnExec.style.color = "#777";
                        btnExec.style.cursor = "not-allowed";
                    }
                    return;
                }

                const cost = UpgradeSystem.calcCost(item);
                // 비용 표시 (색상 강조)
                if(costDisplay) costDisplay.innerHTML = `<span style="color:#f1c40f; font-weight:bold; font-size:1.1em;">${MainEngine.formatNumber(cost)} G</span>`;

                // 2. 보조 아이템(주문서/강화권) 표시 HTML 생성
                let supportHtml = `<span style="color:#7f8c8d; font-size:0.9em;">(선택된 보조 아이템 없음)</span>`;
                let scroll = UpgradeSystem.selectedScroll !== -1 ? data.inventory[UpgradeSystem.selectedScroll] : null;
                let ticket = UpgradeSystem.selectedTicket !== -1 ? data.inventory[UpgradeSystem.selectedTicket] : null;

                if (scroll) {
                    let isUsable = true;
                    let warning = "";
                    if (scroll.maxLimit && item.en > scroll.maxLimit) { isUsable = false; warning = ` (+${scroll.maxLimit}강 이하만)`; }
                    else if (scroll.limitLv && item.lv > scroll.limitLv) { isUsable = false; warning = ` (Lv.${scroll.limitLv} 이하만)`; }

                    supportHtml = `
                        <div style="display:flex; align-items:center; gap:8px; background:rgba(52, 152, 219, 0.1); padding:5px 10px; border-radius:5px; border:1px solid ${isUsable ? '#3498db' : '#e74c3c'};">
                            <span style="font-size:1.2em;">🛡️</span>
                            <div>
                                <div style="color:${isUsable ? '#3498db' : '#e74c3c'}; font-weight:bold; font-size:0.95em;">${scroll.name}</div>
                                ${warning ? `<div style="color:#e74c3c; font-size:0.8em;">${warning}</div>` : ''}
                            </div>
                        </div>`;
                } else if (ticket) {
                    let isUsable = true;
                    let warning = "";
                    if (ticket.val <= item.en) { isUsable = false; warning = " (현재 수치가 더 높음)"; }
                    else if (ticket.limitLv && item.lv > ticket.limitLv) { isUsable = false; warning = ` (Lv.${ticket.limitLv} 이하만)`; }

                    supportHtml = `
                        <div style="display:flex; align-items:center; gap:8px; background:rgba(241, 196, 15, 0.1); padding:5px 10px; border-radius:5px; border:1px solid ${isUsable ? '#f1c40f' : '#e74c3c'};">
                            <span style="font-size:1.2em;">🎫</span>
                            <div>
                                <div style="color:${isUsable ? '#f1c40f' : '#e74c3c'}; font-weight:bold; font-size:0.95em;">${ticket.name}</div>
                                ${warning ? `<div style="color:#e74c3c; font-size:0.8em;">${warning}</div>` : ''}
                            </div>
                        </div>`;
                }
                if(supportDisplay) supportDisplay.innerHTML = supportHtml;

                // 3. 메인 아이템 정보 표시 (이미지 + 테두리 + 강화상태)
                // 이미지 경로 처리 (오류 방지)
                let imgSrc = item.img ? `image/${item.img}` : '';
                let fallbackIcon = '⚔️';
                if(item.type==='armor') fallbackIcon='🛡️';
                else if(item.type==='shoes' || item.type==='gloves') fallbackIcon='🧤';

                // 등급별 테두리 색상 (간단 로직)
                let rarityColor = '#bdc3c7';
                if(item.en >= 15) rarityColor = '#e74c3c'; // 빨강
                else if(item.en >= 10) rarityColor = '#9b59b6'; // 보라
                else if(item.en >= 5) rarityColor = '#3498db'; // 파랑

                const itemImgHtml = imgSrc ?
                    `<img src="${imgSrc}" style="width:50px; height:50px; border-radius:8px; border:2px solid ${rarityColor}; background:rgba(0,0,0,0.3);" onerror="this.src='';this.nextElementSibling.style.display='block';"> <span style="display:none; font-size:2em;">${fallbackIcon}</span>` :
                    `<span style="font-size:2.5em; color:${rarityColor};">${fallbackIcon}</span>`;

                // 4. 강화권 사용 시 UI 처리
                if (ticket) {
                    if(display) {
                        display.innerHTML = `
                            <div style="display:flex; align-items:center; gap:15px;">
                                ${itemImgHtml}
                                <div style="text-align:left;">
                                    <div style="font-size:1.1em; font-weight:bold; color:#fff;">${item.name} <span style="color:#f1c40f;">(+${item.en})</span></div>
                                    <div style="color:#2ecc71; font-size:0.9em; margin-top:3px;">▲ ${ticket.name} 적용 대기</div>
                                </div>
                            </div>`;
                    }
                    document.getElementById('up-chance').innerText = '100';
                    document.getElementById('up-break').innerText = '0';

                    if(btnExec) {
                        const isOk = (ticket.val > item.en) && (!ticket.limitLv || item.lv <= ticket.limitLv);
                        btnExec.disabled = !isOk;
                        btnExec.innerText = isOk ? "강화권 사용" : "사용 불가";

                        // 버튼 스타일
                        btnExec.style.background = isOk ? "#f1c40f" : "#333";
                        btnExec.style.color = isOk ? "#000" : "#777";
                        btnExec.style.cursor = isOk ? "pointer" : "not-allowed";
                        btnExec.style.boxShadow = isOk ? "0 0 15px rgba(241, 196, 15, 0.4)" : "none";
                    }
                }
                // 5. 일반 강화 시 UI 처리
                else {
                    const rates = UpgradeSystem.getRates(item.en);
                    let destroyRate = (scroll && (!scroll.maxLimit || item.en <= scroll.maxLimit) && (!scroll.limitLv || item.lv <= scroll.limitLv)) ? 0 : rates.destroy;

                    if(display) {
                        display.innerHTML = `
                            <div style="display:flex; align-items:center; gap:15px;">
                                ${itemImgHtml}
                                <div style="text-align:left;">
                                    <div style="font-size:1.1em; font-weight:bold; color:#fff;">${item.name} <span style="color:#f1c40f;">(+${item.en})</span></div>
                                    ${destroyRate === 0 && scroll ?
                                        '<div style="color:#3498db; font-size:0.85em; margin-top:3px; font-weight:bold;">🛡️ 파괴 방지 적용중</div>' :
                                        '<div style="color:#aaa; font-size:0.85em; margin-top:3px;">일반 강화 모드</div>'}
                                </div>
                            </div>`;
                    }
                    document.getElementById('up-chance').innerText = rates.success;

                    // 파괴 확률 색상 처리 (위험하면 빨갛게)
                    const breakEl = document.getElementById('up-break');
                    if(breakEl) {
                        breakEl.innerText = destroyRate;
                        breakEl.style.color = destroyRate > 0 ? '#e74c3c' : '#bdc3c7';
                    }

                    if(btnExec) {
                        const isMax = item.en >= 20;
                        btnExec.disabled = isMax;
                        btnExec.innerText = isMax ? "최대 강화 달성" : "강화 시도";

                        // 버튼 스타일 (일반 강화: 초록 / 최대 강화: 골드)
                        if (isMax) {
                            btnExec.style.background = "linear-gradient(45deg, #f1c40f, #f39c12)";
                            btnExec.style.color = "#fff";
                            btnExec.style.cursor = "default";
                            btnExec.style.boxShadow = "0 0 15px rgba(243, 156, 18, 0.4)";
                        } else {
                            btnExec.style.background = "#2ecc71";
                            btnExec.style.color = "#fff";
                            btnExec.style.cursor = "pointer";
                            btnExec.style.boxShadow = "0 5px 15px rgba(46, 204, 113, 0.3)";
                        }
                    }
                }

                if(btnSell) {
                    btnSell.style.display = 'inline-block';
                }
            },

    getRates: (en) => {
        let success = 0;

        if (en < 10) {
            // 0~9강 구간: 100%에서 8%씩 감소 (최소 20% 보장)
            success = Math.max(20, 100 - (en * 8));
        } else if (en >= 10 && en < 20) {
            // 10강->11강 시도시 20% 시작, 이후 1%씩 감소
            success = 20 - (en - 10);
        } else {
            // 20강 이상은 10% 고정 (혹은 0)
            success = 10;
        }

        // 파괴 확률: 11강 시도(en이 11 이상일 때)부터 발생
        // 11강 시도 시 5%, 이후 5%씩 증가
        let destroy = en >= 11 ? 5 + (en - 11) * 5 : 0;

        return { success, destroy };
    },

    try: () => {
            if (UpgradeSystem.targetIdx === -1) return;
            const item = data.inventory[UpgradeSystem.targetIdx];
            const log = document.getElementById('log-container');

            if (item.en >= 20) {
                UpgradeSystem.stopAuto();
                return alert("이미 최대 강화 수치(+20)에 도달했습니다!");
            }

            // [A] 강화권 사용 로직
            if (UpgradeSystem.selectedTicket !== -1) {
                const ticket = data.inventory[UpgradeSystem.selectedTicket];
                if (!ticket || ticket.val <= item.en || (ticket.limitLv && item.lv > ticket.limitLv)) return alert("사용 불가");

                if (confirm(`${ticket.name}을 사용하여 +${ticket.val} 강으로 만드시겠습니까?`)) {
                    item.en = ticket.val;

                    if (ticket.count > 1) {
                        ticket.count--;
                    } else {
                        data.inventory.splice(UpgradeSystem.selectedTicket, 1);
                        UpgradeSystem.selectedTicket = -1;
                    }

                    UpgradeSystem.targetIdx = data.inventory.indexOf(item);

                    if(log) log.innerHTML = `<div style="color:#f1c40f">🎫 강화권 사용 성공! -> +${item.en} 달성!</div>` + log.innerHTML;

                    // --- UI 업데이트 추가 ---
                    UpgradeSystem.renderUI();
                    MainEngine.renderInventory(); // 인벤토리 리스트 갱신
                    MainEngine.isDirty = true;
                    MainEngine.updateUI();
                }
                return;
            }

            // [B] 일반 강화 로직
            const cost = UpgradeSystem.calcCost(item);
            if (data.gold < cost) {
                UpgradeSystem.stopAuto();
                return alert("골드가 부족합니다.");
            }

            const scroll = UpgradeSystem.selectedScroll !== -1 ? data.inventory[UpgradeSystem.selectedScroll] : null;
            const isProtected = scroll && (!scroll.maxLimit || item.en <= scroll.maxLimit) && (!scroll.limitLv || item.lv <= scroll.limitLv);

            data.gold -= cost;
            const rates = UpgradeSystem.getRates(item.en);
            const rand = Math.random() * 100;

            if (rand < rates.success) {
                // [성공]
                item.en++;
                MainEngine.showNotification(`✨ 강화 성공! (+${item.en} 달성) ✨`, "#f1c40f");

                const safeMode = document.getElementById('chk-safe-mode');
                if (UpgradeSystem.isAuto && safeMode && safeMode.checked && item.en >= 10) {
                     UpgradeSystem.stopAuto();
                     MainEngine.showNotification("🛑 [안전 모드] +10강 달성! 자동 강화를 종료합니다. 🛑", "#2ecc71");
                }

                if (item.en >= 20) {
                    UpgradeSystem.stopAuto();
                    MainEngine.showNotification("🎊 [MAX] 축하합니다! 최대 강화 수치에 도달했습니다! 🎊", "#ff00ff");
                }
            } else {
                // [실패]
                if (Math.random() * 100 < rates.destroy) {
                    if (isProtected) {
                        // 파괴 방지 성공
                        if (scroll.count > 1) {
                            scroll.count--;
                        } else {
                            data.inventory.splice(UpgradeSystem.selectedScroll, 1);
                            UpgradeSystem.selectedScroll = -1;
                        }
                        UpgradeSystem.targetIdx = data.inventory.indexOf(item);
                        MainEngine.showNotification("🛡️ 파괴 방지 주문서가 장비를 지켜냈습니다! 🛡️", "#3498db");
                        if(log) log.innerHTML = `<div style="color:#3498db">🛡️ 파괴 방지 성공! (${scroll.name} 소모)</div>` + log.innerHTML;
                        UpgradeSystem.stopAuto();
                    } else {
                        // 장비 파괴
                        data.inventory.splice(UpgradeSystem.targetIdx, 1);
                        // 장착 중이었다면 해제
                        if (data.equipment[item.type] && data.equipment[item.type].uid === item.uid) {
                            data.equipment[item.type] = null;
                        }
                        UpgradeSystem.targetIdx = -1;
                        UpgradeSystem.stopAuto();
                        MainEngine.showNotification("💀 장비가 산산조각 났습니다... 💀", "#e74c3c");
                    }
                } else {
                    // 파괴는 안 되었지만 강화 실패한 경우
		    MainEngine.showNotification(`💀 강화 실패! ㅋㅋ 병신 💀`, "#f1c40f");
                    if(log) log.innerHTML = `<div style="color:#95a5a6">실패: 수치 변동 없음</div>` + log.innerHTML;
                }
            }

            // --- 공통 UI 업데이트 ---
            UpgradeSystem.renderUI();      // 강화창 UI 갱신
            MainEngine.renderInventory();  // ★ 인벤토리 리스트 즉시 갱신 (수치/개수 반영)

            if (!UpgradeSystem.isAuto) {
                MainEngine.isDirty = true;
            }
            MainEngine.updateUI();         // 상단바 골드 및 스탯 갱신
        },

 startAuto: () => {
         // 1. 강화 대상이 선택되었는지 확인
         if (UpgradeSystem.targetIdx === -1) return alert("대상을 선택하세요.");

         // ★ [추가된 방어 로직] 현재 장비가 이미 10강 이상인지 확인
         const item = data.inventory[UpgradeSystem.targetIdx];
         if (item && item.en >= 10) {
             // 10강 이상이면 경고창을 띄우고 함수를 즉시 종료(return)하여 자동 강화를 막음
             return alert("🚫 10강 이상 장비는 자동 강화를 시작할 수 없습니다.");
         }

         // 2. 이미 자동 강화가 돌아가는 중이라면 멈춤 (토글 기능)
         if (UpgradeSystem.isAuto) {
             UpgradeSystem.stopAuto();
             return;
         }

         // 3. 자동 강화 시작 처리
         UpgradeSystem.isAuto = true;

         const btn = document.getElementById('auto-btn');
         if (btn) btn.innerText = "⏹ 중지"; // 버튼 텍스트 변경

         // 0.15초마다 강화 시도 (try 함수 호출)
         UpgradeSystem.autoTimer = setInterval(UpgradeSystem.try, 150);
     },
stopAuto: () => {
        UpgradeSystem.isAuto = false;
        if (UpgradeSystem.autoTimer) {
            clearInterval(UpgradeSystem.autoTimer);
            UpgradeSystem.autoTimer = null;
        }
        const btn = document.getElementById('auto-btn');
        if (btn) btn.innerText = "자동 강화 시작";
    },
};


