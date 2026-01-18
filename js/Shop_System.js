/* ==========================================
   [Shop_System.js] 통합 상점 시스템
   - 디자인: 네온 글래스모피즘 & 커스텀 모달
   - 기능: 장비/물약 구매, 가챠, 재화 포맷팅
   ========================================== */

// 1. [Helper] 화폐 단위 포맷터 (만, 억)
function formatKoreanCurrency(num) {
    if (!num) return "0";
    const n = Number(num);
    if (isNaN(n)) return "0";

    if (n >= 100000000) {
        const eok = Math.floor(n / 100000000);
        const man = Math.floor((n % 100000000) / 10000);
        return `${eok}억${man > 0 ? ` ${man}만` : ''}`;
    } 
    else if (n >= 10000) {
        const man = Math.floor(n / 10000);
        const remainder = n % 10000;
        return `${man}만${remainder > 0 ? ` ${remainder.toLocaleString()}` : ''}`;
    }
    
    return n.toLocaleString();
}

// 2. [Helper] 아이템 타입별 대체 이모지
function getFallbackEmoji(type) {
    if (!type) return "📦";
    if (type === 'weapon') return "⚔️";
    if (type === 'armor') return "🛡️";
    if (type === 'gloves') return "🧤";
    if (type === 'belt') return "🥋";
    if (type === 'potion') return "🧪";
    if (type === 'scroll') return "📜";
    if (type === 'ticket') return "🎫";
    return "📦";
}

/* ==========================================
   [Modal] 구매 확인 모달 컨트롤러 (modal_shop_buy)
   ========================================== */
const modal_shop_buy = {
    open: (item, priceText, onConfirm) => {
        const overlay = document.getElementById('shop-modal-overlay');
        const nameEl = document.getElementById('modal-item-name');
        const descEl = document.getElementById('modal-item-desc');
        const priceEl = document.getElementById('modal-item-price');
        const btnConfirm = document.getElementById('btn-modal-confirm');
        const btnCancel = document.getElementById('btn-modal-cancel');

        if (!overlay) return;

        // 1. 기본 데이터 채우기
        nameEl.innerText = item.name;
        priceEl.innerText = `${priceText} G`;

        // 2. 설명 텍스트 가공 (DB 변수명 매칭)
        let finalDesc = item.info || item.desc || "설명이 없습니다.";

        // ★ [DB 호환] 타입별 추가 정보 표시
        if (item.type === 'potion' && item.val) {
            // 포션: val = 회복량
            finalDesc += `<br><br><span style="color:#00d2d3; font-weight:bold; font-size:1.1em;">✚ 회복량 : ${item.val.toLocaleString()}</span>`;
        }
        else if (item.type === 'ticket' && item.val) {
            // 강화권: val = 강화 수치
            finalDesc += `<br><br><span style="color:#f1c40f; font-weight:bold;">🎫 강화 수치 : +${item.val}</span>`;
        }
        else if (['weapon', 'armor', 'gloves', 'belt'].includes(item.type)) {
            // 장비: val 없음 -> 티어와 레벨 표시
            const tierInfo = item.tier ? `[${item.tier}티어]` : '';
            const lvInfo = item.lv ? `Lv.${item.lv}` : '';
            finalDesc += `<br><br><span style="color:#a4b0be; font-weight:bold;">🛡️ 스펙 : ${tierInfo} ${lvInfo}</span>`;
            if(item.k) {
                finalDesc += `<br><span style="color:#7f8c8d; font-size:0.9em;">(성장 계수: x${item.k})</span>`;
            }
        }
        else if (item.type === 'scroll') {
             // 주문서: 제한 레벨 표시
             if(item.limitLv) finalDesc += `<br><br><span style="color:#ff7675;">⚠️ 사용 제한 : ${item.limitLv} 레벨 이하</span>`;
        }

        descEl.innerHTML = finalDesc;

        // 3. 버튼 이벤트 연결 (중복 방지)
        const newConfirmBtn = btnConfirm.cloneNode(true);
        btnConfirm.parentNode.replaceChild(newConfirmBtn, btnConfirm);

        const newCancelBtn = btnCancel.cloneNode(true);
        btnCancel.parentNode.replaceChild(newCancelBtn, btnCancel);

        newConfirmBtn.onclick = () => {
            modal_shop_buy.close();
            if (typeof onConfirm === 'function') onConfirm();
        };

        newCancelBtn.onclick = () => {
            modal_shop_buy.close();
        };
        
        overlay.onclick = (e) => {
            if(e.target === overlay) modal_shop_buy.close();
        };

        overlay.style.display = 'flex';
    },

    close: () => {
        const overlay = document.getElementById('shop-modal-overlay');
        if (overlay) overlay.style.display = 'none';
    }
};

/* ==========================================
   [System] 메인 상점 로직 (ShopSystem)
   ========================================== */
const ShopSystem = {
    // 1. 상점 화면 열기
    open: (tab) => {
        const list = document.getElementById('shop-list');
        const titleContainer = document.getElementById('shop-title');

        if (!list || !titleContainer) return;

        // 리스트 초기화 및 스크롤 설정
        list.innerHTML = '';
        list.className = 'shop-grid custom-scroll'; 
        list.scrollTop = 0;
        // CSS에서 .shop-grid가 flex/grid로 제어되므로 스타일 초기화
        list.style.maxHeight = 'calc(100vh - 250px)';
        list.style.overflowY = 'auto';
        list.style.paddingBottom = '20px';

        let titleText = "";
        let subText = "";
        let themeClass = ""; 
        let cardTheme = "";  

        // 탭별 분기 처리
        if (tab === 'equip') {
            titleText = "⚔️ 초보 상점";
            subText = "\"다시 일어날 계기가 될겁니다.\"";
            themeClass = "theme-shop";
            cardTheme = "shop-equip";
            
            // DB 확인 및 1티어 장비만 필터링
            const dbItems = GameDatabase.EQUIPMENT || [];
            const items = dbItems.filter(i => (i.tier || 1) <= 1);
            ShopSystem.renderItems(items, list, cardTheme);
        }
        else if (tab === 'consume') {
            titleText = "🧪 물약 상점";
            subText = "\"오랜 싸움을 원하시나요?\"";
            themeClass = "theme-shop";
            cardTheme = "shop-potion";
            
            const items = (GameDatabase.CONSUMABLES && GameDatabase.CONSUMABLES.potions) ? GameDatabase.CONSUMABLES.potions : [];
            ShopSystem.renderItems(items, list, cardTheme);
        }
        else if (tab === 'gacha') {
            titleText = "🎲 강화 뽑기";
            subText = "\"고강으로 향하는 유일한 길.\"";
            themeClass = "theme-gamble"; 
            ShopSystem.renderGacha(list);
        }
        else if (tab === 'synth') {
            if(typeof SynthesisSystem !== 'undefined') SynthesisSystem.open();
            return;
        }

        // 헤더 렌더링 (제공된 HTML 구조 준수)
        titleContainer.innerHTML = `
            <div class="page-header-box ${themeClass}">
                <h2 class="page-title-text">${titleText}</h2>
                <div class="page-subtitle-text">${subText}</div>
                <div class="page-header-divider"></div>
            </div>
        `;

        if (typeof showPage === 'function') showPage('page-shop-detail');
    },



    // 2. [일반 아이템] 렌더러
    renderItems: (items, listElement, themeClass) => {
        if(!items || items.length === 0) {
            listElement.innerHTML = "<div style='text-align:center; padding:30px; color:#888;'>판매 중인 상품이 없습니다.</div>";
            return;
        }

        items.forEach((item, index) => {
            const div = document.createElement('div');
            // CSS에 정의된 .shop-card와 테마 클래스 적용
            div.className = `shop-card ${themeClass}`;
            
            // 등장 애니메이션
            div.style.animation = `fadeInUpCard 0.4s ease-out forwards ${index * 0.05}s`;
            div.style.opacity = '0';

            const fallback = getFallbackEmoji(item.type);
            // 이미지가 있으면 이미지 태그, 없으면 이모지
            const iconContent = item.img 
                ? `<img src="image/${item.img}" style="width:100%; height:100%; object-fit:contain;" onerror="this.parentElement.innerHTML='${fallback}'">`
                : fallback;

            // 가격 포맷팅 (DB 속성 'p' 또는 'price')
            const priceText = formatKoreanCurrency(item.p || item.price || 0);

            // HTML 구조 생성 (요청하신 .btn-price-buy 구조 적용)
            div.innerHTML = `
                <div style="font-size: 2.2em; margin-right: 20px; display: flex; align-items: center; justify-content: center; width: 50px;">
                    ${iconContent}
                </div>

                <div style="flex: 1; min-width: 0;">
                    <div class="shop-name">${item.name}</div>
                    <div class="shop-desc" style="color: rgba(255,255,255,0.5); font-size: 0.85em;">
                        👆 눌러서 정보보기
                    </div>
                </div>

                <div class="card-right-action">
                    <button class="btn-price-buy">
                        <span class="price-part">${priceText}</span>
                        <span class="divider"></span>
                        <span class="text-part">구매</span>
                    </button>
                </div>
            `;

            // 카드 클릭 이벤트 (버튼 클릭 포함 처리)
            div.onclick = (e) => {
                // 버튼을 직접 클릭했을 때도 이벤트 전파를 막고 구매 로직 실행
                if (e.target.closest('button')) {
                    e.stopPropagation(); 
                }
                
                // 모달 호출: modal_shop_buy.open(아이템객체, 가격텍스트, 확인콜백)
                modal_shop_buy.open(item, priceText, () => {
                    ShopSystem.buy(item.name || item.id);
                });
            };

            listElement.appendChild(div);
        });
    },

    // 3. [가챠] 렌더러
    renderGacha: (listElement) => {
        if(!GameDatabase.GACHA) return;

        let index = 0;
        for (const key in GameDatabase.GACHA) {
            const box = GameDatabase.GACHA[key];
            const div = document.createElement('div');
            
            div.className = `shop-card shop-gacha`;
            div.style.animation = `fadeInUpCard 0.4s ease-out forwards ${index * 0.1}s`;
            div.style.opacity = '0';

            const price1 = formatKoreanCurrency(box.cost);
            const price10 = formatKoreanCurrency(box.cost * 10);

            div.innerHTML = `
                <div style="font-size: 2.5em; margin-right: 20px; filter: drop-shadow(0 0 10px #ffa502);">
                    🎁
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div class="shop-name" style="color:#ffd700;">${box.name}</div>
                    <div class="shop-desc">${box.info}</div>
                </div>
                
                <div class="card-right-action" style="display: flex; flex-direction: column; gap: 5px; min-width: 110px;">
                    <button class="gacha-btn-sm" style="padding: 4px 8px; font-size: 0.8em; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: #fff; border-radius: 4px; cursor: pointer;" 
                        onclick="event.stopPropagation(); ShopSystem.playGacha('${key}', 1)">
                        1회 (${price1})
                    </button>
                    <button class="gacha-btn-sm multi" style="padding: 4px 8px; font-size: 0.8em; border: 1px solid #ffa502; background: rgba(255, 165, 2, 0.2); color: #ffa502; border-radius: 4px; cursor: pointer; font-weight: bold;" 
                        onclick="event.stopPropagation(); ShopSystem.playGacha('${key}', 10)">
                        10회 (${price10})
                    </button>
                </div>
            `;
            
            listElement.appendChild(div);
            index++;
        }
    },

    // 4. [기능] 아이템 구매 로직
    buy: (name) => {
        // 아이템 찾기 (장비 -> 포션 -> 주문서 순서)
        const item = GameDatabase.EQUIPMENT.find(i => i.name === name) ||
                     GameDatabase.CONSUMABLES.potions.find(i => i.name === name) ||
                     GameDatabase.CONSUMABLES.scrolls.find(i => i.name === name);

        if (!item) return;

        // 골드 확인
        if (data.gold < item.p) {
            return MainEngine.showNotification("💰 골드가 부족합니다.", "#e74c3c");
        }

        // 골드 차감
        data.gold -= item.p;

        // 아이템 생성 (장비는 고유 ID 부여)
        const newItem = { ...item, en: 0, count: 1 };
        if (['weapon','armor','belt','gloves','shoes'].includes(item.type)) {
            newItem.uid = Date.now() + Math.random();
        }

        // 인벤토리 추가
        MainEngine.addItem(newItem);
        
        // 알림 및 저장
        MainEngine.showNotification(`🛒 ${item.name} 구매 완료!`, "#3498db");
        MainEngine.isDirty = true;
        MainEngine.updateUI();
    },

    // 5. [기능] 가챠 실행 로직
    playGacha: (boxKey, count) => {
        const box = GameDatabase.GACHA[boxKey];
        if(!box) return;

        const totalCost = box.cost * count;

        if (data.gold < totalCost) {
            return MainEngine.showNotification("💰 골드가 부족합니다.", "#e74c3c");
        }

        data.gold -= totalCost;

        // 확률 계산 및 아이템 지급 루프
        for (let i = 0; i < count; i++) {
            const rand = Math.random() * 100;
            let current = 0;
            let selected = box.rates[box.rates.length - 1]; // 기본값: 꽝(마지막 항목)

            for (let r of box.rates) {
                current += r.chance;
                if (rand < current) { selected = r; break; }
            }

            let pick = null;
            if (selected.type === 'ticket') {
                // 티켓 찾기
                const lv = parseInt(boxKey.replace(/[^0-9]/g, '')); // 상자 키에서 레벨 추출 등 로직
                pick = GameDatabase.CONSUMABLES.tickets.find(t => t.val === selected.val && t.limitLv === lv);
            } else {
                // 주문서 찾기
                pick = GameDatabase.CONSUMABLES.scrolls.find(s => s.id === selected.id);
            }
            
            if (pick) {
                MainEngine.addItem({ ...pick, count: 1 });
            }
        }

        MainEngine.showNotification(`🎲 ${box.name} ${count}회 뽑기 완료!`, "#f1c40f");
        MainEngine.isDirty = true;
        MainEngine.updateUI();
    }
};

/* ==========================================
   [1] 합성 시스템 (SynthesisSystem) - 수정본
   ========================================== */
const SynthesisSystem = {
    tiers: [30, 50, 70, 100],
    recipes: [
        { src: 5, dst: 7 }, { src: 7, dst: 10 }, { src: 10, dst: 12 }, { src: 12, dst: 13 }
    ],
    tierNames: { 30: '🌱 초급 합성', 50: '🔨 숙련 합성', 70: '🔥 장인 합성', 100: '🌌 신화 합성' },

    open: () => {
        // HTML 구조에 맞춰 ID 수정 (synth-list)
        const list = document.getElementById('synth-list');
        if (!list) return;

        // 리스트 초기화
        list.innerHTML = '';
        
        // 데이터 렌더링
        SynthesisSystem.render(list);

        // 페이지 전환 (HTML의 id인 page-synthesis로 이동)
        if (typeof showPage === 'function') {
            showPage('page-synthesis');
        }
    },

    render: (listElement) => {
        const counts = {};
        // 인벤토리 데이터 확인
        if (window.data && data.inventory) {
            data.inventory.forEach(i => {
                if (i.type === 'ticket') {
                    const key = `${i.val}_${i.limitLv}`;
                    counts[key] = (counts[key] || 0) + (i.count || 1);
                }
            });
        }

        SynthesisSystem.tiers.forEach(tier => {
            // 티어 제목 생성
            const h = document.createElement('div');
            h.className = 'shop-section-title';
            h.style.gridColumn = "1 / -1";
            h.style.width = "100%";
            h.style.color = "#fff";
            h.style.margin = "20px 0 10px 0";
            h.style.borderLeft = "4px solid #2ed573";
            h.style.paddingLeft = "10px";
            h.innerHTML = `${SynthesisSystem.tierNames[tier]} <span style="font-size:0.8em; opacity:0.7;">(~${tier}Lv)</span>`;
            listElement.appendChild(h);

            SynthesisSystem.recipes.forEach(r => {
                const key = `${r.src}_${tier}`;
                const myCount = counts[key] || 0;
                const canCraft = myCount >= 3;

                const div = document.createElement('div');
                // HTML 클래스 스타일에 맞춤
                div.className = `shop-card shop-synth`;
                if (!canCraft) div.style.opacity = "0.6";
                
                // 클릭 이벤트
                div.onclick = () => SynthesisSystem.craft(r.src, r.dst, tier);

                div.innerHTML = `
                    <div class="shop-icon" style="font-size: 2em; margin-right: 15px;">📜</div>
                    <div class="shop-info" style="flex: 1;">
                        <div class="shop-name" style="font-weight: bold; font-size: 1.1em;">+${r.src} ➡ +${r.dst}권</div>
                        <div class="shop-desc" style="font-size: 0.9em; margin-top: 5px;">
                            재료: <span style="color:${canCraft ? '#2ecc71' : '#ff4d4d'}; font-weight: bold;">${myCount}/3</span>
                            <br><span style="font-size:0.8em; opacity:0.7;">(클릭하여 합성)</span>
                        </div>
                    </div>
                `;
                listElement.appendChild(div);
            });
        });
    },

    craft: (src, dst, lv) => {
        const inventoryIdx = data.inventory.findIndex(i => i.type === 'ticket' && i.val === src && i.limitLv === lv);
        
        if (inventoryIdx === -1 || data.inventory[inventoryIdx].count < 3) {
            // MainEngine 알림 시스템이 있다면 사용, 없으면 alert
            if (window.MainEngine && MainEngine.showNotification) {
                return MainEngine.showNotification("🚫 재료가 부족합니다! (3장 필요)", "#e74c3c");
            } else {
                return alert("🚫 재료가 부족합니다! (3장 필요)");
            }
        }

        const item = data.inventory[inventoryIdx];
        item.count -= 3;
        if (item.count <= 0) data.inventory.splice(inventoryIdx, 1);

        // GameDatabase에서 결과 아이템 정보 가져오기
        const rewardDb = GameDatabase.CONSUMABLES.tickets.find(t => t.val === dst && t.limitLv === lv);
        
        if (rewardDb) {
            if (window.MainEngine) {
                MainEngine.addItem({ ...rewardDb, count: 1 });
                MainEngine.showNotification(`⚗️ 합성 성공! [+${dst} 강화권] 획득!`, "#2ecc71");
                MainEngine.isDirty = true;
                MainEngine.updateUI();
            }
            // 리스트 새로고침
            SynthesisSystem.open();
        }
    }
};