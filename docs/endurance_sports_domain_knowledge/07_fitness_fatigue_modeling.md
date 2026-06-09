# Chương 7: Mô hình hóa Thể lực & Sự mệt mỏi (Fitness & Fatigue Modeling)

Hiểu được tác động của một buổi tập đơn lẻ là chưa đủ. Để giúp vận động viên đạt được trạng thái thể lực tốt nhất vào đúng ngày đua (điểm rơi phong độ), hệ thống cần phải mô hình hóa tác động tích lũy của toàn bộ quá trình tập luyện qua nhiều tuần và nhiều tháng. Đây là nơi thuật toán Thể lực - Mệt mỏi (Fitness & Fatigue Model - mô hình Banister cải tiến bởi Coggan) phát huy vai trò.

---

## 1. Khái niệm cốt lõi

### CTL (Chronic Training Load) hay Thể lực tích lũy (Fitness)
*   **Khái niệm**: Là mức trung bình có trọng số của tải tập luyện hàng ngày (TSS hoặc Load) trong thời gian dài (thường mặc định là 42 ngày qua - tương đương 6 tuần).
*   **Tại sao tồn tại**: Thể lực hiếu khí của con người cần thời gian dài để xây dựng (tăng mao mạch cơ, tăng thể tích tim, tăng số lượng ty thể). CTL phản ánh khả năng chịu đựng tải tập luyện lớn của vận động viên. CTL càng cao, vận động viên càng có nền tảng thể lực tốt.

### ATL (Acute Training Load) hay Sự mệt mỏi ngắn hạn (Fatigue)
*   **Khái niệm**: Là mức trung bình có trọng số của tải tập luyện hàng ngày trong thời gian ngắn (thường mặc định là 7 ngày qua - tương đương 1 tuần).
*   **Tại sao tồn tại**: Sự mệt mỏi sinh ra ngay lập tức sau tập luyện và phân rã nhanh chóng. ATL phản ánh mức độ kiệt sức hiện tại của vận động viên.

### TSB (Training Stress Balance) hay Trạng thái Phong độ (Form)
*   **Khái niệm**: Hiệu số giữa Thể lực của ngày hôm trước và Sự mệt mỏi của ngày hôm trước.
*   **Tại sao tồn tại**: Để chạy nhanh nhất có thể vào ngày đua, vận động viên cần có Thể lực cao (CTL cao) nhưng phải có mức mệt mỏi rất thấp (ATL thấp). TSB cho biết vận động viên đang ở trạng thái mệt mỏi, đang duy trì thể lực, hay đã sẵn sàng để thi đấu.
*   **Công thức**:
    $$TSB(t) = CTL(t-1) - ATL(t-1)$$
    *   **TSB dương (ví dụ: $+5$ đến $+25$)**: Trạng thái "Fresh" (Sung sức/Sẵn sàng thi đấu). Thể lực tốt, mệt mỏi thấp. Tối ưu cho thi đấu (Tapering).
    *   **TSB âm tối ưu (ví dụ: $-10$ đến $-30$)**: Trạng thái "Productive" (Tối ưu để tích lũy thể lực). Cơ thể chịu stress vừa phải để kích thích thích nghi.
    *   **TSB quá âm (ví dụ: dưới $-30$)**: Trạng thái "Overreaching" (Quá tải). Nguy cơ cao dẫn đến chấn thương hoặc kiệt sức nếu kéo dài.

---

## 2. Công thức Toán học cốt lõi

Thuật toán sử dụng phương pháp **Trung bình trượt lũy thừa (Exponential Moving Average - EMA)** để tính toán CTL và ATL hàng ngày. Trọng số của các ngày gần nhất sẽ cao hơn các ngày xa hơn.

### Công thức CTL ngày hôm nay ($CTL_t$)
$$CTL_t = CTL_{t-1} + \frac{Load_t - CTL_{t-1}}{\lambda_{CTL}}$$
Hoặc viết dưới dạng EMA chuẩn:
$$CTL_t = Load_t \cdot \alpha_{CTL} + CTL_{t-1} \cdot (1 - \alpha_{CTL})$$
Trong đó:
*   $\lambda_{CTL}$ là hằng số thời gian dài hạn (mặc định là **42 ngày**).
*   $\alpha_{CTL} = \frac{1}{\lambda_{CTL}} = \frac{1}{42} \approx 0.0238$.

### Công thức ATL ngày hôm nay ($ATL_t$)
$$ATL_t = ATL_{t-1} + \frac{Load_t - ATL_{t-1}}{\lambda_{ATL}}$$
Hoặc:
$$ATL_t = Load_t \cdot \alpha_{ATL} + ATL_{t-1} \cdot (1 - \alpha_{ATL})$$
Trong đó:
*   $\lambda_{ATL}$ là hằng số thời gian ngắn hạn (mặc định là **7 ngày**).
*   $\alpha_{ATL} = \frac{1}{\lambda_{ATL}} = \frac{1}{7} \approx 0.1428$.

---

## 3. Ứng dụng trong lập kế hoạch điểm rơi phong độ (Race Planning)

Một trong những tính năng đắt giá nhất của nền tảng huấn luyện là cho phép vẽ trước tương lai (Forecasting).
*   Nếu huấn luyện viên lên lịch trước cho vận động viên các bài tập trong 4 tuần tới (Planned Workouts với Planned TSS).
*   Hệ thống có thể chạy thuật toán tính CTL, ATL, TSB dự phóng (Projected Fitness Chart).
*   Huấn luyện viên có thể tinh chỉnh các buổi tập tương lai sao cho đúng ngày thi đấu của giải chạy Marathon (ví dụ: ngày 15 tháng 10), chỉ số **TSB dự phóng đạt điểm rơi tối ưu là $+15$** trong khi **CTL đạt mức tối đa khả thi**.

---

## 4. Ví dụ thực tế

### Ví dụ về Athlete
Vận động viên A chuẩn bị tham gia giải Ironman 70.3. Hiện tại (1 tháng trước đua), CTL của A là 80, ATL là 95, nên TSB là $-15$. A đang trong giai đoạn huấn luyện cao trào cuối cùng.

### Ví dụ về Coach
Huấn luyện viên thiết lập kế hoạch giảm tải (Tapering) 3 tuần trước giải đua:
*   Tuần 1 trước đua: giảm 25% khối lượng tập.
*   Tuần 2 trước đua: giảm 50% khối lượng tập.
*   Tuần cuối cùng: chỉ chạy nhẹ nhàng và nghỉ ngơi.
*   Hệ thống dự phóng: Ngày đua TSB của A sẽ đạt $+12$, ATL giảm xuống còn 25, trong khi CTL vẫn giữ được ở mức 75. A sẽ bước vào vạch xuất phát với trạng thái sung mãn nhất.

### Ví dụ về Product
Phát triển tính năng **"Vùng Phong độ An toàn" (Fitness Matrix / Training Zones Dashboard)**. Hệ thống phân chia TSB thành các vùng màu sắc:
*   **Vùng Xám (Duy trì / Tapering)**: TSB từ $+5$ đến $+25$. Lời khuyên: *"Cơ thể sẵn sàng cho thi đấu."*
*   **Vùng Xanh lá (Tích lũy tối ưu)**: TSB từ $-10$ đến $-29$. Lời khuyên: *"Mức độ kích thích thể lực tốt."*
*   **Vùng Đỏ (Quá tải)**: TSB dưới $-30$. Lời khuyên: *"Nguy cơ chấn thương cao. Hãy nghỉ ngơi."*
*   **Vùng Xanh lam (Nghỉ ngơi quá mức / Detraining)**: TSB trên $+25$. Lời khuyên: *"Thể lực đang giảm sút do tập quá ít."*

### Ví dụ về Cơ sở dữ liệu (Database Schema)
Để vẽ biểu đồ Thể lực - Mệt mỏi nhanh chóng, hệ thống cần tính toán trước (Pre-calculate) các chỉ số CTL, ATL, TSB hàng ngày cho mỗi vận động viên thay vì chạy tính toán động thời gian thực từ lịch sử hàng năm.

Bảng lưu trữ dữ liệu đã tính toán sẵn:

```sql
CREATE TABLE athlete_fitness_trends (
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    ctl DOUBLE PRECISION NOT NULL, -- Thể lực (Fitness)
    atl DOUBLE PRECISION NOT NULL, -- Mệt mỏi (Fatigue)
    tsb DOUBLE PRECISION NOT NULL, -- Phong độ (Form)
    daily_load DOUBLE PRECISION NOT NULL DEFAULT 0.0, -- Điểm tải thực tế ngày hôm đó
    planned_load DOUBLE PRECISION NOT NULL DEFAULT 0.0, -- Điểm tải dự kiến ngày hôm đó
    projected_ctl DOUBLE PRECISION, -- CTL dự phóng (tính từ bài tập kế hoạch)
    projected_atl DOUBLE PRECISION, -- ATL dự phóng
    projected_tsb DOUBLE PRECISION, -- TSB dự phóng
    PRIMARY KEY (athlete_id, date)
);

CREATE INDEX idx_fitness_trends_date ON athlete_fitness_trends(athlete_id, date DESC);
```

### Ví dụ về Giao diện người dùng (UI)
*   Màn hình biểu đồ Thể lực (Fitness Chart):
    *   Sử dụng biểu đồ vùng chồng (Area Chart) và đường (Line Chart).
    *   Vùng CTL tô màu xanh dương nhạt. Đường ATL màu vàng cam chạy phía trên.
    *   Trục TSB hiển thị ở nửa dưới biểu đồ dưới dạng các cột xanh lá/đỏ hướng lên hoặc hướng xuống từ trục số 0.

### Ví dụ về Dashboard
Một widget tóm tắt phong độ hiện tại (Form Widget):
*   Hiển thị chữ lớn: **Form: +10 (Sung sức)**.
*   Kèm theo một la bàn hoặc kim chỉ số (Gauge Chart) trỏ vào vùng **"Sẵn sàng thi đấu" (Freshness Zone)**.

---

## 5. Sai lầm phổ biến khi thiết kế sản phẩm (Common Pitfalls)

1.  **Lỗi ngày trống (Cold Start & Data Gaps)**:
    *   *Sai lầm*: Nếu vận động viên không tập luyện trong 1 tuần và không có dữ liệu tải được ghi nhận, thuật toán EMA nếu không được xử lý đúng sẽ bỏ qua tuần đó hoặc tính sai CTL/ATL vì thiếu các mốc ngày.
    *   *Giải pháp*: Khi chạy script tính toán CTL/ATL hàng ngày, hệ thống phải chạy qua **toàn bộ các ngày liên tục** trên lịch. Nếu một ngày không có bài tập nào, giá trị `daily_load` của ngày đó mặc định bằng 0 và tiếp tục chạy công thức EMA để CTL và ATL tự động phân rã tự nhiên.
2.  **Tính toán lại toàn bộ lịch sử mỗi khi có bài tập mới (Performance Bottleneck)**:
    *   *Sai lầm*: Mỗi khi vận động viên tải lên một buổi tập mới từ Garmin, hệ thống lại chạy vòng lặp tính toán lại CTL/ATL từ ngày đầu tiên tham gia hệ thống (ví dụ: 5 năm trước). Điều này gây tốn tài nguyên máy chủ vô ích.
    *   *Giải pháp*: Chỉ chạy recalculate ngược lại từ **ngày xảy ra hoạt động được thêm/sửa/xóa** cho đến ngày hiện tại (hoặc ngày cuối cùng có kế hoạch tập luyện). Lưu trữ một checkpoint CTL/ATL của ngày hôm trước để làm điểm xuất phát.
3.  **Không cho phép tùy biến hằng số thời gian (Hardcoded Time Constants)**:
    *   *Sai lầm*: Khóa cứng CTL ở 42 ngày và ATL ở 7 ngày. Thực tế, một số vận động viên chuyên nghiệp phục hồi rất nhanh (ATL phân rã nhanh hơn - ví dụ 5 ngày) hoặc muốn theo dõi thể lực trong chu kỳ ngắn hơn.
    *   *Giải pháp*: Cung cấp cài đặt nâng cao trong hồ sơ huấn luyện viên/vận động viên để thay đổi giá trị mặc định của hằng số thời gian CTL ($\tau_1$) và ATL ($\tau_2$).
        *   Mặc định: $CTL\_Days = 42, ATL\_Days = 7$.
