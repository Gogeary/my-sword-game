/* ==========================================
   [Shop_System.js] 
   상점 시스템 (장비 / 소비 / 뽑기 통합)
   - 수정사항: 장비 탭 열 때 5티어 이하만 표시되도록 필터링 적용
   ========================================== */

const ShopSystem = {
    currentTab: 'equip', // 현재 탭 상태 ('equip' 또는 'consume')

    // 1. 상점 열기 & 목록 표시
    open: (tab) => {
        ShopSystem.currentTab = tab;
        const list = document.getElementById('shop-list');
        const title = document.getElementById('shop-title');
        
        // UI 요소가 없으면 중단 (안전장치)
        if (!list || !title) return console.error("상점 UI 요소를 찾을 수 없습니다.");

        list.innerHTML = ''; // 목록 초기화
        
        let items = [];
        
        if (tab === 'equip') {
            title.innerText = "⚔️ 장비 상점";
            
            // [★핵심 수정] 5티어(Tier 5) 이하인 아이템만 필터링하여 보여줌
            // item.tier가 없으면(구버전 데이터) 그냥 보여주거나 1티어로 취급
            items = GameDatabase.EQUIPMENT.filter(item => (item.tier || 1) <= 5);

        } else {
            title.innerText = "🧪 소비 아이템 상점";
            // 물약과 주문서 데이터를 안전하게 합침
            const potions = GameDatabase.CONSUMABLES.potions || [];
            const scrolls = GameDatabase.CONSUMABLES.scrolls || [];
            items = [...potions, ...scrolls];
        }

        // 아이템 카드 생성 및 추가
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'item-card';
            
            // 이미지 경로 처리 & 로딩 실패 시 대체 아이콘
            const imgPath = item.img ? `image/${item.img}` : '';
            const imgTag = item.img ? 
                `<img src="${imgPath}" class="item-icon" onerror="this.replaceWith(document.createElement('div')); this.className='item-icon'; this.innerText='💰';">` 
                : '<div class="item-icon">💰</div>';

            // 아이템 설명 텍스트 (커스텀 info 우선 방식)
            let subText = "";

            if (item.info) {
                // 1순위: Database에 직접 적은 커스텀 설명
                subText = item.info;
            } else if (item.type === 'potion') {
                // 2순위: 포션일 경우 회복량
                subText = `체력 회복: <span style="color:#e74c3c">${item.val.toLocaleString()}</span>`;
            } else if (item.type === 'scroll') {
                // 3순위: 주문서 효과
                subText = `효과: 강화 파괴 방지`;
            } else {
                // 4순위: 아무것도 없을 때 등급 표시 (DB에 tier 속성이 있으면 그것 사용)
                const tierVal = item.tier ? item.tier : Math.floor((item.p || 0) / 1000); 
                subText = `등급: Tier ${tierVal > 0 ? tierVal : 1}`;
            }

            div.innerHTML = `
                ${imgTag}
                <div class="item-info">
                    <strong>${item.name}</strong><br>
                    <span style="color:#aaa; font-size:0.85em;">${subText}</span><br>
                    <span style="color:var(--money); font-weight:bold;">${item.p.toLocaleString()} G</span>
                </div>
                <button class="item-btn" style="background:var(--money); color:#000; width:60px;" onclick="ShopSystem.buy('${item.name}')">구매</button>
            `;
            list.appendChild(div);
        });
        
        // 페이지 전환 (index.html의 함수 호출)
        if (typeof showPage === 'function') {
            showPage('page-shop-detail');
        }
    },

    // 2. 아이템 구매 로직
    buy: (name) => {
        // [검색] 장비, 물약, 주문서 전체 데이터에서 해당 이름의 아이템 찾기
        let item = GameDatabase.EQUIPMENT.find(i => i.name === name);
        if (!item) item = GameDatabase.CONSUMABLES.potions.find(i => i.name === name);
        if (!item) item = GameDatabase.CONSUMABLES.scrolls.find(i => i.name === name);

        if (!item) return alert("아이템 정보를 찾을 수 없습니다.");

        // [비용 체크]
        if (data.gold < item.p) return alert("골드가 부족합니다.");

        // [타입별 구매 처리]
        if (item.type === 'potion') {
            // 물약 소지 개수 제한 체크 (최대 10개)
            const currentPotions = data.inventory.filter(i => i.type === 'potion').length;
            if (currentPotions >= GameDatabase.SYSTEM.MAX_POTION_CAPACITY) {
                return alert(`물약은 최대 ${GameDatabase.SYSTEM.MAX_POTION_CAPACITY}개까지만 소지할 수 있습니다.`);
            }
            
            // 결제 및 인벤토리 추가
            data.gold -= item.p;
            data.inventory.push({
                id: Date.now() + Math.random(), // 고유 ID 부여
                name: item.name,
                type: 'potion',
                val: item.val,
                img: item.img,
                p: item.p,
                en: 0
            });
            alert(`${item.name}을(를) 구매했습니다!`);

        } else if (item.type === 'scroll') {
            // 주문서 구매
            data.gold -= item.p;
            data.inventory.push({ 
                id: Date.now() + Math.random(),
                ...item, 
                en: 0 
            });
            alert(`${item.name}을(를) 구매했습니다!`);
            
        } else {
            // 장비 구매
            data.gold -= item.p;
            data.inventory.push({
                id: Date.now() + Math.random(),
                ...item,
                en: 0
            });
            alert(`${item.name}을(를) 구매했습니다!`);
        }

        // UI 갱신 (골드 변화 등 반영)
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
    },

    // 3. 뽑기 로직 (강화권 상자 전용)
    playGacha: (type, count) => {
        // 장비 뽑기('equip') 요청이 오면 무시 (강화권만 작동)
        if (type !== 'enhance') return;

        // DB 안전성 체크
        if (!GameDatabase.GACHA || !GameDatabase.GACHA.ENHANCE_BOX) {
            return alert("뽑기 데이터(GACHA)를 불러올 수 없습니다. Database.js를 확인하세요.");
        }

        const config = GameDatabase.GACHA.ENHANCE_BOX;
        const cost = config.COST * count;

        if (data.gold < cost) {
            return alert(`골드가 부족합니다. (${cost.toLocaleString()} G 필요)`);
        }
        
        if (data.inventory.length + count > 100) {
             return alert("인벤토리가 가득 찼습니다! 정리가 필요합니다.");
        }

        if(!confirm(`${cost.toLocaleString()} G를 사용하여 ${count}회 뽑으시겠습니까?`)) return;

        data.gold -= cost;
        const logBox = document.getElementById('gacha-log');
        if(logBox) logBox.innerHTML = ''; 

        let results = [];

        for (let i = 0; i < count; i++) {
            const rand = Math.random() * 100;
            let currentProb = 0;
            let pick = null;

            // --- 강화권 상자 로직 ---
            let selectedOption = null;
            for (let rate of config.RATES) {
                currentProb += rate.chance;
                if (rand < currentProb) {
                    selectedOption = rate;
                    break;
                }
            }
            // 확률 오차 시 꽝(하급 방지권) - 맨 마지막 아이템 선택
            if (!selectedOption) selectedOption = config.RATES[config.RATES.length - 1];

            if (selectedOption.type === 'ticket') {
                // 강화권 생성
                const ticketBase = GameDatabase.CONSUMABLES.tickets.find(t => t.val === selectedOption.val);
                if (ticketBase) {
                    pick = { ...ticketBase, id: Date.now() + Math.random() + i, en: 0 };
                    pick.displayColor = selectedOption.color;
                    pick.displayName = selectedOption.name;
                }
            } else {
                // 방지권 생성
                const scrollBase = GameDatabase.CONSUMABLES.scrolls.find(s => s.id === selectedOption.id);
                if (scrollBase) {
                    pick = { ...scrollBase, id: Date.now() + Math.random() + i, en: 0 };
                    pick.displayColor = selectedOption.color;
                    pick.displayName = selectedOption.name;
                }
            }

            if (pick) {
                data.inventory.push(pick);
                results.push(pick);
            } else {
                results.push({ displayName: "오류 발생 (아이템 없음)", displayColor: "#555" });
            }
        }

        // 결과 출력
        if(logBox) {
            results.forEach((res, idx) => {
                const div = document.createElement('div');
                div.style.padding = "5px";
                div.style.borderBottom = "1px solid #333";
                div.innerHTML = `<span style="color:#888;">#${idx+1}</span> <span style="color:${res.displayColor}; font-weight:bold;">${res.displayName}</span> 획득!`;
                logBox.appendChild(div);
            });
            logBox.scrollTop = logBox.scrollHeight;
        }

        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
    }
};

/* ==========================================
   [추가] 강화권 합성 시스템
   ========================================== */
const SynthesisSystem = {
    // 합성 공식 정의
    recipes: [
        { src: 5, dst: 7 },
        { src: 7, dst: 10 },
        { src: 10, dst: 12 },
        { src: 12, dst: 13 },
        { src: 13, dst: 14 },
        { src: 14, dst: 15 }
    ],
    open: () => {
        showPage('page-synthesis');
        SynthesisSystem.render();
    },

    render: () => {
        const list = document.getElementById('synthesis-list');
        if (!list) return;
        list.innerHTML = '';

        // 인벤토리 내 강화권 개수 파악
        const ticketCounts = {};
        data.inventory.forEach(item => {
            if (item.type === 'ticket') {
                ticketCounts[item.val] = (ticketCounts[item.val] || 0) + 1;
            }
        });

        // 레시피별 카드 생성
        SynthesisSystem.recipes.forEach(recipe => {
            const count = ticketCounts[recipe.src] || 0;
            const canCraft = count >= 3;

            const div = document.createElement('div');
            div.className = 'item-card';
            div.style.border = canCraft ? '1px solid #2ecc71' : '1px solid #444';
            
            div.innerHTML = `
                <div style="flex:1; text-align:left; padding-left:10px;">
                    <div style="font-size:1.1em; font-weight:bold; color:#fff;">
                        +${recipe.src} 강화권 <span style="color:#aaa;">x3</span> 
                        <span style="margin:0 5px;">➡</span> 
                        <span style="color:#f1c40f">+${recipe.dst} 강화권</span>
                    </div>
                    <div style="font-size:0.85em; color:${canCraft ? '#2ecc71' : '#e74c3c'}; margin-top:4px;">
                        보유량: ${count} / 3
                    </div>
                </div>
                <button class="item-btn" 
                    style="background:${canCraft ? '#27ae60' : '#555'}; color:#fff; width:70px; padding:10px;" 
                    onclick="SynthesisSystem.craft(${recipe.src}, ${recipe.dst})" 
                    ${canCraft ? '' : 'disabled'}>
                    합성
                </button>
            `;
            list.appendChild(div);
        });
    },

    craft: (srcVal, dstVal) => {
        // 1. 재료 3개 찾기
        const materialIndices = [];
        data.inventory.forEach((item, idx) => {
            if (item.type === 'ticket' && item.val === srcVal) {
                materialIndices.push(idx);
            }
        });

        if (materialIndices.length < 3) return alert("재료가 부족합니다.");

        if (!confirm(`+${srcVal} 강화권 3개를 소모하여 +${dstVal} 강화권을 만드시겠습니까?`)) return;

        // 2. 재료 삭제 (뒤에서부터 삭제해야 인덱스 안 꼬임)
        // 사용할 3개의 인덱스만 추출
        const toRemove = materialIndices.slice(0, 3).sort((a, b) => b - a);
        toRemove.forEach(idx => {
            data.inventory.splice(idx, 1);
        });

        // 3. 결과물 지급
        const targetTicket = GameDatabase.CONSUMABLES.tickets.find(t => t.val === dstVal);
        if (targetTicket) {
            data.inventory.push({ 
                ...targetTicket, 
                id: Date.now() + Math.random(), 
                en: 0 
            });
            alert(`🎉 합성 성공! [+${dstVal} 강화권] 획득!`);
        } else {
            alert("데이터베이스 오류: 목표 강화권을 찾을 수 없습니다.");
        }

        // 4. UI 갱신
        SynthesisSystem.render();
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
    }
};
