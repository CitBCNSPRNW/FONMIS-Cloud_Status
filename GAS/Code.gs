/**
 * =========================================================================
 * รายงานสถานะ Cloud คณะพยาบาลศาสตร์ สถาบันพระบรมราชชนก
 * BCNNV Cloud Server Status Public Dashboard
 * Master Controller & Sanitized Public API
 * Version: v1.0.1 (Build 2026.10.14)
 * =========================================================================
 */

const CONFIG = {
  APP_TITLE: 'รายงานสถานะ Cloud',
  FACULTY_NAME: 'คณะพยาบาลศาสตร์ สถาบันพระบรมราชชนก',
  APP_VERSION: 'v1.2.0',
  BUILD_DATE: '2026.10.14',
  TARGET_SHEET_NAME: 'webapp'
};

const ADMIN_PASSWORD = 'Fonmis2569';

/**
 * เสิร์ฟหน้าเว็บแอปพลิเคชัน และรองรับ REST API สำหรับ GitHub Pages
 */
function doGet(e) {
  // รองรับ REST API สำหรับ GitHub Pages หรือ External Clients
  if (e && e.parameter && e.parameter.action) {
    const action = e.parameter.action;
    let result = { success: false, message: 'Invalid action' };

    if (action === 'getPublicCloudStatusData') {
      result = getPublicCloudStatusData();
    } else if (action === 'verifyAdminPassword') {
      result = verifyAdminPassword(e.parameter.password);
    } else if (action === 'getWebappRawSheetData') {
      result = getWebappRawSheetData(e.parameter.password);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // หากไม่มี action ให้แสดงหน้า HTML Web App ตามปกติ
  const template = HtmlService.createTemplateFromFile('index');
  template.config = CONFIG;
  return template.evaluate()
    .setTitle(CONFIG.APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * รองรับคำขอ POST จากภายนอก (REST API สำหรับ GitHub Pages) สำหรับบันทึกข้อมูล
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
      if (typeof payload.rowsData === 'string') {
        payload.rowsData = JSON.parse(payload.rowsData);
      }
    }

    const action = payload.action;
    let result = { success: false, message: 'Invalid action' };

    if (action === 'saveWebappSheetData') {
      result = saveWebappSheetData(payload.password, payload.rowsData);
    } else if (action === 'verifyAdminPassword') {
      result = verifyAdminPassword(payload.password);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'เกิดข้อผิดพลาดในการประมวลผลคำขอ POST: ' + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ฟังก์ชันนำเข้าไฟล์ย่อย (Include Helper)
 */
function include(filename) {
  try {
    const template = HtmlService.createTemplateFromFile(filename);
    template.config = CONFIG;
    return template.evaluate().getContent();
  } catch (err) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  }
}

/**
 * ค้นหาแท็บชีต 'webapp' อย่างแม่นยำ ป้องกันการดึงชีตผิดหรือดึงชีตลับของผู้ดูแล
 */
function findWebappSheet(ss) {
  if (!ss) return null;

  // 1. ลองค้นหาด้วยชื่อตรงๆ
  let sheet = ss.getSheetByName(CONFIG.TARGET_SHEET_NAME);
  if (sheet) return sheet;

  // 2. ค้นหาแบบ Trim ช่องว่างและไม่สนตัวพิมพ์เล็ก-ใหญ่ (Case-insensitive)
  const allSheets = ss.getSheets();
  for (let i = 0; i < allSheets.length; i++) {
    const currentName = allSheets[i].getName().trim().toLowerCase();
    if (currentName === CONFIG.TARGET_SHEET_NAME.toLowerCase()) {
      return allSheets[i];
    }
  }

  // 3. ค้นหาชีตที่มีคำว่า webapp
  for (let i = 0; i < allSheets.length; i++) {
    const currentName = allSheets[i].getName().trim().toLowerCase();
    if (currentName.includes('webapp')) {
      return allSheets[i];
    }
  }

  return null;
}

/**
 * ดึงข้อมูลสถานะ Cloud และระบบงานจากชีต 'webapp' เท่านั้น
 * กรองเฉพาะข้อมูลที่ปลอดภัยสำหรับสาธารณะ 100% (Zero-Leakage Security Policy)
 */
function getPublicCloudStatusData() {
  try {
    let ss;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      ss = null;
    }

    if (!ss) {
      const sheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      if (sheetId) {
        ss = SpreadsheetApp.openById(sheetId);
      }
    }

    if (!ss) {
      return {
        success: false,
        message: 'ไม่สามารถระบุ Google Sheet ได้ กรุณาผูกสคริปต์กับชีต หรือกำหนด SPREADSHEET_ID ใน Script Properties'
      };
    }

    // ค้นหาเฉพาะแท็บ webapp อย่างเข้มงวด ห้าม fallback ไปยังชีตแรกเด็ดขาด
    const sheet = findWebappSheet(ss);
    if (!sheet) {
      return {
        success: false,
        message: 'ไม่พบแท็บชีตชื่อ "' + CONFIG.TARGET_SHEET_NAME + '" ในไฟล์สเปรดชีต กรุณาตรวจสอบชื่อแท็บชีต'
      };
    }

    const data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) {
      return {
        success: false,
        message: 'ไม่พบแถวข้อมูลในชีต ' + sheet.getName()
      };
    }

    // แถวที่ 1 คือ Header
    // คอลัมน์ที่กำหนด:
    // A (0): Server Name | B (1): OS | C (2): CPU | D (3): RAM | E (4): HDD | F (5): ลำดับ | G (6): ระบบภายใน | H (7): url | I (8): หมายเหตุ | J (9): สถานะ
    const serversMap = new Map();
    let totalServicesCount = 0;
    let activeServicesCount = 0;
    let devServicesCount = 0;
    let vacantServicesCount = 0;
    let noInfoServicesCount = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const serverName = String(row[0] || '').trim();
      if (!serverName) continue; // ข้ามแถวว่าง

      const os = String(row[1] || 'Ubuntu 22.04').trim();
      const cpu = String(row[2] || '-').trim();
      const ram = String(row[3] || '-').trim();
      const hdd = String(row[4] || '-').trim();

      const serviceOrder = row[5] !== '' && !isNaN(Number(row[5])) 
        ? Number(row[5]) 
        : (serversMap.has(serverName) ? serversMap.get(serverName).services.length + 1 : 1);
        
      const serviceName = String(row[6] || '').trim();
      const rawUrl = String(row[7] || '').trim();
      const remark = String(row[8] || '').trim();
      const rawStatus = String(row[9] || '').trim();

      // จัดหมวดหมู่สถานะ 4 ประเภท:
      // 1. ใช้งาน (success - เขียว)
      // 2. อยู่ระหว่างการพัฒนา (dev - ส้ม)
      // 3. ว่าง (info - ฟ้า)
      // 4. ไม่มีข้อมูล (no-info - เทา/เตือน สำหรับค่าอื่นๆ เช่น ยุคของโจ วุฒิชัย)
      let displayStatus = 'ไม่มีข้อมูล';
      let statusType = 'no-info';

      if (/อยู่ระหว่างการพัฒนา|ระหว่างพัฒนา|กำลังพัฒนา|development|in progress|dev/i.test(rawStatus)) {
        displayStatus = 'อยู่ระหว่างการพัฒนา';
        statusType = 'dev';
      } else if (/ใช้งาน|ปกติ|active|online/i.test(rawStatus)) {
        displayStatus = 'ใช้งาน';
        statusType = 'success';
      } else if (/ว่าง|vacant|available/i.test(rawStatus)) {
        displayStatus = 'ว่าง';
        statusType = 'info';
      } else {
        displayStatus = 'ไม่มีข้อมูล';
        statusType = 'no-info';
      }

      // ตรวจสอบและลงทะเบียนเครื่องแม่ข่าย (Deduplication: รวมสเปกฮาร์ดแวร์ CPU/RAM/HDD เป็นเครื่องเดียว ไม่บวกซ้ำ)
      if (!serversMap.has(serverName)) {
        serversMap.set(serverName, {
          server_name: serverName,
          os: os,
          cpu: cpu,
          ram: ram,
          hdd: hdd,
          services: []
        });
      }

      // หากแถวนี้มีข้อมูลบริการ หรือมีสถานะ หรือมีลิงก์ หรือมีหมายเหตุ ให้นำเข้าระบบ
      const hasServiceEntry = serviceName !== '' || rawStatus !== '' || rawUrl !== '' || remark !== '';
      if (hasServiceEntry) {
        totalServicesCount++;
        if (statusType === 'dev') {
          devServicesCount++;
        } else if (statusType === 'success') {
          activeServicesCount++;
        } else if (statusType === 'info') {
          vacantServicesCount++;
        } else {
          noInfoServicesCount++;
        }

        serversMap.get(serverName).services.push({
          order: serviceOrder,
          name: serviceName || '-',
          url: rawUrl,
          remark: remark,
          status: displayStatus,
          raw_status: rawStatus || 'ไม่มีข้อมูล', // ข้อความสถานะจริงสำหรับ Tooltip
          status_type: statusType
        });
      }
    }

    const serversList = Array.from(serversMap.values());

    // คำนวณสรุปสถิติทรัพยากรจากเครื่องที่ไม่ซ้ำกัน (1 เครื่องนับ CPU/RAM เพียง 1 ครั้ง ไม่บวกซ้ำตามแถวบริการ)
    let totalCpuCores = 0;
    let totalRamGb = 0;

    serversList.forEach(s => {
      const cpuMatch = s.cpu.match(/(\d+)/);
      if (cpuMatch) totalCpuCores += parseInt(cpuMatch[1], 10);

      const ramMatch = s.ram.match(/(\d+)/);
      if (ramMatch) totalRamGb += parseInt(ramMatch[1], 10);
    });

    return {
      success: true,
      sheet_used: sheet.getName(),
      last_updated: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'),
      summary: {
        total_servers: serversList.length,
        total_services: totalServicesCount,
        active_services: activeServicesCount,
        dev_services: devServicesCount,
        vacant_services: vacantServicesCount,
        no_info_services: noInfoServicesCount,
        total_cpu_cores: totalCpuCores,
        total_ram_gb: totalRamGb
      },
      servers: serversList
    };

  } catch (error) {
    return {
      success: false,
      message: 'เกิดข้อผิดพลาดในการประมวลผลข้อมูล: ' + error.toString()
    };
  }
}

/**
 * =========================================================================
 * ส่วนงานจัดการข้อมูลสำหรับเจ้าหน้าที่ (Admin Spreadsheet Services)
 * =========================================================================
 */

/**
 * ตรวจสอบรหัสผ่านสำหรับเจ้าหน้าที่
 */
function verifyAdminPassword(password) {
  if (String(password || '').trim() === ADMIN_PASSWORD) {
    return { success: true, message: 'รหัสผ่านถูกต้อง ยินดีต้อนรับสู่โหมดเจ้าหน้าที่' };
  }
  return { success: false, message: 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' };
}

/**
 * ดึงข้อมูลดิบทั้งหมดในแท็บ 'webapp' สำหรับแสดงในตารางแก้ไขแบบ Excel
 */
function getWebappRawSheetData(password) {
  if (String(password || '').trim() !== ADMIN_PASSWORD) {
    return { success: false, message: 'ไม่มีสิทธิ์เข้าถึง (รหัสผ่านไม่ถูกต้อง)' };
  }

  try {
    let ss;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      ss = null;
    }
    if (!ss) {
      const sheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      if (sheetId) ss = SpreadsheetApp.openById(sheetId);
    }
    if (!ss) return { success: false, message: 'ไม่พบไฟล์ Spreadsheet' };

    const sheet = findWebappSheet(ss);
    if (!sheet) return { success: false, message: 'ไม่พบแท็บชีต ' + CONFIG.TARGET_SHEET_NAME };

    const data = sheet.getDataRange().getValues();
    const standardHeaders = ['Server Name', 'OS', 'CPU', 'RAM', 'HDD', 'ลำดับ', 'ระบบภายใน', 'url', 'หมายเหตุ', 'สถานะ'];

    if (!data || data.length === 0) {
      return {
        success: true,
        headers: standardHeaders,
        rows: []
      };
    }

    const headers = data[0].map(h => String(h || '').trim());
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowData = [];
      for (let c = 0; c < 10; c++) {
        rowData.push(row[c] !== undefined && row[c] !== null ? String(row[c]).trim() : '');
      }
      rows.push(rowData);
    }

    return {
      success: true,
      headers: headers.length >= 10 ? headers.slice(0, 10) : standardHeaders,
      rows: rows
    };
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลชีต: ' + err.toString() };
  }
}

/**
 * บันทึกข้อมูลตารางที่แก้ไขแล้วลงแท็บ 'webapp'
 */
function saveWebappSheetData(password, rowsData) {
  if (String(password || '').trim() !== ADMIN_PASSWORD) {
    return { success: false, message: 'ไม่มีสิทธิ์บันทึกข้อมูล (รหัสผ่านไม่ถูกต้อง)' };
  }

  if (!Array.isArray(rowsData)) {
    return { success: false, message: 'รูปแบบข้อมูลไม่ถูกต้อง' };
  }

  try {
    let ss;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      ss = null;
    }
    if (!ss) {
      const sheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      if (sheetId) ss = SpreadsheetApp.openById(sheetId);
    }
    if (!ss) return { success: false, message: 'ไม่พบไฟล์ Spreadsheet' };

    const sheet = findWebappSheet(ss);
    if (!sheet) return { success: false, message: 'ไม่พบแท็บชีต ' + CONFIG.TARGET_SHEET_NAME };

    const standardHeaders = ['Server Name', 'OS', 'CPU', 'RAM', 'HDD', 'ลำดับ', 'ระบบภายใน', 'url', 'หมายเหตุ', 'สถานะ'];
    
    // กรองแถวที่ว่างทุกคอลัมน์ทิ้ง
    const cleanRows = [];
    for (let i = 0; i < rowsData.length; i++) {
      const r = rowsData[i];
      if (!Array.isArray(r)) continue;
      const hasContent = r.some(val => String(val || '').trim() !== '');
      if (hasContent) {
        const formattedRow = [];
        for (let c = 0; c < 10; c++) {
          formattedRow.push(r[c] !== undefined && r[c] !== null ? String(r[c]).trim() : '');
        }
        cleanRows.push(formattedRow);
      }
    }

    const fullSheetData = [standardHeaders, ...cleanRows];

    // ล้างข้อมูลเดิมและเขียนข้อมูลชุดใหม่ลงชีต webapp
    sheet.clearContents();
    if (fullSheetData.length > 0) {
      sheet.getRange(1, 1, fullSheetData.length, standardHeaders.length).setValues(fullSheetData);
    }

    return {
      success: true,
      message: 'บันทึกข้อมูลชีต ' + CONFIG.TARGET_SHEET_NAME + ' สำเร็จเรียบร้อยแล้ว (' + cleanRows.length + ' รายการ)',
      rows_count: cleanRows.length
    };
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.toString() };
  }
}
