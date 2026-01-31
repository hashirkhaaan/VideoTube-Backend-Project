# VideoTube Backend

Backend API for a video hosting platform (YouTube-style project) built using Node.js, Express, and MongoDB. This project focuses on backend architecture, authentication, database relationships, and media handling.

---

## 🚀 Features

- User authentication (JWT Access + Refresh tokens)
- Secure password hashing (bcrypt)
- Video upload & management
- Subscriptions system
- Likes & comments
- Channel dashboard statistics using MongoDB aggregation
- Watch history tracking
- Standardized API responses and error handling

---

## 🛠 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT, Cookies
- **File Uploads:** Multer
- **Cloud Storage:** Cloudinary

---

## 🧠 Backend Architecture

### Key Concepts Implemented

- Middleware-based authentication
- Role of Access vs Refresh tokens
- MongoDB aggregation pipelines
- Centralized error handling (`ApiError`)
- Standard response format (`ApiResponse`)
- Async wrapper (`asyncHandler`) to avoid try/catch repetition

---

## 🗄 Database Relationships (Simplified)

- A **User** can upload many **Videos**
- Users can **subscribe** to other users
- A **Video** can have many **Likes** and **Comments**
- Watch history is stored per user

---

## ⚙️ Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (Local or Atlas)
- Cloudinary account

---

### 1. Clone the repository

```bash
git clone https://github.com/your-username/videotube-backend.git
cd videotube-backend
```

---

### 2. Install dependencies

```bash
npm install
```

---

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
PORT=8000
MONGODB_URI=mongodb+srv://<your-connection-string>
CORS_ORIGIN=http://localhost:3000

ACCESS_TOKEN_SECRET=your-access-secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRY=10d

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

---

### 4. Run the server

```bash
npm run dev
```

Server runs on:

```
http://localhost:8000
```

---

## 🔌 Example API Response Format

**Success Response**

```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {}
}
```

**Error Response**

```json
{
  "success": false,
  "message": "Unauthorized request",
  "errors": []
}
```

---

## 📂 Project Structure

```
src/
├── controllers/
├── db/
├── middlewares/
├── models/
├── routes/
├── utils/
├── app.js
└── index.js
```

---

## 📌 Notes

This project is built as a backend architecture learning project focusing on real-world backend patterns such as authentication flows, media handling, and database aggregations.

---

## 📝 License

MIT
