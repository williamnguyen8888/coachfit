# Chương 8: Bộ dựng bài tập cấu trúc (Workout Builder)

Một bài tập thể thao sức bền chuyên nghiệp không chỉ đơn thuần là "hãy chạy 10 km". Nó được cấu trúc tỉ mỉ thành các phần: Khởi động, các hiệp chính với cường độ cụ thể, và thả lỏng. Bộ dựng bài tập (Workout Builder) là tính năng cho phép huấn luyện viên lập trình ra các bài tập có cấu trúc (Structured Workouts) để xuất sang các thiết bị thông minh (Garmin, Wahoo) dẫn đường cho vận động viên khi tập luyện.

---

## 1. Các thành phần của Bài tập cấu trúc

### Các bước tập luyện (Steps)
Là các đơn vị thời gian hoặc quãng đường cơ bản của bài tập. Mỗi bước bao gồm:
*   **Mục tiêu thời gian/khoảng cách (Duration Target)**: Ví dụ chạy trong 10 phút hoặc chạy đúng 2 km.
*   **Mục tiêu cường độ (Intensity Target)**: Khoảng nhịp tim, công suất hoặc tốc độ cần duy trì (ví dụ: Công suất từ 150W đến 180W).

### Nhóm bước lặp (Repeats / Intervals Group)
Là cấu trúc lặp đi lặp lại một nhóm các bước chính và bước phục hồi.
*   Ví dụ: Lặp lại 5 lần [Chạy 3 phút ở Zone 4 + Đi bộ phục hồi 2 phút ở Zone 1].

### Phân loại các bước (Step Types)
Các hệ thống đều chuẩn hóa phân loại bước để thiết bị hiển thị đúng giao diện và hướng dẫn giọng nói (audio prompts):
1.  **Warm Up (Khởi động)**: Đưa cơ thể vào trạng thái sẵn sàng.
2.  **Active (Hiệp chính)**: Đoạn tập luyện tập trung cường độ cao.
3.  **Recovery (Phục hồi)**: Thả lỏng ngắn giữa các hiệp chính để nhịp tim giảm xuống.
4.  **Cool Down (Thả lỏng)**: Đưa nhịp tim và cơ bắp về trạng thái bình thường sau bài tập.
5.  **Rest (Nghỉ hoàn toàn)**.

---

## 2. Thiết kế ngôn ngữ mô tả bài tập (Workout DSL / JSON Structure)

Để lưu trữ và truyền tải bài tập có cấu trúc giữa các nền tảng (ví dụ gửi sang Garmin API), chúng ta cần một ngôn ngữ mô tả (Domain-Specific Language - DSL) hoặc một cấu trúc dữ liệu JSON chuẩn hóa.

### So sánh cách viết bài tập bằng văn bản (Text DSL)
*   **TrainingPeaks**: Sử dụng kéo thả trực quan.
*   **Intervals.icu**: Sử dụng một trình soạn thảo văn bản thông minh (Markdown-like DSL) cực kỳ mạnh mẽ. Huấn luyện viên chỉ cần gõ:
    ```text
    - Warm up 10m 50-60% FTP
    - 5x
      - 3m 100% FTP
      - 2m recovery 50% FTP
    - Cool down 5m 50% FTP
    ```
    Hệ thống sẽ tự động phân tích cú pháp (parse) văn bản này thành cấu trúc JSON bài tập để gửi cho đồng hồ Garmin.

### Thuật toán phân tích cú pháp (DSL Parser Algorithm)
Để chuyển đổi từ chuỗi văn bản do Coach gõ sang cấu trúc JSON cây, Backend hoặc Frontend có thể sử dụng một Lexer/Parser đơn giản chạy dòng-bằng-dòng:
1.  **Đọc dòng**: Tách văn bản thành mảng các dòng. Bỏ qua các dòng trống hoặc dòng chú thích (bắt đầu bằng `#`).
2.  **Xác định cấp độ thụt lề (Indentation level)**: Đếm số lượng khoảng trắng đầu dòng để xác định quan hệ cha-con (các bước con nằm trong nhóm lặp `5x`).
3.  **Phân tích Regex để trích xuất thuộc tính**:
    *   *Nhận diện nhóm lặp*: Dùng Regex `/^-\s+(\d+)x$/` để tìm số lần lặp (ví dụ: `5x`).
    *   *Nhận diện bước (Step)*: Dùng Regex `/^-\s*(Warm up|Active|Recovery|Cool down)?\s*(\d+(?:m|s|km))?\s*(?:@|at)?\s*(\d+(?:-\d+)?%?\s*(?:FTP|HR|LTHR|pace|m\/s)?)?/i` để bắt các trường:
        *   `Category`: `Warm up`, `Active`, `Recovery`, `Cool down`.
        *   `Duration`: Ví dụ `10m` (10 phút), `1000m` (1000 mét), `2km`.
        *   `Target`: Ví dụ `50-60% FTP`, `140-150 BPM`.
4.  **Xây dựng Cây (Abstract Syntax Tree - AST)**: Sử dụng cấu trúc ngăn xếp (Stack) để duy trì nhóm lặp hiện tại dựa trên cấp độ thụt lề, sau đó push các bước con vào đúng thuộc tính `steps` của nhóm lặp đó trước khi xuất ra mảng JSON cuối cùng.

---


## 3. Cách tính toán Tải dự kiến (Planned TSS / Load)

Trước khi vận động viên thực hiện bài tập, hệ thống phải tính trước được bài tập này sẽ tạo ra bao nhiêu điểm tải (Planned TSS) để vẽ biểu đồ thể lực tương lai.

### Công thức tính Planned TSS cho từng bước ($TSS_{step}$):
$$TSS_{step} = \frac{t \times P_{target} \times IF_{target}}{FTP \times 3600} \times 100$$
Trong đó:
*   $t$: Thời gian của bước đó tính bằng giây.
*   $P_{target}$: Công suất mục tiêu của bước (Watt) - tính bằng điểm trung vị hoặc giá trị trung bình của khoảng mục tiêu.
*   $IF_{target} = \frac{P_{target}}{FTP}$ là hệ số cường độ mục tiêu của bước.
*   Nếu bước đó sử dụng nhịp tim làm mục tiêu, hệ thống quy đổi nhịp tim dự kiến sang công suất tương đương để tính hrTSS dự kiến.

### Tổng Planned TSS của bài tập:
$$Planned\ TSS = \sum_{i=1}^{n} TSS_{step\_i}$$

---

## 4. Ví dụ thực tế

### Ví dụ về Athlete
Vận động viên mở đồng hồ Garmin vào buổi sáng, màn hình đồng hồ hiển thị bài tập được đồng bộ sẵn từ lịch của ứng dụng: **"Chạy biến tốc 5x1km"**. Đồng hồ sẽ tít tít báo động nếu A chạy quá nhanh hoặc quá chậm so với tốc độ mục tiêu của từng bước.

### Ví dụ về Coach
Huấn luyện viên sử dụng trình soạn thảo của ứng dụng để viết giáo án tuần tới. Coach gõ dòng chữ đơn giản:
`10m WU @ Z2 | 6x (800m @ Z4, 200m Walk) | 10m CD @ Z1`
Hệ thống tự động biên dịch và hiển thị biểu đồ cột mô phỏng bài tập trực quan dạng khối xếp chồng cho Coach kiểm tra trực quan.

### Ví dụ về Product
Phát triển tính năng **"Đồng bộ hóa bài tập sang Garmin Connect" (Garmin Workout Sync Engine)**. Khi bài tập được tạo hoặc thay đổi trên lịch tập của ứng dụng, hệ thống tự động gọi API của Garmin để đẩy cấu trúc bài tập có định dạng khớp với đặc tả kỹ thuật FIT SDK của Garmin.

### Ví dụ về Cơ sở dữ liệu (Database Schema)
Thiết kế bảng lưu trữ bài tập có cấu trúc dưới dạng JSON để tối ưu hóa tính linh hoạt:

```sql
CREATE TABLE structured_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES athletes(id), -- NULL nếu là bài tập mẫu trong thư viện
    coach_id UUID REFERENCES coaches(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sport_type VARCHAR(50) NOT NULL, -- 'ride', 'run', 'swim'
    target_metric VARCHAR(50) NOT NULL, -- 'power', 'heart_rate', 'pace'
    planned_duration_seconds INT NOT NULL,
    planned_distance_meters DOUBLE PRECISION,
    planned_tss DOUBLE PRECISION,
    raw_text_dsl TEXT, -- Lưu văn bản DSL như của Intervals.icu
    steps_json JSONB NOT NULL, -- Cấu trúc các bước chi tiết
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_structured_workouts_athlete ON structured_workouts(athlete_id);
```

#### Ví dụ về trường `steps_json` lưu trong Database:
```json
[
  {
    "type": "step",
    "category": "warmup",
    "duration_type": "time",
    "duration_value": 600,
    "target_type": "power",
    "target_min_percent": 0.50,
    "target_max_percent": 0.60
  },
  {
    "type": "group",
    "repeat_count": 5,
    "steps": [
      {
        "type": "step",
        "category": "active",
        "duration_type": "distance",
        "duration_value": 1000,
        "target_type": "pace",
        "target_min_percent": 0.95,
        "target_max_percent": 1.05
      },
      {
        "type": "step",
        "category": "recovery",
        "duration_type": "time",
        "duration_value": 120,
        "target_type": "heart_rate",
        "target_min_percent": 0.60,
        "target_max_percent": 0.70
      }
    ]
  }
]
```

### Ví dụ về Giao diện người dùng (UI)
*   **Trình soạn thảo bài tập (Workout Editor UI)**:
    *   Bên trái là trình nhập liệu văn bản DSL có tính năng tự động hoàn thành (autocomplete) cú pháp.
    *   Bên phải là biểu đồ trực quan hóa bài tập (Preview Chart) được vẽ động theo thời gian thực mỗi khi huấn luyện viên gõ phím. Biểu đồ hiển thị các cột màu sắc (độ cao của cột thể hiện cường độ, độ rộng thể hiện thời gian).

### Ví dụ về Dashboard
Một ô trên Lịch tập luyện (Calendar Day Cell) hiển thị bài tập cấu trúc:
*   Tiêu đề bài chạy màu vàng: **"5x1000m Intervals"**.
*   Chỉ số nhỏ bên dưới: **1:10:00 | 12 km | 85 Planned TSS**.

---

## 5. Sai lầm phổ biến khi thiết kế sản phẩm (Common Pitfalls)

1.  **Lỗi tính toán sai Planned TSS do không xử lý bước "Lặp" (Repeats Group)**:
    *   *Sai lầm*: Khi duyệt qua cây cấu trúc JSON để tính tổng Planned TSS, thuật toán quên nhân thời gian và cường độ của các bước nằm bên trong nhóm lặp với hệ số lặp (`repeat_count`). Điều này làm cho Planned TSS dự báo bị thấp hơn thực tế rất nhiều.
    *   *Giải pháp*: Viết hàm đệ quy duyệt qua cấu trúc cây bài tập (recursive tree traversal), luôn nhân kết quả của các nút con nằm trong nút `group` với thuộc tính `repeat_count` trước khi cộng dồn vào tổng.
2.  **Thiếu cơ chế dịch đổi mục tiêu (Target Translation Fallback)**:
    *   *Sai lầm*: Huấn luyện viên tạo bài tập dựa trên mục tiêu Công suất (Power) cho vận động viên chạy bộ, nhưng vận động viên này chạy không mang cảm biến Stryd. Khi đồng bộ sang Garmin, thiết bị không thể hiển thị cảnh báo cường độ vì không có cảm biến tương thích.
    *   *Giải pháp*: Cung cấp tính năng tự động chuyển dịch mục tiêu (Target Auto-translation). Nếu thiết bị đích không hỗ trợ Power chạy bộ, hệ thống tự động dịch khoảng % Power sang khoảng % Pace hoặc % Nhịp tim tương ứng của vận động viên đó trước khi gửi đi.
3.  **Cho phép huấn luyện viên đặt mục tiêu cường độ dạng điểm cố định thay vì khoảng**:
    *   *Sai lầm*: Đặt mục tiêu cường độ là đúng `"250W"` hoặc đúng `"Pace 4:30/km"`. Trong thực tế tập luyện ngoài đường, gió và dốc làm cho việc giữ đúng một số Watt hay Pace tuyệt đối là bất khả thi. Thiết bị của vận động viên sẽ liên tục báo chuông cảnh báo quá cao/quá thấp, gây ức chế cực kỳ khi chạy.
    *   *Giải pháp*: Luôn định dạng mục tiêu dưới dạng một **khoảng cường độ** (ví dụ: $240W - 260W$ hoặc Pace $4:25 - 4:35/km$). Khoảng này nên rộng từ $5\% - 10\%$ để tạo không gian vận động thực tế cho người tập.
