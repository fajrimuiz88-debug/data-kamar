let confirmCallback = null;
let rowNo = 1;
let historyData = [];
let systemPrices = new Map();

// ===== LOAD RIWAYAT DARI LOCALSTORAGE =====
if(localStorage.getItem("historyData")){
    historyData = JSON.parse(localStorage.getItem("historyData"));
}
window.addEventListener("load", () => {
    const welcome = document.getElementById("welcomeOverlay");

    if (localStorage.getItem("welcomeShown")) {
        // sudah pernah masuk → langsung sembunyikan
        welcome.style.display = "none";
    }
});
function closeWelcome() {
    const overlay = document.getElementById("welcomeOverlay");
    localStorage.setItem("welcomeShown", "yes");

    overlay.classList.add("fade-out");
    overlay.addEventListener("animationend", () => {
        overlay.style.display = "none";
        overlay.classList.remove("fade-out");
    }, { once: true });
}
// ===== POPUP CONFIRM =====
function showConfirm(message, callback, type = "normal") {
    const box = document.querySelector(".confirm-box");

    box.classList.remove("normal", "danger");
    box.classList.add(type);

    document.getElementById("confirmMessage").textContent = message;
    document.querySelector(".btn-cancel").style.display = "inline-block";
    document.querySelector(".btn-ok").textContent = "Ya";
    document.getElementById("confirmOverlay").style.display = "flex";

    confirmCallback = callback;
}
function closeConfirm(result) {
    document.getElementById("confirmOverlay").style.display = "none";
    if (confirmCallback) confirmCallback(result);
}
function showInfo(message) {
    const box = document.querySelector(".confirm-box");

    box.classList.remove("normal", "danger");
    box.classList.add("danger");

    document.getElementById("confirmMessage").textContent = message;
    document.querySelector(".btn-cancel").style.display = "none";
    document.querySelector(".btn-ok").textContent = "OK";
    document.getElementById("confirmOverlay").style.display = "flex";

    confirmCallback = () => {};
}
function saveDraft() {
    const tbody = document.getElementById("tbody");
    const draftRows = [];
    tbody.querySelectorAll("tr").forEach(tr => {
        const row = {
            kode: tr.cells[1].textContent,
            room: tr.cells[2].textContent,
            price: tr.cells[3].textContent,
            deposit: tr.cells[4].querySelector("input.deposit")?.value || "",
            ket: tr.cells[5].textContent,
            pengeluaran: tr.cells[6].querySelector("input.pengeluaran")?.value || ""
        };
        draftRows.push(row);
    });
    localStorage.setItem("draftData", JSON.stringify(draftRows));
}

/* UTILS */
function formatRupiah(num){return num===0?"0":num.toString().replace(/\B(?=(\d{3})+(?!\d))/g,".");}
function parseNum(val){return parseInt(val.replace(/\D/g,""))||0;}
function extractNumber(text){
    if(!text) return 0;
    const nums = text.replace(/\./g,'').match(/\d+/g);
    if(!nums) return 0;
    return parseInt(nums[nums.length - 1]);
}
function formatPengeluaranText(text) {
    if (!text) return "";

    // ambil semua angka
    const nums = text.replace(/\./g, '').match(/\d+/g);
    if (!nums) return text;

    const lastNum = nums[nums.length - 1];
    const formatted = formatRupiah(parseInt(lastNum));

    // ganti angka terakhir dengan versi bertitik
    return text.replace(lastNum, formatted);
}
/* DATE */
function updateDay(){
    const date = new Date(document.getElementById("dateInput").value);
    const days = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    document.getElementById("dayName").textContent = days[date.getDay()];
}

/* PRICE LOGIC */
function getBasePrice(room){
    if(/^A\d+$/i.test(room)){const n=parseInt(room.slice(1));if(n>=1&&n<=11)return 170000;}
    const r=parseInt(room);
    if(r>=100&&r<=120)return 295000;
    if(r>=201&&r<=239)return 230000;
    if(r>=301&&r<=339)return 190000;
    return 0;
}
function getDiscountPrice(room){
    const r=parseInt(room);
    if(r>=100&&r<=120)return 210000;
    if(r>=201&&r<=239)return 170000;
    if(r>=301&&r<=339)return 135000;
    return getBasePrice(room);
}

/* TABLE FUNCTIONS */
function addRow() {
    const tbody = document.getElementById("tbody");
    const lastRow = tbody.lastElementChild;
    let nextCode = "";

    if (lastRow) {
        const lastCode = lastRow.cells[1].textContent.trim();
        if (!isNaN(lastCode) && lastCode !== "") {
            nextCode = parseInt(lastCode) + 1;
        }
    }

    const tr = document.createElement("tr");

    tr.innerHTML = `
        <td class="no">${rowNo}</td>

        <td class="same" contenteditable>
            ${nextCode}
        </td>

        <td class="room" contenteditable oninput="roomChange(this)"></td>

        <td class="same" contenteditable onblur="autoCorrect(this)"></td>

        <td class="same">
            <input
                type="number"
                inputmode="numeric"
                pattern="[0-9]*"
                class="deposit"
                oninput="calcKetInput(this)"
                onblur="this.value = formatRupiah(parseNum(this.value))"
            >
        </td>

        <td class="same"></td>

        <td class="same">
            <input
                type="text"
                class="pengeluaran"
                oninput="calcTotal()"
            >
        </td>
    `;

    tbody.appendChild(tr);
    rowNo++;
}
function loadDraft() {
    const draft = localStorage.getItem("draftData");
    if (!draft) return;
    const rows = JSON.parse(draft);
    const tbody = document.getElementById("tbody");
    tbody.innerHTML = "";
    rows.forEach((r, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="no">${index + 1}</td>
            <td class="same" contenteditable>${r.kode}</td>
            <td class="room" contenteditable oninput="roomChange(this)">${r.room}</td>
            <td class="same" contenteditable onblur="autoCorrect(this)">${r.price}</td>
            <td class="same">
                <input type="number" class="deposit" value="${r.deposit}"
                    oninput="calcKetInput(this)"
                    onblur="this.value=formatRupiah(parseNum(this.value))"
                    inputmode="numeric" pattern="[0-9]*" step="1" min="0">
            </td>
            <td class="same">${r.ket}</td>
            <td class="same">
                <input type="text" class="pengeluaran" value="${r.pengeluaran}" 
    oninput="calcTotal(); saveDraft()">
            </td>
        `;
        tbody.appendChild(tr);
        const priceNum = parseNum(r.price);
        systemPrices.set(tr, priceNum);
    });
    calcTotal();
}

function removeRow(){const tbody=document.getElementById("tbody");if(tbody.rows.length>1){tbody.removeChild(tbody.lastElementChild);rowNo--;calcTotal();}}
function roomChange(cell){const tr=cell.parentElement;let codeText=cell.textContent.trim().toLowerCase();let roomText=tr.cells[2].textContent.trim();let price=getBasePrice(roomText);if(codeText.includes("sales")){const roomNum=parseInt(roomText);if(roomNum>=100&&roomNum<=120)price=210000;else if(roomNum>=201&&roomNum<=239)price=170000;else if(roomNum>=301&&roomNum<=339)price=135000;else if(/^a\d+$/i.test(roomText))price=170000;}systemPrices.set(tr,price);tr.cells[3].textContent=formatRupiah(price);const depositInput=tr.querySelector("input.deposit");if(depositInput)calcKetInput(depositInput);
saveDraft();
}
function ketChange(cell){const tr=cell.parentElement;const ketText=cell.textContent.toLowerCase();const room=tr.cells[2].textContent.trim();let price=getBasePrice(room);if(ketText.includes("sales")&&!/^A/i.test(room))price=getDiscountPrice(room);systemPrices.set(tr,price);tr.cells[3].textContent=formatRupiah(price);const depositInput=tr.querySelector("input.deposit");if(depositInput)calcKetInput(depositInput);}
function autoCorrect(cell){const tr=cell.parentElement;if(systemPrices.has(tr))cell.textContent=formatRupiah(systemPrices.get(tr));}
function calcKetInput(input){
    const tr = input.closest("tr");

    const deposit = parseNum(tr.querySelector(".deposit")?.value || "0");
    const price = systemPrices.get(tr) || 0;

    // ✅ KET HANYA DARI DEPOSIT - PRICE
    const result = deposit - price;

    tr.cells[5].textContent =
        result === 0 ? "0" : formatRupiah(result);

    calcTotal();
    saveDraft();
}
function calcTotal(){
    let totalPrice = 0;
    let totalKet = 0;
    let totalPengeluaran = 0;

    document.querySelectorAll("#tbody tr").forEach(tr => {
        totalPrice += systemPrices.get(tr) || 0;
        totalKet += parseNum(tr.cells[5].textContent);
        totalPengeluaran += extractNumber(
            tr.querySelector(".pengeluaran")?.value || ""
        );
    });

    document.getElementById("totalPrice").textContent =
        formatRupiah(totalPrice);

    document.getElementById("totalKet").textContent =
        totalKet === 0 ? "0" : formatRupiah(totalKet);

    document.getElementById("totalPengeluaran").textContent =
        totalPengeluaran === 0 ? "0" : formatRupiah(totalPengeluaran);

    /* ===== NOTE DETAIL (TAMBAHAN) ===== */
    const noteArea = document.getElementById("noteArea");
    const sisa = totalPrice - totalPengeluaran;

    if (totalPengeluaran > 0) {
        noteArea.style.display = "block";
        noteArea.innerHTML = `
            <strong>CATATAN</strong><br>
            Total Price : ${formatRupiah(totalPrice)}<br>
            Total Pengeluaran : ${formatRupiah(totalPengeluaran)}<br>
            SISA (Price - Pengeluaran) : ${formatRupiah(sisa)}
        `;
    } else {
        noteArea.style.display = "none";
        noteArea.innerHTML = "";
    }
}
function finishData() {
    showConfirm("Semua data sudah terisi?", (ok) => {
        if (!ok) return;

        const tbody = document.getElementById("tbody");

        tbody.querySelectorAll("tr").forEach(tr => {
            const deposit = tr.querySelector(".deposit");
            const pengeluaran = tr.querySelector(".pengeluaran");

            if (deposit) {
                tr.cells[4].textContent =
                    formatRupiah(parseNum(deposit.value));
            }

            if (pengeluaran) {
                tr.cells[6].textContent =
                    formatPengeluaranText(pengeluaran.value);
            }
        });

        const tableClone = document.querySelector("table").cloneNode(true);
        tableClone.querySelectorAll("input").forEach(i => i.remove());

        const now = new Date();
        const day = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"][now.getDay()];
        const date = String(now.getDate()).padStart(2,'0') + '/' +
                     String(now.getMonth()+1).padStart(2,'0') + '/' +
                     now.getFullYear();
        const time = now.toLocaleTimeString().slice(0,5);

        const shift = document.getElementById("shiftSelect").value;

        const newHistory = {
            day,
            date,
            shift,
            time,
            tableHTML: tableClone.outerHTML,
            totalHTML: document.getElementById("totalArea").outerHTML,
            noteHTML: document.getElementById("noteArea").outerHTML
        };

        historyData.push(newHistory);
        localStorage.setItem("historyData", JSON.stringify(historyData));

        document.getElementById("dateInput").value = "";
        document.getElementById("dayName").textContent = "-";
        document.getElementById("shiftSelect").value = "Pagi";

        resetTable();
    });
    localStorage.removeItem("draftData");
}
function resetTable(){
    document.getElementById("tbody").innerHTML = "";
    rowNo = 1;
    systemPrices.clear();

    const noteArea = document.getElementById("noteArea");
    noteArea.style.display = "none";
    noteArea.innerHTML = "";

    addRow();
    calcTotal();
}
/* NAVIGATION */
function showHome(){togglePage("homePage");setActive("btnHome");}
function showHistory(){togglePage("historyPage");setActive("btnHistory");renderHistory();}
function togglePage(id){["homePage","historyPage","historyDetail"].forEach(p=>document.getElementById(p).style.display="none");document.getElementById(id).style.display="block";}
function setActive(btn){document.querySelectorAll(".sidebar button").forEach(b=>b.classList.remove("active"));document.getElementById(btn).classList.add("active");}

/* HISTORY VIEW */
let deleteMode = false; // mode hapus aktif atau tidak
let longPressTimer = null;

// Render riwayat dengan event adaptif
function renderHistory() {
    const list = document.getElementById("historyList");
    list.innerHTML = "";

    // Tombol Hapus Terpilih
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Hapus Terpilih";
    deleteBtn.style.marginBottom = "10px";
    deleteBtn.style.display = deleteMode ? "inline-block" : "none";
    deleteBtn.onclick = deleteSelectedHistory;
    list.appendChild(deleteBtn);

    // Tombol Batal
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Batal";
    cancelBtn.style.marginLeft = "10px";
    cancelBtn.style.display = deleteMode ? "inline-block" : "none";
    cancelBtn.onclick = () => {
        deleteMode = false;
        renderHistory();
    };
    list.appendChild(cancelBtn);

    historyData.forEach((h, i) => {
        const div = document.createElement("div");
        div.className = "history-item";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "space-between";

        const leftDiv = document.createElement("div");
        leftDiv.style.display = "flex";
        leftDiv.style.alignItems = "center";
        leftDiv.style.gap = "5px";

        // Checkbox untuk pilih hapus, hanya tampil saat deleteMode aktif
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.index = i;
        checkbox.style.display = deleteMode ? "inline-block" : "none";

        leftDiv.appendChild(checkbox);
        leftDiv.append(` ${h.shift} | ${h.day} | ${h.date} | ${h.time}`);

        // Tombol Detail
        const detailBtn = document.createElement("button");
        detailBtn.textContent = "Detail";
        detailBtn.style.marginLeft = "10px";
        detailBtn.onclick = () => openHistory(i);

        div.appendChild(leftDiv);
        div.appendChild(detailBtn);
        list.appendChild(div);

        // Event untuk aktifkan mode hapus
        if (/Mobi|Android/i.test(navigator.userAgent)) {
            // Mobile: tekan lama 800ms
            div.addEventListener("touchstart", () => {
                longPressTimer = setTimeout(() => {
                    deleteMode = true;
                    renderHistory();
                }, 800);
            });
            div.addEventListener("touchend", () => clearTimeout(longPressTimer));
        } else {
            // Desktop: klik dua kali
            div.addEventListener("dblclick", () => {
                deleteMode = true;
                renderHistory();
            });
        }
    });
}
function deleteSelectedHistory() {
    const checkboxes = document.querySelectorAll("#historyList input[type='checkbox']");
    const indexesToDelete = [];

    checkboxes.forEach(cb => {
        if (cb.checked) indexesToDelete.push(parseInt(cb.dataset.index));
    });

    if (indexesToDelete.length === 0) {
        showInfo("Pilih riwayat yang ingin dihapus!");
        return;
    }

    showConfirm(`Hapus ${indexesToDelete.length} item riwayat?`, (ok) => {
        if (!ok) return;

        indexesToDelete
            .sort((a, b) => b - a)
            .forEach(i => historyData.splice(i, 1));

        localStorage.setItem("historyData", JSON.stringify(historyData));
        deleteMode = false;
        renderHistory();
    }, "danger");
}
function openHistory(i) {
    const h = historyData[i];
    const detailDiv = document.getElementById("historyDetail");

    detailDiv.innerHTML = `
        <div id="historySnapshot" style="padding:10px;background:#fff;">
            <div style="margin-bottom:10px;font-weight:bold;">
                ${h.shift} | ${h.day} | ${h.date} | ${h.time}
            </div>
            ${h.tableHTML}
            ${h.totalHTML || ""}
            ${h.noteHTML || ""}
        </div>

        <button id="btnPNG">Download PNG</button>
        <button id="btnPDF">Download PDF</button>
        <button id="btnExcel">Download Excel</button>
        <button onclick="showHistory()">Kembali</button>
    `;

    document.getElementById("btnPNG").onclick = () => {
        html2canvas(document.getElementById("historySnapshot"), { scale: 2 })
        .then(c => {
            const a = document.createElement("a");
            a.href = c.toDataURL("image/png");
            a.download = `riwayat-${h.date}-${h.time}.png`;
            a.click();
        });
    };

    document.getElementById("btnPDF").onclick = () => {
        const pdf = new window.jspdf.jsPDF("p", "mm", "a4");
        pdf.setFontSize(14);
        pdf.text(`Riwayat ${h.shift} - ${h.date}`, 14, 15);

        pdf.autoTable({
            html: "#historySnapshot table",
            startY: 25,
            theme: "grid",
            styles: { fontSize: 9 }
        });

        pdf.save(`riwayat-${h.date}-${h.time}.pdf`);
    };

    document.getElementById("btnExcel").onclick = () => {
        const table = document.querySelector("#historySnapshot table");
        const wb = XLSX.utils.table_to_book(table, { sheet: "Riwayat" });
        XLSX.writeFile(wb, `riwayat-${h.date}-${h.time}.xlsx`);
    };

    togglePage("historyDetail");
}
function downloadPDF() {
    window.print();
}
function deleteHistory(i){historyData.splice(i,1);localStorage.setItem("historyData",JSON.stringify(historyData));showHistory();}
addRow();
window.addEventListener("load", () => {
    loadDraft();
    if(document.querySelectorAll("#tbody tr").length === 0){
        addRow();
    }
});



