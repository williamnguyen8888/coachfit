# Chương 2: Hồ sơ vận động viên (Athlete Profile) & Bộ chỉ số cá nhân

Hồ sơ vận động viên trong một nền tảng thể thao sức bền không đơn thuần là thông tin cá nhân cơ bản mà là một **bản đồ giới hạn sinh lý**. Toàn bộ các thuật toán phân tích, tính toán tải tập luyện, phân chia vùng tập luyện và dự báo phong độ đều sử dụng các thông số trong hồ sơ này làm tham số đầu vào.

---

## 1. Các chỉ số sinh trắc học và ngưỡng sinh lý

### Sinh trắc học cơ bản: Cân nặng (Weight), Chiều cao (Height), Tuổi (Age), Giới tính (Gender)
*   **Ý nghĩa**:
    *   **Cân nặng**: Yếu tố quyết định để tính chỉ số Công suất trên trọng lượng ($W/kg$) - thước đo quan trọng nhất cho khả năng leo dốc của cua-dơ và hiệu suất chạy bộ.
    *   **Chiều cao & Giới tính**: Dùng để ước tính dung tích phổi và các chỉ số chuyển hóa cơ bản (BMR). Giới tính cũng quyết định phân loại các vùng nhịp tim sinh lý mặc định.
    *   **Tuổi**: Dùng để ước tính nhịp tim tối đa lý thuyết ($HR_{max} = 220 - Tuổi$) và theo dõi sự suy giảm VO2Max tự nhiên theo thời gian.
*   **Cách đo & Cập nhật**: Cân nặng cần được cập nhật thường xuyên (qua cân thông minh đồng bộ với hệ thống như Withings hoặc Garmin). Tuổi tự động tăng theo ngày sinh nhật.
*   **Cách lưu trữ**: Lưu trữ lịch sử biến động (đặc biệt là cân nặng) vì cân nặng thay đổi theo mùa huấn luyện.

---

### Ngưỡng năng lượng Đạp xe: FTP và eFTP
#### Ngưỡng công suất chức năng (FTP - Functional Threshold Power)
*   **Ý nghĩa**: Là công suất trung bình cao nhất (tính bằng Watt) mà một vận động viên có thể duy trì liên tục trong vòng 1 giờ. Đây là "mỏ neo" để tính toán toàn bộ các vùng tập luyện bằng công suất (Power Zones) và điểm số tải tập luyện (TSS) cho môn đạp xe.
*   **Cách đo**:
    1.  **Bài kiểm tra 20 phút (20-min Test)**: Thực hiện đạp hết sức trong 20 phút. FTP được tính bằng 95% công suất trung bình của 20 phút đó.
    2.  **Bài kiểm tra tăng dần (Ramp Test)**: Đạp trên smart trainer, công suất tăng dần mỗi phút cho đến khi kiệt sức hoàn toàn (failure). FTP được tính bằng 75% công suất của phút cuối cùng được hoàn thành.
*   **Công thức**:
    $$FTP = Average\ Power_{20min} \times 0.95$$
    $$FTP = Power_{Ramp\ Max} \times 0.75$$

#### Ngưỡng công suất ước tính (eFTP - Estimated Functional Threshold Power)
*   **Ý nghĩa**: Là FTP được hệ thống tự động ước tính dựa trên các nỗ lực tập luyện thực tế của vận động viên mà không cần họ phải thực hiện các bài kiểm tra kiệt sức đau đớn.
*   **Cách tính**: Phân tích đường cong công suất theo thời gian (Power Duration Curve - PDC). Tìm điểm nỗ lực tối đa trong khoảng từ 3 phút đến 12 phút, sau đó áp dụng các mô hình toán học (như mô hình Morton's 3-parameter hoặc mô hình Monod & Scherrer) để suy rộng ra FTP.

---

### Công suất tới hạn (Critical Power - CP) và W' (Vùng năng lượng kị khí)
*   **Ý nghĩa**:
    *   **Critical Power (CP)**: Về mặt toán học, đây là đường tiệm cận của đường cong công suất khi thời gian tiến tới vô hạn (trên thực tế là khoảng 30 đến 40 phút). CP rất gần với FTP nhưng có tính chất sinh lý chính xác hơn.
    *   **$W'$ (đọc là W prime, đơn vị Joules)**: Là tổng lượng năng lượng kị khí hữu hạn mà vận động viên có thể sử dụng khi vượt lên trên ngưỡng CP. Nó giống như một "bình xăng phụ" chỉ dùng khi bứt tốc hoặc leo dốc ngắn.
*   **Công thức**:
    $$Work = (CP \times t) + W'$$
    Trong đó $Work$ là tổng năng lượng tạo ra (Joules = Watts $\times$ giây), $t$ là thời gian (giây). Từ dữ liệu của ít nhất 2 nỗ lực hết sức (ví dụ: bài test 3 phút và 12 phút), ta giải hệ phương trình tuyến tính để tìm ra CP và $W'$:
    $$CP = \frac{(P_1 \times t_1) - (P_2 \times t_2)}{t_1 - t_2}$$
    $$W' = (P_1 - CP) \times t_1$$

---

### Ngưỡng chạy bộ và bơi lội: Threshold Pace, Critical Pace, CSS
#### Ngưỡng tốc độ chạy bộ (Threshold Pace / LTHR Pace)
*   **Ý nghĩa**: Là tốc độ chạy nhanh nhất mà vận động viên có thể duy trì trong trạng thái ổn định lactate (thường từ 45 - 60 phút). Tương đương với tốc độ chạy cự ly 10km đến bán marathon (21km) của vận động viên phong trào.
*   **Cách đo**: Chạy hết sức trong 30 phút đơn độc. Lấy tốc độ trung bình của 20 phút cuối cùng.

#### Tốc độ bơi tới hạn (CSS - Critical Swim Speed)
*   **Ý nghĩa**: Tốc độ bơi nhanh nhất có thể duy trì liên tục mà không bị kiệt sức, dùng để xác định các vùng tập luyện dưới nước.
*   **Cách đo**: Vận động viên thực hiện 2 bài test bơi hết sức ở cự ly 400m và 200m trong bể bơi.
*   **Công thức**:
    $$CSS\ (m/s) = \frac{400 - 200}{t_{400} - t_{200}}$$
    Trong đó $t_{400}$ và $t_{200}$ là thời gian hoàn thành (tính bằng giây) của mỗi cự ly.

---

### Các ngưỡng nhịp tim: Resting HR, Max HR, Threshold HR (LTHR)
*   **Resting Heart Rate (Resting HR - Nhịp tim nghỉ)**: Nhịp tim thấp nhất khi thức dậy vào buổi sáng. Vận động viên càng khỏe, Resting HR càng thấp (do thể tích nhịp tim tăng).
*   **Max Heart Rate (Max HR - Nhịp tim tối đa)**: Số nhịp đập lớn nhất của tim trong 1 phút dưới áp lực tập luyện cực độ.
    *   *Công thức truyền thống*: $HR_{max} = 220 - Tuổi$. (Đơn giản nhưng độ sai số lớn $\pm 10-12$ BPM).
    *   *Công thức Tanaka (Khuyên dùng cho người trưởng thành)*: 
        $$HR_{max} = 208.7 - 0.7 \times Tuổi$$
    *   *Công thức Gellish (Khuyên dùng cho VĐV thể thao sức bền)*: 
        $$HR_{max} = 207 - 0.7 \times Tuổi$$
*   **Threshold Heart Rate (LTHR - Lactate Threshold Heart Rate - Nhịp tim ngưỡng)**: Nhịp tim tương ứng với thời điểm lactate bắt đầu tích tụ nhanh trong máu. Đây là chỉ số quan trọng nhất để thiết lập vùng nhịp tim (Heart Rate Zones) vì nó phản ánh chính xác trạng thái sinh lý hơn là nhịp tim tối đa.
*   **Cách đo LTHR**: Chạy test 30 phút hết sức. Nhịp tim trung bình của 20 phút cuối là LTHR.


---

### Các chỉ số thích nghi và sức khỏe: VO2Max và HRV
#### VO2Max (Thể tích oxy tối đa)
*   **Ý nghĩa**: Lượng oxy tối đa (tính bằng mililit) mà một người có thể tiêu thụ trong 1 phút trên mỗi kilôgam trọng lượng cơ thể ($ml/kg/min$) ở hiệu suất đỉnh cao. Đây là thước đo chuẩn vàng cho dung tích hiếu khí.
*   **Công thức ước tính (Dành cho Developer lập trình)**:
    1.  *Ước tính dựa trên Nhịp tim (Uth-Sørensen-Overgaard-Pedersen)*:
        $$VO2Max = 15.3 \times \frac{HR_{max}}{HR_{resting}}$$
    2.  *Ước tính qua bài kiểm tra chạy 12 phút (Cooper Test)*:
        $$VO2Max = \frac{Distance_{12min\ (meters)} - 504.9}{44.73}$$
    3.  *Ước tính dựa trên tốc độ và nhịp tim (Mô hình tuyến tính)*: Phân tích các đoạn chạy ổn định dài trên 10 phút, xây dựng hàm hồi quy tuyến tính tương quan giữa % nhịp tim dự phòng (%HRR) và tốc độ chạy để ngoại suy ra tốc độ ở 100% VO2Max (vVO2Max), sau đó chuyển đổi sang chỉ số VO2Max.

#### HRV (Heart Rate Variability - Biến thiên nhịp tim)
*   **Ý nghĩa**: Sự biến thiên thời gian giữa các nhịp tim liên tiếp (khoảng R-R tính bằng mili-giây). HRV phản ánh hoạt động của Hệ thần kinh tự chủ (Autonomic Nervous System).
*   **Các chỉ số đo lường trong hệ thống**:
    1.  **rMSSD (Root Mean Square of Successive Differences)**:
        $$rMSSD = \sqrt{\frac{1}{N-1} \sum_{i=1}^{N-1} (RR_{i+1} - RR_i)^2}$$
        *Ý nghĩa*: Phản ánh hoạt động của hệ phó giao cảm (phục hồi) trong thời gian ngắn. Rất nhạy bén và là chỉ số tiêu chuẩn cho các phép đo ngắn hạn (ví dụ: đo 1 phút buổi sáng bằng camera điện thoại hoặc đai tim).
    2.  **SDNN (Standard Deviation of NN intervals)**:
        $$SDNN = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (RR_i - RR_{avg})^2}$$
        *Ý nghĩa*: Độ lệch chuẩn của toàn bộ các khoảng R-R trong thời gian dài (thường là đo suốt đêm 24 giờ). Phản ánh tổng thể khả năng thích nghi của hệ thần kinh tự chủ đối với các tác nhân stress (cả tập luyện, tâm lý, môi trường). Phổ biến ở dữ liệu đồng bộ từ Oura, Apple Watch, Whoop.
*   **Trạng thái sinh lý**: HRV cao nghĩa là Hệ phó giao cảm đang chiếm ưu thế (cơ thể đang phục hồi tốt). HRV thấp đột ngột nghĩa là cơ thể đang bị stress, quá tải hoặc sắp ốm.


---

## 2. Góc nhìn phát triển sản phẩm (Product & Engineering)

### Cách hệ thống lưu trữ (Data Modeling)
Các chỉ số ngưỡng không cố định. Chúng thay đổi khi vận động viên khỏe lên hoặc yếu đi. Do đó, **cấm thiết kế lưu trữ các thông số này như các cột tĩnh trong bảng `athletes`**. Phải lưu trữ dưới dạng một chuỗi thời gian (Time-series) để có thể tính toán chính xác dữ liệu lịch sử. 

Ví dụ: Nếu hôm nay vận động viên có FTP là 250W, nhưng 6 tháng trước FTP của họ là 200W. Khi phân tích một bài tập từ 6 tháng trước, hệ thống phải sử dụng FTP = 200W của thời điểm đó để tính chỉ số tải tập luyện, không được dùng FTP hiện tại là 250W.

#### Thiết kế Database (PostgreSQL)

```sql
-- Lưu trữ thông tin sinh trắc học biến động theo thời gian
CREATE TABLE athlete_biometrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    effective_date DATE NOT NULL,
    weight_kg DOUBLE PRECISION,
    height_cm DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(athlete_id, effective_date)
);

-- Lưu trữ lịch sử các ngưỡng sinh lý
CREATE TABLE athlete_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    sport_type VARCHAR(50) NOT NULL, -- 'ride', 'run', 'swim'
    effective_date DATE NOT NULL,
    ftp INT, -- Dùng cho ride (Watts)
    threshold_pace DOUBLE PRECISION, -- Dùng cho run/swim (m/s)
    threshold_hr INT, -- Nhịp tim ngưỡng LTHR (BPM)
    max_hr INT, -- Nhịp tim tối đa (BPM)
    resting_hr INT, -- Nhịp tim nghỉ (BPM)
    critical_power INT, -- Công suất tới hạn CP (Watts)
    w_prime_joules INT, -- Dung tích kị khí W' (Joules)
    vo2max DOUBLE PRECISION, -- ml/kg/min
    source VARCHAR(50) NOT NULL, -- 'manual_entry', 'auto_detected', 'ramp_test'
    activity_id UUID, -- Liên kết đến activity nếu tự động phát hiện
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(athlete_id, sport_type, effective_date)
);

CREATE INDEX idx_athlete_thresholds_lookup ON athlete_thresholds(athlete_id, sport_type, effective_date DESC);
```

---

## 3. Ví dụ thực tế

### Ví dụ về Athlete
Vận động viên Nguyễn Văn A (Nam, 30 tuổi, nặng 65kg) cập nhật cân nặng mới của mình lên hệ thống. Sáng hôm sau, A thực hiện bài kiểm tra FTP 20 phút và đạt công suất trung bình 263W.

### Ví dụ về Coach
Huấn luyện viên xem lịch sử ngưỡng của A, thấy hệ thống tự tính toán FTP mới của A là:
$$FTP = 263 \times 0.95 = 250W$$
Đồng nghĩa với tỉ lệ công suất trên cân nặng là:
$$\frac{250W}{65kg} = 3.85\ W/kg$$
Coach nhấn nút "Chấp nhận" để hệ thống tự động cập nhật lại toàn bộ các vùng công suất huấn luyện của A kể từ ngày hôm nay.

### Ví dụ về Product
Khi hệ thống tự động phát hiện một nỗ lực của Vận động viên vượt trội hơn ngưỡng cũ (ví dụ: chạy 5km với pace trung bình nhanh hơn Threshold Pace hiện tại), hệ thống sẽ gửi một thông báo đẩy (push notification) chúc mừng:
> **"Kỷ lục mới! Ngưỡng tốc độ (Threshold Pace) của bạn đã cải thiện từ 5:00/km lên 4:50/km. Bạn có muốn cập nhật phân vùng tập luyện của mình không?"** kèm nút `[Cập nhật ngay]` và `[Bỏ qua]`.

### Ví dụ về Giao diện người dùng (UI)
Màn hình cài đặt hồ sơ vận động viên (Athlete Profile Settings):
*   Chia thành các tab: **Thông số cơ bản**, **Đạp xe (Cycling)**, **Chạy bộ (Running)**, **Bơi lội (Swimming)**.
*   Bên trong mỗi tab môn thể thao là các ô nhập liệu cho FTP, LTHR, Max HR kèm theo ngày cập nhật gần nhất và một biểu đồ lịch sử phát triển của ngưỡng đó trong 1 năm qua.

### Ví dụ về Dashboard
Một widget mang tên **"Tóm tắt Sinh lý" (Physiological Summary)** ở góc trang cá nhân của Athlete:
*   Hiển thị các thẻ thông tin dạng số lớn:
    *   **FTP**: `250 W` ($3.85\ W/kg$) $\uparrow 2\%$ so với tháng trước.
    *   **LTHR**: `168 BPM`.
    *   **VO2Max**: `54 ml/kg/min` (Thuộc nhóm "Xuất sắc" cho lứa tuổi 30).
    *   **HRV (7-day baseline)**: `65 ms` (Trạng thái phục hồi: Bình thường).

---

## 4. Sai lầm phổ biến khi thiết kế sản phẩm (Common Pitfalls)

1.  **Sử dụng FTP/Ngưỡng tĩnh cho toàn bộ dữ liệu lịch sử**:
    *   *Sai lầm*: Tính toán chỉ số tải tập luyện (TSS) của một buổi tập từ 3 năm trước bằng FTP vừa đo được ngày hôm qua. Điều này làm sai lệch hoàn toàn biểu đồ phân tích thể lực dài hạn (CTL/ATL).
    *   *Giải pháp*: Luôn thực hiện truy vấn SQL dạng `LIMIT 1` với điều kiện `effective_date <= activity_date ORDER BY effective_date DESC` để lấy đúng ngưỡng tại thời điểm hoạt động diễn ra.
2.  **Cho phép nhập Threshold Pace dưới dạng văn bản tự do (String)**:
    *   *Sai lầm*: Cho người dùng nhập `"5:30"` hoặc `"5 phút 30 giây"` dẫn đến lỗi định dạng khi tính toán.
    *   *Giải pháp*: Lưu trữ toàn bộ Tốc độ (Pace) dưới dạng Đơn vị cơ bản của Hệ đo lường quốc tế (SI) là **mét trên giây (m/s)** ở Database. Trên UI, chuyển đổi hiển thị động tùy theo đơn vị người dùng chọn (ví dụ: phút/km hoặc phút/mile).
        *   Ví dụ: Pace $5:00/km \Rightarrow 300\ s/1000m \Rightarrow \frac{1000}{300} \approx 3.33\ m/s$.
3.  **Cập nhật ngưỡng tự động mà không xin phép người dùng**:
    *   *Sai lầm*: Hệ thống tự động thay đổi FTP của vận động viên ngay khi phát hiện một đỉnh công suất ngắn hạn bị lỗi thiết bị (sensor spike - ví dụ công suất nhảy lên 2000W do nhiễu sóng). Điều này làm hỏng toàn bộ các bài tập tiếp theo vì vùng tập luyện bị đẩy lên quá cao.
    *   *Giải pháp*: Luôn có bước phê duyệt (Confirmation Workflow). Các phát hiện tự động phải nằm ở trạng thái "Chờ phê duyệt" (Pending Approval) và có cơ chế lọc các dữ liệu bất thường (anomaly detection - ví dụ loại bỏ các điểm dữ liệu công suất tăng vọt đột ngột trong 1-2 giây).
