/* ==========================================
   [Stock_System.js] 모든 에러 수정 완료 버전
   ========================================== */

const StockSystem = {
    isInitialized: false,
    currentPrices: {},
    updateInterval: 60 * 1000,

    init: () => {
        if (typeof MainEngine !== 'undefined' && typeof data !== 'undefined' && data && !data.stocks) {
            data.stocks = {};
            MainEngine.isDirty = true;
        }

        if (!StockSystem.isInitialized) {
            setInterval(() => {
                StockSystem.checkAndFluctuateMarket();
            }, 60000);
        }

        StockSystem.isInitialized = true;
        console.log("📈 코인 시스템 온라인");
    },

    // [중요] 에러가 났던 지점: 이 함수가 반드시 있어야 합니다.
    /* Stock_System.js 수정본 */
    createStockCard: (stockInfo, price, changeRate, container) => {
    if (!data.stocks) data.stocks = {};
    let myStock = data.stocks[stockInfo.id] || { count: 0, avgPrice: 0 };
    if (typeof myStock === 'number') myStock = { count: myStock, avgPrice: 0 };

    const myCount = myStock.count || 0;
    const myAvg = myStock.avgPrice || 0;
    let profitPercent = (myCount > 0 && myAvg > 0) ? ((price - myAvg) / myAvg) * 100 : 0;

    const isUp = changeRate >= 0;
    const rateClass = isUp ? "up-bg" : "down-bg";
    const priceClass = isUp ? "up-color" : "down-color";

    const div = document.createElement("div");
    div.className = "stock-card";
    
    // ★ 기존에 있던 div.onclick 부분 전체 삭제 (카드 클릭 이벤트 제거)

    div.innerHTML = `
    <div class="stock-name-info">
        <span class="stock-main-name">${stockInfo.name}</span>
        <div class="stock-sub-data">
            <span class="stock-cur-price ${priceClass}">${Math.floor(price).toLocaleString()}G</span>
            ${myCount > 0 ? `<span class="stock-owned-count">(${myCount.toLocaleString()}주)</span>` : ''}
        </div>
    </div>
    
    <div class="stock-rate-info">
        <div class="rate-badge ${rateClass}">
            ${isUp ? '▲' : '▼'} ${Math.abs(changeRate).toFixed(2)}%
        </div>
    </div>

    <div class="stock-actions">
        <button class="buy-btn" onclick="event.stopPropagation(); StockSystem.trade('${stockInfo.id}', 'buy')">매수</button>
        <button class="sell-btn" onclick="event.stopPropagation(); StockSystem.trade('${stockInfo.id}', 'sell')">매도</button>
    </div>

    ${myCount > 0 ? `
    <div class="stock-owned-info">
        <span>평단: ${myAvg.toLocaleString()} G</span>
        <span style="color:${profitPercent >= 0 ? '#ff4757' : '#2e7bff'}">수익: ${profitPercent.toFixed(2)}%</span>
    </div>` : ''}
`;
    container.appendChild(div);
},

    refreshMarket: async () => {
    const listContainer = document.getElementById("stock-list-container");
    if (!listContainer) return;

    // 1. [즉시 실행] 서버 데이터를 가져오기 전에 현재 메모리에 있는 값으로 현황판부터 갱신
    // 이렇게 하면 사용자가 페이지를 열자마자 "로딩 중..." 대신 기존 데이터를 바로 봅니다.
    StockSystem.updateMyStatus(); 

    try {
        // 2. 서버에서 최신 가격 정보 가져오기
        const doc = await db.collection("stocks").doc("ALL_PRICES").get();
        const allPrices = doc.exists ? doc.data() : {};

        listContainer.innerHTML = '';

        if (typeof GameDatabase !== 'undefined' && GameDatabase.STOCKS) {
            GameDatabase.STOCKS.forEach(stockInfo => {
                const dbData = allPrices[stockInfo.id];
                // 서버 데이터가 있으면 최신값, 없으면 기존 메모리값, 그것도 없으면 기본값 사용
                const currentPrice = dbData ? dbData.price : (StockSystem.currentPrices[stockInfo.id] || stockInfo.cost);
                const changeRate = dbData ? dbData.changeRate : 0;

                StockSystem.currentPrices[stockInfo.id] = currentPrice;
                StockSystem.createStockCard(stockInfo, currentPrice, changeRate, listContainer);
            });
        }

        // 3. 서버 데이터를 다 그렸으니 최신 가격 기준으로 현황 다시 한번 업데이트
        StockSystem.updateMyStatus();

        // 갱신 시간 표시
        const timeDiv = document.createElement("div");
        timeDiv.style.cssText = "font-size:0.8em; color:#555; margin-top:10px; text-align:center;";
        const updateTime = allPrices.lastGlobalUpdate ? new Date(allPrices.lastGlobalUpdate).toLocaleTimeString() : '최근 기록 없음';
        timeDiv.innerText = `실시간 시세 동기화 완료: ${updateTime}`;
        listContainer.appendChild(timeDiv);

    } catch (e) {
        console.error("주식 데이터 로드 실패", e);
        // 에러가 나더라도 내 현황은 볼 수 있게 유지
        StockSystem.updateMyStatus();
    }
},

   checkAndFluctuateMarket: async () => {
       // 단 하나의 문서 'ALL_PRICES'만 사용합니다.
       const pricesRef = db.collection("stocks").doc("ALL_PRICES");

       try {
           const doc = await pricesRef.get();
           const now = Date.now();
           let allData = doc.exists ? doc.data() : {};

           // 1. 쿨타임 검사 (마지막 업데이트 시간 확인)
           const lastUpdated = allData.lastGlobalUpdate || 0;
           if (now - lastUpdated < StockSystem.updateInterval) return;

           console.log("🎲 코인이 딸그락거립니다.");

           // 2. 모든 종목 계산
           if (typeof GameDatabase !== 'undefined' && GameDatabase.STOCKS) {
               GameDatabase.STOCKS.forEach(stock => {
                   // 기존 가격 가져오기 (없으면 상장가)
                   const prevInfo = allData[stock.id] || { price: stock.cost };
                   const currentPrice = prevInfo.price;

                   // --- 변동 로직 (기존과 동일) ---
                   const trendWeight = 0.48;
                   const isEvent = Math.random() < 0.05;
                   const multiplier = isEvent ? 3 : 1;
                   const randomSeed = Math.random();

                   let changePercent = (randomSeed < trendWeight)
                       ? Math.random() * stock.volatility * multiplier
                       : -(Math.random() * stock.volatility * multiplier);

                   let newPrice = Math.max(1, parseFloat((currentPrice * (1 + changePercent)).toFixed(2)));
                   const changeRate = ((newPrice - currentPrice) / (currentPrice || 1)) * 100;

                   // 객체에 저장
                   allData[stock.id] = {
                       price: newPrice,
                       changeRate: changeRate,
                       lastUpdated: now
                   };
               });

               // 3. 메타데이터도 이 문서에 같이 저장 (쓰기 횟수 추가 절약)
               allData.lastGlobalUpdate = now;

               // ★ 핵심: 단 한 번의 .set()으로 모든 종목 저장 (쓰기 1회!!)
               await pricesRef.set(allData);
               console.log("✅ 코인 가격 변동!");
           }

           // 4. 화면 갱신
           const stockPage = document.getElementById("page-stock");
           if (stockPage && stockPage.classList.contains("active")) {
               StockSystem.refreshMarket();
           }
       } catch (e) {
           console.warn("📉 시세 업데이트 중 오류:", e.message);
       }
   },

    updateMyStatus: () => {
            if (!data) return;
            const userStocks = data.stocks || {};
            let totalStockValue = 0;
            let totalProfit = 0;

            if (typeof GameDatabase !== 'undefined' && GameDatabase.STOCKS) {
                GameDatabase.STOCKS.forEach(stock => {
                    const myStock = userStocks[stock.id] || { count: 0, avgPrice: 0 };
                    const currentPrice = StockSystem.currentPrices[stock.id] || 0;
                    if (myStock.count > 0) {
                        totalStockValue += myStock.count * currentPrice;
                        totalProfit += (currentPrice - (myStock.avgPrice || 0)) * myStock.count;
                    }
                });
            }

            const profitColor = totalProfit > 0 ? '#e74c3c' : (totalProfit < 0 ? '#3498db' : '#fff');
            const el = document.getElementById("my-stock-summary");
            if (el) {
                el.innerHTML = `
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        <div><small style="color:#888;">보유 현금</small><br><b>${data.gold.toLocaleString()} G</b></div>
                        <div><small style="color:#888;">주식 평가액</small><br><b>${totalStockValue.toLocaleString()} G</b></div>
                        <div style="grid-column: span 2; border-top:1px solid #444; padding-top:10px; margin-top:5px;">
                            <small style="color:#888;">총 손익</small>
                            <b style="color:${profitColor}; float:right;">${totalProfit > 0 ? '+' : ''}${totalProfit.toLocaleString()} G</b>
                        </div>
                    </div>
                `;
            }
        },

   trade: (id, type, count = null) => {
        const price = StockSystem.currentPrices[id];
        const currentPrice = Math.floor(price);
        const stockInfo = GameDatabase.STOCKS.find(s => s.id === id);

        if (count === null) {
            if (typeof StockUI !== 'undefined') {
                StockUI.openModal(id, type);
            }
            return; // 함수 내부이므로 정상적인 return
        }

        if (!data.stocks[id] || typeof data.stocks[id] === 'number') {
            data.stocks[id] = { count: 0, avgPrice: 0 };
        }
        const myStock = data.stocks[id];

        if (type === 'buy') {
            const totalPrice = currentPrice * count;
            if (data.gold < totalPrice) return alert("골드가 부족합니다.");

            const totalCost = (myStock.count * myStock.avgPrice) + (count * currentPrice);
            myStock.count += count;
            myStock.avgPrice = Math.floor(totalCost / myStock.count);
            data.gold -= totalPrice;
        } else {
            if (myStock.count < count) return alert("보유 수량이 부족합니다.");
            const profit = (currentPrice - myStock.avgPrice) * count;
            myStock.count -= count;
            data.gold += currentPrice * count;
            if (myStock.count === 0) myStock.avgPrice = 0;
        }

        MainEngine.isDirty = true;
        MainEngine.updateUI(); 
        StockSystem.refreshMarket();
    },
    };

const StockUI = {
    openModal: (id, type) => {
        const stockInfo = GameDatabase.STOCKS.find(s => s.id === id);
        const currentPrice = Math.floor(StockSystem.currentPrices[id]);
        const title = type === 'buy' ? 
            '<span style="color:#38ef7d">STOCK BUY</span>' : 
            '<span style="color:#eb3b5a">STOCK SELL</span>';

        const modalHtml = `
            <div id="stock-modal-overlay" class="modal-overlay">
                <div class="modal-content">
                    <h2>${title}</h2>
                    <div style="font-size:0.9rem; color:#888; margin-bottom:5px;">${stockInfo.name}</div>
                    <div style="font-size:1.1rem; color:#fff;">현재가: ${currentPrice.toLocaleString()} G</div>
                    
                    <input type="number" id="modal-trade-count" min="1" value="1" 
                           oninput="StockUI.updateEstimate(${currentPrice})">
                    
                    <div id="trade-estimate" style="margin-bottom:20px; font-size:0.85rem; color:#aaa;">
                        예상 결제: <span style="color:#00d2ff">${currentPrice.toLocaleString()}</span> G
                    </div>

                    <div class="modal-btns">
                        <button class="confirm-btn" onclick="StockUI.submit('${id}', '${type}')">거래 확정</button>
                        <button class="cancel-btn" onclick="StockUI.close()">거래 취소</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.getElementById('modal-trade-count').focus();
    },

    // 입력 시 예상 금액 실시간 계산
    updateEstimate: (price) => {
        const count = parseInt(document.getElementById('modal-trade-count').value) || 0;
        const total = count * price;
        document.getElementById('trade-estimate').innerHTML = 
            `예상 결제: <span style="color:#00d2ff">${total.toLocaleString()}</span> G`;
    },

    submit: (id, type) => {
        const count = parseInt(document.getElementById('modal-trade-count').value);
        if (count > 0) {
            StockSystem.trade(id, type, count);
            StockUI.close();
        }
    },

    close: () => {
        const modal = document.getElementById('stock-modal-overlay');
        if (modal) modal.remove();
    }
};