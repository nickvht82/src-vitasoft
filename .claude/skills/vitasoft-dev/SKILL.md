---
name: vitasoft-dev
description: Orchestrator cho mọi công việc phát triển sản phẩm Vitasoft — brainstorm ý tưởng, xây tính năng/MVP, QA chất lượng. Dùng khi user yêu cầu xây/thêm/sửa tính năng, tạo sản phẩm mới, phát triển ý tưởng, hoặc các yêu cầu tiếp nối như "làm tiếp", "chạy lại", "cập nhật", "cải thiện", "sửa lại phần X", "build tiếp Mind", "thêm tính năng cho homepage". Câu hỏi thuần túy (không tạo/sửa gì) có thể trả lời trực tiếp không cần skill này.
---

# Vitasoft Dev — Orchestrator

Điều phối 3 agents (định nghĩa tại `.claude/agents/`): `product-strategist`,
`builder`, `qa-reviewer`. Mọi Agent call dùng `model: "opus"`.

**Chế độ thực thi: Hybrid**
- **Phase Ý tưởng** — sub-agent đơn lẻ (chỉ cần kết quả, không cần giao tiếp nhóm)
- **Phase Xây dựng + QA** — agent team (builder ↔ qa-reviewer trao đổi trực tiếp, incremental QA)

## Phase 0 — Xác định bối cảnh

Trước khi làm gì, xác định loại thực thi:

| Tình huống | Chế độ |
|---|---|
| Yêu cầu mới, chưa có sản phẩm liên quan | Chạy đầy đủ từ Phase phù hợp |
| `_workspace/` tồn tại + user yêu cầu sửa một phần | Chỉ gọi lại agent liên quan (partial re-run) |
| `_workspace/` tồn tại + user cho input mới hoàn toàn | Đổi tên thành `_workspace_prev/`, chạy mới |
| User hỏi thuần túy, không tạo/sửa | Trả lời trực tiếp, không spawn agent |

Yêu cầu chỉ liên quan 1 giai đoạn (VD: "brainstorm ý tưởng X") → chạy đúng phase đó, bỏ qua phần còn lại.

## Phase 1 — Ý tưởng (khi có yêu cầu brainstorm/brief)

**Chế độ:** sub-agent.

1. Gọi Agent(`product-strategist`, model opus) với mô tả ý tưởng từ user.
2. Output: `ideas/<slug>/README.md`.
3. Trình brief cho user duyệt — **chỉ tiếp tục Phase 2 khi user đồng ý xây MVP**.

## Phase 2 — Xây dựng + QA (khi có yêu cầu build)

**Chế độ:** agent team.

1. `TeamCreate` team `vitasoft-build` gồm: `builder`, `qa-reviewer`.
2. `TaskCreate` các task theo module, khai báo dependency giữa các task.
3. Luồng làm việc: builder xong module → SendMessage cho qa-reviewer → QA ngay
   (incremental) → bug thì builder sửa → re-verify → module tiếp theo.
4. Trung gian lưu tại `_workspace/` (format: `{phase}_{agent}_{artifact}.md`).
5. Kết thúc: tổng hợp báo cáo — file thay đổi, kết quả verification, findings còn mở.

## Phase 3 — Bàn giao

1. Chạy `pnpm typecheck && pnpm build && pnpm test` lần cuối ở cấp repo.
2. Commit theo quy ước repo (xem CLAUDE.md), push lên `main` nếu user đã duyệt.
3. Báo cáo cho user: tóm tắt outcome trước, chi tiết sau.

## Truyền dữ liệu

- **Điều phối:** TaskCreate/TaskUpdate (trạng thái, dependency).
- **Sản phẩm trung gian:** file trong `_workspace/` — giữ lại sau khi xong để audit.
- **Trao đổi thời gian thực:** SendMessage giữa builder ↔ qa-reviewer.
- Brief từ Phase 1 (file trong `ideas/`) là input trực tiếp của Phase 2.

## Xử lý lỗi

| Lỗi | Cách xử lý |
|---|---|
| Agent fail lần 1 | Retry 1 lần với chỉ dẫn cụ thể hơn |
| Fail lần 2 | Dừng phase, báo user kèm lỗi nguyên văn — không giấu, không tự đoán |
| Builder & QA bất đồng về finding | Leader đọc cả hai phía, quyết định; nếu không rõ, hỏi user |
| Verification không chạy được (thiếu deps) | Báo user cài đặt (pnpm install), không skip |

## Kịch bản test

**Luồng bình thường:** User: "Thêm trang /about cho homepage" → Phase 0 xác định build-only
→ team builder+qa → builder tạo `vitasoft-homepage/src/app/about/page.tsx` → qa verify
typecheck/build + so sánh route ↔ link nội bộ → báo cáo pass → commit.

**Luồng lỗi:** Builder thêm tính năng dùng env mới nhưng quên khai báo trong
`@vitasoft/config` schema → qa-reviewer phát hiện qua so sánh ranh giới config ↔ service
(Bước 2 của qa-verification) → SendMessage cho builder → builder bổ sung schema → re-verify pass.
