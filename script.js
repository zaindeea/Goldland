// إعدادات Firebase القياسية (تعمل بدون أي قيود)
const firebaseConfig = {
    apiKey: "AIzaSyA-2N_HZoej2Vv3vQa0P5hu0gvmwVs0R3o",
    authDomain: "gold-land2021.firebaseapp.com",
    projectId: "gold-land2021",
    storageBucket: "gold-land2021.firebasestorage.app",
    messagingSenderId: "580003463235",
    appId: "1:580003463235:web:4ebb43e8f3db552b3294f6"
};

// متغيرات النظام العامة
const ADMIN_USER = "Zain"; 
const ADMIN_PASS = "327798";
let additionalUsers = [], configuredOrderTypes = [], configuredPages = [], allCloudOrders = [], filteredCloudOrders = [];
let loggedInUser = "", loggedInUserCanDelete = false, loggedInUserCanEdit = false, loggedInUserCanSettings = false, loggedInUserCanReports = false; 

function safeGetStorage(key, def) { try { return localStorage.getItem(key) || def; } catch(e) { return def; } }
function safeSetStorage(key, val) { try { localStorage.setItem(key, val); } catch(e) {} }

let feeBaghdad = parseInt(safeGetStorage('feeBaghdad', '5000')) || 5000;
let feeOther = parseInt(safeGetStorage('feeOther', '8000')) || 8000;
let currentConfirmAction = null;
let currentEditDocId = null;

// دالة تحديث صلاحيات المستخدم الحالي تلقائياً وبدون تسجيل خروج
function refreshCurrentUserPermissions() {
    if (!loggedInUser) return;
    if (loggedInUser === ADMIN_USER) {
        loggedInUserCanDelete = true;
        loggedInUserCanEdit = true;
        loggedInUserCanSettings = true;
        loggedInUserCanReports = true;
    } else {
        const u = additionalUsers.find(user => user.username === loggedInUser);
        if (u) {
            loggedInUserCanDelete = !!u.canDeleteCloud;
            loggedInUserCanEdit = !!u.canEditCloud;
            loggedInUserCanSettings = !!u.canAccessSettings;
            loggedInUserCanReports = !!u.canAccessReports;
        }
    }
    if (document.getElementById('cloudOrdersModal') && document.getElementById('cloudOrdersModal').style.display === 'flex') {
        window.filterCloudOrders();
    }
}

// تهيئة Firebase وتفعيل التحديث التلقائي المباشر (Real-time Listeners)
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

        // 1. استماع مباشر لتغييرات المستخدمين والصلاحيات
        db.collection("system_users").onSnapshot((snap) => {
            additionalUsers = [];
            snap.forEach(d => additionalUsers.push({ id: d.id, ...d.data() }));
            refreshCurrentUserPermissions();
            if (document.getElementById('settingsModal') && document.getElementById('settingsModal').style.display === 'flex') {
                window.renderUsers();
            }
        });

        // 2. استماع مباشر لتغييرات أنواع الطلبات
        db.collection("order_types").onSnapshot((snap) => {
            configuredOrderTypes = [];
            snap.forEach(d => configuredOrderTypes.push({ id: d.id, ...d.data() }));
            window.updateOrderTypeSelects();
            if (document.getElementById('settingsModal') && document.getElementById('settingsModal').style.display === 'flex') {
                window.renderOrderTypesSettings();
            }
        });

        // 3. استماع مباشر لتغييرات البيجات
        db.collection("system_pages").onSnapshot((snap) => {
            configuredPages = [];
            snap.forEach(d => configuredPages.push({ id: d.id, ...d.data() }));
            window.updatePagesDropdown();
            if (document.getElementById('settingsModal') && document.getElementById('settingsModal').style.display === 'flex') {
                window.renderPagesSettings();
            }
        });

        // 4. استماع مباشر لتغييرات أجور التوصيل في السحابة
        db.collection("system_config").doc("delivery_fees").onSnapshot((docSnap) => {
            if (docSnap.exists) {
                const data = docSnap.data();
                feeBaghdad = parseInt(data.baghdad) || 0;
                feeOther = parseInt(data.other) || 0;
                safeSetStorage('feeBaghdad', feeBaghdad);
                safeSetStorage('feeOther', feeOther);
                
                const baghdadInput = document.getElementById('feeBaghdadInput');
                const otherInput = document.getElementById('feeOtherInput');
                if (baghdadInput) baghdadInput.value = feeBaghdad;
                if (otherInput) otherInput.value = feeOther;

                if (document.getElementById('reportsModal') && document.getElementById('reportsModal').style.display === 'flex') {
                    window.generateReports();
                }
            }
        });

        // 5. استماع مباشر للطلبات السحابية
        db.collection("orders").onSnapshot((snap) => {
            allCloudOrders = [];
            snap.forEach(d => allCloudOrders.push({ id_doc: d.id, ...d.data() }));
            allCloudOrders.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            
            if (document.getElementById('cloudOrdersModal') && document.getElementById('cloudOrdersModal').style.display === 'flex') {
                window.filterCloudOrders();
            }
            if (document.getElementById('reportsModal') && document.getElementById('reportsModal').style.display === 'flex') {
                window.populateReportFilters();
                window.generateReports();
            }
        });

        // دوال العمليات على قاعدة البيانات
        window.saveDataToFirebase = async function(orderData) {
            try { 
                orderData.timestamp = firebase.firestore.FieldValue.serverTimestamp(); 
                await db.collection("orders").add(orderData); 
                return true; 
            } catch (e) { return false; }
        };
        window.deleteOrderFromFirebase = async function(docId) { await db.collection("orders").doc(docId).delete(); };
        window.updateOrderInFirebase = async function(docId, newData) { await db.collection("orders").doc(docId).update(newData); };
        
        window.addSystemUserToFirebase = async function(data) { return await db.collection("system_users").add(data); };
        window.deleteSystemUserFromFirebase = async function(docId) { await db.collection("system_users").doc(docId).delete(); };
        window.updateSystemUserInFirebase = async function(docId, data) { await db.collection("system_users").doc(docId).update(data); };
        
        window.addOrderTypeToFirebase = async function(data) { return await db.collection("order_types").add(data); };
        window.deleteOrderTypeFromFirebase = async function(docId) { await db.collection("order_types").doc(docId).delete(); };
        
        window.addSystemPageToFirebase = async function(data) { return await db.collection("system_pages").add(data); };
        window.deleteSystemPageFromFirebase = async function(docId) { await db.collection("system_pages").doc(docId).delete(); };
        
        window.saveDeliveryFeesToFirebase = async function(baghdad, other) {
            await db.collection("system_config").doc("delivery_fees").set({ baghdad, other });
        };

        window.loadSystemDataFromFirebase = async function() {
            try {
                let users = [];
                const uSnap = await db.collection("system_users").get();
                uSnap.forEach(d => users.push({ id: d.id, ...d.data() }));
                return { users };
            } catch (e) { return { users: [] }; }
        };
    }
} catch(e) {
    console.warn("Firebase Init Error", e);
}

// =========================================
// الحركات البصرية والإشعارات
// =========================================

window.createGoldDust = function() {
    const dustContainer = document.createElement('div');
    document.body.appendChild(dustContainer);
    for(let i = 0; i < 35; i++) {
        let dust = document.createElement('div');
        dust.className = 'gold-dust';
        dust.style.left = Math.random() * 100 + 'vw';
        dust.style.animationDuration = (Math.random() * 5 + 4) + 's';
        dust.style.animationDelay = Math.random() * 5 + 's';
        let size = Math.random() * 4 + 2;
        dust.style.width = size + 'px';
        dust.style.height = size + 'px';
        dustContainer.appendChild(dust);
    }
};

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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.createGoldDust);
} else {
    window.createGoldDust();
}

// =========================================
// المظهر والدوال الأساسية
// =========================================

let currentTheme = safeGetStorage('gl_theme', 'dark');
window.applyTheme = function(theme) {
    if (theme === 'light') document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
};
window.toggleTheme = function() {
    currentTheme = (currentTheme === 'dark') ? 'light' : 'dark';
    safeSetStorage('gl_theme', currentTheme); 
    window.applyTheme(currentTheme);
};
window.applyTheme(currentTheme);

window.saveDeliveryFees = async function() {
    const bInput = document.getElementById('feeBaghdadInput');
    const oInput = document.getElementById('feeOtherInput');
    window.formatAmount(bInput);
    window.formatAmount(oInput);

    feeBaghdad = parseInt(bInput.value.replace(/[^0-9]/g, "")) || 0;
    feeOther = parseInt(oInput.value.replace(/[^0-9]/g, "")) || 0;
    
    safeSetStorage('feeBaghdad', feeBaghdad); 
    safeSetStorage('feeOther', feeOther);
    
    if (window.saveDeliveryFeesToFirebase) {
        await window.saveDeliveryFeesToFirebase(feeBaghdad, feeOther);
    }
    window.showSuccessToast("تم حفظ أجور التوصيل في السحابة بنجاح! 🚚☁️");
};

window.showInstallInstructions = function(os) {
    if (os === 'ios') {
        alert("لتثبيت التطبيق على آيفون:\n1. اضغط على زر المشاركة (Share) في أسفل متصفح سفاري.\n2. اختر 'إضافة إلى الشاشة الرئيسية' (Add to Home Screen).");
    } else {
        alert("لتثبيت التطبيق على أندرويد:\n1. اضغط على النقاط الثلاث في أعلى متصفح كروم.\n2. اختر 'تثبيت التطبيق' أو 'الإضافة إلى الشاشة الرئيسية'.");
    }
};

window.showConfirmDialog = function(msg, callback) { 
    document.getElementById('confirmMessage').innerText = msg; 
    currentConfirmAction = callback; 
    document.getElementById('confirmModal').style.display = 'flex'; 
    document.getElementById('confirmYesBtn').onclick = function() { 
        if(currentConfirmAction) currentConfirmAction(); 
        window.closeConfirmModal(); 
    }; 
};

window.closeConfirmModal = function() { 
    document.getElementById('confirmModal').style.display = 'none'; 
    currentConfirmAction = null; 
};

window.handleEnter = function(event) { if (event.key === "Enter") window.login(); };

window.formatAmount = function(input) {
    let val = input.value.trim(); if (!val) return;
    let numericVal = parseFloat(val.replace(/[^0-9.-]+/g, ""));
    if (!isNaN(numericVal) && numericVal > 0 && numericVal < 1000) {
        input.value = (numericVal * 1000).toString();
    } else if (!isNaN(numericVal)) {
        input.value = numericVal.toString();
    }
};

window.toggleOrderInput = function(btn) {
    let container = btn.parentElement;
    let select = container.querySelector('.orderTypeSelect');
    let customInput = container.querySelector('.orderTypeCustomInput');
    if(select.style.display !== 'none') { 
        select.style.display = 'none'; 
        customInput.style.display = 'block'; 
        customInput.focus(); 
        btn.innerHTML = '📋'; 
    } else { 
        customInput.style.display = 'none'; 
        customInput.value = ''; 
        select.style.display = 'block'; 
        btn.innerHTML = '✍️'; 
    }
};

// =========================================
// تسجيل الدخول والخروج
// =========================================

window.login = async function() {
    try {
        const user = document.getElementById("username").value.trim();
        const pass = document.getElementById("password").value.trim();
        const errorMsg = document.getElementById("login-error");
        const btn = document.getElementById("loginBtn");
        
        if(user === "" || pass === "") return;

        btn.innerText = "جاري الدخول... ⏳"; btn.disabled = true;

        if (user === ADMIN_USER && pass === ADMIN_PASS) {
            loggedInUser = user; 
            refreshCurrentUserPermissions();
            document.getElementById('feeBaghdadInput').value = feeBaghdad; 
            document.getElementById('feeOtherInput').value = feeOther;
            window.showDashboard(); 
            errorMsg.style.display = "none";
            btn.innerText = "تسجيل الدخول"; btn.disabled = false; 
            return;
        }

        if (additionalUsers.length === 0 && window.loadSystemDataFromFirebase) {
            const cloudData = await window.loadSystemDataFromFirebase();
            additionalUsers = cloudData.users;
        }

        btn.innerText = "تسجيل الدخول"; btn.disabled = false;

        const isNormalUser = additionalUsers.find(u => u.username === user && u.password === pass);
        if (isNormalUser) { 
            loggedInUser = user; 
            refreshCurrentUserPermissions();
            document.getElementById('feeBaghdadInput').value = feeBaghdad; 
            document.getElementById('feeOtherInput').value = feeOther;
            window.showDashboard(); 
            errorMsg.style.display = "none"; 
        } else { 
            errorMsg.style.display = "block"; 
        }

    } catch (err) {
        alert("تعذر الاتصال بقاعدة البيانات. تحقق من الإنترنت.");
        document.getElementById("loginBtn").innerText = "تسجيل الدخول"; 
        document.getElementById("loginBtn").disabled = false;
    }
};

window.showDashboard = function() { 
    document.getElementById("login-section").style.display = "none"; 
    const dash = document.getElementById("dashboard-section");
    dash.style.display = "block"; 
    dash.classList.add("fade-in-section"); 
};

window.logout = function() { 
    window.showConfirmDialog("تسجيل الخروج سيقوم بمسح الجدول المؤقت الحالي، هل أنت متأكد؟", function() { 
        loggedInUser = ""; 
        document.getElementById("dashboard-section").style.display = "none"; 
        document.getElementById("login-section").style.display = "flex"; 
        window.clearForm(); 
        document.getElementById('tableBody').innerHTML = ""; 
        window.updateOrdersCounter();
    }); 
};

// =========================================
// التقارير الشاملة
// =========================================

window.populateReportFilters = function() {
    const pageSelect = document.getElementById('repPageFilter');
    const typeSelect = document.getElementById('repTypeFilter');
    const currentPageVal = pageSelect.value || 'all';
    const currentTypeVal = typeSelect.value || 'all';

    const pagesSet = new Set(), typesSet = new Set();
    configuredPages.forEach(p => pagesSet.add(p.name));
    configuredOrderTypes.forEach(t => typesSet.add(t.code));

    allCloudOrders.forEach(o => {
        if(o.constant) pagesSet.add(o.constant);
        if(o.type) {
            o.type.split('+').forEach(item => {
                let match = item.match(/\[(.*?)\s\(/);
                if(match) typesSet.add(match[1].trim());
            });
        }
    });
    
    pageSelect.innerHTML = '<option value="all">-- كل البيجات --</option>' + Array.from(pagesSet).map(p => `<option value="${p}">${p}</option>`).join('');
    typeSelect.innerHTML = '<option value="all">-- كل الطلبات --</option>' + Array.from(typesSet).map(t => `<option value="${t}">${t}</option>`).join('');
    
    if (Array.from(pagesSet).includes(currentPageVal)) pageSelect.value = currentPageVal;
    if (Array.from(typesSet).includes(currentTypeVal)) typeSelect.value = currentTypeVal;
};

window.openReports = async function() {
    if (!loggedInUserCanReports) { alert("❌ ليس لديك صلاحية للوصول إلى التقارير."); return; }
    document.getElementById('reportsModal').style.display = 'flex';
    window.populateReportFilters();
    window.generateReports();
};

window.closeReports = function() { document.getElementById('reportsModal').style.display = 'none'; };

window.switchReportTab = function(tabId, btn) { 
    document.querySelectorAll('#reportsModal .tab-btn').forEach(b => b.classList.remove('active')); 
    document.querySelectorAll('#reportsModal .tab-pane').forEach(p => p.classList.remove('active')); 
    btn.classList.add('active'); 
    document.getElementById(tabId).classList.add('active'); 
};

window.generateReports = function() {
    const fromVal = document.getElementById('repDateFrom').value;
    const toVal = document.getElementById('repDateTo').value;
    
    let fromDate = fromVal ? new Date(fromVal) : null; if(fromDate) fromDate.setHours(0,0,0,0);
    let toDate = toVal ? new Date(toVal) : null; if(toDate) toDate.setHours(23,59,59,999);

    const selPage = document.getElementById('repPageFilter').value;
    const selType = document.getElementById('repTypeFilter').value;

    let targetOrders = allCloudOrders.filter(o => {
        if(fromDate || toDate) {
            if(!o.timestamp?.seconds) return false;
            const orderDate = new Date(o.timestamp.seconds * 1000);
            if(fromDate && orderDate < fromDate) return false;
            if(toDate && orderDate > toDate) return false;
        } return true;
    });

    // 1. تقرير البيجات
    let pageTargetOrders = targetOrders;
    if(selPage !== "all") pageTargetOrders = targetOrders.filter(o => o.constant === selPage);

    let totalPageQty = 0, totalPageAmt = 0, pageTbodyHtml = "";
    if (pageTargetOrders.length === 0) {
        pageTbodyHtml = '<tr><td colspan="3" style="text-align:center;">لا توجد بيانات</td></tr>';
    } else {
        pageTargetOrders.forEach(o => {
            let amt = parseFloat((o.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0;
            let qty = parseInt(o.qty) || 1;
            totalPageQty += qty; totalPageAmt += amt;
            
            let safeType = (o.type || "غير محدد").split(' + ').map(item => `<span dir="ltr" style="display: inline-block; padding: 0 4px;">${item}</span>`).join(' <span style="font-weight:bold; color:inherit;">+</span> ');
            pageTbodyHtml += `<tr><td style="color:var(--neon-gold); font-size: 13px; text-align: center;">${safeType}</td><td>${qty}</td><td>${amt.toLocaleString()}</td></tr>`;
        });
    }
    
    document.getElementById('repPageTbody').innerHTML = pageTbodyHtml;
    document.getElementById('totalPageQty').innerText = totalPageQty;
    document.getElementById('totalPageAmount').innerText = totalPageAmt.toLocaleString();

    // 2. تقرير الطلبات (البطاقات)
    let typeStats = {};
    targetOrders.forEach(o => {
        if(o.type) {
            o.type.split('+').forEach(item => {
                let match = item.match(/\[(.*?)\s\((\d+)\)/); if(match) { let code = match[1].trim(), qty = parseInt(match[2]) \vert{}\vert{} 1; typeStats[code] = (typeStats[code] \vert{}\vert{} 0) + qty; } else { let cleanItem = item.replace(/[\[\]]/g, '').trim();
                    if(cleanItem) typeStats[cleanItem] = (typeStats[cleanItem] || 0) + (parseInt(o.qty) || 1);
                }
            });
        }
    });

    let typeCardsHtml = "";
    let filteredTypes = Object.entries(typeStats);
    if(selType !== "all") filteredTypes = filteredTypes.filter(([tCode]) => tCode === selType);

    if(filteredTypes.length === 0) {
        typeCardsHtml = '<div style="grid-column: 1 / -1; text-align:center; color:#ccc; padding:20px;">لا توجد بيانات</div>';
    } else {
        filteredTypes.forEach(([tCode, tQty]) => {
            typeCardsHtml += `
                <div class="report-card">
                    <h4>${tCode}</h4>
                    <div class="val">${tQty}</div>
                </div>`;
        });
    }
    document.getElementById('repTypeCardsContainer').innerHTML = typeCardsHtml;

    // 3. التقرير المالي
    let finCount = targetOrders.length, finQty = 0, finGross = 0, finDelivery = 0;
    targetOrders.forEach(o => {
        let amt = parseFloat((o.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0;
        finQty += parseInt(o.qty) || 1; 
        finGross += amt;
        finDelivery += (o.gov || "").includes("بغداد") ? feeBaghdad : feeOther;
    });
    document.getElementById('finCount').innerText = finCount; 
    document.getElementById('finQty').innerText = finQty;
    document.getElementById('finGross').innerText = finGross.toLocaleString(); 
    document.getElementById('finDelivery').innerText = finDelivery.toLocaleString();
    document.getElementById('finNet').innerText = (finGross - finDelivery).toLocaleString();
};

window.exportPageReportPDF = function() {
    const pageName = document.getElementById('repPageFilter').value;
    const titleText = 'تقرير المبيعات - ' + (pageName === 'all' ? 'جميع البيجات' : pageName);
    
    const tempDiv = document.createElement('div');
    tempDiv.style.padding = '30px';
    tempDiv.style.background = '#ffffff';
    tempDiv.style.color = '#000000';
    tempDiv.style.direction = 'rtl';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    
    const title = document.createElement('h2');
    title.innerText = titleText;
    title.style.textAlign = 'center';
    title.style.marginBottom = '25px';
    title.style.color = '#000';
    tempDiv.appendChild(title);
    
    const tableClone = document.getElementById('pageReportTable').cloneNode(true);
    tableClone.style.width = '100%';
    tableClone.style.borderCollapse = 'collapse';
    
    const cells = tableClone.querySelectorAll('th, td');
    cells.forEach(cell => {
        cell.style.border = '1px solid #333';
        cell.style.padding = '10px';
        cell.style.color = '#000';
        cell.style.textAlign = 'center';
        cell.style.background = '#fff';
    });
    
    tableClone.querySelectorAll('th').forEach(th => th.style.background = '#f2f2f2');
    tableClone.querySelectorAll('tfoot td').forEach(td => { 
        td.style.background = '#e6e6e6'; 
        td.style.fontWeight = 'bold'; 
    });

    tempDiv.appendChild(tableClone);
    document.body.appendChild(tempDiv); 

    const opt = {
        margin:       10,
        filename:     `تقرير_${pageName === 'all' ? 'عام' : pageName}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(tempDiv).save().then(() => {
        document.body.removeChild(tempDiv); 
    });
};

// =========================================
// الأرشيف السحابي وتعديل الطلبات
// =========================================

window.openCloudOrders = function() {
    document.getElementById('cloudOrdersModal').style.display = 'flex';
    window.filterCloudOrders();
};
window.closeCloudOrders = function() { document.getElementById('cloudOrdersModal').style.display = 'none'; };

window.filterCloudOrders = function() {
    const qt = document.getElementById('cloudSearchInput').value.toLowerCase();
    const pF = document.getElementById('cloudPageFilter').value;
    const fromVal = document.getElementById('cloudDateFrom').value;
    const toVal = document.getElementById('cloudDateTo').value;

    let fromDate = fromVal ? new Date(fromVal) : null; if(fromDate) fromDate.setHours(0,0,0,0);
    let toDate = toVal ? new Date(toVal) : null; if(toDate) toDate.setHours(23,59,59,999);

    const tb = document.getElementById('cloudOrdersTbody'); 
    tb.innerHTML = '';
    
    filteredCloudOrders = allCloudOrders.filter(o => {
        const matchText = (o.name||"").toLowerCase().includes(qt) || (o.phone1||"").includes(qt) || (o.id||"").toString().includes(qt);
        const matchPage = (pF === "" || (o.constant||"") === pF);
        let matchDate = true;
        if(fromDate || toDate) {
            if(!o.timestamp?.seconds) matchDate = false;
            else {
                const orderDate = new Date(o.timestamp.seconds * 1000);
                if(fromDate && orderDate < fromDate) matchDate = false;
                if(toDate && orderDate > toDate) matchDate = false;
            }
        }
        return matchText && matchPage && matchDate;
    });
    
    if (filteredCloudOrders.length === 0) {
        tb.innerHTML = '<tr><td colspan="9" style="text-align:center;">لا توجد طلبات مطابقة</td></tr>';
        return;
    }

    filteredCloudOrders.forEach(o => {
        const tr = document.createElement('tr');
        
        let actionsHtml = '<div style="display:flex; gap:5px; justify-content:center;">';
        if (loggedInUserCanEdit) {
            actionsHtml += `<button class="btn-parse" style="padding: 6px 10px; background: #3498db; border-radius:6px;" onclick="openEditModal('${o.id_doc}')" title="تعديل">✏️</button>`;
        }
        if (loggedInUserCanDelete) {
            actionsHtml += `<button class="btn-danger" style="padding: 6px 10px; border-radius:6px;" onclick="deleteCloudOrder('${o.id_doc}')" title="حذف">🗑️</button>`;
        }
        actionsHtml += '</div>';
        if (!loggedInUserCanEdit && !loggedInUserCanDelete) actionsHtml = '-';

        let amtFormatted = parseFloat((o.amount||"0").toString().replace(/[^0-9.-]+/g,"")) || 0;

        tr.innerHTML = `
            <td>${o.id||'-'}</td> 
            <td style="color:var(--neon-gold); font-weight:bold;">${o.constant||'-'}</td> 
            <td>${o.name||'-'}</td>
            <td dir="ltr" style="font-size:12px;">${o.phone1||''}${o.phone2 ? '<br>'+o.phone2 : ''}</td> 
            <td style="font-size:12px;">${o.gov||'-'}${o.area ? ' - '+o.area : ''}</td>
            <td style="color:var(--neon-gold); font-size:12px;" dir="ltr">${o.type||'-'}</td> 
            <td style="font-weight:bold;">${amtFormatted ? amtFormatted.toLocaleString() : (o.amount||'-')}</td> 
            <td style="font-size:12px;">${o.addedBy||''}</td>
            <td>${actionsHtml}</td>`;
        tb.appendChild(tr);
    });
};

window.deleteCloudOrder = function(docId) {
    window.showConfirmDialog("تأكيد الحذف النهائي من السحابة؟", async function() {
        if(window.deleteOrderFromFirebase) { 
            await window.deleteOrderFromFirebase(docId); 
            window.showSuccessToast("تم حذف الطلب بنجاح!");
        }
    });
};

window.openEditModal = function(docId) {
    let order = allCloudOrders.find(o => o.id_doc === docId);
    if(!order) return;
    
    currentEditDocId = docId;
    
    const editPageSelect = document.getElementById('editConstant');
    editPageSelect.innerHTML = configuredPages.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    if (order.constant && !configuredPages.some(p => p.name === order.constant)) {
        editPageSelect.innerHTML += `<option value="${order.constant}">${order.constant}</option>`;
    }
    editPageSelect.value = order.constant || '';

    document.getElementById('editName').value = order.name || '';
    document.getElementById('editPhone1').value = order.phone1 || '';
    document.getElementById('editPhone2').value = order.phone2 || '';
    document.getElementById('editGov').value = order.gov || '';
    document.getElementById('editArea').value = order.area || '';
    document.getElementById('editType').value = order.type || '';
    document.getElementById('editQty').value = order.qty || 1;
    document.getElementById('editAmount').value = order.amount || '';
    document.getElementById('editNote').value = order.note || '';
    
    document.getElementById('editOrderModal').style.display = 'flex';
};

window.closeEditModal = function() {
    document.getElementById('editOrderModal').style.display = 'none';
    currentEditDocId = null;
};

window.saveEditedOrder = async function() {
    if(!currentEditDocId) return;
    
    const amtInput = document.getElementById('editAmount');
    window.formatAmount(amtInput);

    const newData = {
        constant: document.getElementById('editConstant').value,
        name: document.getElementById('editName').value.trim(),
        phone1: document.getElementById('editPhone1').value.trim(),
        phone2: document.getElementById('editPhone2').value.trim(),
        gov: document.getElementById('editGov').value.trim(),
        area: document.getElementById('editArea').value.trim(),
        type: document.getElementById('editType').value.trim(),
        qty: parseInt(document.getElementById('editQty').value) || 1,
        amount: amtInput.value.trim(),
        note: document.getElementById('editNote').value.trim()
    };

    if(window.updateOrderInFirebase) {
        const btn = document.getElementById('saveEditBtn');
        btn.disabled = true; btn.innerText = "جاري الحفظ... ⏳";
        try {
            await window.updateOrderInFirebase(currentEditDocId, newData);
            window.closeEditModal();
            window.showSuccessToast("تم حفظ التعديلات والمبلغ بنجاح! ✏️💾");
        } catch(e) {
            alert("حدث خطأ أثناء التعديل. تأكد من الاتصال بالإنترنت.");
        }
        btn.disabled = false; btn.innerText = "حفظ التعديلات في السحابة 💾";
    }
};

window.exportCloudToExcel = function() {
    if(filteredCloudOrders.length === 0) return;
    let exportData = filteredCloudOrders.map((o, i) => {
        const amt = parseFloat((o.amount || "0").toString().replace(/[^0-9.-]+/g,"")) || 0;
        const del = (o.gov || "").includes("بغداد") ? feeBaghdad : feeOther;
        return { 
            "ت": i+1, "البيج": o.constant||"", "اسم الزبون": o.name||"", 
            "رقم الهاتف": o.phone1, "العنوان": (o.gov||"") + (o.area ? " - " + o.area : ""), 
            "الطلب": o.type||"", "العدد": parseInt(o.qty)||1, 
            "المبلغ الكلي": amt, "مبلغ التوصيل": del, "الصافي": amt-del, "ملاحظات": o.note||"" 
        };
    });
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportData), "السحابة"); 
    XLSX.writeFile(wb, "أرشيف_السحابة.xlsx");
};

// =========================================
// الإعدادات وإدارة المستخدمين (تحديث مباشر)
// =========================================

window.openSettings = function() {
    document.getElementById('settingsModal').style.display = 'flex'; 
    document.getElementById('feeBaghdadInput').value = feeBaghdad;
    document.getElementById('feeOtherInput').value = feeOther;

    if (loggedInUserCanSettings) { 
        document.getElementById('settingsAuthSection').style.display = 'none'; 
        document.getElementById('settingsManagerSection').style.display = 'block'; 
        window.renderPagesSettings(); window.renderOrderTypesSettings(); window.renderUsers(); 
    } else { 
        document.getElementById('settingsAuthSection').style.display = 'block'; 
        document.getElementById('settingsManagerSection').style.display = 'none'; 
        document.getElementById('settingsPass').value = '';
        document.getElementById('settings-error').style.display = 'none';
    }
};
window.closeSettings = function() { document.getElementById('settingsModal').style.display = 'none'; };

window.verifySettingsPass = function() { 
    if (document.getElementById('settingsPass').value === ADMIN_PASS) { 
        document.getElementById('settingsAuthSection').style.display = 'none'; 
        document.getElementById('settingsManagerSection').style.display = 'block'; 
        window.renderPagesSettings(); window.renderOrderTypesSettings(); window.renderUsers(); 
    } else { 
        document.getElementById('settings-error').style.display = 'block'; 
    } 
};

window.switchTab = function(tabId, btn) { 
    document.querySelectorAll('#settingsModal .tab-btn').forEach(b => b.classList.remove('active')); 
    document.querySelectorAll('#settingsModal .tab-pane').forEach(p => p.classList.remove('active')); 
    btn.classList.add('active'); 
    document.getElementById(tabId).classList.add('active'); 
};

window.addPageType = async function() { 
    const input = document.getElementById('newPageName');
    const val = input.value.trim(); 
    if(val && window.addSystemPageToFirebase) { 
        input.value = '';
        await window.addSystemPageToFirebase({name: val}); 
        window.showSuccessToast("تمت إضافة البيج بنجاح!");
    } 
};
window.deletePageType = function(id) { 
    window.showConfirmDialog("هل أنت متأكد من حذف هذا البيج؟", async function() { 
        await window.deleteSystemPageFromFirebase(id); 
    }); 
};

window.renderPagesSettings = function() { 
    const el = document.getElementById("pagesListDisplay");
    if(!el) return;
    el.innerHTML = configuredPages.map(p => `
        <li class="settings-list-item">
            <span class="item-text">${p.name}</span>
            <button class="btn-danger" onclick="deletePageType('${p.id}')">حذف ❌</button>
        </li>
    `).join(''); 
};

window.updatePagesDropdown = function() { 
    const s1 = document.getElementById('constantField');
    const s2 = document.getElementById('cloudPageFilter'); 
    const v1 = s1 ? s1.value : '';
    const v2 = s2 ? s2.value : '';

    if (s1) {
        s1.innerHTML = '<option value="">-- اختر البيج التابع له الطلب --</option>' + configuredPages.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
        s1.value = v1;
    }
    if (s2) {
        s2.innerHTML = '<option value="">-- كل البيجات --</option>' + configuredPages.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
        s2.value = v2;
    }
};

window.addOrderType = async function() { 
    const nInput = document.getElementById('newOrderName');
    const cInput = document.getElementById('newOrderCode');
    const n = nInput.value.trim(), c = cInput.value.trim(); 
    if(n && c && window.addOrderTypeToFirebase) { 
        nInput.value = ''; cInput.value = '';
        await window.addOrderTypeToFirebase({name: n, code: c}); 
        window.showSuccessToast("تمت إضافة نوع الطلب بنجاح!");
    } 
};
window.deleteOrderType = function(id) { 
    window.showConfirmDialog("هل أنت متأكد من حذف نوع الطلب هذا؟", async function() { 
        await window.deleteOrderTypeFromFirebase(id); 
    }); 
};

window.renderOrderTypesSettings = function() { 
    const el = document.getElementById("orderTypesListDisplay");
    if(!el) return;
    el.innerHTML = configuredOrderTypes.map(t => `
        <li class="settings-list-item">
            <span class="item-text">${t.name} <span style="color:var(--neon-gold); font-size: 14px;">(${t.code})</span></span>
            <button class="btn-danger" onclick="deleteOrderType('${t.id}')">حذف ❌</button>
        </li>
    `).join(''); 
};

window.updateOrderTypeSelects = function() { 
    document.querySelectorAll('.orderTypeSelect').forEach(s => { 
        const v = s.value; 
        s.innerHTML = '<option value="">-- اختر الطلب --</option>' + configuredOrderTypes.map(t => `<option value="${t.name}">${t.name}</option>`).join(''); 
        s.value = v; 
    }); 
};

window.addUser = async function() {
    const uInput = document.getElementById("new-user-name");
    const pInput = document.getElementById("new-user-pass");
    const u = uInput.value.trim(), p = pInput.value.trim();
    if(u === "" || p === "" || u === ADMIN_USER) return;
    
    const data = { 
        username: u, password: p, 
        canDeleteCloud: document.getElementById("new-user-can-delete").checked, 
        canEditCloud: document.getElementById("new-user-can-edit").checked, 
        canAccessSettings: document.getElementById("new-user-can-settings").checked, 
        canAccessReports: document.getElementById("new-user-can-reports").checked 
    };
    uInput.value = ''; pInput.value = '';
    await window.addSystemUserToFirebase(data); 
    window.showSuccessToast("تمت إضافة المستخدم بنجاح!");
};

window.deleteUser = function(id) { 
    window.showConfirmDialog("هل أنت متأكد من حذف هذا المستخدم؟", async function() { 
        await window.deleteSystemUserFromFirebase(id); 
    }); 
};

window.togglePermission = async function(id, field) { 
    const u = additionalUsers.find(user => user.id === id); 
    if(!u) return;
    const newVal = !u[field];
    await window.updateSystemUserInFirebase(id, {[field]: newVal}); 
    window.showSuccessToast("تم تحديث الصلاحية فوراً! ⚡");
};

window.renderUsers = function() {
    const el = document.getElementById("users-list");
    if(!el) return;
    el.innerHTML = additionalUsers.map(u => `
        <li class="settings-list-item user-list-item">
            <div class="user-list-header">
                <span class="item-text" style="color: var(--neon-gold);">${u.username} <span style="font-size:13px; color:#aaa;">(${u.password})</span></span>
                <button class="btn-danger" onclick="deleteUser('${u.id}')">حذف ❌</button>
            </div>
            <div class="user-permissions">
                <span class="permission-badge" onclick="togglePermission('${u.id}', 'canDeleteCloud')">
                    ${u.canDeleteCloud ? '🟢 مسح' : '🔴 مسح'}
                </span>
                <span class="permission-badge" onclick="togglePermission('${u.id}', 'canEditCloud')">
                    ${u.canEditCloud ? '🟢 تعديل' : '🔴 تعديل'}
                </span>
                <span class="permission-badge" onclick="togglePermission('${u.id}', 'canAccessSettings')">
                    ${u.canAccessSettings ? '🟢 الإعدادات' : '🔴 الإعدادات'}
                </span>
                <span class="permission-badge" onclick="togglePermission('${u.id}', 'canAccessReports')">
                    ${u.canAccessReports ? '🟢 التقارير' : '🔴 التقارير'}
                </span>
            </div>
        </li>
    `).join('');
};

// =========================================
// معالجة وإضافة الطلبات من لوحة التحكم
// =========================================

window.addOrderItemRow = function() {
    const wr = document.getElementById('dynamicRowsWrapper');
    const r = document.createElement('div'); 
    r.className = 'order-item-row';
    r.innerHTML = `<div style="display:flex; flex: 2; min-width: 140px; gap:5px;"><select class="orderTypeSelect" style="flex: 1;"></select><input type="text" class="orderTypeCustomInput" placeholder="يدوي..." style="display:none; flex: 1;"><button type="button" class="btn-outline toggle-custom-btn" onclick="toggleOrderInput(this)" style="padding: 0 10px;">✍️</button></div> <input type="text" class="orderColorInput" placeholder="اللون" style="flex: 1; min-width: 100px;"> <div class="qty-controls" style="flex: 1; min-width: 120px;"><button type="button" class="qty-btn plus" onclick="changeQty(this, 1)">+</button><input type="number" class="orderQtyInput" value="1" min="1" style="width: 45px; text-align: center;"><button type="button" class="qty-btn minus" onclick="changeQty(this, -1)">-</button><button type="button" class="btn-danger" style="padding: 8px 12px;" onclick="this.closest('.order-item-row').remove()">❌</button></div>`;
    wr.appendChild(r); 
    window.updateOrderTypeSelects();
};

window.resetItemsContainer = function() { 
    document.getElementById('dynamicRowsWrapper').innerHTML = `<div class="order-item-row"><div style="display:flex; flex: 2; min-width: 140px; gap:5px;"><select class="orderTypeSelect" style="flex: 1;"></select><input type="text" class="orderTypeCustomInput" placeholder="اكتب نوع الطلب..." style="display:none; flex: 1;"><button type="button" class="btn-outline toggle-custom-btn" onclick="toggleOrderInput(this)" style="padding: 0 10px;">✍️</button></div> <input type="text" class="orderColorInput" placeholder="اللون (اختياري)" style="flex: 1; min-width: 100px;"> <div class="qty-controls" style="flex: 1; min-width: 120px;"><label style="color:#ccc; font-size:12px; margin:0;">العدد:</label><button type="button" class="qty-btn plus" onclick="changeQty(this, 1)">+</button><input type="number" class="orderQtyInput" value="1" min="1" style="width: 50px; text-align: center;"><button type="button" class="qty-btn minus" onclick="changeQty(this, -1)">-</button></div></div>`; 
    window.updateOrderTypeSelects(); 
};

window.changeQty = function(btn, d) { 
    let i = btn.parentElement.querySelector('input[type="number"]'), v = parseInt(i.value)||1; 
    v += d; 
    if(v<1) v=1; 
    i.value = v; 
};

window.extractValue = function(lines, keyword) {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(keyword)) {
            let val = lines[i].split(':').pop().trim().replace(/🛑/g, '').trim(); 
            if (val !== "" && val !== keyword.replace(/:/g, '').trim()) return val;
            if (i + 1 < lines.length) { 
                let nVal = lines[i+1].replace(/🛑/g, '').trim(); 
                if(nVal && !nVal.includes(':')) return nVal; 
            }
        }
    } return "";
};

window.parseText = function() {
    const txt = document.getElementById('pasteArea').value.trim(); if (!txt) return;
    const lines = txt.split('\n').map(l => l.trim()).filter(l => l !== '');
    
    document.getElementById('custId').value = window.extractValue(lines, 'تسلسل الزب'); 
    document.getElementById('custName').value = window.extractValue(lines, 'اسم الزبون'); 
    document.getElementById('phone1').value = window.extractValue(lines, 'رقم الهاتف الاول'); 
    document.getElementById('phone2').value = window.extractValue(lines, 'رقم الهاتف الثاني'); 
    document.getElementById('gov').value = window.extractValue(lines, 'المحافظة'); 
    document.getElementById('area').value = window.extractValue(lines, 'المنطقة'); 
    document.getElementById('amount').value = window.extractValue(lines, 'المبلغ الكلي'); 
    window.formatAmount(document.getElementById('amount')); 
    document.getElementById('note').value = window.extractValue(lines, 'ملاحظة مهمة');
    
    let s = document.querySelector('.orderTypeSelect'), 
        ci = document.querySelector('.orderTypeCustomInput'), 
        tb = s.parentElement.querySelector('.toggle-custom-btn');
    let extType = window.extractValue(lines, 'نوع الطلب');
    
    if (extType && s) {
        if (Array.from(s.options).some(o => o.value === extType)) { 
            if(s.style.display === 'none') window.toggleOrderInput(tb); 
            s.value = extType; 
        } else { 
            if(s.style.display !== 'none') window.toggleOrderInput(tb); 
            ci.value = extType; 
        }
    }
};

window.addToTable = async function() {
    const pg = document.getElementById('constantField').value; 
    if (!pg) { alert("📌 يجب اختيار البيج أولاً!"); return; }
    
    window.formatAmount(document.getElementById('amount'));

    let arr = [], totQty = 0;
    document.querySelectorAll('.order-item-row').forEach(r => {
        let s = r.querySelector('.orderTypeSelect'), ci = r.querySelector('.orderTypeCustomInput'), cv = r.querySelector('.orderColorInput').value.trim();
        let tv = (ci.style.display !== 'none') ? ci.value.trim() : s.value.trim();
        let qv = parseInt(r.querySelector('.orderQtyInput').value) || 1;
        if (tv !== "") { 
            let ft = configuredOrderTypes.find(t => t.name === tv); 
            let cd = ft ? ft.code : tv; 
            arr.push(`[${cd} (${qv})${cv ? ' ' + cv : ''}]`); 
            totQty += qv; 
        }
    });
    
    const data = { 
        id: document.getElementById('custId').value.trim(), 
        name: document.getElementById('custName').value.trim(), 
        phone1: document.getElementById('phone1').value.trim(), 
        phone2: document.getElementById('phone2').value.trim(), 
        gov: document.getElementById('gov').value.trim(), 
        area: document.getElementById('area').value.trim(), 
        type: arr.join(' + '), 
        qty: totQty || 1, 
        amount: document.getElementById('amount').value.trim(), 
        constant: pg, 
        note: document.getElementById('note').value.trim(), 
        addedBy: loggedInUser || 'مجهول', 
        status: 'جديد' 
    };
    
    if (!data.id && !data.name && !data.phone1) {
        alert("يرجى إدخال بيانات الطلب أولاً!");
        return;
    }

    if (window.saveDataToFirebase) { 
        const btn = document.getElementById("mainSaveBtn");
        btn.disabled = true; btn.innerText = "جاري الحفظ... ⏳";
        await window.saveDataToFirebase(data); 
        btn.disabled = false; btn.innerText = "إضافة إلى الجدول والحفظ سحابياً ➕";
    }
    
    const row = document.createElement('tr'); 
    row.innerHTML = `<td>${data.id}</td> <td style="color:var(--neon-gold);">${data.constant}</td> <td>${data.name}</td> <td dir="ltr">${data.phone1}</td> <td dir="ltr">${data.phone2}</td> <td>${data.gov}</td> <td>${data.area}</td> <td style="color:var(--neon-gold);" dir="ltr">${data.type}</td> <td style="color:var(--neon-gold);">${data.qty}</td> <td>${data.amount}</td> <td>${data.note}</td> <td><button class="btn-danger" style="padding: 6px 10px;" onclick="this.closest('tr').remove(); updateOrdersCounter();">حذف ❌</button></td>`;
    document.getElementById('tableBody').appendChild(row); 
    window.updateOrdersCounter(); 
    window.clearForm(); 
    document.getElementById('pasteArea').value = '';
    
    window.showSuccessToast("تمت إضافة الطلب وتخزينه سحابياً بنجاح! 🎉");
};

window.clearForm = function() { 
    ['custId','custName','phone1','phone2','gov','area','amount','note'].forEach(id => document.getElementById(id).value = ''); 
    window.resetItemsContainer(); 
};
window.clearAll = function() { 
    document.getElementById('pasteArea').value = ''; 
    document.getElementById('constantField').value = ''; 
    window.clearForm(); 
};
window.updateOrdersCounter = function() { 
    document.getElementById('ordersCounterBadge').innerText = `إجمالي الطلبات: ${document.getElementById('tableBody').rows.length}`; 
};

window.exportToExcel = function() {
    const trs = document.getElementById("tableBody").rows; if(trs.length === 0) return;
    let d = new Date(), ds = d.getFullYear() + "/" + (d.getMonth() + 1).toString().padStart(2, '0') + "/" + d.getDate().toString().padStart(2, '0');
    let exp = Array.from(trs).map((r, i) => {
        const amt = parseFloat(r.cells[9].innerText.replace(/[^0-9.-]+/g,"")) || 0;
        const del = r.cells[5].innerText.includes("بغداد") ? feeBaghdad : feeOther;
        return { 
            "ت": i+1, "البيج": r.cells[1].innerText, "رقم الوصل": r.cells[0].innerText || (i+1), "تاريخ": ds, 
            "اسم الزبون": r.cells[2].innerText, "رقم الهاتف": r.cells[3].innerText, 
            "العنوان": r.cells[5].innerText, "العنوان منطقة": r.cells[6].innerText, 
            "العدد": parseInt(r.cells[8].innerText)||1, "المبلغ الكلي": amt, 
            "مبلغ التوصيل": del, "المبلغ الصافي": amt-del, "ملاحظات": r.cells[7].innerText + (r.cells[10].innerText ? " - " + r.cells[10].innerText : "")
        };
    });
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exp), "الجدول"); 
    XLSX.writeFile(wb, "طلبات_المندوب.xlsx");
};
