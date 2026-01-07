/* ============================================================
   [Enhancement_System.js]
   강화 로직: 강화권/방지권 사용 및 장비 선택 처리
   ============================================================ */

const UpgradeSystem = {
    targetIdx: -1,       // 강화할 장비의 인벤토리 인덱스
    selectedScroll: -1,  // 선택된 방지권 인벤토리 인덱스
    selectedTicket: -1,  // 선택된 강화권 인벤토리 인덱스
    isAuto: false,
    autoTimer: null,
    
    // 1. 장비 선택 (Main_Engine.js의 모달에서 이 함수를 호출함)
    selectUpgrade: (idx) => {
        // 인덱스가 유효한지 확인
        if (typeof idx === 'undefined' || idx === null || idx < 0) return console.error("잘못된 장비 인덱스입니다.");
        
        UpgradeSystem.targetIdx = idx;
        UpgradeSystem.selectedScroll = -1; // 초기화
        UpgradeSystem.selectedTicket = -1; // 초기화
        
        // 화면 갱신
        UpgradeSystem.renderUI();
        UpgradeSystem.renderSupportItems(); 
    },

    // 2. UI 렌더링 (확률 및 정보 표시)
    renderUI: () => {
        const display = document.getElementById('upgrade-target-display');
        const btnExec = document.getElementById('btn-up-exec');
        const btnSell = document.getElementById('btn-up-sell');
        
        // 데이터 유효성 검사
        if (typeof data === 'undefined' || !data.inventory) return;

        // 선택된 장비가 없거나 유효하지 않으면 초기화
        if (UpgradeSystem.targetIdx === -1 || !data.inventory[UpgradeSystem.targetIdx]) {
            if(display) display.innerHTML = '<span style="color:#888">강화할 장비를 선택해주세요.</span>';
            if(btnExec) {
                btnExec.disabled = true;
                btnExec.innerText = "강화하기";
            }
            if(btnSell) btnSell.style.display = 'none';
            
            const elChance = document.getElementById('up-chance');
            const elBreak = document.getElementById('up-break');
            if(elChance) elChance.innerText = '0';
            if(elBreak) elBreak.innerText = '0';
            
            const supportArea = document.getElementById('support-item-area');
            if(supportArea) supportArea.innerHTML = '';
            return;
        }

        const item = data.inventory[UpgradeSystem.targetIdx];
        
        // [A] 강화권 사용 대기 상태
        if (UpgradeSystem.selectedTicket !== -1) {
            const ticket = data.inventory[UpgradeSystem.selectedTicket];
            if(display) {
                display.innerHTML = `
                    <div style="font-size:1.2em; font-weight:bold; color:#f1c40f">${item.name} (+${item.en})</div>
                    <div style="margin-top:5px; color:#2ecc71;">
                        ▲ [${ticket.name}] 사용 대기중<br>
                        (즉시 +${ticket.val} 강으로 변경)
                    </div>`;
            }
            document.getElementById('up-chance').innerText = '100';
            document.getElementById('up-break').innerText = '0';
        
        } 
        // [B] 일반 강화 상태
        else {
            const rates = UpgradeSystem.getRates(item.en);
            let destroyRate = rates.destroy;

            // 방지권 적용 여부
            if (UpgradeSystem.selectedScroll !== -1) destroyRate = 0;

            if(display) {
                display.innerHTML = `
                    <div style="font-size:1.2em; font-weight:bold; color:${item.en >= 10 ? '#e74c3c' : '#fff'}">${item.name} (+${item.en})</div>
                    <div style="color:#aaa; font-size:0.9em;">다음 레벨: +${item.en + 1}</div>
                    ${UpgradeSystem.selectedScroll !== -1 ? '<div style="color:#3498db; margin-top:5px;">🛡️ 파괴 방지권 적용됨</div>' : ''}
                `;
            }
            
            document.getElementById('up-chance').innerText = rates.success;
            document.getElementById('up-break').innerText = destroyRate;
        }

        if(btnExec) {
            btnExec.disabled = false;
            btnExec.innerText = (UpgradeSystem.selectedTicket !== -1) ? '강화권 사용' : '강화하기 (비용 0)';
        }
        if(btnSell) btnSell.style.display = 'inline-block';
        
        // 전역 변수 upIdx 동기화 (판매 기능용)
        if(typeof upIdx !== 'undefined') upIdx = UpgradeSystem.targetIdx; 
    },

    // 3. 보조 아이템 목록 표시
    renderSupportItems: () => {
        const area = document.getElementById('support-item-area');
        if (!area) return;

        const item = data.inventory[UpgradeSystem.targetIdx];
        if (!item) return;

        area.innerHTML = ''; // 초기화

        // (1) 강화권 목록
        const tickets = [];
        data.inventory.forEach((it, idx) => {
            if (it.type === 'ticket') tickets.push({ ...it, invIdx: idx });
        });

        if (tickets.length > 0) {
            const tDiv = document.createElement('div');
            tDiv.innerHTML = '<div style="font-size:0.9em; color:#ccc; margin:5px 0;">🎫 강화권 선택</div>';
            const tGrid = document.createElement('div');
            tGrid.style.display = 'flex'; tGrid.style.gap = '5px'; tGrid.style.flexWrap = 'wrap';

            tickets.forEach(t => {
                const btn = document.createElement('button');
                const isSelected = (UpgradeSystem.selectedTicket === t.invIdx);
                const isUsable = (t.val > item.en);

                btn.className = 'btn-small';
                btn.style.width = 'auto';
                btn.style.background = isSelected ? '#2ecc71' : (isUsable ? '#333' : '#222');
                btn.style.color = isUsable ? '#fff' : '#555';
                btn.style.border = isSelected ? '1px solid #fff' : '1px solid #444';
                btn.innerText = t.name;
                
                if (isUsable) {
                    btn.onclick = () => {
                        if (UpgradeSystem.selectedTicket === t.invIdx) UpgradeSystem.selectedTicket = -1;
                        else {
                            UpgradeSystem.selectedTicket = t.invIdx;
                            UpgradeSystem.selectedScroll = -1; 
                        }
                        UpgradeSystem.renderUI();
                        UpgradeSystem.renderSupportItems();
                    };
                } else {
                    btn.disabled = true;
                }
                tGrid.appendChild(btn);
            });
            tDiv.appendChild(tGrid);
            area.appendChild(tDiv);
        }

        // (2) 방지권 목록 (강화권 미사용 시)
        if (UpgradeSystem.selectedTicket === -1) {
            const scrolls = [];
            data.inventory.forEach((it, idx) => {
                if (it.type === 'scroll') scrolls.push({ ...it, invIdx: idx });
            });

            if (scrolls.length > 0) {
                const sDiv = document.createElement('div');
                sDiv.style.marginTop = '10px';
                sDiv.innerHTML = '<div style="font-size:0.9em; color:#ccc; margin:5px 0;">🛡️ 방지권 선택 (파괴 확률 0%)</div>';
                const sGrid = document.createElement('div');
                sGrid.style.display = 'flex'; sGrid.style.gap = '5px'; sGrid.style.flexWrap = 'wrap';

                scrolls.forEach(s => {
                    const btn = document.createElement('button');
                    const isSelected = (UpgradeSystem.selectedScroll === s.invIdx);
                    
                    btn.className = 'btn-small';
                    btn.style.width = 'auto';
                    btn.style.background = isSelected ? '#3498db' : '#333';
                    btn.style.border = isSelected ? '1px solid #fff' : '1px solid #444';
                    btn.innerText = s.name;
                    
                    btn.onclick = () => {
                        if (UpgradeSystem.selectedScroll === s.invIdx) UpgradeSystem.selectedScroll = -1;
                        else UpgradeSystem.selectedScroll = s.invIdx;
                        UpgradeSystem.renderUI();
                        UpgradeSystem.renderSupportItems();
                    };
                    sGrid.appendChild(btn);
                });
                sDiv.appendChild(sGrid);
                area.appendChild(sDiv);
            }
        }
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
        
        // [A] 강화권 사용
        if (UpgradeSystem.selectedTicket !== -1) {
            const ticket = data.inventory[UpgradeSystem.selectedTicket];
            if (confirm(`${ticket.name}을 사용하여 +${ticket.val} 강으로 만드시겠습니까?`)) {
                item.en = ticket.val;
                const realTicketIdx = data.inventory.findIndex(i => i === ticket);
                if (realTicketIdx !== -1) {
                    data.inventory.splice(realTicketIdx, 1);
                    if (realTicketIdx < UpgradeSystem.targetIdx) UpgradeSystem.targetIdx--;
                }
                if(log) log.innerHTML = `<div style="color:#f1c40f">🎫 [${ticket.name}] 사용 성공! -> +${item.en} 달성!</div>` + log.innerHTML;
                
                UpgradeSystem.selectedTicket = -1;
                UpgradeSystem.renderUI();
                UpgradeSystem.renderSupportItems();
                if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
            }
            return;
        }

        // [B] 일반 강화
        const rates = UpgradeSystem.getRates(item.en);
        const rand = Math.random() * 100;

        if (rand < rates.success) {
            item.en++;
            if(log) log.innerHTML = `<div style="color:#2ecc71">성공! (+${item.en})</div>` + log.innerHTML;
        } else {
            const destroyRand = Math.random() * 100;
            if (destroyRand < rates.destroy) {
                if (UpgradeSystem.selectedScroll !== -1) {
                    const scroll = data.inventory[UpgradeSystem.selectedScroll];
                    const realScrollIdx = data.inventory.findIndex(i => i === scroll);
                    if (realScrollIdx !== -1) {
                        data.inventory.splice(realScrollIdx, 1);
                        if (realScrollIdx < UpgradeSystem.targetIdx) UpgradeSystem.targetIdx--;
                    }
                    if(log) log.innerHTML = `<div style="color:#3498db">🛡️ 강화 실패했으나 [${scroll.name}]으로 파괴를 막았습니다!</div>` + log.innerHTML;
                    UpgradeSystem.selectedScroll = -1; 
                } else {
                    if(log) log.innerHTML = `<div style="color:#e74c3c">💀 강화 실패... 장비가 파괴되었습니다.</div>` + log.innerHTML;
                    data.inventory.splice(UpgradeSystem.targetIdx, 1);
                    if (data.equipment[item.type] === item) data.equipment[item.type] = null;
                    UpgradeSystem.targetIdx = -1;
                }
            } else {
                if(log) log.innerHTML = `<div style="color:#e67e22">실패... (등급 유지)</div>` + log.innerHTML;
            }
        }
        UpgradeSystem.renderUI();
        UpgradeSystem.renderSupportItems();
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
    },

    startAuto: () => {
        if (UpgradeSystem.isAuto) { UpgradeSystem.stopAuto(); return; }
        if (UpgradeSystem.targetIdx === -1) return alert("대상을 선택하세요.");
        
        UpgradeSystem.selectedScroll = -1;
        UpgradeSystem.selectedTicket = -1;
        UpgradeSystem.renderUI();
        UpgradeSystem.renderSupportItems();

        UpgradeSystem.isAuto = true;
        document.getElementById('auto-btn').innerText = "⏹ 중지";
        
        UpgradeSystem.autoTimer = setInterval(() => {
            if (!UpgradeSystem.isAuto || UpgradeSystem.targetIdx === -1) {
                UpgradeSystem.stopAuto();
                return;
            }
            UpgradeSystem.try();
        }, 800);
    },

    stopAuto: () => {
        UpgradeSystem.isAuto = false;
        if (UpgradeSystem.autoTimer) clearInterval(UpgradeSystem.autoTimer);
        const btn = document.getElementById('auto-btn');
        if(btn) btn.innerText = "자동 강화 시작";
    }
};
