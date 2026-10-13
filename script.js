import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA-2N_HZoej2Vv3vQa0P5hu0gvmwVs0R3o",
    authDomain: "gold-land2021.firebaseapp.com",
    projectId: "gold-land2021",
    storageBucket: "gold-land2021.firebasestorage.app",
    messagingSenderId: "580003463235",
    appId: "1:580003463235:web:4ebb43e8f3db552b3294f6"
};

try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    window.saveDataToFirebase = async function(orderData) {
        try { orderData.timestamp = serverTimestamp(); await addDoc(collection(db, "orders"), orderData); return true; } 
        catch (e) { return false; }
    };
    
    window.getCloudOrdersFromFirebase = async function() {
        try { 
            const q = query(collection(db, "orders")); 
            const snap = await getDocs(q); 
            let orders = []; 
            snap.forEach(d => orders.push({ id_doc: d.id, ...d.data() })); 
            return orders; 
        } catch (e) { return []; }
    };
    
    window.deleteOrderFromFirebase = async function(docId) { await deleteDoc(doc(db, "orders", docId)); };
    window.updateOrderInFirebase = async function(docId, newData) { await updateDoc(doc(db, "orders", docId), newData); };
    
    window.loadSystemDataFromFirebase = async function() {
        try {
            let users = [], types = [], pages = [];
            const [uSnap, tSnap, pSnap] = await Promise.all([ 
                getDocs(collection(db, "system_users")), 
                getDocs(collection(db, "order_types")), 
                getDocs(collection(db, "system_pages")) 
            ]);
            uSnap.forEach(d => users.push({ id: d.id, ...d.data() }));
            tSnap.forEach(d => types.push({ id: d.id, ...d.data() }));
            pSnap.forEach(d => pages.push({ id: d.id, ...d.data() }));
            return { users, types, pages };
        } catch (e) { return { users: [], types: [], pages: [] }; }
    };
    
    window.addSystemUserToFirebase = async function(data) { return await addDoc(collection(db, "system_users"), data); };
    window.deleteSystemUserFromFirebase = async function(docId) { await deleteDoc(doc(db, "system_users", docId)); };
    window.updateSystemUserInFirebase = async function(docId, data) { await updateDoc(doc(db, "system_users", docId), data); };
    window.addOrderTypeToFirebase = async function(data) { return await addDoc(collection(db, "order_types"), data); };
    window.deleteOrderTypeFromFirebase = async function(docId) { await deleteDoc(doc(db, "order_types", docId)); };
    window.addSystemPageToFirebase = async function(data) { return await addDoc(collection(db, "system_pages"), data); };
    window.deleteSystemPageFromFirebase = async function(docId) { await deleteDoc(doc(db, "system_pages", docId)); };
} catch(e) {
    console.warn("Firebase Init Error", e);
}

// =========================================
// التخزين وتغيير المظهر (Theme Toggle)
// =========================================

function safeGetStorage(key, def) { try { return localStorage.getItem(key) || def; } catch(e) { return def; } }
function safeSetStorage(key, val) { try { localStorage.setItem(key, val); } catch(e) {} }

let currentTheme = safeGetStorage('gl_theme', 'light');

window.applyTheme = function(theme) {
    const isDark = (theme === 'dark');
    if (isDark) {
        document.body.classList.add('dark-mode');
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => btn.innerHTML = '☀️');
    } else {
        document.body.classList.remove('dark-mode');
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => btn.innerHTML = '🌙');
    }
}

window.toggleTheme = function() {
    currentTheme = (currentTheme === 'light') ? 'dark' : 'light';
    safeSetStorage('gl_theme', currentTheme); 
    window.applyTheme(currentTheme);
}
window.applyTheme(currentTheme);

window.showSuccessToast = function(message) {
    let toast = document.getElementById('success-toast-alert');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'success-toast-alert';
        toast.className = 'success-toast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `✨ ${message}`;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
};

const ADMIN_USER = "Zain"; 
const ADMIN_PASS = "327798";
let additionalUsers = [], configuredOrderTypes = [], configuredPages = [];
let loggedInUser = "", loggedInUserCanDelete = false, loggedInUserCanEdit = false, loggedInUserCanSettings = false, loggedInUserCanReports = false; 

let feeBaghdad = parseInt(safeGetStorage('feeBaghdad', '5000')) || 5000;
let feeOther = parseInt(safeGetStorage('feeOther', '8000')) || 8000;

window.saveDeliveryFees = function() {
    feeBaghdad = parseInt(document.getElementById('feeBaghdadInput').value) || 0;
    feeOther = parseInt(document.getElementById('feeOtherInput').value) || 0;
    safeSetStorage('feeBaghdad', feeBaghdad); safeSetStorage('feeOther', feeOther);
    alert("تم حفظ أجور التوصيل بنجاح!");
}

let allCloudOrders = [], filteredCloudOrders = []; 
let currentConfirmAction = null;
let currentEditDocId = null;

// =========================================
// نظام تثبيت التطبيق (PWA) 
// =========================================
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });

window.showInstallInstructions = async function(os) {
    if (deferredPrompt && os !== 'ios') {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') console.log('User accepted the install prompt');
        deferredPrompt = null;
    } else {
        if(os === 'ios') {
            alert("🍏 لتثبيت التطبيق على الآيفون:\n\n1. اضغط على زر 'المشاركة' أسفل المتصفح.\n2. اختر 'إضافة إلى الصفحة الرئيسية'.");
        } else {
            alert("📱 التطبيق مثبت بالفعل، أو قم بإضافته من خيارات المتصفح.");
        }
    }
}

// =========================================
// الحوارات والتحكم
// =========================================
window.showConfirmDialog = function(msg, callback) { 
    document.getElementById('confirmMessage').innerText = msg; 
    currentConfirmAction = callback; 
    document.getElementById('confirmModal').style.display = 'flex'; 
    document.getElementById('confirmYesBtn').onclick = function() { 
        if(currentConfirmAction) currentConfirmAction(); 
        window.closeConfirmModal(); 
    }; 
}
window.closeConfirmModal = function() { document.getElementById('confirmModal').style.display = 'none'; currentConfirmAction = null; }
window.handleEnter = function(event) { if (event.key === "Enter") window.login(); }

window.formatAmount = function(input) {
    let val = input.value.trim(); if (!val) return;
    let numericVal = parseFloat(val.replace(/[^0-9.-]+/g, ""));
    if (!isNaN(numericVal) && numericVal > 0 && numericVal < 1000) input.value = (numericVal * 1000).toString();
}

window.toggleOrderInput = function(btn) {
    let container = btn.parentElement;
    let select = container.querySelector('.orderTypeSelect');
    let customInput = container.querySelector('.orderTypeCustomInput');
    if(select.style.display !== 'none') { 
        select.style.display = 'none'; customInput.style.display = 'block'; customInput.focus(); btn.innerHTML = '📋'; 
    } else { 
        customInput.style.display = 'none'; customInput.value = ''; select.style.display = 'block'; btn.innerHTML = '✍️'; 
    }
}

window.login = async function() {
    try {
        const user = document.getElementById("username").value.trim();
        const pass = document.getElementById("password").value.trim();
        const errorMsg = document.getElementById("login-error");
        const btn = document.getElementById("loginBtn");
        
        if(user === "" || pass === "") return;

        let isManager = (user === ADMIN_USER && pass === ADMIN_PASS);
        btn.innerText = "جاري التحقق... ⏳"; btn.disabled = true;

        if (isManager) {
            loggedInUser = user; loggedInUserCanDelete = true; loggedInUserCanEdit = true; loggedInUserCanSettings = true; loggedInUserCanReports = true;
            window.showDashboard(); errorMsg.style.display = "none";
            
            if(window.loadSystemDataFromFirebase) {
                window.loadSystemDataFromFirebase().then(cloudData => {
                    additionalUsers = cloudData.users; configuredOrderTypes = cloudData.types; configuredPages = cloudData.pages;
                    document.getElementById('feeBaghdadInput').value = feeBaghdad; document.getElementById('feeOtherInput').value = feeOther;
                    window.updateOrderTypeSelects(); window.updatePagesDropdown();
                }).catch(e => console.log(e));
            }
            btn.innerText = "تسجيل الدخول"; btn.disabled = false; return;
        }

        if(window.loadSystemDataFromFirebase) {
            const cloudData = await window.loadSystemDataFromFirebase();
            additionalUsers = cloudData.users; configuredOrderTypes = cloudData.types; configuredPages = cloudData.pages;
            document.getElementById('feeBaghdadInput').value = feeBaghdad; document.getElementById('feeOtherInput').value = feeOther;
            window.updateOrderTypeSelects(); window.updatePagesDropdown();
        }

        btn.innerText = "تسجيل الدخول"; btn.disabled = false;

        const isNormalUser = additionalUsers.find(u => u.username === user && u.password === pass);
        if (isNormalUser) { 
            loggedInUser = user; loggedInUserCanDelete = isNormalUser.canDeleteCloud || false; loggedInUserCanEdit = isNormalUser.canEditCloud || false;
            loggedInUserCanSettings = isNormalUser.canAccessSettings || false; loggedInUserCanReports = isNormalUser.canAccessReports || false; 
            window.showDashboard(); errorMsg.style.display = "none"; 
        } else { errorMsg.style.display = "block"; }
    } catch (err) {
        alert("تعذر الاتصال بقاعدة البيانات. تحقق من الإنترنت.");
        document.getElementById("loginBtn").innerText = "تسجيل الدخول"; document.getElementById("loginBtn").disabled = false;
    }
}

// التوجيه إلى القائمة الرئيسية بعد تسجيل الدخول
window.showDashboard = function() { 
    document.getElementById("login-section").style.display = "none"; 
    document.getElementById("dashboard-section").style.display = "none"; 
    document.getElementById("main-menu-section").style.display = "flex"; 
}

// وظائف القائمة الرئيسية
window.openDistribution = function() {
    document.getElementById("main-menu-section").style.display = "none"; 
    document.getElementById("dashboard-section").style.display = "block"; 
}

window.backToMainMenu = function() {
    document.getElementById("dashboard-section").style.display = "none"; 
    document.getElementById("main-menu-section").style.display = "flex"; 
}

window.comingSoon = function(feature) {
    alert("ميزة " + feature + " سيتم إضافتها لاحقاً ⏳");
}

window.logout = function() { 
    window.showConfirmDialog("تسجيل الخروج سيقوم بمسح الجدول الحالي، هل أنت متأكد؟", function() { 
        loggedInUser = ""; 
        document.getElementById("dashboard-section").style.display = "none"; 
        document.getElementById("main-menu-section").style.display = "none"; 
        document.getElementById("login-section").style.display = "flex"; 
        window.clearForm(); 
        document.getElementById('tableBody').innerHTML = ""; 
    }); 
}

// =========================================
// التقارير السحابية
// =========================================
window.openReports = async function() {
    if (!loggedInUserCanReports) { alert("❌ ليس لديك صلاحية للوصول إلى التقارير."); return; }
    document.getElementById('reportsModal').style.display = 'flex';
    if (allCloudOrders.length === 0 && window.getCloudOrdersFromFirebase) {
        document.getElementById('repPageTbody').innerHTML = '<tr><td colspan="3" style="text-align:center;">جاري جلب البيانات... ⏳</td></tr>';
        allCloudOrders = await window.getCloudOrdersFromFirebase();
    }
    const pagesSet = new Set(), typesSet = new Set();
    allCloudOrders.forEach(o => {
        if(o.constant) pagesSet.add(o.constant);
        if(o.type) {
            o.type.split('+').forEach(item => { let match = item.match(/\[(.*?)\s\(/); if(match) typesSet.add(match[1].trim()); });
        }
    });
    
    document.getElementById('repPageFilter').innerHTML = '<option value="all">-- كل البيجات --</option>' + Array.from(pagesSet).map(p => `<option value="${p}">${p}</option>`).join('');
    document.getElementById('repTypeFilter').innerHTML = '<option value="all">-- كل الطلبات --</option>' + Array.from(typesSet).map(t => `<option value="${t}">${t}</option>`).join('');
    window.generateReports();
}
window.closeReports = function() { document.getElementById('reportsModal').style.display = 'none'; }
window.switchReportTab = function(tabId, btn) { 
    document.querySelectorAll('#reportsModal .tab-btn').forEach(b => b.classList.remove('active')); 
    document.querySelectorAll('#reportsModal .tab-pane').forEach(p => p.classList.remove('active')); 
    btn.classList.add('active'); document.getElementById(tabId).classList.add('active'); 
}

window.generateReports = function() {
    if(allCloudOrders.length === 0) return;
    const fromVal = document.getElementById('repDateFrom').value, toVal = document.getElementById('repDateTo').value;
    let fromDate = fromVal ? new Date(fromVal) : null; if(fromDate) fromDate.setHours(0,0,0,0);
    let toDate = toVal ? new Date(toVal) : null; if(toDate) toDate.setHours(23,59,59,999);
    const selPage = document.getElementById('repPageFilter').value, selType = document.getElementById('repTypeFilter').value;

    let targetOrders = allCloudOrders.filter(o => {
        if(fromDate || toDate) {
            if(!o.timestamp?.seconds) return false;
            const orderDate = new Date(o.timestamp.seconds * 1000);
            if(fromDate && orderDate < fromDate) return false;
            if(toDate && orderDate > toDate) return false;
        } return true;
    });

    let pageTargetOrders = targetOrders;
    if(selPage !== "all") pageTargetOrders = targetOrders.filter(o => o.constant === selPage);

    let totalPageQty = 0, totalPageAmt = 0, pageTbodyHtml = "";
    if (pageTargetOrders.length === 0) {
        pageTbodyHtml = '<tr><td colspan="3" style="text-align:center;">لا توجد بيانات</td></tr>';
    } else {
        pageTargetOrders.forEach(o => {
            let amt = parseFloat((o.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0, qty = parseInt(o.qty) || 1;
            totalPageQty += qty; totalPageAmt += amt;
            let safeType = (o.type || "غير محدد").split(' + ').map(item => `<span dir="ltr" style="display: inline-block; padding: 0 5px;">${item}</span>`).join(' <span style="font-weight:bold;">+</span> ');
            pageTbodyHtml += `<tr><td style="color:var(--primary-blue); font-size: 13px; text-align: center;">${safeType}</td><td>${qty}</td><td>${amt.toLocaleString()}</td></tr>`;
        });
    }
    
    document.getElementById('repPageTbody').innerHTML = pageTbodyHtml;
    document.getElementById('totalPageQty').innerText = totalPageQty;
    document.getElementById('totalPageAmount').innerText = totalPageAmt.toLocaleString();

    let typeStats = {};
    targetOrders.forEach(o => {
        if(o.type) { o.type.split('+').forEach(item => { let match = item.match(/\[(.*?)\s\((\d+)\)/); if(match) { let code = match[1].trim(), qty = parseInt(match[2]) || 1; typeStats[code] = (typeStats[code] || 0) + qty; } }); }
    });

    let typeCardsHtml = "", filteredTypes = Object.entries(typeStats);
    if(selType !== "all") filteredTypes = filteredTypes.filter(([tCode]) => tCode === selType);

    if(filteredTypes.length === 0) { typeCardsHtml = '<div style="width:100%; text-align:center; color:#ccc; padding:20px;">لا توجد بيانات</div>';
    } else {
        filteredTypes.forEach(([tCode, tQty]) => {
            typeCardsHtml += `<div class="report-card"><h4>${tCode}</h4><div class="val">${tQty}</div></div>`;
        });
    }
    document.getElementById('repTypeCardsContainer').innerHTML = typeCardsHtml;

    let finCount = targetOrders.length, finQty = 0, finGross = 0, finDelivery = 0;
    targetOrders.forEach(o => {
        let amt = parseFloat((o.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0;
        finQty += parseInt(o.qty) || 1; finGross += amt;
        finDelivery += (o.gov || "").includes("بغداد") ? feeBaghdad : feeOther;
    });
    document.getElementById('finCount').innerText = finCount; document.getElementById('finQty').innerText = finQty;
    document.getElementById('finGross').innerText = finGross.toLocaleString(); document.getElementById('finDelivery').innerText = finDelivery.toLocaleString();
    document.getElementById('finNet').innerText = (finGross - finDelivery).toLocaleString();
}

window.exportPageReportPDF = function() {
    const pageName = document.getElementById('repPageFilter').value;
    const tempDiv = document.createElement('div');
    tempDiv.style.padding = '30px'; tempDiv.style.background = '#ffffff'; tempDiv.style.color = '#000000'; tempDiv.style.direction = 'rtl'; tempDiv.style.fontFamily = 'Arial, sans-serif';
    
    const title = document.createElement('h2'); title.innerText = 'تقرير المبيعات - ' + (pageName === 'all' ? 'جميع البيجات' : pageName); title.style.textAlign = 'center'; title.style.marginBottom = '25px';
    tempDiv.appendChild(title);
    
    const tableClone = document.getElementById('pageReportTable').cloneNode(true);
    tableClone.style.width = '100%'; tableClone.style.borderCollapse = 'collapse';
    tableClone.querySelectorAll('th, td').forEach(cell => { cell.style.border = '1px solid #ccc'; cell.style.padding = '12px'; cell.style.textAlign = 'center'; cell.style.color = '#000'; cell.style.background = '#fff';});
    
    tempDiv.appendChild(tableClone); document.body.appendChild(tempDiv); 
    const opt = { margin: 10, filename: `تقرير_${pageName === 'all' ? 'عام' : pageName}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from(tempDiv).save().then(() => { document.body.removeChild(tempDiv); });
}

// =========================================
// الأرشيف السحابي وتعديل الطلبات
// =========================================
window.openCloudOrders = async function() {
    document.getElementById('cloudOrdersModal').style.display = 'flex';
    if(window.getCloudOrdersFromFirebase) {
        allCloudOrders = await window.getCloudOrdersFromFirebase();
        allCloudOrders.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        filteredCloudOrders = [...allCloudOrders]; window.filterCloudOrders();
    }
}
window.closeCloudOrders = function() { document.getElementById('cloudOrdersModal').style.display = 'none'; }

window.filterCloudOrders = function() {
    const qt = document.getElementById('cloudSearchInput').value.toLowerCase(), pF = document.getElementById('cloudPageFilter').value, tb = document.getElementById('cloudOrdersTbody'); 
    tb.innerHTML = '';
    
    filteredCloudOrders = allCloudOrders.filter(o => ((o.name||"").toLowerCase().includes(qt) || (o.phone1||"").includes(qt)) && (pF === "" || (o.constant||"") === pF));
    
    filteredCloudOrders.forEach(o => {
        const tr = document.createElement('tr');
        let actionsHtml = '';
        if (loggedInUserCanEdit) actionsHtml += `<button style="padding: 5px 10px; margin-left: 5px; background: #3498db; border-radius:6px; box-shadow:none; color:white; border:none;" onclick="openEditModal('${o.id_doc}')">✏️</button>`;
        if (loggedInUserCanDelete) actionsHtml += `<button style="padding: 5px 10px; border-radius:6px; background: #e74c3c; box-shadow:none; color:white; border:none;" onclick="deleteCloudOrder('${o.id_doc}')">🗑️</button>`;
        if (!actionsHtml) actionsHtml = '-';

        tr.innerHTML = `<td>${o.id||'-'}</td> <td style="color:var(--primary-blue); font-weight:bold;">${o.constant||'-'}</td> <td>${o.name||'-'}</td>
            <td dir="ltr" style="font-size:12px;">${o.phone1}<br>${o.phone2||''}</td> <td style="font-size:12px;">${o.gov||'-'}</td>
            <td style="color:var(--primary-blue); font-size:12px;">${o.type||'-'}</td> <td>${o.amount||'-'}</td> <td style="font-size:12px;">${o.addedBy||''}</td>
            <td>${actionsHtml}</td>`;
        tb.appendChild(tr);
    });
}

window.deleteCloudOrder = function(docId) {
    window.showConfirmDialog("تأكيد الحذف النهائي؟", async function() {
        if(window.deleteOrderFromFirebase) { 
            await window.deleteOrderFromFirebase(docId); allCloudOrders = allCloudOrders.filter(o => o.id_doc !== docId); 
            window.filterCloudOrders(); window.showSuccessToast("تم حذف الطلب بنجاح!");
        }
    });
}

window.openEditModal = function(docId) {
    let order = allCloudOrders.find(o => o.id_doc === docId); if(!order) return;
    currentEditDocId = docId;
    document.getElementById('editConstant').value = order.constant || ''; document.getElementById('editName').value = order.name || '';
    document.getElementById('editPhone1').value = order.phone1 || ''; document.getElementById('editPhone2').value = order.phone2 || '';
    document.getElementById('editGov').value = order.gov || ''; document.getElementById('editArea').value = order.area || '';
    document.getElementById('editType').value = order.type || ''; document.getElementById('editQty').value = order.qty || 1;
    document.getElementById('editAmount').value = order.amount || '';
    document.getElementById('editOrderModal').style.display = 'flex';
}
window.closeEditModal = function() { document.getElementById('editOrderModal').style.display = 'none'; currentEditDocId = null; }

window.saveEditedOrder = async function() {
    if(!currentEditDocId) return;
    const newData = { constant: document.getElementById('editConstant').value, name: document.getElementById('editName').value, phone1: document.getElementById('editPhone1').value, phone2: document.getElementById('editPhone2').value, gov: document.getElementById('editGov').value, area: document.getElementById('editArea').value, type: document.getElementById('editType').value, qty: parseInt(document.getElementById('editQty').value) || 1, amount: document.getElementById('editAmount').value };
    if(window.updateOrderInFirebase) {
        try {
            await window.updateOrderInFirebase(currentEditDocId, newData);
            let idx = allCloudOrders.findIndex(o => o.id_doc === currentEditDocId); if(idx > -1) { allCloudOrders[idx] = { ...allCloudOrders[idx], ...newData }; }
            window.filterCloudOrders(); window.closeEditModal(); window.showSuccessToast("تم تعديل البيانات بنجاح! ✏️");
        } catch(e) { alert("حدث خطأ أثناء التعديل. تأكد من الاتصال بالإنترنت."); }
    }
}

window.exportCloudToExcel = function() {
    if(filteredCloudOrders.length === 0) return;
    let exportData = filteredCloudOrders.map((o, i) => {
        const amt = parseFloat((o.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0, del = (o.gov || "").includes("بغداد") ? feeBaghdad : feeOther;
        return { "ت": i+1, "البيج": o.constant||"", "اسم الزبون": o.name||"", "رقم الهاتف": o.phone1, "العنوان": o.gov||"", "العدد": parseInt(o.qty)||1, "المبلغ الكلي": amt, "مبلغ التوصيل": del, "الصافي": amt-del };
    });
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportData), "السحابة"); XLSX.writeFile(wb, "أرشيف_السحابة.xlsx");
}

// =========================================
// الإعدادات وإدارة المستخدمين
// =========================================
window.openSettings = function() {
    document.getElementById('settingsModal').style.display = 'flex'; 
    if (loggedInUserCanSettings) { document.getElementById('settingsAuthSection').style.display = 'none'; document.getElementById('settingsManagerSection').style.display = 'block'; window.renderPagesSettings(); window.renderOrderTypesSettings(); window.renderUsers(); } 
    else { document.getElementById('settingsAuthSection').style.display = 'block'; document.getElementById('settingsManagerSection').style.display = 'none'; }
}
window.closeSettings = function() { document.getElementById('settingsModal').style.display = 'none'; }
window.verifySettingsPass = function() { 
    if (document.getElementById('settingsPass').value === ADMIN_PASS) { document.getElementById('settingsAuthSection').style.display = 'none'; document.getElementById('settingsManagerSection').style.display = 'block'; window.renderPagesSettings(); window.renderOrderTypesSettings(); window.renderUsers(); } 
    else { document.getElementById('settings-error').style.display = 'block'; } 
}
window.switchTab = function(tabId, btn) { document.querySelectorAll('#settingsModal .tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('#settingsModal .tab-pane').forEach(p => p.classList.remove('active')); btn.classList.add('active'); document.getElementById(tabId).classList.add('active'); }

window.addPageType = async function() { const val = document.getElementById('newPageName').value.trim(); if(val && window.addSystemPageToFirebase) { const r = await window.addSystemPageToFirebase({name: val}); configuredPages.push({id: r.id, name: val}); window.renderPagesSettings(); window.updatePagesDropdown(); } }
window.deletePageType = async function(idx) { window.showConfirmDialog("حذف البيج؟", async function() { await window.deleteSystemPageFromFirebase(configuredPages[idx].id); configuredPages.splice(idx, 1); window.renderPagesSettings(); window.updatePagesDropdown(); }); }

window.renderPagesSettings = function() { 
    document.getElementById("pagesListDisplay").innerHTML = configuredPages.map((p, i) => `
        <li class="settings-list-item">
            <span class="item-text">${p.name}</span>
            <button class="btn-danger" onclick="deletePageType(${i})">حذف</button>
        </li>
    `).join(''); 
}

window.updatePagesDropdown = function() { const s1 = document.getElementById('constantField'), s2 = document.getElementById('cloudPageFilter'); s1.innerHTML = '<option value="">-- اختر البيج --</option>' + configuredPages.map(p => `<option value="${p.name}">${p.name}</option>`).join(''); s2.innerHTML = '<option value="">-- كل البيجات --</option>' + configuredPages.map(p => `<option value="${p.name}">${p.name}</option>`).join(''); }

window.addOrderType = async function() { const n = document.getElementById('newOrderName').value.trim(), c = document.getElementById('newOrderCode').value.trim(); if(n && c && window.addOrderTypeToFirebase) { const r = await window.addOrderTypeToFirebase({name: n, code: c}); configuredOrderTypes.push({id: r.id, name: n, code: c}); window.renderOrderTypesSettings(); window.updateOrderTypeSelects(); } }
window.deleteOrderType = async function(idx) { window.showConfirmDialog("حذف نوع الطلب؟", async function() { await window.deleteOrderTypeFromFirebase(configuredOrderTypes[idx].id); configuredOrderTypes.splice(idx, 1); window.renderOrderTypesSettings(); window.updateOrderTypeSelects(); }); }

window.renderOrderTypesSettings = function() { 
    document.getElementById("orderTypesListDisplay").innerHTML = configuredOrderTypes.map((t, i) => `
        <li class="settings-list-item">
            <span class="item-text">${t.name} <span style="color:var(--primary-blue); font-size: 13px;">(${t.code})</span></span>
            <button class="btn-danger" onclick="deleteOrderType(${i})">حذف</button>
        </li>
    `).join(''); 
}

window.updateOrderTypeSelects = function() { document.querySelectorAll('.orderTypeSelect').forEach(s => { const v = s.value; s.innerHTML = '<option value="">-- اختر الطلب --</option>' + configuredOrderTypes.map(t => `<option value="${t.name}">${t.name}</option>`).join(''); s.value = v; }); }

window.addUser = async function() {
    const u = document.getElementById("new-user-name").value.trim(), p = document.getElementById("new-user-pass").value.trim();
    if(u === "" || p === "" || u === ADMIN_USER) return;
    const data = { username: u, password: p, canDeleteCloud: document.getElementById("new-user-can-delete").checked, canEditCloud: document.getElementById("new-user-can-edit").checked, canAccessSettings: document.getElementById("new-user-can-settings").checked, canAccessReports: document.getElementById("new-user-can-reports").checked };
    const r = await window.addSystemUserToFirebase(data); additionalUsers.push({id: r.id, ...data}); window.renderUsers();
}
window.deleteUser = function(idx) { window.showConfirmDialog("حذف المستخدم؟", async function() { await window.deleteSystemUserFromFirebase(additionalUsers[idx].id); additionalUsers.splice(idx, 1); window.renderUsers(); }); }

window.togglePermission = async function(idx, field) { 
    const u = additionalUsers[idx]; 
    u[field] = !u[field]; 
    await window.updateSystemUserInFirebase(u.id, {[field]: u[field]}); 
    window.renderUsers(); 
}

window.renderUsers = function() {
    document.getElementById("users-list").innerHTML = additionalUsers.map((u, i) => `
        <li class="settings-list-item user-list-item">
            <div class="user-header-row">
                <span class="item-text" style="color:var(--primary-blue);">${u.username} <span style="font-size:12px; color:var(--text-muted);">(${u.password})</span></span>
                <button class="btn-danger" onclick="deleteUser(${i})">حذف</button>
            </div>
            <div class="user-permissions-row">
                <span class="status-badge ${u.canDeleteCloud ? 'active' : 'inactive'}" onclick="togglePermission(${i}, 'canDeleteCloud')">مسح</span>
                <span class="status-badge ${u.canEditCloud ? 'active' : 'inactive'}" onclick="togglePermission(${i}, 'canEditCloud')">تعديل</span>
                <span class="status-badge ${u.canAccessSettings ? 'active' : 'inactive'}" onclick="togglePermission(${i}, 'canAccessSettings')">إعدادات</span>
                <span class="status-badge ${u.canAccessReports ? 'active' : 'inactive'}" onclick="togglePermission(${i}, 'canAccessReports')">تقارير</span>
            </div>
        </li>
    `).join('');
}

// =========================================
// معالجة وإضافة الطلبات من لوحة التحكم
// =========================================
window.addOrderItemRow = function() {
    const wr = document.getElementById('dynamicRowsWrapper'), r = document.createElement('div'); r.className = 'order-item-row';
    r.innerHTML = `<div style="display:flex; flex: 2; gap:5px;"><select class="orderTypeSelect" style="flex: 1;"></select><input type="text" class="orderTypeCustomInput" placeholder="يدوي..." style="display:none; flex: 1;"><button type="button" class="btn-outline toggle-custom-btn" onclick="toggleOrderInput(this)">✍️</button></div> <input type="text" class="orderColorInput" placeholder="اللون" style="flex: 1; min-width: 80px;"> <div class="qty-controls" style="flex: 1; min-width: 110px;"><button type="button" class="qty-btn" onclick="changeQty(this, 1)">+</button><input type="number" class="orderQtyInput" value="1" style="width: 40px; text-align: center; box-shadow:none; padding:5px;"><button type="button" class="qty-btn" onclick="changeQty(this, -1)">-</button><button type="button" class="btn-danger" style="padding: 5px; border-radius: 10px; width: 35px; height: 35px; min-width:unset;" onclick="this.closest('.order-item-row').remove()">❌</button></div>`;
    wr.appendChild(r); window.updateOrderTypeSelects();
}
window.resetItemsContainer = function() { 
    document.getElementById('dynamicRowsWrapper').innerHTML = `<div class="order-item-row"><div style="display:flex; flex: 2; min-width: 140px; gap:5px;"><select class="orderTypeSelect" style="flex: 1;"></select><input type="text" class="orderTypeCustomInput" placeholder="اكتب نوع الطلب..." style="display:none; flex: 1;"><button type="button" class="btn-outline toggle-custom-btn" onclick="toggleOrderInput(this)" style="padding: 0 10px;" title="كتابة يدوية">✍️</button></div><input type="text" class="orderColorInput" placeholder="اللون (اختياري)" style="flex: 1; min-width: 100px;"><div class="qty-controls" style="flex: 1; min-width: 110px;"><button type="button" class="qty-btn" onclick="changeQty(this, 1)">+</button><input type="number" class="orderQtyInput" value="1" min-width="1" style="width: 40px; text-align: center; box-shadow:none; padding:5px;"><button type="button" class="qty-btn" onclick="changeQty(this, -1)">-</button></div></div>`; 
    window.updateOrderTypeSelects(); 
}
window.changeQty = function(btn, d) { let i = btn.parentElement.querySelector('input[type="number"]'), v = parseInt(i.value)||1; v += d; if(v<1) v=1; i.value = v; }

window.extractValue = function(lines, keyword) {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(keyword)) {
            let val = lines[i].split(':').pop().trim().replace(/🛑/g, '').trim(); 
            if (val !== "" && val !== keyword.replace(/:/g, '').trim()) return val;
            if (i + 1 < lines.length) { let nVal = lines[i+1].replace(/🛑/g, '').trim(); if(nVal && !nVal.includes(':')) return nVal; }
        }
    } return "";
}

window.parseText = function() {
    const txt = document.getElementById('pasteArea').value.trim(); if (!txt) return;
    const lines = txt.split('\n').map(l => l.trim()).filter(l => l !== '');
    document.getElementById('custId').value = window.extractValue(lines, 'تسلسل الزب'); document.getElementById('custName').value = window.extractValue(lines, 'اسم الزبون'); document.getElementById('phone1').value = window.extractValue(lines, 'رقم الهاتف الاول'); document.getElementById('phone2').value = window.extractValue(lines, 'رقم الهاتف الثاني'); document.getElementById('gov').value = window.extractValue(lines, 'المحافظة'); document.getElementById('area').value = window.extractValue(lines, 'المنطقة'); document.getElementById('amount').value = window.extractValue(lines, 'المبلغ الكلي'); window.formatAmount(document.getElementById('amount')); document.getElementById('note').value = window.extractValue(lines, 'ملاحظة مهمة');
    
    let s = document.querySelector('.orderTypeSelect'), ci = document.querySelector('.orderTypeCustomInput'), tb = s.parentElement.querySelector('.toggle-custom-btn');
    let extType = window.extractValue(lines, 'نوع الطلب');
    if (extType && s) { if (Array.from(s.options).some(o => o.value === extType)) { if(s.style.display === 'none') window.toggleOrderInput(tb); s.value = extType; } else { if(s.style.display !== 'none') window.toggleOrderInput(tb); ci.value = extType; } }
}

window.addToTable = async function() {
    const pg = document.getElementById('constantField').value; if (!pg) { alert("يجب اختيار البيج!"); return; }
    let arr = [], totQty = 0;
    document.querySelectorAll('.order-item-row').forEach(r => {
        let s = r.querySelector('.orderTypeSelect'), ci = r.querySelector('.orderTypeCustomInput'), cv = r.querySelector('.orderColorInput').value.trim();
        let tv = (ci.style.display !== 'none') ? ci.value.trim() : s.value.trim();
        let qv = parseInt(r.querySelector('.orderQtyInput').value) || 1;
        if (tv !== "") { let ft = configuredOrderTypes.find(t => t.name === tv); let cd = ft ? ft.code : tv; arr.push(`[${cd} (${qv}) ${cv}]`.trim()); totQty += qv; }
    });
    
    const data = { id: document.getElementById('custId').value, name: document.getElementById('custName').value, phone1: document.getElementById('phone1').value, phone2: document.getElementById('phone2').value, gov: document.getElementById('gov').value, area: document.getElementById('area').value, type: arr.join(' + '), qty: totQty, amount: document.getElementById('amount').value, constant: pg, note: document.getElementById('note').value, addedBy: loggedInUser || 'مجهول', status: 'جديد' };
    if (!data.id && !data.name) return;

    if (window.saveDataToFirebase) { document.getElementById("mainSaveBtn").disabled = true; await window.saveDataToFirebase(data); document.getElementById("mainSaveBtn").disabled = false; }
    
    const row = document.createElement('tr'); 
    row.innerHTML = `<td>${data.id}</td> <td style="color:var(--primary-blue); font-weight:bold;">${data.constant}</td> <td>${data.name}</td> <td dir="ltr">${data.phone1}</td> <td dir="ltr">${data.phone2}</td> <td>${data.gov}</td> <td>${data.area}</td> <td style="color:var(--primary-blue); font-weight:bold;">${data.type}</td> <td>${data.qty}</td> <td>${data.amount}</td> <td>${data.note}</td> <td><button class="btn-danger" style="padding: 5px 15px; border-radius: 10px; font-size: 13px;" onclick="this.closest('tr').remove(); updateOrdersCounter();">حذف</button></td>`;
    document.getElementById('tableBody').appendChild(row); window.updateOrdersCounter(); window.clearForm(); document.getElementById('pasteArea').value = '';
    window.showSuccessToast("تمت إضافة الطلب بنجاح! 🎉");
}

window.clearForm = function() { ['custId','custName','phone1','phone2','gov','area','amount','note'].forEach(id => document.getElementById(id).value = ''); window.resetItemsContainer(); }
window.clearAll = function() { document.getElementById('pasteArea').value = ''; document.getElementById('constantField').value = ''; window.clearForm(); }
window.updateOrdersCounter = function() { document.getElementById('ordersCounterBadge').innerText = `(${document.getElementById('tableBody').rows.length})`; }

window.exportToExcel = function() {
    const trs = document.getElementById("tableBody").rows; if(trs.length === 0) return;
    let d = new Date(), ds = d.getFullYear() + "/" + (d.getMonth() + 1).toString().padStart(2, '0') + "/" + d.getDate().toString().padStart(2, '0');
    let exp = Array.from(trs).map((r, i) => {
        const amt = parseFloat(r.cells[9].innerText.replace(/[^0-9.-]+/g,"")) || 0, del = r.cells[5].innerText.includes("بغداد") ? feeBaghdad : feeOther;
        return { "ت": i+1, "البيج": r.cells[1].innerText, "رقم الوصل": i+1, "تاريخ": ds, "اسم الزبون": r.cells[2].innerText, "رقم الهاتف": r.cells[3].innerText, "العنوان": r.cells[5].innerText, "العنوان منطقة": r.cells[6].innerText, "العدد": parseInt(r.cells[8].innerText)||1, "المبلغ الكلي": amt, "مبلغ التوصيل": del, "المبلغ الصافي": amt-del, "ملاحظات": r.cells[10].innerText };
    });
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exp), "الجدول"); XLSX.writeFile(wb, "طلبات_المندوب.xlsx");
}
