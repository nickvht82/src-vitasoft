---
name: deep-research
description: Phương pháp deep research cho Vitasoft — nghiên cứu sâu ý tưởng sản phẩm, so sánh framework/thư viện/giải pháp, xác minh vòng đời (EOL) công nghệ. Dùng khi user nói "research", "nghiên cứu", "deep research", "so sánh công nghệ", "chọn framework", "đánh giá giải pháp", "công nghệ nào tốt", hoặc trước mọi quyết định chọn stack/thư viện mới.
---

# Deep Research

Nghiên cứu tồi dẫn đến quyết định tồi khó đảo ngược (chọn nhầm framework = trả nợ nhiều năm).
Mục tiêu: mọi quyết định công nghệ/sản phẩm của Vitasoft có căn cứ kiểm chứng được.

## Quy trình 5 bước

### 1. Định nghĩa câu hỏi
Viết rõ: quyết định cần đưa ra là gì, ràng buộc nào (chi phí, kỹ năng team, hạ tầng GKE),
tiêu chí thành công. Câu hỏi mơ hồ → hỏi lại người yêu cầu trước khi nghiên cứu.

### 2. Thu thập nguồn (WebSearch + WebFetch)
Kiến thức training lỗi thời nhanh — **luôn tra cứu mới** cho:
- **Vòng đời:** endoflife.date/<product> — EOL date của runtime, framework, database
- **Sức khỏe dự án:** GitHub (commit gần nhất, issues mở/đóng, maintainers), npm trends (downloads)
- **Trend hiện tại:** docs chính thức, release notes, State of JS/DevOps surveys gần nhất
- **Bảo mật:** CVE database, GitHub Security Advisories cho thư viện đang xét

### 3. Ma trận quyết định
So sánh 2-3 phương án trên các trục có trọng số. Trục bắt buộc cho lựa chọn công nghệ:

| Trục | Trọng số gợi ý |
|---|---|
| Vòng đời — còn hỗ trợ ≥24 tháng? | Loại trực tiếp nếu <12 tháng |
| Độ trưởng thành & cộng đồng | Cao |
| Khả năng scale & upgrade path | Cao |
| Phù hợp stack hiện tại (TS, GKE, pnpm) | Trung bình |
| Chi phí học + vận hành | Trung bình |

### 4. Khuyến nghị
Một phương án được chọn + lý do 3-5 câu + rủi ro chính + kế hoạch giảm rủi ro.
Phương án bị loại: ghi 1 dòng lý do loại (để sau này không phải nghiên cứu lại).

### 5. Báo cáo
Lưu tại `docs/research/<YYYY-MM-DD>-<slug>.md`:

```markdown
# <Câu hỏi nghiên cứu>
**Ngày:** ... | **Người yêu cầu:** ... | **Trạng thái:** khuyến nghị / cần quyết định

## TL;DR
Khuyến nghị + lý do chính trong 3 câu.

## Ma trận so sánh
| Tiêu chí | Phương án A | Phương án B |

## Chi tiết & nguồn
Mỗi dữ kiện quan trọng kèm [nguồn](url) + ngày truy cập.

## Rủi ro & giảm thiểu
```

## Nguyên tắc chất lượng

- Dữ kiện ≠ ý kiến: "Next.js có 130k stars (nguồn, 07/2026)" ≠ "Next.js rất phổ biến".
- Nguồn chính thức > blog cá nhân > forum. Blog SEO spam không phải nguồn.
- Nghiên cứu ý tưởng sản phẩm: bắt buộc khảo sát đối thủ hiện có (ít nhất 3) và trả lời
  "tại sao AI của chúng ta thắng?".
