# 🏫 Roomify — Backend

Backend API ของระบบจองห้องเรียนออนไลน์ **Roomify** พัฒนาด้วย NestJS, Prisma และ PostgreSQL

## ✨ ความสามารถ
- Login / Register
- JWT Authentication
- Google Authentication
- User / Admin Role
- จัดการห้องเรียน
- จัดการตารางห้อง
- ระบบจองห้อง
- อนุมัติ / ปฏิเสธ / ยกเลิกการจอง
- ประวัติการจอง
- Check-in / Check-out
- LINE Login และ LINE Notification
- จัดการ Theme

## 🛠️ เทคโนโลยี
NestJS • TypeScript • Prisma ORM • PostgreSQL • JWT • Google OAuth • LINE Login • LINE Messaging API • Axios • Docker

## 🚀 ติดตั้ง

```bash
git clone https://github.com/Kroekkan/Project-RoomSystem-Backend.git
cd Project-RoomSystem-Backend
npm install
```

## ⚙️ Environment Variables

สร้าง `.env` หรือใช้ `.env.docker` สำหรับ Docker

```env
DATABASE_URL=
DIRECT_URL=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

FRONT_URL=

JWT_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

LINE_LOGIN_CALLBACK_URL=
LINE_LOGIN_CHANNEL_ID=
LINE_LOGIN_CHANNEL_SECRET=

LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
```

> ⚠️ ห้าม commit `.env` หรือ `.env.docker` ที่มี Secret / Token จริงขึ้น GitHub

## 🗄️ Prisma

```bash
npx prisma generate
npx prisma studio
```

## ▶️ รัน Backend

```bash
npm run start:dev
```

Backend จะทำงานที่ `http://localhost:4000`

## 🔗 เชื่อมต่อ Frontend

Frontend ต้องตั้งค่า:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

โครงสร้าง:

```text
Frontend (Next.js :3000)
          │
          ▼ HTTP API
Backend (NestJS :4000)
          │
          ▼
PostgreSQL
```

Frontend Repository:
https://github.com/Kroekkan/Project-RoomSystem

## 🐳 Docker

```bash
docker build -t roomify-backend .
docker run -p 4000:4000 roomify-backend
```

## 🐳 Docker Compose

หากมีโปรเจกต์รวม Frontend + Backend:

```text
Roomify-Docker/
├── frontend/
├── backend/
└── docker-compose.yml
```

รัน:

```bash
docker compose up --build
```

หยุด:

```bash
docker compose down
```

## 📝 สถานะการจอง

```text
PENDING
APPROVED
REJECTED
CANCELLED
```

## 🔐 Role

```text
USER
ADMIN
```

## 📱 LINE

รองรับการแจ้งผลการจอง การอนุมัติ การปฏิเสธ Check-in และ Check-out ผ่าน LINE

## 🌐 Deploy

สามารถ Deploy Backend บน Render หรือบริการที่รองรับ Docker / Node.js ได้

หลัง Deploy ให้นำ URL ไปใส่ใน Frontend:

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

## 👨‍💻 ผู้พัฒนา
**Kroekkan**
