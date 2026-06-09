# Hệ thống Tài liệu Tri thức Domain (Domain Knowledge) cho Nền tảng Huấn luyện Thể thao Sức bền (Endurance Sports Platform)

Tài liệu này được biên soạn dành riêng cho **Product Owner (Quản lý Sản phẩm)** và **Software Architect (Kiến trúc sư Phần mềm)**. Mục tiêu của bộ tài liệu là cung cấp toàn bộ tri thức nền tảng và nâng cao về Khoa học Thể thao (Sport Science), Lý thuyết Huấn luyện (Coaching Theory), Thiết kế Sản phẩm (Product Design), và Kiến trúc Hệ thống (Software Architecture) cần thiết để xây dựng một nền tảng phân tích và huấn luyện thể thao sức bền tương đương hoặc vượt trội hơn các hệ thống hàng đầu thế giới như TrainingPeaks, Intervals.icu, Garmin Connect, và WKO.

---

## Mục lục các Chương học tập

Nhấn vào từng chương dưới đây để đi sâu vào chi tiết:

1. **[Chương 1: Kiến thức nền tảng về Huấn luyện Sức bền](file:///c:/Working/coachfit/docs/endurance_sports_domain_knowledge/01_endurance_fundamentals.md)**
   * Bản chất huấn luyện sức bền, các hệ năng lượng (Aerobic, Anaerobic), Lactate, sự mệt mỏi (Fatigue), phục hồi (Recovery), cơ chế thích nghi (Adaptation) và siêu bù (Supercompensation) dưới 4 lăng kính: Coach, Athlete, Product Owner, Software Engineer.
2. **[Chương 2: Hồ sơ vận động viên (Athlete Profile) & Bộ chỉ số cá nhân](file:///c:/Working/coachfit/docs/endurance_sports_domain_knowledge/02_athlete_profile.md)**
   * Khảo sát chi tiết các chỉ số sinh trắc học và ngưỡng: FTP, eFTP, Công suất tới hạn (Critical Power), Ngưỡng tốc độ (Threshold Pace), Nhịp tim nghỉ (Resting HR), Nhịp tim tối đa (Max HR), Nhịp tim ngưỡng (Threshold HR), VO2Max, và HRV.
3. **[Chương 3: Phân vùng Huấn luyện (Training Zones)](file:///c:/Working/coachfit/docs/endurance_sports_domain_knowledge/03_training_zones.md)**
   * So sánh và thiết kế các mô hình phân vùng nhịp tim (Heart Rate), công suất (Power), tốc độ (Pace), bơi (Swim), và vòng quay chân/guồng chân (Cadence). Đối chiếu Coggan, Garmin, TrainingPeaks và Intervals.icu.
4. **[Chương 4: Chỉ số buổi tập (Workout Metrics)](file:///c:/Working/coachfit/docs/endurance_sports_domain_knowledge/04_workout_metrics.md)**
   * Phân tích nguồn gốc dữ liệu, công thức tính toán và ứng dụng của các chỉ số cơ bản trong tệp FIT/TCX/GPX: Thời gian, Khoảng cách, Cao độ, Tốc độ, Công suất, Nhịp tim, Lượng calo, Tải tập luyện.
5. **[Chương 5: Phân tích chuyên sâu về Công suất (Power Analytics)](file:///c:/Working/coachfit/docs/endurance_sports_domain_knowledge/05_power_analytics.md)**
   * Các thuật toán cốt lõi cho Đạp xe và Chạy bộ: Average Power, Normalized Power (NP), Variability Index (VI), Intensity Factor (IF), Efficiency Factor (EF), Power Duration Curve (PDC), Critical Power Model, và W' Balance (Cân bằng năng lượng kị khí).
6. **[Chương 6: Hệ thống tính toán Tải tập luyện (Training Load System)](file:///c:/Working/coachfit/docs/endurance_sports_domain_knowledge/06_training_load_system.md)**
   * Các mô hình tính điểm tải: TSS, hrTSS, rTSS, sTSS, TRIMP, Relative Effort. So sánh triết lý tính toán của TrainingPeaks, Intervals.icu, Strava và Garmin.
7. **[Chương 7: Mô hình hóa Thể lực & Sự mệt mỏi (Fitness & Fatigue Modeling)](file:///c:/Working/coachfit/docs/endurance_sports_domain_knowledge/07_fitness_fatigue_modeling.md)**
   * Thuật toán Banister/Coggan áp dụng vào thực tế: Thể lực tích lũy (CTL/Fitness), Sự mệt mỏi ngắn hạn (ATL/Fatigue), Trạng thái cân bằng (TSB/Form). Ứng dụng trong lập kế hoạch điểm rơi phong độ (Race Planning).
8. **[Chương 8: Bộ dựng bài tập cấu trúc (Workout Builder)](file:///c:/Working/coachfit/docs/endurance_sports_domain_knowledge/08_workout_builder.md)**
   * Phân tích cấu trúc bài tập: Steps, Repeats, Intervals, Targets. Cách thiết kế bộ chuyển đổi ngôn ngữ bài tập (Workout DSL) và cách tính toán Tải dự kiến (Planned TSS).
9. **[Chương 9: Nền tảng dành cho Huấn luyện viên (Coach Platform)](file:///c:/Working/coachfit/docs/endurance_sports_domain_knowledge/09_coach_platform.md)**
   * Luồng nghiệp vụ quản lý danh sách vận động viên, giao tiếp, lập kế hoạch huấn luyện diện rộng (Macrocycle, Mesocycle), phân tích và theo dõi mức độ tuân thủ (Compliance Tracking).
10. **[Chương 10: Nền tảng dành cho Vận động viên (Athlete Platform)](file:///c:/Working/coachfit/docs/endurance_sports_domain_knowledge/10_athlete_platform.md)**
    * Thiết kế Lịch tập luyện (Calendar), Bảng điều khiển (Dashboard), phân tích chi tiết hoạt động (Activity Analysis), theo dõi thể lực lâu dài và quản lý mục tiêu cá nhân.
11. **[Chương 11: Kiến trúc Dữ liệu & Thiết kế Cơ sở dữ liệu (Data Architecture)](file:///c:/Working/coachfit/docs/endurance_sports_domain_knowledge/11_data_architecture.md)**
    * Thiết kế cơ sở dữ liệu chi tiết cho Athlete, Activity, Workout, Zone, Threshold, Metric, Training Load, Notification. Kèm theo biểu đồ ERD chi tiết bằng Mermaid.
12. **[Chương 12: Động cơ Phân tích (Analytics Engine)](file:///c:/Working/coachfit/docs/endurance_sports_domain_knowledge/12_analytics_engine.md)**
    * Kiến trúc phân tầng của các engine xử lý luồng dữ liệu thời gian thực (Time-series): Metrics Engine, Threshold Engine, Zone Engine, Load Engine, Fitness Engine và sơ đồ phụ thuộc dữ liệu.
13. **[Chương 13: Động cơ Tự động phát hiện Ngưỡng (Auto Detection Engine)](file:///c:/Working/coachfit/docs/endurance_sports_domain_knowledge/13_auto_detection_engine.md)**
    * Thuật toán tự động phát hiện và đề xuất thay đổi FTP, eFTP, Threshold HR, Critical Power, Critical Pace dựa trên dữ liệu hoạt động thực tế.
14. **[Chương 14: Sơ đồ hóa Giao diện UI/UX (UI/UX Mapping)](file:///c:/Working/coachfit/docs/endurance_sports_domain_knowledge/14_ui_ux_mapping.md)**
    * Đặc tả chi tiết các Dashboard Widgets, Màn hình phân tích chuyên sâu, Màn hình lịch tập, Màn hình chi tiết bài tập và cách phân phối các chỉ số trực quan hóa.
15. **[Chương 15: Phân tích Kỹ thuật đảo ngược (Reverse Engineering)](file:///c:/Working/coachfit/docs/endurance_sports_domain_knowledge/15_reverse_engineering.md)**
    * Giải mã tính năng, chỉ số, mục đích sản phẩm, nguồn dữ liệu và logic nghiệp vụ của TrainingPeaks, Intervals.icu, Garmin Connect, và WKO.
16. **[Chương 16: Lộ trình Phát triển Sản phẩm (Product Roadmap)](file:///c:/Working/coachfit/docs/endurance_sports_domain_knowledge/16_roadmap.md)**
    * Phân kỳ phát triển từ sản phẩm khả dụng tối thiểu (MVP) đến các phiên bản nâng cấp (V1, V2, V3). Mối quan hệ phụ thuộc giữa các chỉ số và tính năng.

---

## Hướng dẫn đọc và áp dụng tài liệu

1. **Dành cho Product Owner**: Tập trung vào các phần **"Tại sao tồn tại"**, **"Ví dụ thực tế"**, **"Góc nhìn Product Owner"**, và **"UI/UX Mapping"** để hiểu cách biến khoa học thể thao khô khan thành trải nghiệm người dùng cuốn hút, giữ chân khách hàng (retention) và tạo giá trị cốt lõi cho ứng dụng.
2. **Dành cho Software Architect / Senior Engineer**: Tập trung vào **"Công thức"**, **"Kiến trúc dữ liệu"**, **"Analytics Engine"**, **"Auto Detection Engine"** và **"Ví dụ Database"** để xây dựng kiến trúc hệ thống xử lý dữ liệu lớn (IoT / Time-series data) hiệu năng cao, chính xác và có khả năng mở rộng tốt.
3. **Cơ chế Thuật ngữ**: Tài liệu sử dụng thuật ngữ tiếng Việt chuẩn hóa song hành với thuật ngữ tiếng Anh gốc của ngành khoa học thể thao (được đặt trong ngoặc đơn, ví dụ: *Ngưỡng công suất chức năng (FTP)*) giúp người đọc không bị nhầm lẫn khi làm việc với API hoặc tài liệu quốc tế.
