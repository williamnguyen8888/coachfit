# Chương 9: Nền tảng dành cho Huấn luyện viên (Coach Platform)

Mô hình kinh doanh của các nền tảng thể thao sức bền (như TrainingPeaks) phụ thuộc cực kỳ lớn vào Huấn luyện viên (Coach). Huấn luyện viên là người trả phí bản quyền cao và là kênh tiếp thị truyền miệng (marketing channel) mang lại lượng lớn vận động viên cho hệ thống. Do đó, xây dựng một phân hệ Coach Platform mạnh mẽ là yếu tố sống còn cho sự thành bại của sản phẩm.

---

## 1. Khái niệm và Luồng công việc cốt lõi của Huấn luyện viên

Huấn luyện viên thể thao sức bền không dạy học theo giờ. Họ làm việc theo mô hình **Huấn luyện từ xa có hệ thống (Structured Remote Coaching)**. Luồng công việc (workflows) của họ bao gồm:

### 1. Quản lý danh sách Vận động viên (Athlete Management)
*   **Mục tiêu**: Theo dõi trạng thái của 10 đến 50 vận động viên cùng lúc mà không bị sót thông tin.
*   **Hành động**: Nhận yêu cầu kết nối, phân nhóm vận động viên (nhóm cự ly marathon, nhóm đạp xe phong trào), quản lý trạng thái kích hoạt tài khoản.

### 2. Lập kế hoạch huấn luyện diện rộng (Planning & Periodization)
*   **Mục tiêu**: Thiết lập lộ trình huấn luyện dài hạn (Macrocycle - chu kỳ năm, Mesocycle - chu kỳ tháng, Microcycle - chu kỳ tuần).
*   **Hành động**: Tạo các thư viện bài tập mẫu (Workout Library), áp dụng hàng loạt bài tập lên lịch của nhiều vận động viên cùng lúc để tiết kiệm thời gian.

### 3. Theo dõi mức độ tuân thủ (Compliance Tracking)
*   **Mục tiêu**: Đảm bảo vận động viên tập đúng giáo án đã giao.
*   **Hành động**: Đánh giá kết quả bài tập dựa trên so sánh giữa bài tập kế hoạch (Planned) và bài tập thực tế (Completed).

### 4. Phân tích hiệu năng chuyên sâu (Analytics)
*   **Mục tiêu**: Tìm kiếm các chỉ dấu sinh lý biểu thị sự thích nghi tốt hoặc nguy cơ quá tải.
*   **Hành động**: Xem biểu đồ thể lực (CTL/ATL/TSB), biểu đồ công suất đỉnh (MMP), phân tích nhịp tim/HRV buổi sáng của từng vận động viên.

### 5. Giao tiếp & Phản hồi (Communication & Feedback)
*   **Mục tiêu**: Cung cấp động lực và điều chỉnh tâm lý cho vận động viên.
*   **Hành động**: Nhận thông báo khi vận động viên hoàn thành bài tập, viết nhận xét bình luận (comments), điều chỉnh nhanh giáo án dựa trên tin nhắn phản hồi.

---

## 2. Chỉ số đo lường mức độ Tuân thủ giáo án (Compliance Index)

Hệ thống chấm điểm độ tuân thủ bài tập giúp Coach lọc nhanh ra những vận động viên cần can thiệp khẩn cấp.

### Thuật toán tính độ tuân thủ Thời gian tập (Duration Compliance):
$$Compliance_{duration} = \frac{Moving\ Time_{completed}}{Duration_{planned}}$$

### Thuật toán tính độ tuân thủ Tải tập luyện (TSS Compliance):
$$Compliance_{tss} = \frac{TSS_{completed}}{TSS_{planned}}$$

### Quy tắc tô màu Trạng thái Tuân thủ (Compliance Color Coding):
Hệ thống tính toán độ lệch để tô màu tự động bài tập trên lịch:
*   **Xanh lá (Hoàn thành tốt)**: Độ lệch nằm trong khoảng $\pm 20\%$ (tức độ tuân thủ từ $80\% - 120\%$).
*   **Vàng (Tập thiếu hoặc thừa nhẹ)**: Độ lệch từ $50\% - 79\%$ hoặc $121\% - 150\%$.
*   **Đỏ (Lệch nghiêm trọng / Không tập)**: Độ lệch dưới $50\%$ hoặc trên $150\%$.
*   **Màu xanh lam (Tập ngoài giáo án)**: Bài tập thực tế phát sinh nhưng không có bài kế hoạch tương ứng trên lịch.

---

## 3. Ví dụ thực tế

### Ví dụ về Athlete
Vận động viên A bận việc đột xuất nên buổi chạy biến tốc 1 tiếng (Planned TSS = 80) bị rút ngắn xuống còn 20 phút chạy nhẹ (Completed TSS = 15).

### Ví dụ về Coach
Huấn luyện viên B mở bảng điều khiển quản lý của mình (Coach Dashboard), thấy ngay dòng lịch tập ngày hôm nay của A chuyển sang **màu Đỏ** chót. Coach click vào xem chi tiết, thấy A để lại comment: *"Hôm nay chân tôi bị đau gân gót chân (Achilles), tôi dừng lại sớm để tránh chấn thương."* Coach phản hồi lập tức: *"Tốt lắm, hãy nghỉ ngơi hoàn toàn ngày mai, tôi sẽ đổi bài tập tuần tới."*

### Ví dụ về Product
Phát thiện tính năng **"Huấn luyện hàng loạt" (Batch Periodization)**. Cho phép Coach chọn 5 vận động viên cùng nhóm, kéo thả một giáo án mẫu dài 12 tuần vào lịch của họ, sau đó hệ thống tự động nhân bản và điền các mốc giá trị tuyệt đối (công suất, nhịp tim) khớp riêng với FTP/LTHR của từng vận động viên đó.

### Ví dụ về Cơ sở dữ liệu (Database Schema)
Bảng lưu trữ mối quan hệ Huấn luyện viên - Vận động viên và cài đặt quyền truy cập:

```sql
CREATE TABLE coach_athlete_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- 'pending', 'active', 'suspended'
    permissions JSONB, -- Quyền hạn: {"can_edit_calendar": true, "can_view_hrv": true}
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(coach_id, athlete_id)
);

-- Bảng lưu trữ bình luận (comments) tương tác trên bài tập
CREATE TABLE activity_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES athlete_activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Có thể là ID của coach hoặc athlete
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_activity ON activity_comments(activity_id, created_at ASC);
```

### Ví dụ về Giao diện người dùng (UI)
*   **Bảng điều khiển của Coach (Coach Dashboard / Athlete Grid)**:
    *   Hiển thị danh sách vận động viên dưới dạng thẻ hàng dọc.
    *   Mỗi hàng hiển thị ảnh đại diện, tên, chỉ số CTL hiện tại, độ dốc TSB, điểm tuân thủ trung bình của tuần này (ví dụ: `92% Compliance`) và một vòng tròn màu cảnh báo trạng thái hiện tại (Đỏ = Quá tải/Bỏ tập, Xanh lá = Tốt, Xám = Không tập).

### Ví dụ về Dashboard
Biểu đồ ma trận **Độ Tuân thủ Huấn luyện (Compliance Matrix)** hiển thị số bài tập theo các màu sắc trong tuần qua để Coach nhìn lướt nhanh là biết tuần này vận động viên tập tốt hay không.

---

## 4. Sai lầm phổ biến khi thiết kế sản phẩm (Common Pitfalls)

1.  **Lỗi gửi quá nhiều thông báo cho Coach (Notification Fatigue)**:
    *   *Sai lầm*: Mỗi khi 1 vận động viên đồng bộ bài tập hoặc bình luận, hệ thống gửi ngay một thông báo đẩy/email cho Coach. Nếu Coach quản lý 40 vận động viên, họ sẽ nhận hàng trăm email mỗi ngày và sẽ tắt hoàn toàn tính năng thông báo.
    *   *Giải pháp*: Cung cấp tính năng **"Bản tin tổng hợp hàng ngày" (Daily Digest Email)**. Gom tất cả hoạt động của toàn bộ vận động viên (bỏ tập, chấn thương, lập kỷ lục) vào một email gửi duy nhất lúc 7h sáng mỗi ngày, đồng thời phân loại thông báo quan trọng (ví dụ: vận động viên nhấn nút báo động chấn thương) để đẩy tin ngay lập tức.
2.  **Cho phép Coach sửa đổi lịch tập mà không có sự đồng ý của Athlete**:
    *   *Sai lầm*: Coach thay đổi lịch tập ngay trong ngày lúc vận động viên đang trên đường đi tập, dẫn đến việc thiết bị của vận động viên đồng bộ bài tập cũ còn trên web đã lưu bài tập mới.
    *   *Giải pháp*: Thực hiện cơ chế đồng bộ hóa bất đồng bộ thời gian thực thông qua WebSockets. Khi Coach cập nhật bài tập trên web, thiết bị điện thoại của vận động viên nhận được tín hiệu đẩy lập tức để cập nhật cache và gửi lệnh đồng bộ đến đồng hồ thông minh của họ qua nền tảng Bluetooth.
3.  **Thiếu tính năng "Thư viện bài tập mẫu" (Workout Library)**:
    *   *Sai lầm*: Buộc Coach phải tạo tay từng bài tập cho từng vận động viên từ đầu. Điều này làm tăng thời gian quản lý của Coach và khiến họ rời bỏ nền tảng sang TrainingPeaks.
    *   *Giải pháp*: Thiết kế module thư viện bài tập dùng chung. Huấn luyện viên có thể phân loại bài tập theo thư mục (Ví dụ: `Bài chạy biến tốc`, `Bài đạp Zone 2`), gắn thẻ (tags) cường độ, và chỉ cần kéo thả bài tập từ thư viện vào ô lịch của bất kỳ vận động viên nào.
