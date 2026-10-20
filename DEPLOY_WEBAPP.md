# BillSpliter Web App

วิธีที่ใช้ง่ายสุดบนมือถือคือเอาโฟลเดอร์นี้ไป deploy เป็น static web app บน HTTPS แล้วเปิดจากมือถือผ่านลิงก์เดียว ไม่ต้องอยู่ Wi-Fi เดียวกับคอม

## Production: GitHub Pages

เว็บไซต์: https://badtzmos-wq.github.io/Billsplter/

GitHub Pages ใช้ branch `main` จากโฟลเดอร์ `/` เมื่อ merge PR แล้ว GitHub จะ build และ deploy ให้อัตโนมัติ ตรวจสถานะ `pages-build-deployment` ให้สำเร็จ และตรวจว่า `Billsplitter.html` แสดงเวอร์ชัน `v2.1.0`

`index.html` และ PWA ชี้ไปยัง `Billsplitter.html` โดย cache ใช้ชื่อ `billspliter-v2-1-0` สำหรับเวอร์ชันนี้

## การเชื่อมต่อเดิม

หยุด auto-build ของ Netlify ด้วย `netlify.toml` แล้ว การถอนการเชื่อมต่อภายนอกให้หมดต้องเปิด https://github.com/settings/installations เลือก Netlify > Configure และนำ repo `Billsplter` ออกจากรายการที่อนุญาตให้เข้าถึง โดยทำเฉพาะ repo นี้เพื่อไม่กระทบโปรเจกต์อื่น

หลังถอนการเชื่อมต่อแล้วจึงลบไฟล์ `netlify.toml` ได้ การตั้งค่านี้ไม่หยุด build hook หรือ manual deploy ที่สั่งจาก Netlify โดยตรง

## iPhone

เปิดใน Safari แล้วกด Share > Add to Home Screen

## Android

เปิดใน Chrome แล้วกดเมนูสามจุด > Add to Home screen หรือ Install app

## หมายเหตุเรื่องข้อมูล

ข้อมูลบิลเก็บใน browser ของแต่ละเครื่องด้วย `localStorage` ถ้าเปลี่ยนจาก localhost ไปเป็นเว็บที่ deploy แล้ว ให้ใช้เมนู Export / Import ในแอปเพื่อย้ายข้อมูลเดิม
