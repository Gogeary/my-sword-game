/* ============================================================
   [Enhancement_System.js]
   강화 로직: 강화권/방지권 사용 기능 추가됨
   ============================================================ */

const UpgradeSystem = {
    targetIdx: -1,       // 강화할 장비의 인벤토리 인덱스
    selectedScroll: -1,  // 선택된 방지권 인벤토리 인덱스
    selectedTicket: -1,  // 선택된 강화권 인벤토리 인덱스
    isAuto: false,
    
    // 1. 장비 선택 (인벤토리 모달에서 호출)
    selectUpgrade: (idx) => {
        UpgradeSystem.targetIdx = idx;
        UpgradeSystem.selectedScroll = -1; // 초기화
        UpgradeSystem.selectedTicket = -1; // 초기화
        
        UpgradeSystem.renderUI();
        UpgradeSystem.renderSupportItems(); // 보조 아이템 목록 표시
    },

    // 2. UI 렌더링 (확률 및 정보 표시)
    renderUI: () => {
        const display = document.getElementById('upgrade-target-display');
        const btnExec = document.getElementById('btn-up-exec');
        const btnSell = document.getElementById('btn-up-sell');
        
        if (UpgradeSystem.targetIdx === -1 || !data.inventory[UpgradeSystem.targetIdx]) {
            if(display) display.innerHTML = '<span style="color:#888">강화할 장비를 선택해주세요.</span>';
            if(btnExec) btnExec.disabled = true;
            if(btnSell) btnSell.style.display = 'none';
            document.getElementById('up-chance').innerText = '0';
            document.getElementById('up-break').innerText = '0';
            document.getElementById('support-item-area').innerHTML = ''; // 선택 해제 시 보조템 영역도 클리어
            return;
        }

        const item = data.inventory[UpgradeSystem.targetIdx];
        
        // 강화권 사용 시 UI 처리
        if (UpgradeSystem.selectedTicket !== -1) {
            const ticket = data.inventory[UpgradeSystem.selectedTicket];
            display.innerHTML = `
                <div style="font-size:1.2em; font-weight:bold; color:#f1c40f">${item.name} (+${item.en})</div>
                <div style="margin-top:5px; color:#2ecc71;">
                    ▲ [${ticket.name}] 사용 대기중<br>
                    (즉시 +${ticket.val} 강으로 변경됩니다)
                </div>`;
            
            // 강화권은 100% 성공, 0% 파괴
            document.getElementById('up-chance').innerText = '100';
            document.getElementById('up-break').innerText = '0';
        
        } else {
            // 일반 강화 (또는 방지권 사용)
            const rates = UpgradeSystem.getRates(item.en);
            let destroyRate = rates.destroy;

            // 방지권 사용 시 파괴 확률 0% 표기
            if (UpgradeSystem.selectedScroll !== -1) {
                destroyRate = 0; 
            }

            display.innerHTML = `
                <div style="font-size:1.2em; font-weight:bold; color:${item.en >= 10 ? '#e74c3c' : '#fff'}">${item.name} (+${item.en})</div>
                <div style="color:#aaa; font-size:0.9em;">다음 레벨: +${item.en + 1}</div>
                ${UpgradeSystem.selectedScroll !== -1 ? '<div style="color:#3498db; margin-top:5px;">🛡️ 파괴 방지권 적용됨</div>' : ''}
            `;
            
            document.getElementById('up-chance').innerText = rates.success;
            document.getElementById('up-break').innerText = destroyRate;
        }

        if(btnExec) {
            btnExec.disabled = false;
            btnExec.innerText = (UpgradeSystem.selectedTicket !== -1) ? '강화권 사용' : '강화하기 (비용 0)';
        }
        if(btnSell) btnSell.style.display = 'inline-block';
        
        // 전역 변수 upIdx 동기화 (판매 로직용)
        upIdx = UpgradeSystem.targetIdx; 
    },

    // 3. 보조 아이템(강화권, 방지권) 목록 렌더링
    renderSupportItems: () => {
        const area = document.getElementById('support-item-area');
        if (!area) return;

        const item = data.inventory[UpgradeSystem.targetIdx];
        if (!item) return;

        area.innerHTML = ''; // 초기화

        // --- (1) 강화권 목록 ---
        const tickets = [];
        data.inventory.forEach((it, idx) => {
            if (it.type === 'ticket') tickets.push({ ...it, invIdx: idx });
        });

        if (tickets.length > 0) {
            const tDiv = document.createElement('div');
            tDiv.innerHTML = '<div style="font-size:0.9em; color:#ccc; margin:5px 0;">🎫 강화권 선택</div>';
            const tGrid = document.createElement('div');
            tGrid.style.display = 'flex';
            tGrid.style.gap = '5px';
            tGrid.style.flexWrap = 'wrap';

            tickets.forEach(t => {
                const btn = document.createElement('button');
                const isSelected = (UpgradeSystem.selectedTicket === t.invIdx);
                
                // 현재 강화수치보다 낮은 강화권은 사용 불가
                const isUsable = (t.val > item.en);

                btn.className = 'btn-small';
                btn.style.width = 'auto';
                btn.style.background = isSelected ? '#2ecc71' : (isUsable ? '#333' : '#222');
                btn.style.color = isUsable ? '#fff' : '#555';
                btn.style.border = isSelected ? '1px solid #fff' : '1px solid #444';
                btn.innerText = t.name;
                
                if (isUsable) {
                    btn.onclick = () => {
                        // 토글 기능
                        if (UpgradeSystem.selectedTicket === t.invIdx) UpgradeSystem.selectedTicket = -1;
                        else {
                            UpgradeSystem.selectedTicket = t.invIdx;
                            UpgradeSystem.selectedScroll = -1; // 강화권 선택 시 방지권 해제 (동시 사용 X)
                        }
                        UpgradeSystem.renderUI();
                        UpgradeSystem.renderSupportItems(); // 버튼 상태 갱신
                    };
                } else {
                    btn.disabled = true;
                }
                tGrid.appendChild(btn);
            });
            tDiv.appendChild(tGrid);
            area.appendChild(tDiv);
        }

        // --- (2) 방지권 목록 (강화권 미사용 시에만 표시) ---
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
                sGrid.style.display = 'flex';
                sGrid.style.gap = '5px';
                sGrid.style.flexWrap = 'wrap';

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

    // 4. 강화 확률 계산
    getRates: (en) => {
        let success = 100;
        let destroy = 0;

        if (en < 10) {
            success = Math.max(40, 100 - (en * 5));
        } else if (en === 10) {
            success = 40;
        } else {
            success = 30; // 11강~19강
        }

        if (en >= 11) {
            destroy = 5 + (en - 11) * 5; 
        }

        return { success, destroy };
    },

    // 5. 강화 시도 (메인 로직)
    try: () => {
        if (UpgradeSystem.targetIdx === -1) return;
        const item = data.inventory[UpgradeSystem.targetIdx];
        const log = document.getElementById('log-container');
        
        // --- [A] 강화권 사용 로직 ---
        if (UpgradeSystem.selectedTicket !== -1) {
            const ticket = data.inventory[UpgradeSystem.selectedTicket];
            
            if (confirm(`${ticket.name}을 사용하여 +${ticket.val} 강으로 만드시겠습니까?`)) {
                item.en = ticket.val; // 즉시 레벨 변경
                
                // 강화권 소모 (인덱스 밀림 방지를 위해 객체 비교 후 삭제)
                const realTicketIdx = data.inventory.findIndex(i => i === ticket);
                if (realTicketIdx !== -1) {
                    data.inventory.splice(realTicketIdx, 1);
                    // 타겟 인덱스 보정 (강화권이 타겟보다 앞에 있었다면)
                    if (realTicketIdx < UpgradeSystem.targetIdx) UpgradeSystem.targetIdx--;
                }

                log.innerHTML = `<div style="color:#f1c40f">🎫 [${ticket.name}] 사용 성공! -> +${item.en} 달성!</div>` + log.innerHTML;
                
                UpgradeSystem.selectedTicket = -1; // 선택 초기화
                UpgradeSystem.renderUI();
                UpgradeSystem.renderSupportItems();
                if (window.MainEngine) MainEngine.updateUI();
            }
            return;
        }

        // --- [B] 일반 강화 로직 ---
        const rates = UpgradeSystem.getRates(item.en);
        const rand = Math.random() * 100;

        // 성공
        if (rand < rates.success) {
            item.en++;
            log.innerHTML = `<div style="color:#2ecc71">성공! (+${item.en})</div>` + log.innerHTML;
        } 
        // 실패 (파괴 체크)
        else {
            const destroyRand = Math.random() * 100;
            // 파괴 당첨됨
            if (destroyRand < rates.destroy) {
                
                // 방지권이 선택되어 있는가?
                if (UpgradeSystem.selectedScroll !== -1) {
                    const scroll = data.inventory[UpgradeSystem.selectedScroll];
                    
                    // 방지권 소모
                    const realScrollIdx = data.inventory.findIndex(i => i === scroll);
                    if (realScrollIdx !== -1) {
                        data.inventory.splice(realScrollIdx, 1);
                        // 타겟 인덱스 보정
                        if (realScrollIdx < UpgradeSystem.targetIdx) UpgradeSystem.targetIdx--;
                    }

                    log.innerHTML = `<div style="color:#3498db">🛡️ 강화 실패했으나 [${scroll.name}]으로 파괴를 막았습니다!</div>` + log.innerHTML;
                    
                    UpgradeSystem.selectedScroll = -1; // 소모했으니 선택 해제
                } 
                // 방지권 없음 -> 파괴
                else {
                    log.innerHTML = `<div style="color:#e74c3c">💀 강화 실패... 장비가 파괴되었습니다.</div>` + log.innerHTML;
                    data.inventory.splice(UpgradeSystem.targetIdx, 1); // 장비 삭제
                    
                    // 장착 중이었다면 해제
                    if (data.equipment[item.type] === item) data.equipment[item.type] = null;
                    
                    UpgradeSystem.targetIdx = -1; // 타겟 없음
                }
            } 
            // 파괴 안 됨 (그냥 실패)
            else {
                log.innerHTML = `<div style="color:#e67e22">실패... (등급 유지)</div>` + log.innerHTML;
            }
        }

        // 마무리 갱신
        UpgradeSystem.renderUI();
        UpgradeSystem.renderSupportItems(); // 소모된 아이템 반영
        if (window.MainEngine) MainEngine.updateUI();
    },

    // 6. 자동 강화 (단순 반복, 소모품 미사용 원칙)
    startAuto: () => {
        if (UpgradeSystem.isAuto) {
            UpgradeSystem.stopAuto();
            return;
        }
        if (UpgradeSystem.targetIdx === -1) return alert("대상을 선택하세요.");
