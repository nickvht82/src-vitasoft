---
name: qa-verification
description: Phương pháp QA cho monorepo vitasoft — chạy verification thực tế và so sánh chéo điểm tiếp giáp giữa các module. Dùng khi cần kiểm tra chất lượng code, review kết quả builder, verify tính năng, "QA", "kiểm tra lại", "test thử", hoặc sau khi bất kỳ module nào vừa hoàn thành.
---

# QA Verification

QA thực chất là trả lời: **"code này chạy đúng khi các mảnh ghép nối với nhau không?"**
Kiểm tra "file có tồn tại" hay "code trông hợp lý" không phải QA.

## Bước 1 — Verification cơ bản (luôn chạy)

```sh
pnpm typecheck
pnpm build
pnpm test
```

Ghi lại output nguyên văn. Fail ở đâu, báo ở đó — kể cả khi nghi là lỗi có sẵn từ trước
(ghi chú "có thể pre-existing" nhưng vẫn báo).

## Bước 2 — So sánh chéo điểm tiếp giáp (trọng tâm)

Bug nguy hiểm nhất nằm ở **ranh giới giữa hai module viết ở hai thời điểm khác nhau**.
Mở cả hai phía cùng lúc và so sánh shape:

| Ranh giới | So sánh gì |
|---|---|
| API route ↔ frontend fetch | Shape JSON trả về vs type/destructuring phía gọi |
| `core/` package ↔ consumer | Export thực tế (tên, chữ ký) vs import statement |
| `@vitasoft/config` ↔ service | Env được validate trong schema vs env code thực đọc |
| `@vitasoft/ai` ↔ sản phẩm | Options truyền vào vs options interface hỗ trợ |

Cách làm: đọc file phía A, ghi ra shape kỳ vọng, đọc file phía B, đối chiếu từng field.
Sai khác tên field, optional/required, kiểu dữ liệu — đều là finding.

## Bước 3 — Kiểm tra theo acceptance criteria

Đối chiếu từng criterion của task với hành vi thực tế (chạy được thì chạy, không thì
trace code path). Criterion không đáp ứng = finding, kể cả khi build pass.

## Format báo cáo

Mỗi finding:

```
[SEVERITY: high|medium|low] file:line
Mô tả: <một câu, vấn đề là gì>
Kịch bản lỗi: <input/trạng thái cụ thể → hành vi sai>
Tin cậy: <chắc chắn | khả nghi>
```

Báo mọi finding kể cả tin cậy thấp — kèm mức tin cậy để leader lọc.
Sạch thì kết luận rõ: "Đã chạy typecheck/build/test — pass. Đã so 3 ranh giới — khớp."
