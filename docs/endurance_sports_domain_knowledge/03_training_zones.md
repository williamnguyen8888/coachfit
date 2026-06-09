# Chương 3: Phân vùng Huấn luyện (Training Zones)

Phân vùng huấn luyện (Training Zones) là công cụ dịch thuật giúp chuyển hóa các mục tiêu sinh lý phức tạp thành các chỉ dẫn hành động đơn giản cho vận động viên trong lúc tập luyện. Thay vì yêu cầu vận động viên "chạy ở ngưỡng hiếu khí", huấn luyện viên chỉ cần yêu cầu "chạy ở Vùng 2 (Zone 2)".

---

## 1. Khái niệm cốt lõi

### Vùng nhịp tim (Heart Rate Zones)
*   **Khái niệm**: Là các khoảng nhịp tim được chia theo tỷ lệ phần trăm của Nhịp tim tối đa ($HR_{max}$), Nhịp tim dự phòng (HRR - Heart Rate Reserve), hoặc Nhịp tim ngưỡng (LTHR).
*   **Tại sao tồn tại**: Giúp đo lường cường độ tập luyện dựa trên phản ứng tim mạch thực tế của cơ thể. Phù hợp cho chạy bộ sức bền, phục hồi và kiểm soát mức độ mệt mỏi hệ thống tim mạch.

### Vùng công suất (Power Zones)
*   **Khái niệm**: Là các khoảng công suất được chia theo tỷ lệ phần trăm của FTP hoặc Critical Power.
*   **Tại sao tồn tại**: Đo lường cơ học trực tiếp công sinh ra (công suất phát lực tức thời). Không bị ảnh hưởng bởi độ trễ sinh lý (như nhịp tim phải mất 1-2 phút mới tăng theo cường độ), hướng gió, độ dốc hay thời tiết. Chuẩn vàng cho môn đạp xe.

### Vùng tốc độ (Pace Zones) và Vùng bơi (Swim Zones)
*   **Khái niệm**: Là các khoảng tốc độ (thời gian trên một quãng đường, ví dụ: phút/km cho chạy bộ hoặc phút/100m cho bơi lội) được chia theo tỷ lệ phần trăm của Ngưỡng tốc độ (Threshold Pace) hoặc CSS.
*   **Tại sao tồn tại**: Đối với chạy bộ trên đường bằng phẳng hoặc bơi lội, tốc độ là thước đo hiệu năng trực tiếp nhất của bài tập.

### Vùng guồng chân (Cadence Zones)
*   **Khái niệm**: Phân chia vòng quay chân mỗi phút (RPM - Revolutions Per Minute) cho đạp xe hoặc số bước chân mỗi phút (SPM - Steps Per Minute) cho chạy bộ.
*   **Tại sao tồn tại**: Giúp tối ưu hóa hiệu suất cơ sinh học và tránh chấn thương khớp gối (ví dụ: chạy bộ duy trì guồng chân tối ưu 170-180 SPM).

---

## 2. Các mô hình Phân vùng phổ biến và Công thức

### Hệ thống 5 vùng nhịp tim kinh điển (Garmin / Karvonen)
Dựa trên tỷ lệ % của Nhịp tim tối đa ($HR_{max}$) hoặc Nhịp tim dự phòng (HRR):
*   **Zone 1 (Khởi động - Warm Up)**: $50\% - 60\% HR_{max}$
*   **Zone 2 (Đốt mỡ/Bền - Easy/Fat Burn)**: $60\% - 70\% HR_{max}$
*   **Zone 3 (Hiếu khí - Aerobic/Tempo)**: $70\% - 80\% HR_{max}$
*   **Zone 4 (Ngưỡng - Threshold)**: $80\% - 90\% HR_{max}$
*   **Zone 5 (Kị khí - Anaerobic/VO2Max)**: $90\% - 100\% HR_{max}$

### Hệ thống 7 vùng công suất của Andrew Coggan (Classic Coggan Power Zones)
Được sử dụng làm tiêu chuẩn trong TrainingPeaks và WKO. Dựa trên % của FTP:
*   **Zone 1 (Phục hồi tích cực - Active Recovery)**: $< 55\% FTP$
*   **Zone 2 (Bền bỉ - Endurance)**: $55\% - 75\% FTP$ (Nền tảng của vận động viên sức bền)
*   **Zone 3 (Nhịp độ - Tempo)**: $76\% - 90\% FTP$
*   **Zone 4 (Ngưỡng lactate - Lactate Threshold)**: $91\% - 105\% FTP$
*   **Zone 5 (Dung tích oxy tối đa - VO2Max)**: $106\% - 120\% FTP$
*   **Zone 6 (Dung tích kị khí - Anaerobic Capacity)**: $121\% - 150\% FTP$
*   **Zone 7 (Công suất thần kinh cơ - Neuromuscular Power)**: $> 150\% FTP$ (Bứt tốc cực ngắn)

### Hệ thống phân vùng của Intervals.icu và TrainingPeaks LTHR (Joe Friel Heart Rate Zones)
Mô hình 7 vùng nhịp tim dựa trên LTHR để đồng nhất với các vùng công suất:
*   **Zone 1 (Recovery)**: $< 85\% LTHR$
*   **Zone 2 (Aerobic / Endurance)**: $85\% - 89\% LTHR$
*   **Zone 3 (Tempo)**: $90\% - 93\% LTHR$
*   **Zone 4 (Sub-Threshold)**: $94\% - 99\% LTHR$
*   **Zone 5a (Super-Threshold)**: $100\% - 102\% LTHR$
*   **Zone 5b (Aerobic Capacity / VO2Max)**: $103\% - 106\% LTHR$
*   **Zone 5c (Anaerobic Capacity)**: $> 106\% LTHR$

### Mô hình 3 vùng phân cực (3-Zone Polarized Model)
Dành cho trường phái huấn luyện phân cực (80/20 polarized training) đang cực kỳ thịnh hành trong giới chuyên nghiệp:
*   **Vùng 1 (Cường độ thấp - Low Intensity)**: Dưới ngưỡng $VT1$ / $LT1$. Nhịp tim duy trì thấp, có thể vừa chạy vừa nói chuyện thoải mái. Chiếm 80% tổng thời gian tập luyện để xây dựng hệ hiếu khí bền vững.
*   **Vùng 2 (Ngưỡng - Threshold)**: Nằm giữa $VT1/LT1$ và $VT2/LT2$. Nơi tích tụ lactate bắt đầu diễn ra nhưng ổn định. Rất ít khi tập ở vùng này trong mô hình phân cực để tránh mỏi cơ hệ thần kinh không cần thiết.
*   **Vùng 3 (Cường độ cao - High Intensity)**: Trên ngưỡng $VT2$ / $LT2$. Vận động kị khí và kích thích VO2Max. Chiếm khoảng 10-20% tổng số buổi tập.

### Tốc độ chuẩn hóa theo độ dốc (Grade Adjusted Pace - GAP) trong phân vùng tốc độ
*   *Vấn đề*: Khi chạy bộ lên dốc với tốc độ 6:00/km, cơ thể chịu stress tương đương chạy 5:00/km trên đường bằng. Nếu thiết bị chỉ hiển thị phân vùng tốc độ phẳng (Flat Pace Zones), vận động viên sẽ lầm tưởng mình đang chạy ở Zone 1 (trong khi nhịp tim đã vọt lên Zone 4).
*   *Giải pháp*: Hệ thống phải sử dụng thuật toán **Tốc độ chuẩn hóa dốc (GAP)** để quy đổi tốc độ tức thời trên địa hình dốc về tốc độ tương đương trên đường bằng phẳng. Phân vùng tốc độ lúc này sẽ dựa trên giá trị GAP này để hướng dẫn vận động viên.

---

## 3. Bảng so sánh các hệ thống phân vùng

| Tiêu chí so sánh | Mô hình Coggan (Power) | Mô hình Joe Friel (HR) | Mô hình Garmin ($HR_{max}$) | Mô hình Swim CSS (Swim Pace) |
| :--- | :--- | :--- | :--- | :--- |
| **Tham số mỏ neo** | FTP (Functional Threshold Power) | LTHR (Lactate Threshold HR) | $HR_{max}$ (Max Heart Rate) | CSS (Critical Swim Speed) |
| **Số lượng vùng** | 7 vùng | 7 vùng (1, 2, 3, 4, 5a, 5b, 5c) | 5 vùng | 5 đến 6 vùng tốc độ |
| **Độ trễ phản hồi** | Không (Phản hồi tức thì trong 1 giây) | Có độ trễ (1-2 phút) | Có độ trễ tương tự | Không (Dựa trên thời gian hoàn thành) |
| **Ứng dụng chính** | Đạp xe trong nhà/ngoài trời có Power Meter | Đạp xe, chạy bộ không có cảm biến công suất | Người mới bắt đầu, theo dõi sức khỏe tổng quát | Tập luyện trong bể bơi |
| **Đặc trưng thiết kế** | Tối ưu hóa cho phân tích cơ sinh học | Tối ưu hóa cho quản lý stress tim mạch | Đơn giản, dễ tiếp cận người dùng đại chúng | Dựa hoàn toàn trên cự ly và thời gian |

---

## 4. Ví dụ thực tế

### Ví dụ về Athlete
Vận động viên đạp xe có FTP = 200W và LTHR = 160 BPM nhận được bài tập đạp Zone 2 từ Huấn luyện viên. Hệ thống tự động dịch bài tập này thành: Đạp trong khoảng công suất từ 110W đến 150W ($55\% - 75\% FTP$) hoặc giữ nhịp tim từ 136 đến 142 BPM ($85\% - 89\% LTHR$).

### Ví dụ về Coach
Huấn luyện viên quan sát biểu đồ thời gian nằm trong vùng (Time in Zones) của bài tập hôm nay. Vận động viên được giao bài tập đạp Zone 2 trong 2 tiếng, nhưng thực tế bài tập cho thấy họ đạp 40 phút ở Zone 3 do thích bám đuổi nhóm khác. Coach nhắc nhở: *"Buổi tập hôm nay bị sai mục tiêu sinh lý, bạn đã tích lũy quá nhiều mệt mỏi ngoài ý muốn."*

### Ví dụ về Product
Khi người dùng thay đổi FTP hoặc LTHR, sản phẩm phải tự động hỏi: **"Bạn có muốn tính toán lại và cập nhật các phân vùng huấn luyện dựa trên ngưỡng mới này không?"**. Nếu đồng ý, hệ thống sẽ thực hiện cập nhật lại bảng phân vùng áp dụng từ ngày hôm đó trở đi.

### Ví dụ về Cơ sở dữ liệu (Database Schema)
Cách thiết kế cấu trúc lưu trữ vùng huấn luyện linh hoạt cho phép người dùng tùy biến số lượng vùng (5 vùng, 7 vùng hoặc tự đặt tên vùng):

```sql
CREATE TABLE athlete_zone_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    sport_type VARCHAR(50) NOT NULL, -- 'ride', 'run', 'swim'
    metric_type VARCHAR(50) NOT NULL, -- 'power', 'heart_rate', 'pace'
    effective_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(athlete_id, sport_type, metric_type, effective_date)
);

CREATE TABLE athlete_zone_bounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID NOT NULL REFERENCES athlete_zone_schemes(id) ON DELETE CASCADE,
    zone_number INT NOT NULL, -- 1, 2, 3, 4, 5...
    zone_name VARCHAR(100) NOT NULL, -- 'Active Recovery', 'Endurance'...
    min_percent DOUBLE PRECISION NOT NULL, -- Ví dụ 0.55 (55%)
    max_percent DOUBLE PRECISION NOT NULL, -- Ví dụ 0.75 (75%)
    min_value DOUBLE PRECISION NOT NULL, -- Giá trị tuyệt đối tính toán (ví dụ: 110 Watts hoặc nhịp tim 136)
    max_value DOUBLE PRECISION NOT NULL, -- Giá trị tuyệt đối tính toán (ví dụ: 150 Watts hoặc nhịp tim 142)
    UNIQUE(scheme_id, zone_number)
);

CREATE INDEX idx_zone_schemes_lookup ON athlete_zone_schemes(athlete_id, sport_type, metric_type, effective_date DESC);
```

### Ví dụ về Giao diện người dùng (UI)
Giao diện hiển thị bảng cấu hình các Zone:
*   Mỗi Zone là một hàng ngang gồm: Số thứ tự, Tên zone, Tỷ lệ %, Khoảng giá trị (có thể chỉnh sửa tay nếu không muốn dùng công thức tự động).
*   Có một thanh màu đặc trưng chạy từ Zone 1 (Màu xám/xanh lam nhạt) $\rightarrow$ Zone 2 (Xanh lá) $\rightarrow$ Zone 3 (Vàng) $\rightarrow$ Zone 4 (Cam) $\rightarrow$ Zone 5-7 (Đỏ rực).

### Ví dụ về Dashboard
Một biểu đồ cột nằm ngang (Horizontal Bar Chart) hiển thị **Phân phối thời gian tập luyện (Time in Zones Distribution)** của buổi tập:
*   `Zone 1 (Phục hồi)`: `15:20` [████░░░░░░] (15%)
*   `Zone 2 (Bền bỉ)`  : `1:15:40` [████████████████████░░] (75%)
*   `Zone 3 (Nhịp độ)` : `10:10` [██░░░░░░░░] (10%)

---

## 5. Sai lầm phổ biến khi thiết kế sản phẩm (Common Pitfalls)

1.  **Cứng nhắc hóa số lượng vùng tập luyện**:
    *   *Sai lầm*: Hardcode hệ thống chỉ có đúng 5 vùng nhịp tim hoặc 7 vùng công suất. Nhiều huấn luyện viên chuyên nghiệp sử dụng mô hình 3 vùng (dưới ngưỡng thông khí VT1, giữa VT1-VT2, trên VT2) hoặc muốn tự định nghĩa 6 vùng.
    *   *Giải pháp*: Thiết kế cơ sở dữ liệu dạng thực thể quan hệ linh hoạt (như Schema ở trên) để số lượng vùng và tỷ lệ phần trăm hoàn toàn có thể tùy biến cấu hình theo nhu cầu của huấn luyện viên hoặc người dùng nâng cao.
2.  **Không tự động cập nhật giá trị tuyệt đối khi thay đổi ngưỡng**:
    *   *Sai lầm*: Khi người dùng tăng FTP từ 200W lên 220W, hệ thống lưu FTP mới nhưng không tính toán lại giá trị tuyệt đối ($min\_value$, $max\_value$) của các vùng công suất liên kết, dẫn đến việc thiết bị hiển thị vùng tập cũ.
    *   *Giải pháp*: Viết một DB trigger hoặc Service logic: Khi một `athlete_thresholds` mới được chèn, tự động nhân tỷ lệ % của sơ đồ vùng hiện tại với ngưỡng mới để cập nhật lại các giá trị tuyệt đối trong bảng `athlete_zone_bounds`.
3.  **Lỗi làm tròn tốc độ (Pace Zones)**:
    *   *Sai lầm*: Khi tính toán vùng chạy bộ dựa trên tốc độ, do lưu trữ dạng số thực m/s nên khi chuyển đổi ngược lại định dạng `phút/km` thường bị lệch 1-2 giây so với thực tế, gây khó chịu cho vận động viên.
    *   *Giải pháp*: Định nghĩa hàm làm tròn chuẩn hóa ở cả Backend và Frontend để đảm bảo chuyển đổi m/s sang nhịp độ luôn chính xác đến từng giây.
        *   Công thức chuyển m/s sang giây/km: 
            $$SecondsPerKm = \frac{1000}{v}$$
            Trong đó $v$ là tốc độ tính bằng mét trên giây (m/s). Làm tròn kết quả $SecondsPerKm$ về số nguyên gần nhất rồi mới định dạng thành chuỗi `MM:SS`.
        *   Ví dụ: Pace $5:00/km \Rightarrow 300\text{ s/km} \Rightarrow v = \frac{1000}{300} \approx 3.33\text{ m/s}$.
