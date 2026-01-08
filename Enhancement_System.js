const UpgradeSystem = {
    targetIdx: -1,        
    selectedScroll: -1,   
    selectedTicket: -1, 
    isAuto: false,
    autoTimer: null,
    
    // 비용 계산 (기존과 동일)
    calcCost: (item) => {
        if (!item) return 0;
        let baseCost = Math.floor(item.p * 0.1);
        if (item.en < 5) return baseCost + (item.en * 1000);
        let cost = baseCost + (5 * 1000);
        for (let i = 5; i < item.en; i++) {
            if (i < 10) cost *= 1.2;
            else cost *= 1.8;
        }
       return Math.floor(cost);
    },

    // [1] 장비 선택
    selectUpgrade: (idx) => {
        if (typeof idx === 'undefined' || idx === null || idx < 0) return;
        UpgradeSystem.targetIdx = idx;
        UpgradeSystem.selectedScroll = -1; // 장비 바뀌면 보조템 해제
        UpgradeSystem.selectedTicket = -1;
        UpgradeSystem.renderUI();
    },

    // [2] 보조 아이템 선택 (New)
    selectSupport: (idx) => {
        const item = data.inventory[idx];
        if (!item) return;

        // 타입에 따라 분류
        if (item.type === 'scroll') {
            UpgradeSystem.selectedScroll = idx;
            UpgradeSystem.selectedTicket = -1; // 티켓 해제
        } else if (item.type === 'ticket') {
            UpgradeSystem.selectedTicket = idx;
            UpgradeSystem.selectedScroll = -1; // 스크롤 해제
        }
        UpgradeSystem.renderUI();
    },

    // [3] 보조 아이템 해제 (New)
    clearSupport: () => {
        UpgradeSystem.selectedScroll = -1;
        UpgradeSystem.selectedTicket = -1;
        UpgradeSystem.renderUI();
    },

    // UI 렌더링
    renderUI: () => {
        const display = document.getElementById('upgrade-target-display');
        const supportDisplay = document.getElementById('support-selected-display'); // 보조템 표시창
        const btnExec = document.getElementById('btn-up-exec');
        const btnSell = document.getElementById('btn-up-sell');
        const costDisplay = document.getElementById('up-cost-display');
        
        // 1. 장비 표시 영역 처리
        if (UpgradeSystem.targetIdx === -1 || !data.inventory[UpgradeSystem.targetIdx]) {
            if(display) display.innerHTML = '<span style="color:#888">강화할 장비를 선택해주세요.</span>';
            if(supportDisplay) supportDisplay.innerText = "선택된 보조 아이템 없음";
            if(btnExec) { btnExec.disabled = true; btnExec.innerText = "강화하기"; }
            if(btnSell) btnSell.style.display = 'none';
            if(costDisplay) costDisplay.innerText = "0 G";
            document.getElementById('up-chance').innerText = '0';
            document.getElementById('up-break').innerText = '0';
            return;
        }

        const item = data.inventory[UpgradeSystem.targetIdx];
        const cost = UpgradeSystem.calcCost(item);
        if(costDisplay) costDisplay.innerText = `${cost.toLocaleString()} G`;

        // 2. 보조 아이템 표시 영역 처리
        let supportHtml = `<span style="color:#888">선택된 보조 아이템 없음</span>`;
        let scroll = null;
        let ticket = null;

        if (UpgradeSystem.selectedScroll !== -1) {
            scroll = data.inventory[UpgradeSystem.selectedScroll];
            if(scroll) {
                // 파괴방지권 유효성 체크 시각화
                const isUsable = !(scroll.maxLimit && item.en > scroll.maxLimit);
                const color = isUsable ? '#3498db' : '#e74c3c';
                const warning = isUsable ? '' : ` (사용불가: +${scroll.maxLimit}강 이하)`;
                supportHtml = `<span style="color:${color}; font-weight:bold;">🛡️ ${scroll.name}${warning}</span>`;
            } else {
                UpgradeSystem.selectedScroll = -1; // 아이템 없으면 해제
            }
        } else if (UpgradeSystem.selectedTicket !== -1) {
            ticket = data.inventory[UpgradeSystem.selectedTicket];
            if(ticket) {
                supportHtml = `<span style="color:#f1c40f; font-weight:bold;">🎫 ${ticket.name} (즉시 +${ticket.val}강)</span>`;
            } else {
                UpgradeSystem.selectedTicket = -1;
            }
        }
        if(supportDisplay) supportDisplay.innerHTML = supportHtml;


        // 3. 메인 정보 및 버튼 상태 처리
        // [A] 강화권 모드
        if (ticket) {
            if(display) {
                display.innerHTML = `
                    <div style="font-size:1.2em; font-weight:bold; color:#f1c40f">${item.name} (+${item.en})</div>
                    <div style="margin-top:5px; color:#2ecc71;">▲ 강화권 적용 대기</div>`;
            }
            document.getElementById('up-chance').innerText = '100';
            document.getElementById('up-break').innerText = '0';
            if(btnExec) { 
                // 강화권은 현재 레벨보다 높아야 사용 가능
                if (ticket.val > item.en) {
                    btnExec.disabled = false; btnExec.innerText = "강화권 사용"; 
                } else {
                    btnExec.disabled = true; btnExec.innerText = "사용 불가 (레벨 낮음)";
                }
            }
        } 
        // [B] 일반/스크롤 모드
        else {
            const rates = UpgradeSystem.getRates(item.en);
            let destroyRate = rates.destroy;
            let scrollText = "";

            if (scroll) {
                // 파괴방지권 조건 체크
                if (scroll.maxLimit && item.en > scroll.maxLimit) {
                    // 조건 안 맞으면 파괴확률 그대로
                    destroyRate = rates.destroy;
                } else {
                    // 조건 맞으면 파괴확률 0
                    destroyRate = 0;
                    scrollText = `<div style="color:#3498db; font-size:0.9em; margin-top:5px;">🛡️ 파괴 방지 적용중</div>`;
                }
            }

            // 최대 강화 체크
            if (item.en >= 20) {
                if(display) display.innerHTML = `<div style="color:#e74c3c; font-weight:bold;">🔥 ${item.name} (+${item.en}) [MAX]</div>`;
                if(btnExec) { btnExec.disabled = true; btnExec.innerText = "최대 강화 도달"; }
            } else {
                if(display) {
                    display.innerHTML = `
                        <div style="font-size:1.2em; font-weight:bold; color:${item.en >= 10 ? '#e74c3c' : '#fff'}">${item.name} (+${item.en})</div>
                        <div style="color:#aaa; font-size:0.9em;">다음 레벨: +${item.en + 1}</div>
                        ${scrollText}
                    `;
                }
                if(btnExec) { btnExec.disabled = false; btnExec.innerText = `강화하기`; }
            }

            document.getElementById('up-chance').innerText = rates.success;
            document.getElementById('up-break').innerText = destroyRate;
        }

        if(btnSell) btnSell.style.display = 'inline-block';
        if(typeof upIdx !== 'undefined') upIdx = UpgradeSystem.targetIdx; 
    },

    getRates: (en) => {
        let success = 100;
        let destroy = 0;
        if (en < 10) success = Math.max(40, 100 - (en * 5));
        else if (en === 10) success = 40;
        else success = 30;

        if (en >= 11) destroy = 5 + (en - 11) * 5; 
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

        // [A] 강화권 사용 실행
        if (UpgradeSystem.selectedTicket !== -1) {
            const ticket = data.inventory[UpgradeSystem.selectedTicket];
            // 유효성 재검사
            if (!ticket || ticket.val <= item.en) return alert("사용할 수 없는 강화권입니다.");

            if (confirm(`${ticket.name}을 사용하여 +${ticket.val} 강으로 만드시겠습니까?`)) {
                item.en = ticket.val;
                if (item.en > 20) item.en = 20;

                // 소모
                const realIdx = data.inventory.findIndex(i => i === ticket);
                if (realIdx !== -1) {
                    data.inventory.splice(realIdx, 1);
                    // 인덱스 보정
                    if (realIdx < UpgradeSystem.targetIdx) UpgradeSystem.targetIdx--;
                }

                if(log) log.innerHTML = `<div style="color:#f1c40f">🎫 [${ticket.name}] 사용 성공! -> +${item.en} 달성!</div>` + log.innerHTML;
                
                UpgradeSystem.selectedTicket = -1;
                UpgradeSystem.renderUI();
                if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
            }
            return;
        }

        // [B] 일반 강화 실행
        const cost = UpgradeSystem.calcCost(item);
        if (data.gold < cost) {
            UpgradeSystem.stopAuto();
            return alert("골드가 부족합니다.");
        }

        // 파괴방지권 체크
        let useScroll = false;
        let scrollItem = null;
        if (UpgradeSystem.selectedScroll !== -1) {
            scrollItem = data.inventory[UpgradeSystem.selectedScroll];
            if (scrollItem) {
                if (scrollItem.maxLimit && item.en > scrollItem.maxLimit) {
                    UpgradeSystem.stopAuto();
                    return alert(`[${scrollItem.name}]은 +${scrollItem.maxLimit}강 이하만 사용 가능합니다.`);
                }
                useScroll = true;
            }
        }

        data.gold -= cost;

        const rates = UpgradeSystem.getRates(item.en);
        const rand = Math.random() * 100;

        // 성공
        if (rand < rates.success) {
            item.en++;
            if (item.en > 20) item.en = 20;
            if(log) log.innerHTML = `<div style="color:#2ecc71">성공! (+${item.en}) / -${cost}G</div>` + log.innerHTML;
            
            // 안전모드 중단 체크
            const safeMode = document.getElementById('chk-safe-mode');
            if (UpgradeSystem.isAuto && safeMode && safeMode.checked && item.en >= 10) {
                 UpgradeSystem.stopAuto();
                 alert("🎉 안전 모드: +10강을 달성하여 자동 강화를 중단합니다.");
            }
            if (item.en >= 20) {
                UpgradeSystem.stopAuto();
                alert("🎉 축하합니다! 최대 강화(+20)에 도달했습니다!");
            }
        } 
        // 실패
        else {
            const destroyRand = Math.random() * 100;
            // 파괴 판정
            if (destroyRand < rates.destroy) {
                // 방지권 사용
                if (useScroll && scrollItem) {
                    const realIdx = data.inventory.findIndex(i => i === scrollItem);
                    if (realIdx !== -1) {
                        data.inventory.splice(realIdx, 1);
                        if (realIdx < UpgradeSystem.targetIdx) UpgradeSystem.targetIdx--;
                    }
                    if(log) log.innerHTML = `<div style="color:#3498db">🛡️ 파괴 방어 성공! (${scrollItem.name} 소모) / -${cost}G</div>` + log.innerHTML;
                    
                    UpgradeSystem.selectedScroll = -1; 
                    UpgradeSystem.stopAuto(); // 소모했으니 자동 중단
                } 
                // 장비 파괴
                else {
                    if(log) log.innerHTML = `<div style="color:#e74c3c">💀 장비 파괴됨... / -${cost}G</div>` + log.innerHTML;
                    data.inventory.splice(UpgradeSystem.targetIdx, 1);
                    if (data.equipment[item.type] === item) data.equipment[item.type] = null;
                    UpgradeSystem.targetIdx = -1;
                    UpgradeSystem.stopAuto();
                }
            } 
            // 그냥 실패 (등급 유지)
            else {
                if(log) log.innerHTML = `<div style="color:#e67e22">실패 (등급 유지) / -${cost}G</div>` + log.innerHTML;
            }
        }
        UpgradeSystem.renderUI();
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
    },

    startAuto: () => {
        if (UpgradeSystem.isAuto) { UpgradeSystem.stopAuto(); return; }
        if (UpgradeSystem.targetIdx === -1) return alert("대상을 선택하세요.");
        
        // 자동 강화 시작 시 보조 아이템 선택 해제 (실수 방지)
        UpgradeSystem.selectedScroll = -1;
        UpgradeSystem.selectedTicket = -1;
        UpgradeSystem.renderUI();

        UpgradeSystem.isAuto = true;
        document.getElementById('auto-btn').innerText = "⏹ 중지";
        
        UpgradeSystem.autoTimer = setInterval(() => {
            if (!UpgradeSystem.isAuto || UpgradeSystem.targetIdx === -1) {
                UpgradeSystem.stopAuto();
                return;
            }
            UpgradeSystem.try();
        }, 100);
    },

    stopAuto: () => {
        UpgradeSystem.isAuto = false;
        if (UpgradeSystem.autoTimer) clearInterval(UpgradeSystem.autoTimer);
        const btn = document.getElementById('auto-btn');
        if(btn) btn.innerText = "자동 강화 시작";
    }
};
