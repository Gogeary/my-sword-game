/* ==========================================
   [Mining_System.js] - 최종 통합 수정본
   - QUEST BOARD 네온 디자인 시스템 적용
   - common.css 유동 레이아웃 및 최적화 반영
   ========================================== */

const MiningSystem = {
    // 1. 광산 리스트 렌더링 (디자인 통일)
    renderMineList: function() {
        const container = document.getElementById('mine-list-container');
        const db = window.GameDatabase;

        // 데이터 안전하게 가져오기
        const mines = (db && db.MINES) ? db.MINES : [];
        const ores = (db && db.ORES) ? db.ORES : [];

        // 1-1. 열쇠 데이터 정의
        const keyDrops = (db && db.KEY_DROPS) ? db.KEY_DROPS : [
            { lv: 5,  id: 'key_lv5',  n: '먼지 쌓인 열쇠' },
            { lv: 10, id: 'key_lv10', n: '낡은 철제 열쇠' },
            { lv: 15, id: 'key_lv15', n: '이끼 낀 동 열쇠' },
            { lv: 20, id: 'key_lv20', n: '단단한 은빛 열쇠' },
            { lv: 25, id: 'key_lv25', n: '광택 나는 열쇠' },
            { lv: 30, id: 'key_lv30', n: '황금빛 세공 열쇠' },
            { lv: 35, id: 'key_lv35', n: '투명한 크리스탈 키' },
            { lv: 40, id: 'key_lv40', n: '단단한 금강석 열쇠' },
            { lv: 45, id: 'key_lv45', n: '숲의 정수 열쇠' },
            { lv: 50, id: 'key_lv50', n: '칠흑의 어둠 열쇠' },
            { lv: 55, id: 'key_lv55', n: '바다의 부름 열쇠' },
            { lv: 60, id: 'key_lv60', n: '강철의 의지 열쇠' },
            { lv: 65, id: 'key_lv65', n: '불타는 루비 열쇠' },
            { lv: 70, id: 'key_lv70', n: '비취색 미스릴 키' },
            { lv: 75, id: 'key_lv75', n: '고대 장인의 열쇠' },
            { lv: 80, id: 'key_lv80', n: '부서지지 않는 열쇠' },
            { lv: 85, id: 'key_lv85', n: '용의 숨결 열쇠' },
            { lv: 90, id: 'key_lv90', n: '기원의 창조 열쇠' },
            { lv: 95, id: 'key_lv95', n: '영원한 안식의 열쇠' },
            { lv: 99, id: 'key_lv99', n: '오르비스의 진실' }
        ];

        // 1-2. 인벤토리 참조
        let inventory = (window.data && window.data.inventory) ? window.data.inventory : [];

        if (!container) return;
        container.innerHTML = '';

        mines.forEach((mine, idx) => {
            const themeClass = `mine-card-lv${mine.level}`;
            const oreData = ores[idx + 1] || { s: 'stone.png', n: '광물' };
            const imgPath = `image/${oreData.s}`;

            // 1-3. 열쇠 확인 및 HTML 생성
            const requiredKey = keyDrops.find(k => k.lv === mine.level);
            let keyHTML = '';

            if (requiredKey) {
                const foundItem = inventory.find(item => item.id === requiredKey.id);
                const myKeyCount = foundItem ? (foundItem.count || 1) : 0;
                const countClass = myKeyCount > 0 ? 'has-key' : 'no-key';
                keyHTML = `<span class="ob-loot-item ${countClass}">🗝️ ${myKeyCount}개</span>`;
            } else {
                keyHTML = `<span class="ob-loot-item free-pass">✨ FREE</span>`;
            }

            // 1-4. 카드 엘리먼트 생성 (ob-sel-card 규격 통일)
            const div = document.createElement('div');
            div.className = `ob-sel-card mode-mine ${themeClass}`;
            div.onclick = () => { MiningSystem.enter(idx); };

            // MiningSystem.renderMineList 함수 내 div.innerHTML 아이콘 영역 수정
div.innerHTML = `
    <div class="ob-card-accent"></div>
    <div class="ob-card-icon mine-icon-container">
        <img src="${imgPath}" class="mine-icon-img-large">
    </div>
    <div class="ob-card-body">
        <div class="ob-card-title-row">
            <div class="ob-card-title">${mine.name}</div>
            <div class="ob-title-tags">
                <span class="ob-tag-neon green">MINING</span>
                <span class="ob-tag-diff">Lv.${mine.level}</span>
            </div>
        </div>
        <p class="ob-card-desc">심연의 광맥에서 귀중한 자원을 채굴하십시오.</p>
        <div class="ob-card-loot">
            ${keyHTML}
            <span class="ob-loot-item">💎 GEM</span>
            <span class="ob-loot-item">🧪 MAT</span>
        </div>
    </div>
    <div class="ob-card-nav">▶</div>
`;
            container.appendChild(div);
        });
    },

    // 2. 광산 입장 (제한 사항 체크 및 열쇠 소모)
    enter: function(idx) {
        const db = window.GameDatabase;
        const mine = db.MINES[idx];
        if (!mine) return alert("존재하지 않는 광산입니다.");

        // 2-1. 레벨 제한 체크
        const userLv = data.level || 1;
        const reqLv = mine.level || 0;

        if (userLv < reqLv) {
            const msg = `🚫 레벨 ${reqLv} 이상이어야 입장할 수 있습니다! (현재: ${userLv})`;
            if (typeof MainEngine !== 'undefined' && MainEngine.showNotification) {
                MainEngine.showNotification(msg, "#e74c3c");
            } else {
                alert(msg);
            }
            return;
        }

        // 2-2. 열쇠 소지 여부 확인
        const hasKey = data.inventory && data.inventory.some(item => item.id === mine.reqId);

        if (!hasKey) {
            const keyInfo = db.KEY_DROPS.find(k => k.id === mine.reqId);
            const keyName = keyInfo ? keyInfo.n : "전용 열쇠";
            const msg = `🚫 [${keyName}]가 필요합니다!`;

            if (typeof MainEngine !== 'undefined' && MainEngine.showNotification) {
                MainEngine.showNotification(msg, "#e67e22");
            } else {
                alert(msg);
            }
            return;
        }

        // 2-3. 열쇠 차감 및 저장 로직
        const keyIdx = data.inventory.findIndex(item => item.id === mine.reqId);
        if (keyIdx !== -1) {
            const targetItem = data.inventory[keyIdx];
            let currentCount = targetItem.count ? parseInt(targetItem.count, 10) : 1;

            if (currentCount > 1) {
                data.inventory[keyIdx].count = currentCount - 1;
            } else {
                data.inventory.splice(keyIdx, 1);
            }

            if (typeof MainEngine !== 'undefined') {
                MainEngine.isDirty = true;
                if (MainEngine.saveData) MainEngine.saveData();
            }
        }

        // 2-4. 입장 성공 처리
        data.currentMineTier = idx;
        this.generateGrid(mine.rates);


        // [추가] 그리드 컨테이너에 광산별 테마 클래스 주입
         const gridContainer = document.getElementById('mine-grid');
    if (gridContainer) {
        // 기존 테마 클래스 제거 후 새 테마 추가 (예: theme-lv5)
        gridContainer.className = `grid-4 theme-lv${mine.level}`;
    }

    if (typeof MainEngine !== 'undefined' && MainEngine.updateUI) {
        MainEngine.updateUI();
    }
    
    showPage('page-mine-play'); 
        // UI 갱신 및 페이지 이동
        if (typeof MainEngine !== 'undefined' && MainEngine.updateUI) {
            MainEngine.updateUI();
        }
        showPage('page-mine-play');

        // 타이틀 설정
        const title = document.getElementById('mine-title');
        if (title) {
            title.innerText = `⛏️ ${mine.name}`;
            title.style.color = reqLv >= 90 ? '#9b59b6' : (reqLv >= 50 ? '#f1c40f' : '#fff');
        }
    },

    // 3. 광맥 초기화
    refreshOre: function() {
        if (data.currentMineTier !== undefined && data.currentMineTier !== -1) {
            this.enter(data.currentMineTier);
        } else {
            alert("광산 정보가 없습니다. 다시 입장해주세요.");
            showPage('page-mine-select');
        }
    },

    // 4. 채굴 격자 생성 (16칸)
    generateGrid: function(rates) {
        data.mineGrid = [];
        for (let i = 0; i < 16; i++) {
            const r = Math.random();
            let acc = 0, typeIdx = 0;
            for (let j = 0; j < rates.length; j++) {
                acc += rates[j];
                if (r < acc) { typeIdx = j; break; }
            }
            data.mineGrid.push(typeIdx);
        }
        this.render();
    },

    // 5. 격자 렌더링 (유동적 크기 유지)
    render: function() {
        const grid = document.getElementById('mine-grid');
        if (!grid) return;
        grid.innerHTML = '';
        let oresLeft = false;

        data.mineGrid.forEach((oreIdx, i) => {
            const cell = document.createElement('div');
            cell.className = 'mine-cell';
            const ore = window.GameDatabase.ORES[oreIdx];

            if (oreIdx > 0) {
                oresLeft = true;
                const img = document.createElement('img');
                img.src = `image/${ore.s}`;
                img.className = 'mine-item-img';
                cell.appendChild(img);
                cell.onclick = () => this.dig(i, ore);
            } else {
                cell.classList.add('empty');
            }
            grid.appendChild(cell);
        });

        const refreshContainer = document.getElementById('mine-refresh-container');
        if (refreshContainer) refreshContainer.style.display = oresLeft ? 'none' : 'block';
    },

    // 6. 채굴 동작
    dig: function(index, ore) {
        if (!ore || ore.v === 0) return;

        data.gold += ore.v;
        data.mineGrid[index] = 0;
        this.render();

        if (typeof MainEngine !== 'undefined') {
            MainEngine.isDirty = true;
            MainEngine.updateUI();
        }

        if (typeof SideLog !== 'undefined') {
            SideLog.add(`⛏️ ${ore.n} 채굴! (+${this.formatKoreanMoney(ore.v)}G)`);
        }
    },

    // 7. 화폐 단위 변환 헬퍼
    formatKoreanMoney: function(num) {
        if (num < 10000) return num.toLocaleString();
        let n = num;
        if (n >= 100000000) {
            let uk = Math.floor(n / 100000000);
            let man = Math.floor((n % 100000000) / 10000);
            if (man > 0) return `${uk.toLocaleString()}억 ${man.toLocaleString()}만`;
            return `${uk.toLocaleString()}억`;
        }
        return `${Math.floor(n / 10000).toLocaleString()}만`;
    }
};