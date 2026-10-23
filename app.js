// ==========================================
// 1. إدارة البيانات (Persistence)
// ==========================================
let database = JSON.parse(localStorage.getItem('adminData')) || [];
let ADMIN_PASSWORD = localStorage.getItem('adminPassword') || "1234";

// حفظ البيانات
function saveToLocalStorage() {
    localStorage.setItem('adminData', JSON.stringify(database));
}

// ==========================================
// 2. تسجيل الدخول
// ==========================================
function checkLogin() {
    const pass = document.getElementById('adminPassword').value;
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
// 3. توليد الجدول الشهري (يشمل كل أيام الشهر)
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
        // أيام الويكند (الجمعة والسبت)
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
        // البحث عن سجل لهذا اليوم
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
// 4. لوحة التحكم والإحصائيات
// ==========================================
function renderAdminDashboard() {
    renderRecordsList();
    updateStats();
    loadIdentity(); // تحميل الشعار والاسم
}

function updateStats() {
    document.getElementById('statTotal').innerText = database.length;
    document.getElementById('statIssues').innerText = database.filter(r => r.issue).length;
    document.getElementById('statCommendations').innerText = database.filter(r => r.commendation).length;
}

// إضافة / تعديل البيانات
document.getElementById('dataForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    
    const data = {
        date: document.getElementById('recordDate').value,
        supervisor: document.getElementById('supervisorName').value.trim(),
        issue: document.getElementById('issueType').value,
        commendation: document.getElementById('commendationType').value,
        notes: document.getElementById('notes').value.trim()
    };

    if (editId) {
        const index = database.findIndex(r => r.date === editId);
        if(index > -1) database[index] = data;
        showToast("تم تعديل البيانات بنجاح ✅");
    } else {
        const existingIndex = database.findIndex(r => r.date === data.date);
        if(existingIndex > -1) {
            database[existingIndex] = data; 
        } else {
            database.push(data); 
        }
        showToast("تمت الإضافة بنجاح ✅");
    }

    saveToLocalStorage();
    resetForm();
    renderTable();
    renderAdminDashboard();
});

function resetForm() {
    document.getElementById('dataForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('recordDate').valueAsDate = new Date();
    document.getElementById('formTitle').innerText = "إضافة بيانات جديدة";
    document.getElementById('submitBtn').innerText = "حفظ البيانات";
}

// عرض السجلات
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

// تعديل وحذف
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

function deleteRecord(date) {
    if (confirm('هل أنت متأكد من حذف هذا السجل نهائياً؟')) {
        database = database.filter(r => r.date !== date);
        saveToLocalStorage();
        renderTable();
        renderAdminDashboard();
        showToast("تم الحذف بنجاح 🗑️", "danger");
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
document.getElementById('passwordForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const current = document.getElementById('currentPassword').value;
    const newP = document.getElementById('newPassword').value;
    const confirmP = document.getElementById('confirmPassword').value;

    if (current !== ADMIN_PASSWORD) return showToast("كلمة المرور الحالية غير صحيحة! ❌", "danger");
    if (newP !== confirmP) return showToast("كلمة المرور الجديدة غير متطابقة! ⚠️", "danger");
    if (newP.length < 4) return showToast("كلمة المرور قصيرة جداً! ⚠️", "danger");

    ADMIN_PASSWORD = newP;
    localStorage.setItem('adminPassword', newP);
    this.reset();
    showToast("تم تغيير كلمة المرور بنجاح! ✅");
});

document.getElementById('identityForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const newName = document.getElementById('newAppName').value.trim();
    const newLogo = document.getElementById('newLogoUrl').value.trim();

    if(newName) localStorage.setItem('appName', newName);
    if(newLogo) localStorage.setItem('appLogo', newLogo);

    loadIdentity();
    this.reset();
    showToast("تم تحديث هوية النظام بنجاح! 🎨");
});

function loadIdentity() {
    const savedName = localStorage.getItem('appName') || "الإدارة العامة";
    const savedLogo = localStorage.getItem('appLogo') || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    
    document.getElementById('appName').innerText = savedName;
    document.getElementById('loginTitle').innerText = "🔒 دخول " + savedName;
    document.getElementById('appLogo').src = savedLogo;
}

// ==========================================
// 6. الأدوات المساعدة (تنبيهات، تصدير، إلخ)
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

// التشغيل
window.onload = () => {
    document.getElementById('recordDate').valueAsDate = new Date();
    renderTable();
    loadIdentity();
    if(sessionStorage.getItem('isAdmin') === 'true') {
        document.getElementById('loginScreen').style.display = 'none';
        renderAdminDashboard();
    }
};
