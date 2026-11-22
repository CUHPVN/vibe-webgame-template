# Hướng dẫn Toolchain, Skills, MCP & Tài nguyên (2026)

Tài liệu này giúp bạn lắp thêm công cụ ngoài khi clone repo này mà **không làm quá tải ngữ cảnh AI**.

---

## 1. Quy tắc giữ Context sạch (Rất quan trọng)

Thử nghiệm thực tế năm 2026 cho thấy cài hàng trăm skill hoặc bật toàn bộ tool MCP làm giảm mạnh độ chính xác chọn skill của agent và ngốn token liên tục. Vì vậy repo này chỉ nhúng sẵn:
- **3 skill nội bộ** trong `.agents/skills/` (`web-game-loop`, `web-game-playtest`, `web-game-release`).
- **2 MCP cốt lõi** trong `.mcp.json` (`chrome-devtools-mcp` và `context7`).

Chỉ cài thêm đúng gói tương ứng với **Combo** và **Engine** bạn chọn!

---

## 2. Ba Combo Thực Chiến Theo Nhu Cầu

### Combo 1: Khởi động 0 đồng (Game Jam, học nhanh, 2D nhẹ)
- **AI Agent**: Gemini CLI (free tier) hoặc OpenCode (BYOK / Ollama local)
- **Setup repo**: `npm run setup -- --name "My Game" --engine kaplay --target itch --install` (hoặc `--engine vanilla`)
- **External Skills** (chỉ lấy router + web-engines):
  ```bash
  npx skills add gamedev-skills/awesome-gamedev-agent-skills
  ```
- **Audio & Asset**: ZzFX tích hợp sẵn (`src/core/audio.ts`) + sprite CC0 từ Kenney.nl

### Combo 2: Studio Indie 2D Thương Mại (CrazyGames / Poki)
- **AI Agent**: Claude Code Pro hoặc OpenAI Codex Plus hoặc Cursor
- **Setup repo**:
  - Phaser 4: `npm run setup -- --name "My 2D Game" --engine phaser --target crazygames --install`
  - Hoặc PixiJS 8: `npm run setup -- --name "My 2D Game" --engine pixi --target poki --install`
- **External Skills** (chọn 1 bộ theo engine):
  - Phaser 4 / tổng quát: `openai/plugins` nhánh `plugins/game-studio` (hoặc `awesome-gamedev-agent-skills`)
  - PixiJS 8: `npx skills add https://github.com/pixijs/pixijs-skills`
- **MCP bổ sung (tùy chọn)**:
  - Pixel Art: `diivi/aseprite-mcp` (cần cài Aseprite) hoặc PixelLab MCP
  - Âm thanh nâng cao: ElevenLabs Hosted MCP (`https://api.elevenlabs.io/v1/mcp`)
  - Multiplayer P2P không server: thư viện `trystero` hoặc Colyseus

### Combo 3: Game Web 3D Chuyên Sâu (Three.js r187+)
- **AI Agent**: Claude Code / Cursor / Antigravity
- **Setup repo**:
  ```bash
  npm run setup -- --name "My 3D Game" --engine three --target web --install
  ```
  *(Lệnh setup tự động thêm `threejs-devtools-mcp` vào `.mcp.json`)*
- **External Skills** (chọn 1):
  - Dựng nhanh tối ưu API r186+: `npx skills add cloudai-x/threejs-skills`
  - Có QA director & test hooks 3D: `npx skills add majidmanzarpour/threejs-game-skills`
- **MCP bổ sung (tùy chọn)**:
  - Tài sản 3D: `ahujasid/mcp-for-blender` (Poly Pizza / Poly Haven; nếu sinh AI bằng Meshy 7.1 nhớ chạy Remesh API giảm đa giác xuống mức nhẹ cho trình duyệt)
  - Vật lý 3D chính xác: `@dimforge/rapier3d-simd` (lưu ý thêm ~500 KB WASM) hoặc `cannon-es` cho cảnh < 400 vật thể động
  - Backend / Deploy: Cloudflare MCP (giữ mặc định Code Mode), Vercel MCP, hoặc Supabase MCP (bắt buộc bật **Row Level Security - RLS**, đặt `read_only=true` khi đọc)

---

## 3. Quy tắc Bản quyền Tài nguyên & Cổng Phát Hành

- **Kenney.nl** & **Quaternius.com**: Toàn bộ **CC0** (dùng thương mại không cần ghi công).
- **OpenGameArt.org** & **Freesound.org**: Bắt buộc lọc **CC0** hoặc **CC-BY** và ghi nguồn vào `credits.txt`. **Cấm dùng `CC BY-NC`** cho game có quảng cáo/thu phí; tránh `GPL` / `CC BY-SA` nếu không muốn mở mã nguồn.
- **Adobe Mixamo**: Dùng thương mại miễn phí không cần ghi công, nhưng **cấm phân phối rời tệp gốc** (phải đóng gói kín bên trong `.glb` / bản build game).
- **Poki**: Chặn mọi network request ra ngoài (không Google Fonts/CDN), chạy tốt trong chế độ Ẩn danh (`SafeStorage` đã xử lý), giữ Initial Load `<= 5 MB`.
- **Discord Activities**: Khi deploy lên Discord iframe (`*.discordsays.com`), dùng `@discord/embedded-app-sdk` + `patchUrlMappings` / `@robojs/patch` để không bị chặn CSP.
