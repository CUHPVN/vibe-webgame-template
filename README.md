# Universal Vibe Code Web Game Template

Một **sườn GitHub Template (Starter Repository)** sẵn sàng clone để vibe code mọi tựa game web 2D hoặc 3D bằng TypeScript + Vite 8, đi kèm kiến trúc tách lớp chuẩn chỉnh, móc nối kiểm thử tất định, âm thanh thủ tục ZzFX (< 1 KB) và cấu hình AI Agent đa nền tảng.

---

## Tính năng nổi bật có sẵn ngay khi Clone

1. **Chạy được ngay với 0 phụ thuộc runtime (Zero Runtime Bloat)**:
   - Mặc định dùng **Vanilla HTML5 Canvas 2D + Vite 8 + TypeScript 7** với mini-game playable mẫu (*Star Dash*).
   - Tách biệt hoàn toàn 3 lớp: `src/core/` (pure TypeScript simulation + fixed `1/60s` loop + seeded RNG) ↔ `src/renderer/` (IRenderer adapter) ↔ `src/ui/` (DOM HUD Overlay qua `EventBus`).
2. **Đổi Engine chỉ bằng 1 lệnh (`npm run setup`)**:
   - Hỗ trợ sẵn 5 bộ renderer 2026 chuẩn API mới nhất trong `templates/engines/`:
     - `vanilla` (Canvas 2D thuần — tải nhẹ nhất)
     - `phaser` (**Phaser 4.2.1** — dùng `import * as Phaser`, Scale FIT)
     - `pixi` (**PixiJS v8.23+** — dùng `await app.init()` chuẩn v8, không bịa API v7)
     - `kaplay` (**KAPLAY v3001+** — non-global mode cho Game Jam)
     - `three` (**Three.js r187+** — dùng `THREE.Timer` thay `Clock`, tự `dispose()` VRAM)
3. **Vòng lặp kiểm thử tự động & Mù-Canvas Proof**:
   - Tích hợp sẵn `window.advanceTime(ms)` và `window.render_game_to_text()` (kích hoạt trong `dev` hoặc `?test=1&seed=42`).
   - Lệnh `npm run verify` chạy trọn bộ 5 bước: `typecheck` → `vitest` → `vite build` → `budget` → headless Playwright playtest chụp ảnh kiểm tra 0 lỗi Console.
4. **Chống 5 lỗi kinh điển của AI Vibe Coding**:
   - Tự `.dispose()` / `.destroy()` GPU & Canvas khi dọn dẹp.
   - Tách DOM HUD khỏi Canvas (không vẽ menu mờ nhòe trong canvas).
   - Bọc `localStorage` bằng `SafeStorage` (`try/catch` + memory fallback) chống sập ở chế độ Ẩn danh.
   - Hiện nút ảo di động **chỉ khi chạm thật** (`pointerType === 'touch'`), áp `touch-action: none` và `env(safe-area-inset-*)`.
   - Âm thanh ZzFX tự mở khóa khi tương tác đầu tiên và tự phục hồi trên iOS Safari khi chuyển tab (`visibilitychange`).
5. **AI Harness đa công cụ, không quá tải ngữ cảnh**:
   - `AGENTS.md` (dưới 4 KB — an toàn giới hạn 16 KiB của Devin Desktop / Antigravity) dùng chung cho Codex, Antigravity, Roo Code, OpenCode.
   - `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/*.mdc` (theo glob path).
   - 3 skill nội bộ gọn nhẹ trong `.agents/skills/` và 2 MCP cốt lõi trong `.mcp.json` (`chrome-devtools-mcp` + `context7`).

---

## Bắt đầu sử dụng (Tạo Repo Template & Clone Dự án mới)

### 1. Biến repo này thành GitHub Template (làm 1 lần)
1. Push thư mục này lên GitHub repository của bạn.
2. Vào **Settings → General** trên GitHub → tích chọn **Template repository**.
3. Từ nay mỗi lần làm game mới, bấm **Use this template → Create a new repository** rồi `git clone` về máy.

### 2. Khởi tạo game mới trong 30 giây
```bash
# Chạy interactive wizard (hỏi tên game, engine, nền tảng phát hành):
npm run setup

# Hoặc truyền tham số trực tiếp (ví dụ làm game Phaser 4 lên CrazyGames):
npm run setup -- --name "Neon Drift" --engine phaser --target crazygames --install

# Hoặc làm game 3D Three.js r187:
npm run setup -- --name "Voxel Runner" --engine three --target web --install
```

*(Thêm cờ `--clean` nếu muốn xóa thư mục `templates/` sau khi đã chọn xong engine; dùng `--dry-run` để xem trước thay đổi mà chưa sửa file).*

### 3. Chạy thử & Kiểm chứng toàn diện
```bash
npm install      # (nếu chưa chạy --install ở bước trên)
npm run dev      # Mở dev server tại http://localhost:5173
npm run verify   # Chạy Typecheck + Unit Test + Build + Budget Check + Browser Playtest
```

---

## Cấu trúc Thư mục

```text
├── AGENTS.md                   # Quy chuẩn kiến trúc & invariants cho mọi AI agent
├── CLAUDE.md                   # Pointer cho Claude Code
├── progress.md                 # Bộ nhớ ngoài giữa các phiên vibe coding
├── .mcp.json                   # MCP tối giản (chrome-devtools + context7)
├── .agents/skills/             # 3 skill nội bộ (loop, playtest, release)
├── .cursor/rules/              # Quy tắc phạm vi cho Cursor (core + shaders)
├── .github/workflows/          # CI, Deploy itch.io (Butler) & GitHub Pages
├── docs/
│   ├── GAME_SPEC.md            # Spec 1 trang & hợp đồng hành vi từng lát cắt
│   └── TOOLCHAIN_SETUP.md      # Hướng dẫn lắp Combo 1/2/3 & bản quyền asset
├── scripts/
│   ├── setup-game.mjs          # CLI chọn tên, engine & nền tảng phát hành
│   ├── check-budget.mjs        # Kiểm tra dung lượng chuẩn Poki / CrazyGames / itch / Cloudflare
│   └── verify-playtest.mjs     # Playwright headless smoke test + chụp ảnh màn hình
├── src/
│   ├── core/                   # Pure TS: simulation, loop, rng, eventBus, storage, audio, input
│   ├── renderer/               # Engine adapter triển khai IRenderer
│   ├── ui/                     # DOM HUD controller (lắng nghe EventBus)
│   ├── debug/                  # window.advanceTime & window.render_game_to_text
│   └── main.ts                 # Bootstrap & lifecycle teardown
├── templates/engines/          # 5 renderer adapter mẫu (vanilla, phaser, pixi, kaplay, three)
└── tests/
    ├── unit/                   # Vitest unit tests (simulation determinism, SafeStorage)
    └── e2e/                    # Playwright E2E smoke test
```

---

## Các lệnh NPM chính

| Lệnh | Tác dụng |
| :--- | :--- |
| `npm run setup` | Đổi tên game, cài engine (`vanilla`/`phaser`/`pixi`/`kaplay`/`three`) & target (`web`/`itch`/`crazygames`/`poki`/`discord`) |
| `npm run dev` | Chạy Vite dev server |
| `npm run typecheck` | Kiểm tra TypeScript 7 (`tsc --noEmit`) |
| `npm test` | Chạy unit tests với Vitest |
| `npm run build` | Typecheck + Build production ra `dist/` |
| `npm run budget` | Đo dung lượng `dist/` đối chiếu ngưỡng Poki, CrazyGames, Cloudflare, itch.io |
| `npm run verify:browser` | Tự khởi động preview server, test game qua Playwright + hooks, kiểm 0 lỗi Console |
| `npm run verify` | Chạy liên hoàn cả 5 bước kiểm chứng chất lượng |
| `npm run test:e2e` | Chạy bộ test Playwright (`tests/e2e/`) |

---

Xem thêm [docs/TOOLCHAIN_SETUP.md](./docs/TOOLCHAIN_SETUP.md) để lắp thêm Skill/MCP theo từng combo ngân sách và quy tắc bản quyền tài sản CC0 / CC-BY / Mixamo.
