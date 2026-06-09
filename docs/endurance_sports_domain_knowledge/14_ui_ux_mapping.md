# Chương 14: Sơ đồ hóa Giao diện UI/UX (UI/UX Mapping)

Để xây dựng một sản phẩm có trải nghiệm người dùng xuất sắc, Product Owner và Frontend Engineer cần biết chính xác chỉ số nào nên xuất hiện ở màn hình nào, sắp xếp theo thứ tự ưu tiên nào để hỗ trợ tốt nhất cho quyết định của người dùng tại thời điểm đó. Chương này ánh xạ các chỉ số thể thao chuyên sâu vào các giao diện UI/UX cụ thể của nền tảng.

---

## 1. Bản đồ Giao diện & Chỉ số tương ứng (Screen to Metric Mapping)

### 1. Màn hình Lịch tập luyện (Calendar Screen)
*   **Mục tiêu**: Lập kế hoạch và theo dõi hàng ngày.
*   **Chỉ số hiển thị**:
    *   *Mỗi thẻ bài tập*: Thể loại môn (icon), Tiêu đề bài tập, Trạng thái tuân thủ (tô màu thẻ), Thời gian thực tế vs Kế hoạch, Quãng đường thực tế vs Kế hoạch, Điểm Tải tập luyện (TSS / hrTSS / rTSS).
    *   *Tổng kết tuần (Weekly Summary Footer)*: Tổng số giờ tập luyện thực tế vs Kế hoạch, Tổng cự ly của từng môn chạy/đạp/bơi, Tổng điểm Tải tích lũy trong tuần (Weekly Load).
    *   *Cột thông số thể lực bên cạnh (Sidebar)*: Chỉ số CTL, ATL, TSB hiện tại của tuần đó để huấn luyện viên/vận động viên nhìn nhanh sự phát triển thể lực mà không cần chuyển sang màn hình phân tích.

### 2. Màn hình Chi tiết Hoạt động (Activity Detail Screen)
*   **Mục tiêu**: Phân tích chuyên sâu sau buổi tập.
*   **Chỉ số hiển thị**:
    *   *Khung tóm tắt chính (Summary Header)*: Moving Time, Distance, Elevation Gain, Calories.
    *   *Khung phân tích sinh lý (Physiology Grid)*: NP (Đạp xe) hoặc NGP (Chạy bộ), Average Power, Average Heart Rate, Max Heart Rate, Average Cadence, EF (Hệ số hiệu quả), VI (Chỉ số biến động).
    *   *Đồ thị chính (Chart Stream)*: Trực quan hóa dòng dữ liệu giây (Heart Rate, Power, Cadence, Elevation, Speed, W' Balance). Hỗ trợ tính năng bôi đen chọn vùng (Zoom & Crop) để tự động tính toán lại các chỉ số trung bình của riêng vùng được chọn đó.
    *   *Bảng phân bổ vùng (Time in Zones Card)*: Biểu đồ thanh ngang thể hiện thời gian và tỷ lệ phần trăm nằm trong các Zone nhịp tim, công suất và tốc độ.
    *   *Bảng phân tích hiệp (Laps Table)*: Bảng số liệu chi tiết của từng km hoặc từng hiệp biến tốc do đồng hồ tự động ghi nhận hoặc do người dùng tự phân chia.

### 3. Màn hình Phân tích Thể lực (Fitness & Analytics Screen)
*   **Mục tiêu**: Theo dõi xu hướng phong độ dài hạn.
*   **Chỉ số hiển thị**:
    *   *Biểu đồ Thể lực chính (Fitness Chart / PMC - Performance Management Chart)*: Trục X là thời gian. Trục Y hiển thị đường CTL (Fitness), ATL (Fatigue), TSB (Form) kết hợp các cột Tải tập luyện hàng ngày (Daily Load).
    *   *Đồ thị Đường cong công suất (Power Duration Curve - PDC)*: Hiển thị công suất tối đa theo từng mốc thời gian từ 1 giây đến 2 tiếng của chu kỳ được chọn (ví dụ: 90 ngày qua) để so sánh năng lực bứt tốc và sức bền bền bỉ.

### 4. Bảng điều khiển của Huấn luyện viên (Coach Dashboard Screen)
*   **Mục tiêu**: Quản lý danh sách vận động viên diện rộng.
*   **Chỉ số hiển thị**:
    *   *Lưới danh sách vận động viên (Athlete Grid)*: Tên vận động viên, CTL hiện tại, Độ dốc TSB (đang tăng hay giảm), Điểm tuân thủ giáo án 7 ngày qua (Compliance %), Trạng thái sức khỏe (Resting HR, HRV, Sleep Score), Ngày cập nhật ngưỡng gần nhất.
    *   *Hộp thoại thông báo khẩn cấp (Alerts Panel)*: Danh sách các sự kiện cần xử lý gấp (Ví dụ: VĐV chấn thương, VĐV bỏ 3 bài tập liên tiếp, VĐV có FTP mới phát hiện).

---

## 2. Ví dụ thực tế về UI/UX Mapping

### Ví dụ về Athlete
Vận động viên A vừa kết thúc buổi chạy bộ biến tốc 10km. A mở màn hình **Activity Detail Screen** trên điện thoại:
*   Đầu tiên, mắt A hướng vào góc trên cùng hiển thị **Độ tuân thủ: 95% (Màu xanh lá)** - cho biết họ đã hoàn thành cực tốt cự ly và thời gian của giáo án.
*   Cuộn xuống dưới, A xem đồ thị nhịp tim chạy song song với cao độ để thấy nhịp tim đẩy lên đỉnh 175 BPM ở 5 đoạn chạy dốc chính.
*   A để lại bình luận: *"Hôm nay trời mát chạy rất sướng, chân khỏe."*

### Ví dụ về Coach
Huấn luyện viên của A mở **Coach Dashboard**, thấy thẻ của A có biểu tượng dấu tick xanh lá biểu thị bài tập tuân thủ tốt. Coach click vào tên A để mở màn hình **Fitness Screen**, kiểm tra xem đường CTL của A có tiếp tục đi lên ổn định không trước khi quyết định tăng độ khó cho tuần huấn luyện tiếp theo.

### Ví dụ về Product
Thiết kế tính năng **"Bộ lọc Màn hình Thông minh" (UX Adaptive Interface)**. Giao diện chi tiết bài tập tự động thay đổi các thẻ chỉ số tùy thuộc vào loại cảm biến có trong tệp dữ liệu:
*   Nếu tệp chạy bộ không có dữ liệu nhịp tim (quên đeo đai): Ẩn hoàn toàn các thẻ liên quan đến Heart Rate, hrTSS và thay thế bằng các thẻ Pace và rTSS để tránh giao diện hiển thị các ô trống rỗng hoặc giá trị `N/A`.

### Ví dụ về Cơ sở dữ liệu (Database Schema)
Bảng lưu trữ cấu hình bố cục giao diện (Dashboard Layout Preferences) được tùy biến theo từng người dùng (Athlete hoặc Coach):

```sql
CREATE TABLE user_ui_preferences (
    user_id UUID PRIMARY KEY, -- Liên kết đến bảng users (athlete hoặc coach)
    dashboard_layout JSONB NOT NULL, -- Cấu hình vị trí các widget: {"top_left": "readiness_gauge", "bottom": "fitness_chart"}
    calendar_view_settings JSONB NOT NULL, -- Cấu hình hiển thị lịch: {"show_tss": true, "color_by": "compliance_status"}
    metric_units VARCHAR(20) NOT NULL DEFAULT 'metric', -- 'metric' (km, m/s, kg) hoặc 'imperial' (miles, mph, lbs)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Ví dụ về Giao diện người dùng (UI) - Cấu trúc màn hình Chi tiết bài tập (Activity Detail Layout)
```text
+-----------------------------------------------------------------------+
|  [Chạy bộ buổi sáng] - 09/06/2026   -   [Độ tuân thủ: 92% - Xanh lá]  |
+-----------------------------------+-----------------------------------+
|  Thông số cơ bản:                  |  Thông số sinh lý:                |
|  - Quãng đường: 12.5 km            |  - NGP (Pace ngưỡng): 5:10 /km    |
|  - Thời gian: 1:05:22             |  - Nhịp tim trung bình: 145 BPM   |
|  - Lượng calo: 780 kcal           |  - Điểm Tải (rTSS): 85            |
+-----------------------------------+-----------------------------------+
|                                                                       |
|  ĐỒ THỊ DÒNG DỮ LIỆU (Power, Heart Rate, Elevation, Pace)            |
|  [=========================== Chart ===============================]  |
|                                                                       |
+-----------------------------------------------------------------------+
|  Phân bổ thời gian trong Zone:                                        |
|  Zone 1 [████░░░░░░░░░░░░░░░░] 20%                                    |
|  Zone 2 [████████████████░░░░] 80%                                    |
+-----------------------------------------------------------------------+
```

---

## 3. Sai lầm phổ biến khi thiết kế sản phẩm (Common Pitfalls)

1.  **Thiết kế giao diện di động giống hệt giao diện Web (Responsive Fail)**:
    *   *Sai lầm*: Cố gắng nhồi nhét biểu đồ PMC thể lực khổng lồ có 3-4 trục thông số phức tạp lên màn hình điện thoại 6 inch. Người dùng không thể tương tác hay đọc được các điểm dữ liệu nhỏ trên màn hình di động.
    *   *Giải pháp*: Trên ứng dụng di động, đơn giản hóa biểu đồ thể lực thành các thẻ chỉ số tóm tắt xu hướng (ví dụ: hiển thị dạng số: **Fitness: 65, Trend: +2% tuần này**). Chỉ vẽ biểu đồ đường đơn giản hóa và để biểu đồ PMC chi tiết, tương tác cao ở giao diện màn hình máy tính (Web Platform).
2.  **Không tối ưu hóa tốc độ tải trang khi vẽ biểu đồ giây**:
    *   *Sai lầm*: Tải toàn bộ $18,000$ điểm dữ liệu giây của một bài tập dài 5 tiếng từ API về client để vẽ biểu đồ. Trình duyệt di động hoặc web của người dùng sẽ bị đơ (lag) vài giây khi render đồ thị.
    *   *Giải pháp*: Áp dụng thuật toán **Giảm điểm dữ liệu (Downsampling Algorithm)** như thuật toán LTTB (Largest-Triangle-Three-Buckets) ở Backend trước khi trả về dữ liệu cho Client. Giảm từ $18,000$ điểm xuống còn đúng $500$ điểm đại diện để vẽ biểu đồ mà không làm mất đi các hình dáng đỉnh/đáy sinh lý quan trọng của đồ thị.
3.  **Sử dụng màu sắc không đồng nhất trên các màn hình**:
    *   *Sai lầm*: Ở màn hình Lịch tập, Zone 2 được ký hiệu màu Xanh lá, nhưng ở màn hình Chi tiết bài tập, Zone 2 lại hiển thị màu Xanh dương, và ở biểu đồ Laps nó lại hiển thị màu Vàng. Điều này gây khó hiểu cho người dùng khi cố gắng nhận diện nhanh mục tiêu sinh lý.
    *   *Giải pháp*: Xây dựng một **Hệ thống Thiết kế Màu sắc chuẩn hóa (Style Guide / Design System)** cho các phân vùng tập luyện và trạng thái tuân thủ. Toàn bộ các component trên web, mobile hay PDF báo cáo đều phải sử dụng chung các mã màu CSS Token này.
        *   Zone 1: Xám (#9CA3AF)
        *   Zone 2: Xanh lá (#10B981)
        *   Zone 3: Vàng (#F59E0B)
        *   Zone 4: Cam (#F97316)
        *   Zone 5-7: Đỏ (#EF4444)
        *   Tuân thủ tốt: Xanh lá (#22C55E), Lệch nhẹ: Vàng (#EAB308), Lệch nặng: Đỏ (#EF4444).
