// قاعدة بيانات وهمية مؤقتة (يمكنك استبدالها بـ Firebase أو Google Sheets لاحقاً)
let database = [];

// توليد أيام الشهر الحالي
function generateMonthDays() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let days = [];
    for (let i = 1; i <= daysInMonth; i++) {
        let date = new Date(year, month, i);
        let dayName = date.toLocaleDateString('ar-EG', { weekday: 'long' });
        let dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
        // تحديد الويكند (الجمعة والسبت)
        let isWeekend = (dayName === 'الجمعة' || dayName === 'السبت');
        days.push({ day: i, name: dayName, date: dateString, isWeekend: isWeekend });
    }
    return days;
}

// تحديث الجدول الرئيسي
function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    const days = generateMonthDays();

    days.forEach(day => {
        // البحث عن بيانات مسجلة لهذا اليوم
        const record = database.find(r => r.date === day.date) || {};
        
        const tr = document.createElement('tr');
        if (day.isWeekend) tr.classList.add('weekend'); // إضافة لون الويكند

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

// إدارة التبويبات
function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

// إضافة / تعديل البيانات
document.getElementById('dataForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const data = {
        date: document.getElementById('recordDate').value,
        supervisor: document.getElementById('supervisorName').value,
        issue: document.getElementById('issueType').value,
        commendation: document.getElementById('commendationType').value,
        notes: document.getElementById('notes').value
    };

    if (id) {
        // تعديل
        const index = database.findIndex(r => r.date === id);
        database[index] = data;
    } else {
        // إضافة جديدة (استبدال إذا كان التاريخ موجود)
        const existingIndex = database.findIndex(r => r.date === data.date);
        if(existingIndex > -1) {
            database[existingIndex] = data;
        } else {
            database.push(data);
        }
    }

    this.reset();
    document.getElementById('editId').value = '';
    renderTable();
    renderRecordsList();
    alert('تم الحفظ بنجاح!');
});

// عرض السجلات في لوحة التحكم (للتعديل والحذف)
function renderRecordsList() {
    const list = document.getElementById('recordsList');
    list.innerHTML = '';
    database.forEach(record => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${record.date} - ${record.supervisor} (${record.issue || 'لا يوجد'})</span>
            <div>
                <button onclick="editRecord('${record.date}')" class="btn btn-primary">تعديل</button>
                <button onclick="deleteRecord('${record.date}')" class="btn btn-danger">حذف</button>
            </div>
        `;
        list.appendChild(li);
    });
}

// دالة التعديل
function editRecord(date) {
    const record = database.find(r => r.date === date);
    if (record) {
        document.getElementById('recordDate').value = record.date;
        document.getElementById('supervisorName').value = record.supervisor;
        document.getElementById('issueType').value = record.issue;
        document.getElementById('commendationType').value = record.commendation;
        document.getElementById('notes').value = record.notes;
        document.getElementById('editId').value = record.date; // نخزن التاريخ كمعرف
        window.scrollTo(0, 0);
    }
}

// دالة الحذف
function deleteRecord(date) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
        database = database.filter(r => r.date !== date);
        renderTable();
        renderRecordsList();
    }
}

// تصدير إلى Excel
function exportExcel() {
    const table = document.getElementById('mainTable');
    const wb = XLSX.utils.table_to_book(table, {sheet: "التقرير"});
    XLSX.writeFile(wb, "التقرير_الشهري.xlsx");
}

// تصدير إلى PDF (باستخدام html2pdf)
function exportPDF() {
    const element = document.getElementById('reports');
    const opt = {
        margin:       0.5,
        filename:     'التقرير_الشهري.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' } // landscape هنا أيضاً
    };
    html2pdf().set(opt).from(element).save();
}

// الوضع الليلي / الفاتح
function toggleDarkMode() {
    document.body.classList.toggle('light-mode');
}

// ==========================================
// برمجة تطبيق سطح المكتب (PWA)
// ==========================================
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block'; // إظهار زر التثبيت
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            installBtn.style.display = 'none';
        }
        deferredPrompt = null;
    }
});

// تشغيل الدوال عند تحميل الصفحة
window.onload = () => {
    // تعيين تاريخ اليوم افتراضياً
    document.getElementById('recordDate').valueAsDate = new Date();
    renderTable();
    renderRecordsList();
};
