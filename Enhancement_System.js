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
        
        // ★ [핵심 수정] 강화 가능한 장비 타입 리스트 (장갑, 신발 포함)
        const gearTypes = ['weapon', 'armor', 'belt', 'gloves', 'shoes'];
        const isGear = gearTypes.includes(item.type);

        if (!isGear) {
            if(display) display.innerHTML = '<span style="color:#e74c3c">강화할 수 없는 아이템입니다.</span>';
            if(btnExec) { btnExec.disabled = true; btnExec.innerText = "강화 불가"; }
            return;
        }

        const cost = UpgradeSystem.calcCost(item);
        if(costDisplay) costDisplay.innerText = `${MainEngine.formatNumber(cost)} G`;

        let supportHtml = `<span style="color:#888">선택된 보조 아이템 없음</span>`;
        let scroll = UpgradeSystem.selectedScroll !== -1 ? data.inventory[UpgradeSystem.selectedScroll] : null;
        let ticket = UpgradeSystem.selectedTicket !== -1 ? data.inventory[UpgradeSystem.selectedTicket] : null;

        if (scroll) {
            let isUsable = true;
            let warning = "";
            if (scroll.maxLimit && item.en > scroll.maxLimit) { isUsable = false; warning = ` (+${scroll.maxLimit}강 이하만)`; }
            else if (scroll.limitLv && item.lv > scroll.limitLv) { isUsable = false; warning = ` (Lv.${scroll.limitLv} 이하만)`; }
            supportHtml = `<span style="color:${isUsable ? '#3498db' : '#e74c3c'}; font-weight:bold;">🛡️ ${scroll.name}${warning}</span>`;
        } else if (ticket) {
            let isUsable = true;
            let warning = "";
            if (ticket.val <= item.en) { isUsable = false; warning = " (수치 낮음)"; }
            else if (ticket.limitLv && item.lv > ticket.limitLv) { isUsable = false; warning = ` (Lv.${ticket.limitLv} 이하만)`; }
            supportHtml = `<span style="color:${isUsable ? '#f1c40f' : '#e74c3c'}; font-weight:bold;">🎫 ${ticket.name}${warning}</span>`;
        }
        if(supportDisplay) supportDisplay.innerHTML = supportHtml;

        if (ticket) {
            if(display) display.innerHTML = `<div style="font-size:1.2em; font-weight:bold; color:#f1c40f">${item.name} (+${item.en})</div><div style="color:#2ecc71;">▲ 강화권 적용 대기</div>`;
            document.getElementById('up-chance').innerText = '100';
            document.getElementById('up-break').innerText = '0';
            if(btnExec) {
                const isOk = (ticket.val > item.en) && (!ticket.limitLv || item.lv <= ticket.limitLv);
                btnExec.disabled = !isOk;
                btnExec.innerText = isOk ? "강화권 사용" : "사용 불가";
            }
        } else {
            const rates = UpgradeSystem.getRates(item.en);
            let destroyRate = (scroll && (!scroll.maxLimit || item.en <= scroll.maxLimit) && (!scroll.limitLv || item.lv <= scroll.limitLv)) ? 0 : rates.destroy;
            
            if(display) display.innerHTML = `<div style="font-size:1.2em; font-weight:bold;">${item.name} (+${item.en})</div>${destroyRate === 0 && scroll ? '<div style="color:#3498db; font-size:0.9em; margin-top:5px;">🛡️ 파괴 방지 적용중</div>' : ''}`;
            document.getElementById('up-chance').innerText = rates.success;
            document.getElementById('up-break').innerText = destroyRate;
            if(btnExec) { 
                btnExec.disabled = item.en >= 20; 
                btnExec.innerText = item.en >= 20 ? "최대 강화" : "강화하기"; 
            }
        }
        if(btnSell) btnSell.style.display = 'inline-block';
    },

    getRates: (en) => {
        let success = en < 10 ? Math.max(40, 100 - (en * 5)) : (en === 10 ? 40 : 30);
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

        // [A] 강화권 사용 로직 (기존과 동일)
        if (UpgradeSystem.selectedTicket !== -1) {
            const ticket = data.inventory[UpgradeSystem.selectedTicket];
            if (!ticket || ticket.val <= item.en || (ticket.limitLv && item.lv > ticket.limitLv)) return alert("사용 불가");
            
            if (confirm(`${ticket.name}을 사용하여 +${ticket.val} 강으로 만드시겠습니까?`)) {
                item.en = ticket.val;
                data.inventory.splice(UpgradeSystem.selectedTicket, 1);
                UpgradeSystem.targetIdx = data.inventory.indexOf(item);
                UpgradeSystem.selectedTicket = -1;
                if(log) log.innerHTML = `<div style="color:#f1c40f">🎫 강화권 사용 성공! -> +${item.en} 달성!</div>` + log.innerHTML;
                UpgradeSystem.renderUI();
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
            item.en++;
            if(log) log.innerHTML = `<div style="color:#2ecc71">성공! (+${item.en}) / -${MainEngine.formatNumber(cost)}G</div>` + log.innerHTML;
            
            // ★ [안전장치 복구] 안전 모드 체크박스가 켜져 있고 10강에 도달하면 중지
            const safeMode = document.getElementById('chk-safe-mode');
            if (UpgradeSystem.isAuto && safeMode && safeMode.checked && item.en >= 10) {
                 UpgradeSystem.stopAuto();
                 alert("🎉 안전 모드: +10강을 달성하여 자동 강화를 중단합니다.");
            }

            if (item.en >= 20) { 
                UpgradeSystem.stopAuto(); 
                alert("🎉 최대 강화 도달!"); 
            }
        } else {
            // 실패 및 파괴 로직 (기존과 동일)
            if (Math.random() * 100 < rates.destroy) {
                if (isProtected) {
                    data.inventory.splice(UpgradeSystem.selectedScroll, 1);
                    UpgradeSystem.selectedScroll = -1;
                    UpgradeSystem.targetIdx = data.inventory.indexOf(item);
                    if(log) log.innerHTML = `<div style="color:#3498db">🛡️ 파괴 방지 성공! (${scroll.name} 소모)</div>` + log.innerHTML;
                    UpgradeSystem.stopAuto();
                } else {
                    data.inventory.splice(UpgradeSystem.targetIdx, 1);
                    if (data.equipment[item.type] === item) data.equipment[item.type] = null;
                    UpgradeSystem.targetIdx = -1;
                    UpgradeSystem.stopAuto();
                    if(log) log.innerHTML = `<div style="color:#e74c3c">💀 장비 파괴됨...</div>` + log.innerHTML;
                }
            } else {
                if(log) log.innerHTML = `<div style="color:#e67e22">실패 (등급 유지) / -${MainEngine.formatNumber(cost)}G</div>` + log.innerHTML;
            }
        }
        UpgradeSystem.renderUI();
        MainEngine.updateUI();
    },

    startAuto: () => {
        if (UpgradeSystem.targetIdx === -1) return alert("대상을 선택하세요.");
        if (UpgradeSystem.isAuto) { UpgradeSystem.stopAuto(); return; }
        UpgradeSystem.isAuto = true;
        document.getElementById('auto-btn').innerText = "⏹ 중지";
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
    }
};


