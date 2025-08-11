
// دوال الموقع الجغرافي
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
}

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const locations = {
  "naseem1": { lat: 21.381115689864014, lon: 39.87005086015681, radius: 50 },
  "naseem4": { lat: 21.383055291801348, lon: 39.871809482514266, radius: 100 },
   "test1": { lat: 21.524353661044245, lon: 39.15289418650849, radius: 500 },

  "amany": { lat: 21.353332012296036, lon: 39.83317700978527, radius: 100 },
  "mohammed": { lat: 21.358667827435426, lon: 39.91056507116383, radius: 50 },
  "ahmad": { lat: 21.547709791439225, lon: 39.14679219068816, radius: 100 }
 
};


async function isUserInRange() {
  const selected = document.getElementById("location").value;
  if (!locations[selected]) return false;
  const { lat, lon, radius } = locations[selected];
  try {
    const pos = await getCurrentPosition();
    const userLat = pos.coords.latitude;
    const userLon = pos.coords.longitude;
    const distance = haversine(userLat, userLon, lat, lon);
    return distance <= radius;
  } catch (error) {
    alert("⚠️ حدث خطأ أثناء تحديد الموقع: " + error.message);
    return false;
  }
}

function isWithinShift(shift, currentTime = new Date()) {
  const [startStr, endStr] = shift.split(" - ");
  const [startHour, startMin] = startStr.split(":").map(Number);
  const [endHour, endMin] = endStr.split(":").map(Number);
  const start = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), startHour, startMin);
  let end = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHour, endMin);
  if (end < start) end.setDate(end.getDate() + 1);
  return currentTime >= start && currentTime <= end;
}

let lastCheckIn = null;
let lastCheckOut = null;

function showReminderModal() {
  const modal = document.getElementById("reminderModal");
  if (modal) modal.style.display = 'block';
}

function closeReminderModal() {
  const modal = document.getElementById("reminderModal");
  if (modal) modal.style.display = 'none';
}

window.addEventListener("click", e => {
  if (e.target.id === "reminderModal") closeReminderModal();
});

document.addEventListener("DOMContentLoaded", () => {
  const checkInBtn = document.querySelector(".btn-checkin");
  const checkOutBtn = document.querySelector(".btn-checkout");
  const form = document.querySelector("#attendanceForm");
  const statusMessage = document.getElementById("statusMessage");

  const nameInput = document.getElementById("fullName");
  const idInput = document.getElementById("idNumber");
  const phoneInput = document.getElementById("phoneNumber");

  if (localStorage.getItem("fullName")) nameInput.value = localStorage.getItem("fullName");
  if (localStorage.getItem("idNumber")) idInput.value = localStorage.getItem("idNumber");
  if (localStorage.getItem("phoneNumber")) phoneInput.value = localStorage.getItem("phoneNumber");

  checkInBtn.addEventListener("click", async e => {
    e.preventDefault();
    const shift = document.getElementById("shiftTime").value;
    const now = new Date();
    if (!isWithinShift(shift, now)) return showMessage("❌ لا يمكنك اختيار هذه الوردية الآن. الرجاء اختيار الوردية المناسبة حسب الوقت الحالي.", "error");
    if (lastCheckIn && now - lastCheckIn < 60000) return showMessage("❌ تم تسجيل الحضور بالفعل في الدقيقة الحالية. لا يمكن التسجيل مرة أخرى.", "error");
    if (!await isUserInRange()) return showMessage("❌ انت خارج النطاق المحدد للموقع.", "error");

    const [startHour, startMin] = shift.split(" - ")[0].split(":").map(Number);
    const shiftStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMin);
    const diffMin = Math.floor((now - shiftStart) / 60000);
    let status = "";
    let statusType = "";
    if (diffMin <= -10) {
      status = "⚠️ تم التحضير - حضور مبكر";
      statusType = "warning";
    } else if (diffMin >= 0 && diffMin <= 5) {
      status = "✅ تم التحضير - في الوقت";
      statusType = "success";
    } else if (diffMin > 5) {
      status = `⚠️ تم التحضير - تأخير ${diffMin} دقيقة`;
      statusType = "warning";
    } else {
      status = "✅ تم التحضير";
      statusType = "success";
    }

    localStorage.setItem("fullName", nameInput.value);
    localStorage.setItem("idNumber", idInput.value);
    localStorage.setItem("phoneNumber", phoneInput.value);

    lastCheckIn = now;
    checkInBtn.disabled = true;
    checkOutBtn.disabled = false;
    showReminderModal();

    const formData = new FormData(form);
    formData.append("actionType", "تسجيل حضور");
    await fetchPost(formData);
    showMessage(status, statusType);
  });

  checkOutBtn.addEventListener("click", async e => {
    e.preventDefault();
    const shift = document.getElementById("shiftTime").value;
    const now = new Date();
    if (!isWithinShift(shift, now)) return showMessage("❌ اختر الوقت الصحيح لدوامك.", "error");
    if (lastCheckOut && now - lastCheckOut < 60000) return showMessage("❌ تم تسجيل الانصراف بالفعل في الدقيقة الحالية. لا يمكن التسجيل مرة أخرى.", "error");
    if (!await isUserInRange()) return showMessage("❌ انت خارج النطاق المحدد للموقع.", "error");

    lastCheckOut = now;
    checkInBtn.disabled = false;
    checkOutBtn.disabled = true;

    const formData = new FormData(form);
    formData.append("actionType", "تسجيل انصراف");
    await fetchPost(formData);
    showMessage("✅ تم تسجيل الانصراف بنجاح. شكراً لك!", "success");
    form.reset();
  });

  function showMessage(text, type) {
    statusMessage.textContent = text;
    statusMessage.className = 'status-message ' + type;
    statusMessage.style.display = 'block';
  }

  async function fetchPost(data) {
    try {
      await fetch("https://script.google.com/macros/s/AKfycbx88024oHiBj4AWmHUBT9ZywDIFKsBXXZmeGxklF_E--YTeh11eMZMrAnmQmmIaSua2uA/exec", {
        method: "POST",
        body: data
      });
    } catch (err) {
      showMessage("❌ فشل الاتصال بالخادم", "error");
    }
  }
});


// 🆕 تعديل submitForm لتستخدم النافذة التذكيرية بدلاً من alert
function submitForm(type) {
  const idInput = document.getElementById("idNumber");
  const fullNameInput = document.getElementById("fullName");
  const phoneInput = document.getElementById("phoneNumber");

  const idVal = idInput.value;
  const savedData = JSON.parse(localStorage.getItem("userData") || "{}");

  savedData[idVal] = {
    name: fullNameInput.value,
    phone: phoneInput.value
  };

  localStorage.setItem("userData", JSON.stringify(savedData));

  // ✅ عرض النافذة التذكيرية
  showReminderModal();
}
