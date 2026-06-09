# Chương 5: Phân tích chuyên sâu về Công suất (Power Analytics)

Công suất (Power) là chỉ số vàng trong huấn luyện đạp xe và ngày càng phổ biến trong chạy bộ. Tuy nhiên, do đặc thù địa hình và biến động lực chân, chỉ sử dụng Công suất trung bình là không đủ để đánh giá đúng độ khó sinh lý của một buổi tập. Chương này sẽ trình bày các thuật toán phân tích công suất nâng cao được phát triển bởi Tiến sĩ Andrew Coggan và các nhà khoa học thể thao khác.

---

## 1. Các thuật toán cốt lõi

### Công suất trung bình (Average Power - $P_{avg}$)
*   **Khái niệm**: Tổng tất cả các mẫu công suất ghi nhận được chia cho thời gian hoạt động.
*   **Tại sao tồn tại**: Đưa ra con số thô về lượng năng lượng trung bình được giải phóng. Tuy nhiên, nó không phản ánh đúng mức độ mỏi cơ nếu bài tập có nhiều đoạn bứt tốc ngắn cường độ cao xen kẽ nghỉ thả lỏng.

### Công suất chuẩn hóa (Normalized Power - NP)
*   **Khái niệm**: Là một ước tính về công suất mà vận động viên có thể duy trì nếu họ đạp xe ở cường độ hoàn toàn ổn định (steady-state) với cùng một mức độ phản ứng sinh lý và áp lực chuyển hóa.
*   **Tại sao tồn tại**: Cơ thể người phản ứng với stress tập luyện một cách phi tuyến tính. Chạy biến tốc 300W trong 30 giây rồi nghỉ 30 giây (trung bình 150W) gây mệt mỏi lớn hơn nhiều so với đạp đều đặn 150W trong 1 phút. NP dùng để định lượng chính xác sự mệt mỏi phi tuyến này.
*   **Thuật toán tính toán**:
    1.  Tính giá trị trung bình trượt 30 giây (30-second rolling average) cho chuỗi dữ liệu công suất.
    2.  Lũy thừa bậc 4 ($x^4$) của từng giá trị trung bình trượt này.
    3.  Tính trung bình cộng của tất cả các giá trị đã lũy thừa bậc 4 đó.
    4.  Lấy căn bậc 4 ($x^{0.25}$) của kết quả trung bình cộng để ra giá trị NP.
*   **Công thức**:
    $$NP = \left( \frac{1}{N} \sum_{i=1}^{N} (P_{30s, i})^4 \right)^{0.25}$$
    Trong đó $P_{30s, i}$ là công suất trung bình trượt 30 giây tại thời điểm thứ $i$.

### Chỉ số biến động (Variability Index - VI)
*   **Khái niệm**: Tỷ số giữa Công suất chuẩn hóa (NP) và Công suất trung bình ($P_{avg}$).
*   **Tại sao tồn tại**: Đo lường mức độ "đều tay" của lực đạp. 
    *   $VI \approx 1.0$: Bài tập đạp rất đều (ví dụ: đua tính giờ - Time Trial hoặc đạp trên xe đạp ba môn phối hợp - Triathlon).
    *   $VI \ge 1.2$: Bài tập biến động mạnh (ví dụ: đua đường trường có nhiều khúc cua, leo dốc ngắn liên tục hoặc bài tập biến tốc).
*   **Công thức**:
    $$VI = \frac{NP}{P_{avg}}$$

### Hệ số cường độ (Intensity Factor - IF)
*   **Khái niệm**: Tỷ số giữa Công suất chuẩn hóa (NP) và FTP hiện tại của vận động viên.
*   **Tại sao tồn tại**: Giúp so sánh độ khó của bài tập giữa các vận động viên có trình độ khác nhau, hoặc so sánh các bài tập của chính mình khi FTP thay đổi.
*   **Công thức**:
    $$IF = \frac{NP}{FTP}$$
*   **Ý nghĩa các mức IF**:
    *   $< 0.75$: Buổi phục hồi hoặc đạp bền nhẹ nhàng.
    *   $0.75 - 0.85$: Bài tập bền bỉ dài (Endurance).
    *   $0.85 - 0.95$: Bài tập Tempo hoặc sát ngưỡng.
    *   $0.95 - 1.05$: Buổi đua xe kéo dài khoảng 1 giờ hoặc bài tập biến tốc cường độ cao.
    *   $> 1.05$: Bài tập biến tốc cực ngắn và nặng.

### Hệ số hiệu quả (Efficiency Factor - EF)
*   **Khái niệm**: Tỷ số giữa Công suất chuẩn hóa (NP) hoặc Công suất trung bình ($P_{avg}$) và Nhịp tim trung bình ($HR_{avg}$) của buổi tập.
*   **Tại sao tồn tại**: Đo lường hiệu quả hoạt động của hệ tim mạch. Nếu tim đập ít hơn để tạo ra cùng một công suất phát lực, nghĩa là vận động viên đang khỏe lên (aerobic fitness tăng).
*   **Công thức**:
    $$EF = \frac{NP}{HR_{avg}}$$
    *(Nếu bài tập có sự biến động lớn, sử dụng NP; nếu bài tập đạp đều ổn định, có thể thay thế NP bằng $P_{avg}$ để tính toán).*

---

## 2. Mô hình toán học nâng cao

### Đường cong công suất theo thời gian (Power Duration Curve - PDC)
*   **Khái niệm**: Đồ thị thể hiện công suất tối đa trung bình ($Mean\ Max\ Power$) mà vận động viên có thể duy trì trong từng khoảng thời gian cụ thể (từ 1 giây đến nhiều giờ).
*   **Tại sao tồn tại**: Xác định hồ sơ năng lực của vận động viên: họ là người bứt tốc (sprinter), người leo dốc (climber) hay người đua bền dài hạn (all-rounder).

### Mô hình Công suất tới hạn (Critical Power - CP) & Sự cân bằng năng lượng kị khí ($W'$ Balance)
*   **Khái niệm**: Khi vận động viên đạp vượt ngưỡng $CP$, "bình xăng kị khí" $W'$ bắt đầu cạn kiệt. Thuật toán $W'$ Balance ước tính lượng năng lượng kị khí còn lại trong bình xăng này tại mỗi thời điểm trong bài tập.
*   **Tại sao tồn tại**: Giúp vận động viên biết khi nào họ sắp "hết hơi" (bình xăng về 0) và tốc độ phục hồi của bình xăng này khi họ giảm cường độ xuống dưới CP.
*   **Các mô hình toán học tính toán**:
    1.  *Mô hình tích phân (Skiba 2012)*:
        $$W'(t) = W'_0 - \int_{0}^{t} W_{exp}(u) e^{-(t-u)/\tau_{W'}} du$$
        Trong đó $W'_0$ là dung tích kị khí ban đầu (Joules), $W_{exp}(u) = P(u) - CP$ nếu $P(u) > CP$ (ngược lại bằng 0). Hằng số thời gian phục hồi $\tau_{W'}$ phụ thuộc vào mức độ chênh lệch giữa CP và công suất tức thời khi phục hồi ($CP - P$).
        *Hạn chế*: Có độ phức tạp tính toán $O(N^2)$ vì tại mỗi giây $t$ phải chạy tích phân quét lại toàn bộ dữ liệu lịch sử từ đầu buổi tập, gây nghẽn CPU nghiêm trọng khi xử lý file dài.
    2.  *Mô hình vi phân sai phân (Skiba 2015 - Khuyên dùng cho Software Architect)*:
        Chuyển đổi sang dạng sai phân để tính toán thời gian thực với độ phức tạp $O(1)$:
        $$W'(t) = W'(t-1) + \left( \frac{W'_0 - W'(t-1)}{\tau_{W'}} - W_{exp}(t) \right) \cdot \Delta t$$
        Trong đó $\Delta t$ là khoảng thời gian lấy mẫu (thường là 1 giây). Công thức này cho phép Backend và thiết bị đeo tính toán $W'$ Balance tức thời của giây hiện tại chỉ bằng cách tham chiếu giá trị của giây trước đó, giảm tải $99\%$ CPU.


---

## 3. Ví dụ bằng số cụ thể

Giả sử vận động viên có **FTP = 200W**.
Họ thực hiện một buổi tập đạp xe kéo dài 1 giờ gồm: 10 phút khởi động nhẹ nhàng, 5 hiệp biến tốc 3 phút ở mức 300W xen kẽ nghỉ 3 phút đạp 100W, và phần còn lại đạp phục hồi ở 120W.

*   **Tính toán Công suất trung bình ($P_{avg}$)**: Giả sử tính tổng công suất cơ học chia cho thời gian ra kết quả **$P_{avg} = 160W$**.
*   **Tính toán Công suất chuẩn hóa (NP)**: Do có 5 đoạn đạp 300W (vượt xa ngưỡng FTP 200W), các mẫu trung bình trượt 30 giây lũy thừa bậc 4 sẽ đẩy trọng số của các đoạn này lên rất cao. Kết quả tính toán NP ra **$NP = 205W$**.
*   **Tính Chỉ số biến động (VI)**:
    $$VI = \frac{NP}{P_{avg}} = \frac{205}{160} \approx 1.28$$
    Con số 1.28 chứng tỏ bài tập này biến động rất lớn (đúng tính chất bài tập biến tốc).
*   **Tính Hệ số cường độ (IF)**:
    $$IF = \frac{NP}{FTP} = \frac{205}{200} = 1.025$$
    Hệ số IF > 1.0 cho thấy đây là một bài tập rất nặng đối với thể trạng hiện tại của vận động viên.
*   **Tính Hệ số hiệu quả (EF)**: Giả sử nhịp tim trung bình trong buổi tập là 150 BPM:
    $$EF = \frac{205}{150} = 1.37\ W/BPM$$

---

## 4. Các góc nhìn thực tế

### Ví dụ về Athlete
Vận động viên A đạp xe leo đèo dài 10km. A cố gắng giữ chỉ số $W'$ Balance của mình không rơi về 0 trước khi chạm đỉnh bằng cách duy trì công suất đạp sát ngưỡng $CP$ và chỉ bứt tốc ở 200m cuối cùng.

### Ví dụ về Coach
Huấn luyện viên xem lại đồ thị $W'$ Balance của A, thấy điểm thấp nhất đạt $1,500\ Joules$ (tức là A đã tận dụng gần như kiệt cùng năng lực kị khí của mình tại vạch đích). Coach đánh giá bài kiểm tra đạt chất lượng hoàn hảo.

### Ví dụ về Product
Phát triển tính năng **"Độc lập năng lượng" (Energy Autonomy)** cho phép hiển thị một đồ thị trực quan: Đường $W'$ giảm dần từ $100\%$ về $0\%$ màu đỏ rực trong những đoạn leo dốc dài cường độ cao và hồi lại màu xanh khi đổ dốc.

### Ví dụ về Cơ sở dữ liệu (Database Schema)
Bảng lưu trữ chuỗi dữ liệu giây (Time-series) của buổi tập để tính toán NP và $W'$ Balance:

```sql
CREATE TABLE activity_time_series (
    activity_id UUID NOT NULL REFERENCES athlete_activities(id) ON DELETE CASCADE,
    time_offset_seconds INT NOT NULL, -- Giây thứ mấy từ lúc bắt đầu tập
    power_watts INT,
    heart_rate INT,
    cadence INT,
    speed_m_s DOUBLE PRECISION,
    w_prime_balance INT, -- Giá trị W' còn lại tính bằng Joules
    PRIMARY KEY (activity_id, time_offset_seconds)
);

-- Bảng lưu trữ đường cong công suất tối đa (Mean Max Power) để vẽ biểu đồ PDC
CREATE TABLE activity_mean_max_power (
    activity_id UUID NOT NULL REFERENCES athlete_activities(id) ON DELETE CASCADE,
    duration_seconds INT NOT NULL, -- Các mốc thời gian: 1s, 5s, 10s, 30s, 1m, 5m, 10m, 20m, 1h...
    max_power_watts INT NOT NULL,
    PRIMARY KEY (activity_id, duration_seconds)
);
```

### Ví dụ về Giao diện người dùng (UI)
*   Thẻ hiển thị chỉ số chuyên sâu:
    *   `NP`: **205 W**
    *   `VI`: **1.28** (Biến động mạnh)
    *   `IF`: **1.03** (Rất nặng)
    *   `EF`: **1.37 W/BPM**
*   Widget biểu đồ **Power Duration Curve** thể hiện so sánh giữa buổi tập hôm nay (Đường màu vàng) và kỷ lục cá nhân của cả mùa (PR - Personal Record - Đường màu xanh lá).

### Ví dụ về Dashboard
Biểu đồ hiển thị sự tiêu hao năng lượng kị khí:
*   Trục hoành: Thời gian buổi tập.
*   Trục tung: Số Joules của $W'$ (giảm dần từ $20,000\ J$ xuống $0\ J$). Khi đường cong chạm sát vạch đáy màu đỏ, hệ thống ghi chú nhãn cảnh báo: **"Ngưỡng kiệt sức tối đa (Exhaustion Point)"**.

---

## 5. Sai lầm phổ biến khi thiết kế sản phẩm (Common Pitfalls)

1.  **Tính NP cho các bài tập quá ngắn (dưới 10-15 phút)**:
    *   *Sai lầm*: Cho phép hệ thống tính toán NP cho các bài chạy/đạp xe dài dưới 10 phút. Thuật toán NP sử dụng trung bình trượt 30 giây lũy thừa bậc 4, nếu áp dụng cho bài tập quá ngắn, các đoạn khởi động và làm nguội cơ sẽ bóp méo kết quả sinh lý, khiến NP không có ý nghĩa so sánh.
    *   *Giải pháp*: Chỉ tính toán và hiển thị chỉ số NP, VI, IF cho các bài tập có **Moving Time lớn hơn hoặc bằng 10 phút**.
2.  **Lỗi tràn bộ nhớ khi tính toán Power Duration Curve (PDC)**:
    *   *Sai lầm*: Chạy thuật toán tìm công suất tối đa trượt (Rolling Maximum) bằng các vòng lặp nested loop lồng nhau trong Postgres hoặc Backend cho tệp dữ liệu chạy dài 6 tiếng ($21,600$ giây). Điều này gây nghẽn CPU trầm trọng ($O(N \cdot M)$).
    *   *Giải pháp*: Sử dụng thuật toán tối ưu hóa tìm kiếm cửa sổ trượt (Sliding Window Maximum) dựa trên cấu trúc dữ liệu **Deque (Double-ended Queue)** để đưa độ phức tạp thuật toán về tuyến tính $O(N)$ trước khi ghi vào bảng `activity_mean_max_power`.
3.  **Giá trị $W'$ Balance bị âm**:
    *   *Sai lầm*: Khi vận động viên vượt trội hơn năng lực ước tính của họ (do thiết lập CP hoặc $W'$ ban đầu quá thấp), đường tính toán $W'$ Balance sẽ đâm xuyên qua trục 0 và hiển thị giá trị âm (ví dụ: $-2500\ J$), điều này là bất khả thi về mặt sinh lý học.
    *   *Giải pháp*: Nếu thuật toán tính $W'$ Balance ra giá trị âm, hệ thống phải tự động giới hạn hiển thị tối thiểu ở mức 0 và ghi nhận một sự kiện: **"Yêu cầu cập nhật ngưỡng: $W'$ thực tế vượt quá cấu hình hiện tại"** để đề xuất tự động phát hiện và tăng thông số CP hoặc $W'_0$ của vận động viên.
