// ==========================================
// 1. المتغيرات العامة والاتصال بالسحابة
// ==========================================
let database = [];
let ADMIN_PASSWORD = "1234"; // كلمة المرور الافتراضية

// دالة لجلب البيانات من السحابة عند فتح التطبيق
async function initCloudData() {
    if (!window.firebaseDB) {
        setTimeout(initCloudData, 500); // انتظار تحميل Firebase
        return;
    }
    
    const { db, doc, getDoc, collection, getDocs } = window.firebaseDB;
    try {
        // 1. جلب كلمة المرور
        const passDoc = await getDoc(doc(db, "settings", "password"));
        if (passDoc.exists()) {
            ADMIN_PASSWORD = passDoc.data().value;
        } else {
            await setDoc(doc(db, "settings", "password"), { value: "1234" }); // حفظ الافتراضية
        }

        // 2. جلب الهوية (الاسم والشعار)
        const identityDoc = await getDoc(doc(db, "settings", "identity"));
        if (identityDoc.exists()) {
            localStorage.setItem('appName', identityDoc.data().appName);
            localStorage.setItem('appLogo', identityDoc.data().appLogo);
            loadIdentity(); // تحديث الواجهة
        }

        // 3. جلب السجلات
        database = [];
        const querySnapshot = await getDocs(collection(db, "records"));
        querySnapshot.forEach((doc) => {
            database.push({ ...doc.data(), id: doc.id }); // إضافة الـ ID
        });

        // تحديث الواجهات
        renderTable();
        renderAdminDashboard();
        console.log("✅ تم تحميل البيانات من السحابة");
        
    } catch (error) {
        console.error("❌ خطأ في جلب البيانات:", error);
        showToast("فشل الاتصال بقاعدة البيانات", "danger");
    }
}

// ==========================================
// 2. تسجيل الدخول
// ==========================================
async function checkLogin() {
    const pass = document.getElementById('adminPassword').value;
    
    // إذا كانت كلمة المرور لم تجلب بعد، ننتظر قليلاً
    if (ADMIN_PASSWORD === "1234" && !window.firebaseDB) {
        await initCloudData();
    }
    
    if (pass === ADMIN_PASSWORD) {
        document.getElementById('loginScreen').style.display = 'none';
        sessionStorage.setItem('isAdmin', 'true');
        renderAdminDashboard();
        showToast("مرحباً بك في لوحة التحكم");
    } else {
        showToast("كلمة المرور خاطئة!", "danger");
    }
}

// ==========================================
// 3. الجدول الشهري
// ==========================================
function generateMonthDays() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let days = [];
    for (let i = 1; i <= daysInMonth; i++) {
        let date = new Date(year, month, i);
        let dayName = date.toLocaleDateString('ar-EG', { weekday: 'long' });
        let dateString = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
        let isWeekend = (dayName === 'الجمعة' || dayName === 'السبت');
        days.push({ day: i, name: dayName, date: dateString, isWeekend: isWeekend });
    }
    return days;
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    const days = generateMonthDays();

    days.forEach(day => {
        const record = database.find(r => r.date === day.date) || {};
        const tr = document.createElement('tr');
        if (day.isWeekend) tr.classList.add('weekend');

        tr.innerHTML = `
            <td>${day.name}</td>
            <td>${day.date}</td>
            <td>${record.supervisor || '-'}</td>
            <td>${record.issue || '-'}</td>
            <td>${record.notes || '-'}</td>
            <td>${record.commendation || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// 4. الإضافة والتعديل والحذف (مربوط بالسحابة)
// ==========================================
function renderAdminDashboard() {
    renderRecordsList();
    updateStats();
    loadIdentity();
}

function updateStats() {
    document.getElementById('statTotal').innerText = database.length;
    document.getElementById('statIssues').innerText = database.filter(r => r.issue).length;
    document.getElementById('statCommendations').innerText = database.filter(r => r.commendation).length;
}

document.getElementById('dataForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    
    const data = {
        date: document.getElementById('recordDate').value,
        supervisor: document.getElementById('supervisorName').value.trim(),
        issue: document.getElementById('issueType').value,
        commendation: document.getElementById('commendationType').value,
        notes: document.getElementById('notes').value.trim()
    };

    // استخدام التاريخ كـ ID فريد للسجل
    const recordId = data.date; 
    
    if (!window.firebaseDB) return showToast("جاري الاتصال... حاول مجدداً", "danger");
    const { db, doc, setDoc } = window.firebaseDB;

    try {
        // حفظ في السحابة (سيقوم بتحديث السجل إذا كان موجوداً أو إضافته إذا كان جديداً)
        await setDoc(doc(db, "records", recordId), data);
        
        // تحديث المصفوفة المحلية
        const existingIndex = database.findIndex(r => r.date === recordId);
        if (existingIndex > -1) {
            database[existingIndex] = { ...data, id: recordId };
        } else {
            database.push({ ...data, id: recordId });
        }

        showToast(editId ? "تم تعديل البيانات بنجاح ✅" : "تمت الإضافة بنجاح ✅");
        resetForm();
        renderTable();
        renderAdminDashboard();
    } catch (error) {
        console.error(error);
        showToast("حدث خطأ أثناء الحفظ", "danger");
    }
});

function resetForm() {
    document.getElementById('dataForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('recordDate').valueAsDate = new Date();
    document.getElementById('formTitle').innerText = "إضافة بيانات جديدة";
    document.getElementById('submitBtn').innerText = "حفظ البيانات";
}

function renderRecordsList() {
    const container = document.getElementById('recordsContainer');
    container.innerHTML = '';
    const sortedData = [...database].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#94a3b8;">لا توجد سجلات حتى الآن.</p>';
        return;
    }

    sortedData.forEach(record => {
        const card = document.createElement('div');
        card.className = 'record-card';
        card.innerHTML = `
            <div class="date">📅 ${record.date}</div>
            <div class="sup-name">👤 ${record.supervisor}</div>
            <div class="tags">
                ${record.issue ? `<span class="tag tag-issue">⚠️ ${record.issue}</span>` : ''}
                ${record.commendation ? `<span class="tag tag-commend">⭐ ${record.commendation}</span>` : ''}
            </div>
            <div class="notes">${record.notes ? '📝 ' + record.notes : 'لا توجد ملاحظات'}</div>
            <div class="card-actions">
                <button onclick="editRecord('${record.date}')" class="btn btn-primary">✏️ تعديل</button>
                <button onclick="deleteRecord('${record.date}')" class="btn btn-danger">🗑️ حذف</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function editRecord(date) {
    const record = database.find(r => r.date === date);
    if (record) {
        document.getElementById('recordDate').value = record.date;
        document.getElementById('supervisorName').value = record.supervisor;
        document.getElementById('issueType').value = record.issue;
        document.getElementById('commendationType').value = record.commendation;
        document.getElementById('notes').value = record.notes;
        document.getElementById('editId').value = record.date;
        document.getElementById('formTitle').innerText = "تعديل البيانات";
        document.getElementById('submitBtn').innerText = "تحديث البيانات";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

async function deleteRecord(date) {
    if (confirm('هل أنت متأكد من حذف هذا السجل نهائياً من السحابة؟')) {
        if (!window.firebaseDB) return;
        const { db, doc, deleteDoc } = window.firebaseDB;
        
        try {
            await deleteDoc(doc(db, "records", date));
            database = database.filter(r => r.date !== date);
            renderTable();
            renderAdminDashboard();
            showToast("تم الحذف بنجاح 🗑️", "danger");
        } catch (error) {
            console.error(error);
            showToast("حدث خطأ أثناء الحذف", "danger");
        }
    }
}

function filterRecords() {
    const search = document.getElementById('searchSupervisor').value.toLowerCase();
    const cards = document.querySelectorAll('.record-card');
    cards.forEach(card => {
        const name = card.querySelector('.sup-name').innerText.toLowerCase();
        card.style.display = name.includes(search) ? 'block' : 'none';
    });
}

// ==========================================
// 5. الإعدادات (كلمة المرور والهوية)
// ==========================================
document.getElementById('passwordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const current = document.getElementById('currentPassword').value;
    const newP = document.getElementById('newPassword').value;
    const confirmP = document.getElementById('confirmPassword').value;

    if (current !== ADMIN_PASSWORD) return showToast("كلمة المرور الحالية غير صحيحة! ❌", "danger");
    if (newP !== confirmP) return showToast("كلمة المرور الجديدة غير متطابقة! ⚠️", "danger");
    if (newP.length < 4) return showToast("كلمة المرور قصيرة جداً! ⚠️", "danger");

    if (!window.firebaseDB) return;
    const { db, doc, setDoc } = window.firebaseDB;

    try {
        await setDoc(doc(db, "settings", "password"), { value: newP });
        ADMIN_PASSWORD = newP;
        this.reset();
        showToast("تم تغيير كلمة المرور في السحابة بنجاح! ✅");
    } catch (error) {
        showToast("خطأ في تحديث كلمة المرور", "danger");
    }
});

document.getElementById('identityForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const newName = document.getElementById('newAppName').value.trim() || "الإدارة العامة";
    const newLogo = document.getElementById('newLogoUrl').value.trim() || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

    if (!window.firebaseDB) return;
    const { db, doc, setDoc } = window.firebaseDB;

    try {
        await setDoc(doc(db, "settings", "identity"), { appName: newName, appLogo: newLogo });
        localStorage.setItem('appName', newName);
        localStorage.setItem('appLogo', newLogo);
        loadIdentity();
        this.reset();
        showToast("تم تحديث هوية النظام في السحابة! 🎨");
    } catch (error) {
        showToast("خطأ في تحديث الهوية", "danger");
    }
});

function loadIdentity() {
    const savedName = localStorage.getItem('appName') || "الإدارة العامة";
    const savedLogo = localStorage.getItem('appLogo') || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    
    document.getElementById('appName').innerText = savedName;
    document.getElementById('loginTitle').innerText = "🔒 دخول " + savedName;
    document.getElementById('appLogo').src = savedLogo;
}

// ==========================================
// 6. أدوات مساعدة
// ==========================================
function showToast(message, type = "success") {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.style.backgroundColor = type === "danger" ? "var(--danger)" : "var(--success)";
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

function openTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
}

function exportExcel() {
    const table = document.getElementById('mainTable');
    const wb = XLSX.utils.table_to_book(table, {sheet: "التقرير"});
    XLSX.writeFile(wb, "التقرير_الشهري.xlsx");
}

function exportPDF() {
    const element = document.getElementById('reports');
    const opt = {
        margin:       0.5,
        filename:     'التقرير_الشهري.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
}

function toggleDarkMode() {
    document.body.classList.toggle('light-mode');
}

// PWA
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block';
});
function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') installBtn.style.display = 'none';
            deferredPrompt = null;
        });
    }
}

// تشغيل التطبيق
window.onload = () => {
    document.getElementById('recordDate').valueAsDate = new Date();
    initCloudData(); // الاتصال بالسحابة وجلب البيانات
    
    if(sessionStorage.getItem('isAdmin') === 'true') {
        document.getElementById('loginScreen').style.display = 'none';
        renderAdminDashboard();
    }
};
