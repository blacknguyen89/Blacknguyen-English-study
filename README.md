# Hộ Chiếu Tiếng Anh — Web App

Web app học tiếng Anh cá nhân, dùng Gemini API (dạy học + nghe ghi âm chấm phát âm),
lưu dữ liệu trên Supabase (đồng bộ nhiều thiết bị), bảo vệ bằng mã PIN.

## 1. Tạo bảng dữ liệu trên Supabase

Vào Supabase → project của bạn → **SQL Editor** → dán đoạn SQL sau → bấm **Run**:

```sql
create table if not exists kv_store (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

alter table kv_store enable row level security;

create policy "allow all via anon key"
on kv_store
for all
using (true)
with check (true);
```

> Lưu ý: bảng này chỉ được truy cập thông qua server (API routes của app), không lộ ra
> trình duyệt, nên chính sách "allow all" ở đây vẫn nằm sau lớp bảo vệ mã PIN của app.

## 2. Đưa code lên GitHub (không cần cài git)

1. Vào github.com → **New repository** → đặt tên (VD: `hoc-tieng-anh`) → Create.
2. Trong repo vừa tạo, chọn **Add file → Upload files**.
3. Kéo thả toàn bộ các file/folder trong thư mục này vào (giữ nguyên cấu trúc thư mục).
4. Bấm **Commit changes**.

## 3. Deploy lên Vercel

1. Vào vercel.com → **Add New → Project**.
2. Chọn **Import** repo GitHub vừa tạo ở bước 2.
3. Ở phần **Environment Variables**, thêm đủ 4 biến sau (giá trị thật của DABU):

   | Tên biến | Giá trị |
   |---|---|
   | `GEMINI_API_KEY` | API key lấy từ aistudio.google.com |
   | `SUPABASE_URL` | Project URL của Supabase |
   | `SUPABASE_ANON_KEY` | anon public key của Supabase |
   | `APP_PIN` | Mã PIN bạn tự đặt để khoá app |

4. Bấm **Deploy**. Chờ khoảng 1-2 phút.
5. Xong, Vercel sẽ đưa 1 đường link dạng `https://ho-chieu-tieng-anh.vercel.app` —
   mở link này trên điện thoại, nhập mã PIN, dùng như app bình thường.

## 4. Sau này muốn sửa gì?

- Sửa nội dung prompt: mở `app/api/chat/route.js`, sửa biến `SYSTEM_PROMPT`.
- Sửa giao diện: mở `app/page.js`.
- Mỗi lần sửa và upload lại lên GitHub, Vercel sẽ tự động deploy lại bản mới
  (không cần làm lại từ đầu).

## 5. Nếu gặp lỗi

- **"Chưa cấu hình GEMINI_API_KEY"**: kiểm tra lại Environment Variables trên Vercel,
  đảm bảo đã Deploy lại sau khi thêm biến.
- **Mic không hoạt động**: trình duyệt cần HTTPS (Vercel tự có HTTPS) và bạn cần
  cho phép quyền truy cập micro khi được hỏi.
- **Bị văng ra màn hình nhập PIN liên tục**: kiểm tra lại giá trị `APP_PIN` đã khớp
  giữa Environment Variables và những gì bạn gõ.
