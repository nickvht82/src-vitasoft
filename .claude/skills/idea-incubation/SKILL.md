---
name: idea-incubation
description: Brainstorm và ươm tạo ý tưởng sản phẩm mới cho Vitasoft — viết idea brief, đánh giá khả thi, xếp độ ưu tiên, quyết định tốt nghiệp lên sản phẩm chính thức. Dùng khi user nói "ý tưởng mới", "brainstorm", "đánh giá ý tưởng", "viết brief", "ideas", hoặc muốn thêm/cải thiện/cập nhật bất kỳ nội dung nào trong folder ideas/.
---

# Idea Incubation

Ý tưởng mới luôn bắt đầu trong `ideas/<slug>/README.md` — không bao giờ tạo folder cấp cao
ngay lập tức. Điều này giữ monorepo sạch: chỉ sản phẩm đã chứng minh mới có hạ tầng riêng.

## Format Idea Brief

```markdown
# <Tên ý tưởng>

## Vấn đề
Ai đang đau ở đâu, tần suất, chi phí hiện tại của vấn đề.

## Giải pháp
Mô tả 2-4 câu. Kèm: tại sao AI (Claude) làm điều này tốt hơn cách truyền thống?

## Người dùng mục tiêu
Cụ thể (VD: "giáo viên toán cấp 2 tại VN"), không chung chung ("mọi người").

## MVP Scope
3-5 tính năng tối thiểu chứng minh giá trị. Mỗi tính năng 1 dòng.

## Ngoài scope MVP
Những gì cố tình KHÔNG làm ở giai đoạn đầu.

## Tiêu chí tốt nghiệp
Điều kiện đo được để chuyển thành folder sản phẩm chính thức
(VD: 50 người dùng thử, feedback tích cực >70%).

## Trạng thái
[GIẢ ĐỊNH] đánh dấu những gì cần founder xác nhận.
```

## Đánh giá độ ưu tiên

Chấm 1-5 cho từng trục, ưu tiên tổng điểm cao:

| Trục | Câu hỏi |
|---|---|
| Lợi thế AI | Claude làm được điều gì mà cách thường không làm nổi? |
| Tận dụng core | Dùng lại được bao nhiêu từ `@vitasoft/ai`, config, logger? |
| Tốc độ đến MVP | Xây MVP trong bao lâu với 1 builder? |
| Thị trường | Người dùng có sẵn sàng trả tiền / dùng thường xuyên? |

Ý tưởng điểm thấp vẫn được lưu brief — đánh dấu trạng thái `on-hold` kèm lý do,
vì bối cảnh thị trường thay đổi có thể làm nó khả thi sau này.

## Khi cải thiện brief cũ

Đọc brief hiện có trước. Giữ nguyên phần vẫn đúng, chỉ sửa phần có thông tin mới,
và ghi chú ngày cập nhật cuối file.
