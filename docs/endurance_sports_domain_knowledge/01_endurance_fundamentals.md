# Chương 1: Kiến thức nền tảng về Huấn luyện Sức bền (Endurance Training)

Để xây dựng một hệ thống phân tích thể thao đẳng cấp thế giới, trước hết chúng ta phải hiểu rõ cơ sở sinh học và khoa học vận động đằng sau cơ thể con người khi tập luyện sức bền. Chương này sẽ mổ xẻ các khái niệm sinh lý học cốt lõi và cách chúng chuyển hóa thành các yêu cầu phần mềm cụ thể.

---

## 1. Khái niệm cốt lõi

### Huấn luyện Sức bền (Endurance Training)
*   **Khái niệm**: Là quá trình tập luyện nhằm nâng cao khả năng duy trì một cường độ vận động nhất định trong thời gian dài mà không bị giảm hiệu suất do mệt mỏi.
*   **Tại sao tồn tại**: Hệ tim mạch và cơ bắp cần được kích thích liên tục và có hệ thống để tăng hiệu suất vận chuyển oxy và sản sinh năng lượng. Nếu không huấn luyện đúng cách, cơ thể không thể tối ưu hóa việc sử dụng năng lượng cho các chặng đua kéo dài từ vài chục phút đến nhiều giờ.

### Hệ thống Năng lượng (Energy Systems) & Hệ Hiếu khí (Aerobic System) vs. Hệ Kị khí (Anaerobic System)
*   **Khái niệm**: Cơ thể tái tạo ATP (Adenosine Triphosphate - đồng tiền năng lượng của tế bào) qua 3 hệ thống chính:
    1.  **Hệ Phosphagen (ATP-PCr)**: Cực nhanh, không cần oxy, dùng cho vận động bộc phát dưới 10 giây (sprint hết tốc lực).
    2.  **Hệ Kị khí Glycolysis (Anaerobic)**: Nhanh, không cần oxy, phân hủy carbohydrate thành glucose và lactate để tạo năng lượng, dùng cho vận động cường độ cao từ 30 giây đến 2 phút.
    3.  **Hệ Hiếu khí Oxidative (Aerobic)**: Chậm, cần oxy, phân hủy carbohydrate, chất béo (lipids) và đôi khi cả protein để tạo năng lượng bền vững, dùng cho vận động kéo dài từ vài phút đến nhiều giờ.
*   **Tại sao tồn tại**: Một nền tảng thể thao cần phân định rõ năng lượng tiêu thụ từ hệ nào để xác định chính xác mục tiêu của bài tập (ví dụ: bài tập xây dựng sức bền cơ bản hay bài tập tăng tốc độ bứt phá).

### Lactate (Axit Lactic)
*   **Khái niệm**: Là sản phẩm phụ của quá trình chuyển hóa đường kị khí (Glycolysis). Ở cường độ thấp, cơ thể tái hấp thu lactate để làm năng lượng. Khi cường độ tăng vượt qua một ngưỡng nhất định, lượng lactate sản sinh ra nhanh hơn khả năng đào thải của cơ thể, dẫn đến tích tụ ion hydro ($H^+$) làm giảm pH trong cơ, gây ra cảm giác mỏi cơ và nóng rát.
*   **Tại sao tồn tại**: Đo lường ngưỡng lactate giúp xác định giới hạn sinh lý tối đa mà vận động viên có thể duy trì trong thời gian dài (thường là 1 giờ).

### Các điểm ngưỡng chuyển đổi sinh lý: LT1/LT2 và VT1/VT2
*   **Khái niệm**:
    1.  **Ngưỡng Lactate 1 (LT1) / Ngưỡng thông khí 1 (VT1)**: Điểm cường độ mà tại đó nồng độ lactate trong máu bắt đầu tăng nhẹ so với mức nghỉ ngơi (thường khoảng 1.5 - 2.0 mmol/L) và nhịp thở bắt đầu tăng nhanh hơn để đào thải CO2 dư thừa. Dưới ngưỡng này, cơ thể sử dụng gần như hoàn toàn hệ hiếu khí chất béo.
    2.  **Ngưỡng Lactate 2 (LT2) / Ngưỡng thông khí 2 (VT2)**: Điểm cường độ mà tại đó sự tích tụ lactate xảy ra phi tuyến tính, cơ thể đạt giới hạn cân bằng động giữa sản sinh và đào thải lactate (thường khoảng 4.0 mmol/L). Vượt qua ngưỡng này (vùng kị khí), mệt mỏi sẽ tích tụ cực kỳ nhanh chóng. LT2 chính là điểm sinh lý tương ứng với FTP của Đạp xe hoặc Threshold Pace của Chạy bộ.
*   **Tại sao tồn tại**: Giúp phân định ranh giới sinh lý học chính xác cho các vùng tập luyện (Zone). Ví dụ, tập luyện Zone 2 (Bền bỉ) thực chất là tập luyện ngay dưới ngưỡng VT1/LT1 để tối ưu hóa quá trình đốt mỡ và phát triển mạng lưới ty thể mà không tích lũy stress thần kinh.


### Sự mệt mỏi (Fatigue), Phục hồi (Recovery), Thích nghi (Adaptation) & Siêu bù (Supercompensation)
*   **Khái niệm**: 
    *   **Fatigue (Mệt mỏi)**: Sự suy giảm khả năng phát lực của cơ bắp sau khi tập luyện.
    *   **Recovery (Phục hồi)**: Quá trình cơ thể tái tạo năng lượng, sửa chữa các sợi cơ bị tổn thương và cân bằng nội môi.
    *   **Adaptation (Thích nghi)**: Sự biến đổi sinh học giúp cơ thể khỏe hơn để chịu đựng áp lực lớn hơn trong tương lai.
    *   **Supercompensation (Siêu bù)**: Chu kỳ sinh học trong đó sau khi bị phá hủy bởi tập luyện (fatigue) và được nghỉ ngơi đầy đủ (recovery), năng lượng và thể lực của vận động viên sẽ đạt mức cao hơn mức nền ban đầu.
*   **Tại sao tồn tại**: Đây là xương sống của mọi giáo án huấn luyện. Huấn luyện thực chất là việc quản lý chu kỳ Mệt mỏi - Phục hồi để đạt được Siêu bù đúng ngày thi đấu.

---

## 2. Công thức và Mô hình Toán học

Mặc dù các quá trình sinh lý diễn ra trong tế bào, phần mềm mô hình hóa chúng bằng các phương thức gián tiếp:

### Chu kỳ Siêu bù và Mô hình Thể lực - Mệt mỏi (Banister's Model)
Mô hình toán học kinh điển biểu diễn Thể lực thực tế ($p(t)$) tại ngày $t$:
$$p(t) = p_0 + k_1 \sum_{i=1}^{t-1} w(i) e^{-(t-i)/\tau_1} - k_2 \sum_{i=1}^{t-1} w(i) e^{-(t-i)/\tau_2}$$

Trong đó:
*   $p_0$: Thể lực nền ban đầu.
*   $w(i)$: Tải tập luyện (Training Load) của ngày thứ $i$.
*   $\tau_1$: Hằng số thời gian phân rã của Thể lực (Fitness) (thường từ 40 - 50 ngày).
*   $\tau_2$: Hằng số thời gian phân rã của Sự mệt mỏi (Fatigue) (thường từ 7 - 15 ngày).
*   $k_1, k_2$: Hệ số chuyển đổi trọng số tương ứng.

Mô hình này chứng minh toán học rằng: **Sự mệt mỏi phân rã nhanh gấp 3-4 lần so với Thể lực**. Nghĩa là nếu được nghỉ ngơi hợp lý, mệt mỏi sẽ biến mất trước khi thể lực giảm đáng kể, tạo ra trạng thái Siêu bù.

---

## 3. Các góc nhìn đa chiều trong phát triển sản phẩm

### Góc nhìn của Huấn luyện viên (Coach)
*   **Mối quan tâm**: Làm sao thiết kế bài tập kích thích đúng hệ năng lượng mong muốn của vận động viên mà không gây ra chấn thương hoặc quá tải (overtraining).
*   **Hành động**: Quan sát biểu đồ tích lũy mệt mỏi và nhịp tim/công suất trong các phân vùng để điều chỉnh giáo án tuần sau.

### Góc nhìn của Vận động viên (Athlete)
*   **Mối quan tâm**: Hôm nay tôi nên tập bài gì? Tôi có đang khỏe lên không? Tôi cảm thấy rất mệt, tôi có nên nghỉ ngơi không?
*   **Hành động**: Xem lịch tập, tải bài tập vào đồng hồ Garmin, chạy/đạp xe, sau đó xem kết quả phản hồi xem mình có hoàn thành đúng mục tiêu hay không.

### Góc nhìn của Quản lý Sản phẩm (Product Owner)
*   **Mối quan tâm**: Làm sao chuyển hóa các thuật ngữ khoa học khó hiểu này thành các chỉ số trực quan, dễ hiểu giúp người dùng có động lực tập luyện mỗi ngày. Làm sao giữ chân (retention) cả huấn luyện viên chuyên nghiệp lẫn người tập nghiệp dư.
*   **Hành động**: Thiết kế các tính năng như "Điểm số Phục hồi" (Recovery Score), "Trạng thái Tập luyện" (Training Status - Đang phát triển, Quá tải, Đạt đỉnh) dựa trên dữ liệu tải tập luyện và HRV.

### Góc nhìn của Kỹ sư Phần mềm (Software Engineer)
*   **Mối quan tâm**: Làm sao xử lý và tính toán lượng lớn dữ liệu time-series (dữ liệu nhịp tim, công suất gửi về mỗi giây) để tính ra điểm số mệt mỏi một cách nhanh nhất mà không làm nghẽn hệ thống.
*   **Hành động**: Thiết kế pipeline xử lý bất đồng bộ, lưu trữ dữ liệu nén hiệu quả, xây dựng cache hợp lý cho các chỉ số tải tập luyện tích lũy.

---

## 4. Ví dụ thực tế ứng dụng trong sản phẩm

### Ví dụ về Athlete
Vận động viên A thực hiện bài tập chạy biến tốc (Intervals) 5x1000m ở ngưỡng lactate để kích thích hệ thống kị khí và nâng cao ngưỡng hiếu khí. Sau bài tập, họ mở ứng dụng và thấy điểm mệt mỏi tăng cao, ứng dụng đề xuất thời gian phục hồi là 36 giờ.

### Ví dụ về Coach
Huấn luyện viên B vào dashboard quản lý, nhận thấy đồ thị mệt mỏi của Vận động viên A đang dốc đứng liên tục trong 3 tuần liền mà không có tuần phục hồi (Recovery week). Coach ngay lập tức chỉnh sửa lịch tập tuần tới, giảm 40% khối lượng tập để kích hoạt chu kỳ siêu bù trước thềm giải đấu.

### Ví dụ về Product
Tính năng **"Trạng thái Phong độ" (Form / Training Status)** trên ứng dụng. Hệ thống tự động tính toán hiệu số giữa Thể lực dài hạn và Mệt mỏi ngắn hạn. 
*   Nếu hiệu số nằm trong khoảng tối ưu (Ví dụ: -10 đến -30), ứng dụng hiển thị trạng thái: **"Tối ưu (Productive)"** kèm lời khuyên: *"Cơ thể bạn đang thích nghi tốt với tải tập luyện hiện tại. Hãy tiếp tục!"*
*   Nếu hiệu số quá âm (Ví dụ dưới -30): Hiển thị cảnh báo màu cam: **"Nguy cơ quá tải (Overreaching)"** kèm lời khuyên: *"Hãy cân nhắc một buổi chạy nhẹ nhàng hoặc nghỉ ngơi hôm nay."*

### Ví dụ về Cơ sở dữ liệu (Database Schema)
Bảng lưu trữ chỉ số sinh lý hàng ngày của Athlete phục vụ cho việc tính toán chu kỳ siêu bù:

```sql
CREATE TABLE athlete_daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    date DATE NOT NULL,
    resting_hr INT, -- Nhịp tim nghỉ
    hrv_rmssd DOUBLE PRECISION, -- Chỉ số phục hồi HRV
    sleep_score INT, -- Điểm giấc ngủ
    subjective_fatigue INT CHECK (subjective_fatigue BETWEEN 1 AND 10), -- Mệt mỏi chủ quan
    fitness_score DOUBLE PRECISION NOT NULL, -- CTL (Thể lực tích lũy)
    fatigue_score DOUBLE PRECISION NOT NULL, -- ATL (Mệt mỏi ngắn hạn)
    form_score DOUBLE PRECISION NOT NULL, -- TSB (Trạng thái phong độ)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(athlete_id, date)
);

CREATE INDEX idx_athlete_metrics_date ON athlete_daily_metrics(athlete_id, date DESC);
```

### Ví dụ về Giao diện người dùng (UI)
*   Màn hình chi tiết bài tập hiển thị một widget dạng thanh tiến trình (progress bar) thể hiện mức đóng góp năng lượng của bài tập:
    *   `[██████████░░░░░░░]` **Hiếu khí (Aerobic)**: 70% (Tập trung phát triển tim mạch và cơ bền).
    *   `[███░░░░░░░░░░░░░░░]` **Kị khí (Anaerobic)**: 30% (Kích thích khả năng bứt tốc).

### Ví dụ về Dashboard
Biểu đồ đường (Line Chart) đa trục kết hợp:
*   Trục Y bên trái: Thể lực (Đường xanh lam) và Mệt mỏi (Đường vàng).
*   Trục Y bên phải: Phong độ (Đường đỏ hoặc xanh lá thể hiện vùng an toàn).
*   Trục X: Thời gian (3 tháng qua và dự phóng 2 tuần tới).

---

## 5. Sai lầm phổ biến khi thiết kế sản phẩm (Common Pitfalls)

1.  **Coi mọi sự mệt mỏi đều như nhau**: 
    *   *Sai lầm*: Hệ thống tính toán điểm mệt mỏi chỉ dựa vào thời gian tập luyện mà không tính đến cường độ. Ví dụ: 1 giờ chạy bộ thả lỏng phục hồi (recovery run) được tính điểm mệt mỏi bằng 1 giờ chạy biến tốc kị khí cường độ cao.
    *   *Giải pháp*: Phải sử dụng các thuật toán tính Tải tập luyện có trọng số cường độ như TSS (Training Stress Score) hoặc TRIMP (Training Impulse) sẽ được chi tiết hóa ở các chương sau.
2.  **Bỏ qua yếu tố phản hồi chủ quan (Subjective Metrics)**:
    *   *Sai lầm*: Quá tin tưởng vào các con số đo đạc từ thiết bị (nhịp tim, công suất) mà bỏ qua việc hỏi cảm nhận của vận động viên. Cùng một bài tập nhưng nếu athlete đang bị stress công việc hoặc mất ngủ thì tải thực tế lên hệ thần kinh sẽ cao hơn rất nhiều.
    *   *Giải pháp*: Thiết kế popup khảo sát ngắn sau buổi tập: *"Hôm nay bạn cảm thấy thế nào? (Cực kỳ khỏe - Rất mệt)"* và *"Độ gắng sức chủ quan (RPE - Rate of Perceived Exertion) từ 1-10 là bao nhiêu?"*.
3.  **Tính toán thời gian phục hồi (Recovery Time) phi thực tế**:
    *   *Sai lầm*: Đưa ra khuyến nghị thời gian phục hồi cứng nhắc dựa trên tổng calo tiêu thụ hoặc cự ly chạy.
    *   *Giải pháp*: Cập nhật động thời gian phục hồi dựa trên xu hướng biến thiên nhịp tim (HRV) buổi sáng tiếp theo của vận động viên. Nếu HRV phục hồi tốt, thời gian đề xuất nghỉ ngơi có thể được rút ngắn.
