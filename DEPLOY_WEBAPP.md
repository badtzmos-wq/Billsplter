# BillSpliter Web App

วิธีที่ใช้ง่ายสุดบนมือถือคือเอาโฟลเดอร์นี้ไป deploy เป็น static web app บน HTTPS แล้วเปิดจากมือถือผ่านลิงก์เดียว ไม่ต้องอยู่ Wi-Fi เดียวกับคอม

## Production: GitHub Pages

เว็บไซต์: https://badtzmos-wq.github.io/Billsplter/

GitHub Pages ใช้ branch `main` จากโฟลเดอร์ `/` เมื่อ merge PR แล้ว GitHub จะ build และ deploy ให้อัตโนมัติ ตรวจสถานะ `pages-build-deployment` ให้สำเร็จ และตรวจว่า `Billsplitter.html` แสดงเวอร์ชัน `v2.1.0`

`index.html` และ PWA ชี้ไปยัง `Billsplitter.html` โดย cache ใช้ชื่อ `billspliter-v2-1-0` สำหรับเวอร์ชันนี้

## ทางเลือก: Netlify แบบลากวาง

1. เปิด https://app.netlify.com/drop
2. ลากทั้งโฟลเดอร์ `BillSpliter_V2.0.1` ไปวาง
3. รอ Netlify สร้างลิงก์ `.netlify.app`
4. เปิดลิงก์นั้นบนมือถือ
5. กด Add to Home Screen

หลัง deploy แล้ว URL หลักคือ:

```text
https://your-site-name.netlify.app/
```

## iPhone

เปิดใน Safari แล้วกด Share > Add to Home Screen

## Android

เปิดใน Chrome แล้วกดเมนูสามจุด > Add to Home screen หรือ Install app

## หมายเหตุเรื่องข้อมูล

ข้อมูลบิลเก็บใน browser ของแต่ละเครื่องด้วย `localStorage` ถ้าเปลี่ยนจาก localhost ไปเป็นเว็บที่ deploy แล้ว ให้ใช้เมนู Export / Import ในแอปเพื่อย้ายข้อมูลเดิม
