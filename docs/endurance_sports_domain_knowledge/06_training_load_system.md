# Chương 6: Hệ thống tính toán Tải tập luyện (Training Load System)

Để lập kế hoạch huấn luyện hiệu quả, chúng ta phải lượng hóa được mức độ căng thẳng thể chất (stress) của mỗi buổi tập. Nếu không có một hệ thống tính điểm chung cho các bài tập khác nhau về thời gian, cường độ và bộ môn, chúng ta không thể vẽ được bản đồ thể lực lâu dài của vận động viên.

---

## 1. Lịch sử ra đời và các Thuật toán cốt lõi

### TRIMP (Training Impulse) của Tiến sĩ Eric Banister (1991)
*   **Lịch sử**: Đây là mô hình toán học đầu tiên trên thế giới định lượng tải tập luyện dựa trên nhịp tim.
*   **Công thức**:
    $$TRIMP = Duration\ (minutes) \times \Delta HR \times y$$
    Trong đó:
    *   $\Delta HR$ là Tỷ lệ nhịp tim dự phòng ($HRR\% = \frac{HR_{avg} - HR_{rest}}{HR_{max} - HR_{rest}}$).
    *   $y$ là hệ số nhân phi tuyến để bù lại việc cơ thể mệt mỏi nhanh hơn ở cường độ cao:
        *   Nam: $y = 0.64 \cdot e^{1.92 \cdot \Delta HR}$
        *   Nữ: $y = 0.86 \cdot e^{1.67 \cdot \Delta HR}$
*   **Ưu điểm**: Đơn giản, chỉ cần nhịp tim, áp dụng được cho mọi môn thể thao.
*   **Nhược điểm**: Nhịp tim có độ trễ lớn và bị ảnh hưởng bởi nhiệt độ, cafein, thiếu ngủ. Không đo được tải cơ học tức thời (như bứt tốc 10 giây).

---

### Hệ thống TSS (Training Stress Score) của Andrew Coggan & TrainingPeaks
Để khắc phục nhược điểm của nhịp tim, TrainingPeaks phát triển hệ thống TSS dựa trên Công suất (Power) làm chuẩn vàng, sau đó mở rộng ra các biến thể khác.

#### 1. TSS (Đạp xe - dựa trên Công suất)
*   **Công thức**:
    $$TSS = \frac{Duration\ (seconds) \times NP \times IF}{FTP \times 3600} \times 100$$
    Vì $IF = \frac{NP}{FTP}$, công thức tương đương:
    $$TSS = \frac{Duration\ (seconds) \times NP^2}{FTP^2 \times 3600} \times 100$$
*   **Mỏ neo**: Đạp xe liên tục 1 giờ ở đúng ngưỡng FTP ($NP = FTP, IF = 1.0$) sẽ cho kết quả chính xác bằng **100 TSS**.

#### 2. hrTSS (Dựa trên Nhịp tim)
*   **Công thức**: Khi không có dữ liệu công suất, hệ thống ước tính hrTSS dựa trên phân bổ thời gian nằm trong các phân vùng nhịp tim LTHR và mức độ mệt mỏi tim mạch tích lũy.

#### 3. rTSS (Chạy bộ - dựa trên Tốc độ ngưỡng)
*   **Công thức**: Chạy bộ sử dụng hai dạng công thức tương đương tùy thuộc vào đơn vị lưu trữ:
    1.  *Nếu tính theo đơn vị Tốc độ cơ bản ($m/s$)*:
        $$rTSS = \frac{Duration\ (seconds) \times NGP \times IF_{run}}{Threshold\ Pace \times 3600} \times 100$$
        Trong đó $NGP$ là Tốc độ chuẩn hóa dốc (m/s), $Threshold\ Pace$ là tốc độ ngưỡng (m/s) và Hệ số cường độ chạy bộ $IF_{run} = \frac{NGP}{Threshold\ Pace}$.
    2.  *Nếu tính theo đơn vị Nhịp độ thực tế ($s/km$)*: Vì Nhịp độ tỉ lệ nghịch với Tốc độ, công thức chuyển đổi thành:
        $$rTSS = \frac{Duration\ (seconds) \times \left( \frac{Threshold\ Pace\ (s/km)}{NGP\ (s/km)} \right)^2}{3600} \times 100$$
        *(Công thức này ngăn chặn lỗi logic kinh điển khi lập trình viên nhầm lẫn giữa phép nhân và phép chia của Pace).*

#### 4. sTSS (Bơi lội - dựa trên Tốc độ bơi ngưỡng CSS)
*   **Công thức**: Tương tự rTSS nhưng sử dụng khoảng cách bơi thực tế và tốc độ bơi tới hạn CSS làm mỏ neo.

---

### Relative Effort (Nỗ lực tương đối - Độc quyền của Strava)
*   **Khái niệm**: Phiên bản cải tiến của TRIMP do Strava phát triển, sử dụng nhịp tim và thang đo RPE (Độ gắng sức chủ quan) để quy đổi mọi hoạt động thể thao (từ yoga, tạ đến chạy bộ) thành một điểm số tải tập luyện duy nhất để người dùng so sánh.

---

## 2. Bảng so sánh triết lý tính toán của các Nền tảng

| Chỉ số | TrainingPeaks (TSS) | Intervals.icu (Load) | Strava (Relative Effort) | Garmin (Exercise Load) |
| :--- | :--- | :--- | :--- | :--- |
| **Độ mở mã nguồn** | Bản quyền thương mại | Công khai thuật toán | Đóng (Proprietary) | Đóng (Mua lại từ Firstbeat) |
| **Tham số ưu tiên** | Power (đạp xe), Pace (chạy) | Power $\rightarrow$ Heart Rate $\rightarrow$ Pace | Nhịp tim $\rightarrow$ RPE (chủ quan) | Nhịp tim $\rightarrow$ Tiêu thụ oxy dư thừa sau tập luyện (EPOC) |
| **Điểm chuẩn** | 100 TSS = 1 giờ đạp xe ở FTP | Đồng nhất với TSS | Không có điểm trần cố định | Dựa trên chỉ số EPOC (thường từ 0-1000) |
| **Tính linh hoạt** | Rất cao cho VĐV nâng cao | Rất cao, tự động điền các nguồn thay thế | Hướng tới người dùng đại chúng | Tự động hoàn toàn, khó tùy biến |

---

## 3. Ví dụ thực tế

### Ví dụ về Athlete
Vận động viên A thực hiện buổi chạy bộ địa hình (Trail Running) trong 1.5 giờ. Do chạy lên xuống dốc liên tục, tốc độ thô của họ khá chậm. Nhưng do địa hình dốc nên nhịp tim duy trì rất cao ở vùng ngưỡng.

### Ví dụ về Coach
Huấn luyện viên xem lại kết quả bài tập của A:
*   Nếu tính bằng rTSS thô dựa trên tốc độ thực tế (chưa bù dốc): bài tập chỉ đạt 60 rTSS.
*   Nếu tính bằng hrTSS (dựa trên nhịp tim): bài tập đạt 120 hrTSS.
*   Nếu tính bằng rTSS sử dụng tốc độ chuẩn hóa dốc (NGP): bài tập đạt 115 rTSS.
*   Coach kết luận: Cần sử dụng hrTSS hoặc rTSS bù dốc để đánh giá đúng tải tập luyện của buổi chạy địa hình này.

### Ví dụ về Product
Phát triển hệ thống **"Thứ bậc ưu tiên tính Tải" (Load Source Fallback Engine)**. Khi nhận một bài tập:
1.  Nếu môn Đạp xe: Tìm xem có dữ liệu Power không $\Rightarrow$ Tính **TSS**. Nếu không, tìm dữ liệu Nhịp tim $\Rightarrow$ Tính **hrTSS**. Nếu không, tìm dữ liệu RPE $\Rightarrow$ Tính **RPE-based TSS**.
2.  Nếu môn Chạy bộ: Tìm dữ liệu Power chạy bộ $\Rightarrow$ Tính **TSS**. Nếu không, tìm Tốc độ và GPS dốc $\Rightarrow$ Tính **rTSS**. Nếu không, tìm dữ liệu Nhịp tim $\Rightarrow$ Tính **hrTSS**.

### Ví dụ về Cơ sở dữ liệu (Database Schema)
Bảng lưu trữ kết quả tính toán tải chi tiết cho mỗi buổi tập và nguồn tính toán:

```sql
CREATE TABLE activity_training_loads (
    activity_id UUID PRIMARY KEY REFERENCES athlete_activities(id) ON DELETE CASCADE,
    load_value DOUBLE PRECISION NOT NULL, -- Điểm số tải cuối cùng sử dụng
    calculation_method VARCHAR(50) NOT NULL, -- 'TSS', 'hrTSS', 'rTSS', 'sTSS', 'TRIMP', 'RPE'
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    details JSONB -- Lưu trữ các thông số trung gian như NP, NGP, LTHR, FTP tại thời điểm tính toán
);
```

### Ví dụ về Giao diện người dùng (UI)
*   Trong màn hình chi tiết buổi tập, điểm Tải tập luyện (Load Score) được hiển thị nổi bật bằng một hình tròn hoặc huy hiệu màu đỏ kèm theo loại hình tính toán (ví dụ: `115 TSS` hoặc `98 hrTSS`).
*   Một tooltip giải thích chi tiết khi hover chuột: *"Điểm tải này được tính toán dựa trên dữ liệu nhịp tim (hrTSS) do bài tập này không có dữ liệu công suất."*

### Ví dụ về Dashboard
Biểu đồ cột chồng (Stacked Bar Chart) theo tuần hiển thị tổng điểm tải tập luyện:
*   Mỗi cột là 1 tuần. Chiều cao của cột là tổng điểm Tải. Cột được chia nhỏ thành các màu khác nhau thể hiện tỉ trọng tải đến từ: Đạp xe (Màu đỏ), Chạy bộ (Màu xanh lá), Bơi lội (Màu xanh lam).

---

## 4. Sai lầm phổ biến khi thiết kế sản phẩm (Common Pitfalls)

1.  **Không có cơ chế dự phòng khi thiếu dữ liệu (No Fallback Mechanism)**:
    *   *Sai lầm*: Nếu vận động viên quên đeo đai tim và không có powermeter, hệ thống trả về điểm Tải = 0. Điều này làm sụp đổ hoàn toàn mô hình thể lực dài hạn (CTL/ATL) vì hệ thống tưởng rằng vận động viên không tập luyện gì trong ngày hôm đó.
    *   *Giải pháp*: Luôn triển khai phương thức dự phòng cuối cùng dựa trên cảm nhận gắng sức chủ quan (RPE) và thời gian:
        $$Load_{RPE} = Duration\ (minutes) \times RPE \times 1.5$$
        (RPE nhập từ 1 đến 10).
2.  **Sử dụng nhầm công thức rTSS cho Đạp xe**:
    *   *Sai lầm*: Lấy công thức tính tải chạy bộ (rTSS) áp dụng cho đạp xe hoặc ngược lại. Tốc độ đạp xe phụ thuộc rất lớn vào khí động học và đổ dốc (đạp xe thả dốc tốc độ cao nhưng tải bằng 0), trong khi chạy bộ thì tốc độ tương quan tuyến tính cao hơn với năng lượng tiêu thụ.
    *   *Giải pháp*: Kiểm tra nghiêm ngặt loại môn thể thao (`sport_type`) trước khi định tuyến hoạt động đến đúng Engine tính toán tải tương ứng.
3.  **Cho phép cộng dồn các hệ thống điểm số khác nhau mà không quy đổi**:
    *   *Sai lầm*: Cộng trực tiếp điểm TRIMP của Garmin, Relative Effort của Strava và TSS của TrainingPeaks lại thành một tổng số tải chung trên cùng một biểu đồ mà không qua bộ lọc đồng bộ hóa chuẩn.
    *   *Giải pháp*: Trên nền tảng phân tích của mình, hệ thống phải chọn một hệ quy chiếu chuẩn duy nhất làm trục tung (thông thường là hệ điểm TSS/Intervals.icu Load) và quy đổi các nguồn dữ liệu bên thứ ba về hệ quy chiếu này.
        *   Ví dụ: Chuyển đổi Relative Effort của Strava sang điểm Load tương đương dựa trên đường cong tương quan thực nghiệm.
