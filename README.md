# ระบบตรวจสอบและรายงานสถานะ Cloud Server คณะพยาบาลศาสตร์ (BCNNV Cloud Status)
### คณะพยาบาลศาสตร์ สถาบันพระบรมราชชนก (FONMIS-Cloud_Status)

ระบบตรวจสอบและรายงานสถานะเครื่องแม่ข่ายคลาวด์ (Cloud Server Status Dashboard) และระบบงานย่อยที่ให้บริการของคณะพยาบาลศาสตร์ สถาบันพระบรมราชชนก พัฒนาด้วยสถาปัตยกรรม **GitHub Pages (Frontend)** เชื่อมโยงกับ **Google Apps Script REST API (Backend)** และจัดเก็บข้อมูลบน **Google Sheets (แท็บ `webapp`)**

---

## 🌐 เข้าชมหน้าเว็บแอปพลิเคชัน (Live URL)

- **GitHub Pages (แนะนำ):** [https://citbcnsprnw.github.io/FONMIS-Cloud_Status/](https://citbcnsprnw.github.io/FONMIS-Cloud_Status/)
- **Google Apps Script Web App (API Endpoint):** [https://script.google.com/macros/s/AKfycbz23Uzy5dfQaJ4HPeWCrloL6ORRmhcWa2OjplPp8ig5D_pV5S3ZdtoxeyeIGRSbpIvj/exec](https://script.google.com/macros/s/AKfycbz23Uzy5dfQaJ4HPeWCrloL6ORRmhcWa2OjplPp8ig5D_pV5S3ZdtoxeyeIGRSbpIvj/exec)

---

## ✨ คุณสมบัติเด่นของระบบ

1. **หน้ารายงานสาธารณะ (Public Cloud Status Dashboard):**
   - แสดงสเปกฮาร์ดแวร์ของเครื่องแม่ข่ายแต่ละเครื่อง (OS, CPU Cores, RAM, HDD)
   - สรุปตัวเลขทรัพยากรภาพรวม (vCPU รวม, RAM รวม) โดยนับสเปก 1 เครื่องต่อ 1 ครั้ง ไม่บวกซ้ำตามจำนวนระบบงานย่อย
   - ตารางระบบงานและบริการภายใน พร้อมลิงก์ปุ่ม "คลิก" สีน้ำเงินไฮไลท์พอดีแถว
   - ป้ายกำกับสถานะ 4 รูปแบบ:
     - 🟢 **ใช้งาน** (สีเขียว)
     - 🟠 **อยู่ระหว่างการพัฒนา** (สีส้ม)
     - 🔵 **ว่าง** (สีฟ้า)
     - ⚪ **ไม่มีข้อมูล** (สีเทาอ่อน สำหรับสถานะอื่นๆ พร้อมแสดง Tooltip รายละเอียดจริงจากชีต)
   - นาฬิกาแสดง วันที่ และ เวลา แบบ Live Clock แสดงสถานะออนไลน์แบบ Real-time

2. **ระบบจัดการข้อมูลสำหรับเจ้าหน้าที่ (Admin Inline Spreadsheet Editor):**
   - เมนู **"สำหรับเจ้าหน้าที่"** บน Navbar พร้อมระบบยืนยันรหัสผ่านเพื่อความปลอดภัย
   - ตารางแก้ไขข้อมูลแบบ Excel โดยตรงบนหน้าเว็บ (Inline Editing)
   - เพิ่มแถวใหม่ (`+ เพิ่มแถวใหม่`), ลบแถว (`🗑️ ลบแถว`)
   - ปุ่มบันทึกข้อมูลลงชีต (`💾 บันทึกข้อมูลลงชีต`) อัปเดตข้อมูลตรงไปยัง Google Sheets แท็บ `webapp` ทันที

3. **มาตรฐานความปลอดภัยข้อมูล (Zero-Leakage Security Policy):**
   - ซ่อนข้อมูลสำคัญทั้งหมด (Username, Password, Internal IP, Public IP) ไม่ถูกส่งออกมายังหน้าเว็บสาธารณะ

---

## 🛠️ สถาปัตยกรรมระบบ (Architecture)

```
[ GitHub Pages: index.html ]  <--- Fetch REST API (JSON) --->  [ Google Apps Script (Code.gs) ]
(https://citbcnsprnw.github.io/FONMIS-Cloud_Status/)                     │
                                                                         ▼
                                                                [ Google Sheets: webapp ]
```

---

## 📄 ลิขสิทธิ์และการพัฒนา

&copy; 2026 คณะพยาบาลศาสตร์ สถาบันพระบรมราชชนก  
เวอร์ชัน: `v1.2.0` (Build `2026.10.14`)
