# ThuChi Auto Fix Engine

Hệ thống này bắt lỗi JavaScript ở trình duyệt và gửi lỗi tới backend Node.js để AI phân tích. API key **không nằm trong frontend**.

## 1. Cài server

Mở CMD/PowerShell trong thư mục `auto-fix-server`:

```bash
npm install
```

Copy `.env.example` thành `.env` rồi đặt:

```text
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-5-mini
PORT=8787
```

Chạy:

```bash
npm start
```

Kiểm tra: `http://localhost:8787/health`

## 2. Frontend

`index.html` đã được thêm `./js/auto-fix.js`.
Mặc định frontend gửi lỗi tới `http://localhost:8787/api/auto-fix`.

Muốn đổi endpoint:

```js
setAutoFixEndpoint('https://domain-cua-ban/api/auto-fix')
```

## 3. An toàn

Engine mặc định **chỉ phân tích và trả patch đề xuất**, không tự ghi đè file production. Muốn tự động áp dụng patch cần thêm bước review/whitelist phía server.

Không đặt `OPENAI_API_KEY` vào HTML, JavaScript frontend hoặc GitHub public.
