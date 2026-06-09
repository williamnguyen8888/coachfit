# Chương 4: Chỉ số buổi tập (Workout Metrics)

Khi vận động viên hoàn thành một buổi tập và đồng bộ hóa thiết bị (Garmin, Wahoo, Apple Watch), hệ thống sẽ nhận được một tệp dữ liệu thô chứa hàng nghìn điểm dữ liệu theo từng giây (dữ liệu time-series). Từ dòng dữ liệu thô này, công cụ phân tích phải trích xuất và tính toán ra các chỉ số tóm tắt của bài tập.

---

## 1. Bản chất và Nguồn gốc dữ liệu

Các chỉ số cơ bản chia làm hai loại:
1.  **Dữ liệu thô từ cảm biến (Raw Sensor Data)**: Do GPS, cảm biến đo nhịp tim (quang học hoặc đai ngực), cảm biến công suất (Power Meter), cảm biến guồng chân (Cadence Sensor) và cảm biến áp suất (Barometric Altimeter) ghi nhận trực tiếp mỗi giây một lần (1Hz).
2.  **Dữ liệu tính toán (Calculated Metrics)**: Do thuật toán của nền tảng phân tích xử lý từ dữ liệu thô để đưa ra đánh giá định lượng.

---

## 2. Chi tiết từng Chỉ số buổi tập

### Thời gian (Duration)
*   **Thời gian trôi qua (Elapsed Time)**: Tổng thời gian từ lúc nhấn nút `Start` đến lúc nhấn nút `Save` (bao gồm cả thời gian dừng đèn đỏ, nghỉ uống nước).
*   **Thời gian vận động (Moving Time)**: Thời gian thực tế vận động viên di chuyển. Được tính bằng cách loại bỏ các khoảng thời gian tốc độ bằng 0 hoặc công suất bằng 0 (nếu dùng chế độ tự động dừng - Auto-pause).
*   **Công thức**:
    $$Moving\ Time = Elapsed\ Time - Idle\ Time$$
*   **Ứng dụng**: Moving Time dùng để tính Tốc độ trung bình (Average Speed), trong khi Elapsed Time phản ánh trung thực hơn tổng áp lực sinh lý lên cơ thể (vì thời gian nghỉ giữa các hiệp biến tốc cũng ảnh hưởng đến sự phục hồi).

### Quãng đường (Distance)
*   **Nguồn gốc**: Tính toán từ chênh lệch tọa độ GPS giữa các điểm liên tiếp hoặc đếm số vòng quay bánh xe (đạp xe trong nhà).
*   **Công thức**: Khoảng cách Harvesine giữa hai điểm GPS $(lat_1, lon_1)$ và $(lat_2, lon_2)$:
    $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta lat}{2}\right) + \cos(lat_1)\cos(lat_2)\sin^2\left(\frac{\Delta lon}{2}\right)}\right)$$
    Trong đó $R$ là bán kính Trái Đất ($\approx 6371\ km$).

### Cao độ (Elevation)
*   **Độ cao tăng lũy kế (Elevation Gain)**: Tổng tất cả các đoạn dốc đi lên trong buổi tập.
*   **Độ cao giảm lũy kế (Elevation Loss)**: Tổng tất cả các đoạn dốc đi xuống.
*   **Nguồn gốc**: Cảm biến áp suất khí quyển tích hợp trong đồng hồ hoặc đối chiếu tọa độ GPS với bản đồ cao độ số hóa (DEM) để sửa lỗi.
*   **Thuật toán lọc nhiễu cao độ (Elevation Hysteresis Filter)**:
    *   *Vấn đề*: Cảm biến áp suất luôn bị dao động nhiễu cực nhỏ do gió, chuyển động tay. Nếu cộng dồn mọi thay đổi (ví dụ: giây 1 cao độ tăng 0.1m, giây 2 giảm 0.1m), tổng Elevation Gain cuối cùng sẽ bị phóng đại lên 200-300m một cách phi lý trên một cung chạy hoàn toàn bằng phẳng.
    *   *Giải pháp*: Áp dụng bộ lọc trễ với ngưỡng trần trễ (Hysteresis Threshold - thường là **2 mét**). Chỉ bắt đầu ghi nhận xu hướng đi lên (climbing state) nếu cao độ tích lũy tăng liên tục vượt qua ngưỡng 2 mét. Khi đang ở trạng thái đi lên, nếu có sự suy giảm dưới 2 mét thì bỏ qua không tính là dốc đi xuống cho đến khi độ giảm vượt ngưỡng trễ.


### Tốc độ (Speed) & Nhịp độ (Pace)
*   **Tốc độ (Speed - km/h hoặc mph)**: Dùng cho Đạp xe.
*   **Nhịp độ (Pace - phút/km hoặc phút/dặm)**: Dùng cho Chạy bộ và Bơi lội (phút/100m).
*   **Công thức tính Pace**:
    $$Pace\ (seconds/km) = \frac{Moving\ Time\ (seconds)}{Distance\ (km)}$$
    Sau đó chuyển đổi sang định dạng `MM:SS`. Ví dụ: 300 giây/km = 5:00/km.

### Công suất (Power - Watts)
*   **Ý nghĩa**: Lực đạp chân tác động lên bàn đạp nhân với vận tốc góc (guồng chân). Đây là chỉ số khách quan nhất về cường độ lực phát ra.
*   **Nguồn gốc**: Cảm biến lực (strain gauge) gắn ở giò đĩa, bàn đạp hoặc đùm bánh sau. Ở chạy bộ, công suất được ước tính qua gia tốc trọng trường và chuyển động cơ thể (Garmin Running Power, Stryd).

### Guồng chân / Vòng quay chân / Tần số bước chạy (Cadence)
*   **Đạp xe**: Số vòng quay đùi đĩa mỗi phút (RPM).
*   **Chạy bộ**: Số bước chân mỗi phút (SPM - Steps Per Minute). Thường đo bằng gia tốc kế trong đồng hồ hoặc đai ngực chạy bộ.

### Nhịp tim (Heart Rate - BPM)
*   **Ý nghĩa**: Số nhịp đập của tim trong một phút. Cho biết tim phải làm việc vất vả thế nào để đáp ứng nhu cầu oxy của cơ bắp.

### Lượng calo tiêu thụ (Calories / Energy Expenditure)
*   **Công thức đạp xe (có đo công suất)**:
    $$Energy\ (kJ) = Average\ Power\ (Watts) \times Duration\ (seconds) / 1000$$
    Vì hiệu suất chuyển hóa năng lượng sinh học cơ thể người chỉ khoảng 20-25% (phần còn lại chuyển thành nhiệt), nên lượng calo tiêu hao tương đương công cơ học tạo ra:
    $$Calories\ (kcal) \approx Energy\ (kJ)$$
*   **Công thức chạy bộ (không có công suất)**:
    1.  *Mô hình Margaria (Kinh điển, độ chính xác cao)*:
        $$Net\ Energy\ Expenditure\ (kcal) = 1.0 \times Weight\ (kg) \times Distance\ (km)$$
    2.  *Mô hình METs (Metabolic Equivalents)*: Tính mức tiêu thụ oxy ($VO_2$) dựa trên tốc độ chạy bộ ($Speed_{m/min}$):
        $$VO_2\ (ml/kg/min) = (0.2 \times Speed) + (0.9 \times Speed \times Grade) + 3.5$$
        Sau đó quy đổi sang Calo tiêu hao mỗi phút:
        $$CaloriesPerMinute = 0.005 \times VO_2 \times Weight\ (kg)$$
        $$Calories\ (kcal) = \sum_{t=1}^{Duration_{min}} CaloriesPerMinute_t$$


### Tải tập luyện (Training Load), Cường độ (Intensity) & Nỗ lực tương đối (Relative Effort)
*   **Intensity (Cường độ)**: Tỷ lệ giữa nỗ lực thực tế so với giới hạn tối đa (ví dụ: nhịp tim trung bình / Max HR hoặc Công suất bình quân / FTP).
*   **Training Load (Tải tập luyện)**: Tích số giữa Cường độ và Thời gian. Cho biết tổng lượng căng thẳng thể chất đặt lên cơ thể sau bài tập.
*   **Relative Effort (Nỗ lực tương đối - Thuật ngữ của Strava)**: Điểm số tải tập luyện dựa trên nhịp tim để so sánh các môn thể thao khác nhau.

---

## 3. Ví dụ thực tế

### Ví dụ về Athlete
Vận động viên chạy bộ hoàn thành buổi chạy dài cuối tuần. Khi xem lại tệp FIT, đồng hồ ghi nhận: Moving Time: 2:00:00, Distance: 20 km, Elevation Gain: 150m, Avg HR: 145 BPM.

### Ví dụ về Coach
Huấn luyện viên xem phân tích:
*   Pace trung bình: $\frac{120\ phút}{20\ km} = 6:00/km$.
*   Calories ước tính: $1200\ kcal$.
*   Coach thấy nhịp tim trung bình của Athlete duy trì ổn định ở vùng Zone 2 dù ở các km cuối cùng có hiện tượng trôi nhịp tim (aerobic drift) nhẹ do mệt mỏi. Điều này chứng tỏ sức bền hiếu khí đang tiến triển tốt.

### Ví dụ về Product
Trên giao diện bài tập, hệ thống tự động làm sạch dữ liệu (Data Cleaning). Nếu phát hiện lỗi GPS nhảy vọt khiến vận động viên chạy với tốc độ 100 km/h trong 1 giây, thuật toán lọc nhiễu (Smoothing Algorithm - như bộ lọc Moving Average hoặc Savitzky-Golay) sẽ tự động làm mịn đường đồ thị tốc độ trước khi hiển thị cho người dùng.

### Ví dụ về Cơ sở dữ liệu (Database Schema)
Bảng lưu trữ tổng hợp kết quả của một buổi tập (Activity):

```sql
CREATE TABLE athlete_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    title VARCHAR(255) NOT NULL,
    sport_type VARCHAR(50) NOT NULL, -- 'ride', 'run', 'swim', 'row'
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    elapsed_time_seconds INT NOT NULL,
    moving_time_seconds INT NOT NULL,
    distance_meters DOUBLE PRECISION NOT NULL,
    elevation_gain_meters DOUBLE PRECISION,
    elevation_loss_meters DOUBLE PRECISION,
    avg_speed_m_s DOUBLE PRECISION,
    max_speed_m_s DOUBLE PRECISION,
    avg_power_watts INT,
    max_power_watts INT,
    avg_heart_rate INT,
    max_heart_rate INT,
    avg_cadence DOUBLE PRECISION,
    max_cadence DOUBLE PRECISION,
    calories_burned INT,
    training_load_score DOUBLE PRECISION, -- Điểm TSS hoặc TRIMP tính toán được
    intensity_factor DOUBLE PRECISION, -- Hệ số cường độ
    perceived_exertion INT CHECK (perceived_exertion BETWEEN 1 AND 10), -- RPE người dùng nhập
    fit_file_path VARCHAR(512), -- Đường dẫn tệp FIT thô lưu trên Cloud Storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_athlete_activities_athlete_start ON athlete_activities(athlete_id, start_time DESC);
```

### Ví dụ về Giao diện người dùng (UI)
Thẻ tóm tắt chỉ số bài tập (Workout Summary Grid):
*   Thiết kế dạng lưới 4x2 các thông số cốt lõi:
    *   **Thời gian**: `1:45:23` | **Quãng đường**: `18.5 km`
    *   **Pace trung bình**: `5:42 /km` | **Nhịp tim trung bình**: `142 BPM`
    *   **Công suất trung bình**: `185 W` | **Lượng calo**: `980 kcal`
    *   **Tải tập luyện**: `115` | **Độ dốc trung bình**: `1.2%`

### Ví dụ về Dashboard
Biểu đồ đa trục thời gian (Time-series Stream Chart) thể hiện sự tương quan:
*   Đường đồ thị nhịp tim (Màu đỏ) chạy song song với đường công suất (Màu xanh lá) và cao độ (Màu xám phủ nền) giúp người dùng thấy rõ khi đạp lên dốc (cao độ tăng) thì công suất tăng lập tức, và sau đó nhịp tim tăng dần theo.

---

## 4. Sai lầm phổ biến khi thiết kế sản phẩm (Common Pitfalls)

1.  **Nhầm lẫn giữa Elapsed Time và Moving Time**:
    *   *Sai lầm*: Sử dụng Elapsed Time để tính tốc độ trung bình cho môn chạy bộ. Nếu vận động viên chạy 10km trong 50 phút thực tế di chuyển, nhưng họ dừng đèn đỏ mất 10 phút (tổng thời gian trôi qua là 60 phút). Nếu lấy 60 phút chia ra, Pace trung bình sẽ là 6:00/km thay vì đúng ra là 5:00/km. Điều này làm sai lệch đánh giá năng lực của họ.
    *   *Giải pháp*: Luôn tính toán các chỉ số trung bình (Avg Speed, Avg Power, Avg Cadence) dựa trên **Moving Time**, ngoại trừ các chỉ số đo áp lực tim mạch như Avg Heart Rate thì nên tính trên **Elapsed Time** vì tim vẫn đập ở mức cao khi vừa dừng di chuyển.
2.  **Không xử lý các khoảng dừng (Gaps) trong tệp dữ liệu cảm biến**:
    *   *Sai lầm*: Khi thiết bị mất tín hiệu GPS (ví dụ chạy qua đường hầm), tệp FIT không ghi nhận dòng dữ liệu trong 30 giây. Nếu hệ thống chỉ nối các điểm trước và sau đường hầm bằng một đường thẳng tắp mà không xử lý nội suy tốc độ, dữ liệu biểu đồ sẽ có đoạn thẳng đứng bất thường.
    *   *Giải pháp*: Viết hàm kiểm tra khoảng trống thời gian giữa các bản ghi liên tiếp. Nếu khoảng trống $> 3$ giây, tiến hành xử lý nội suy (interpolation) hoặc đánh dấu vùng đó là "Mất tín hiệu" để không đưa vào tính toán các đỉnh hiệu suất ngắn hạn (peak performance).
3.  **Lưu trữ dữ liệu dạng đơn vị hiển thị thay vì đơn vị chuẩn**:
    *   *Sai lầm*: Lưu quãng đường dưới dạng Kilomet (km) và tốc độ dưới dạng km/h trong database. Khi người dùng Mỹ đổi cấu hình hiển thị sang Dặm (miles) và mph, hệ thống phải convert toàn bộ database hoặc bị lỗi hiển thị.
    *   *Giải pháp*: Luôn lưu trữ theo đơn vị chuẩn SI: **Quãng đường = mét (m), Tốc độ = mét/giây (m/s), Thời gian = giây (s)**. Việc chuyển đổi sang km, miles, km/h, mph, pace/km hay pace/mile chỉ thực hiện ở lớp Presentation/UI trước khi render.
        *   $1\ m/s \approx 3.6\ km/h$
        *   $1\ m/s \approx 2.237\ mph$
