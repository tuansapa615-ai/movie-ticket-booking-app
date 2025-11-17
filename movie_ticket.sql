-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th7 11, 2025 lúc 07:41 PM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `movie_ticket`
--

DELIMITER $$
--
-- Thủ tục
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_available_seats` (IN `p_showtime_id` INT)   BEGIN
    SELECT
        s.seat_id,
        s.seat_row,
        s.seat_number,
        s.seat_type,
        -- Sử dụng COALESCE với một subquery để kiểm tra trạng thái 'booked' một cách duy nhất
        COALESCE(
            (SELECT 'booked'
             FROM booking_seats bs_sub
             JOIN bookings b_sub ON bs_sub.booking_id = b_sub.booking_id
             WHERE bs_sub.seat_id = s.seat_id
             AND b_sub.showtime_id = st.showtime_id -- Đảm bảo booking này là cho suất chiếu hiện tại
             AND b_sub.status IN ('confirmed', 'pending')
             LIMIT 1), -- LIMIT 1 để đảm bảo subquery chỉ trả về 1 giá trị hoặc NULL
            'available'
        ) AS seat_status
    FROM seats s
    -- Join với halls và showtimes để lọc ghế theo showtime_id
    JOIN halls h ON s.hall_id = h.hall_id
    JOIN showtimes st ON h.hall_id = st.hall_id AND st.showtime_id = p_showtime_id -- Lọc trực tiếp bằng showtime_id
    ORDER BY s.seat_row, s.seat_number;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_search_movies` (IN `p_search_term` VARCHAR(100), IN `p_genre` VARCHAR(50), IN `p_city` VARCHAR(50), IN `p_date` DATE, IN `p_limit` INT, IN `p_offset` INT)   BEGIN
    SELECT DISTINCT
        m.movie_id,
        m.title,
        m.description,
        m.duration_minutes,
        m.genre,
        m.director,
        m.poster_url,
        (SELECT MIN(price) FROM seat_type_prices) as min_price, -- Get the overall minimum seat price
        COUNT(DISTINCT s.showtime_id) as showtime_count
    FROM movies m
    JOIN showtimes s ON m.movie_id = s.movie_id
    JOIN halls h ON s.hall_id = h.hall_id
    JOIN cinemas c ON h.cinema_id = c.cinema_id
    WHERE
        m.display_status = 'showing'
        AND s.start_time >= NOW()
        AND (p_search_term IS NULL OR MATCH(m.title, m.description) AGAINST(p_search_term IN NATURAL LANGUAGE MODE))
        AND (p_genre IS NULL OR m.genre = p_genre)
        AND (p_city IS NULL OR c.city = p_city)
        AND (p_date IS NULL OR DATE(s.start_time) = p_date)
    GROUP BY m.movie_id
    ORDER BY m.title, m.movie_id
    LIMIT p_limit OFFSET p_offset;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `banners`
--

CREATE TABLE `banners` (
  `banner_id` int(11) NOT NULL,
  `imageUrl` varchar(255) NOT NULL,
  `launchUrl` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `banners`
--

INSERT INTO `banners` (`banner_id`, `imageUrl`, `launchUrl`) VALUES
(3, 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1750938955/banners/banner_1750938953719-728337362_bn1.png', 'http://localhost:5173/'),
(4, 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1750938967/banners/banner_1750938966030-766792119_bn2.png', 'http://localhost:5173/'),
(5, 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1750938980/banners/banner_1750938978105-626877292_bn3.png', 'http://localhost:5173/');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `bookings`
--

CREATE TABLE `bookings` (
  `booking_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `showtime_id` int(11) NOT NULL,
  `movie_title` varchar(100) DEFAULT NULL,
  `cinema_name` varchar(100) DEFAULT NULL,
  `hall_name` varchar(50) DEFAULT NULL,
  `show_start_time` datetime DEFAULT NULL,
  `booking_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `total_amount` decimal(10,2) NOT NULL,
  `status` enum('pending','confirmed','cancelled','completed') DEFAULT 'pending',
  `food_items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Thông tin đồ ăn đã đặt' CHECK (json_valid(`food_items`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `bookings`
--

INSERT INTO `bookings` (`booking_id`, `user_id`, `showtime_id`, `movie_title`, `cinema_name`, `hall_name`, `show_start_time`, `booking_date`, `total_amount`, `status`, `food_items`) VALUES
(79, 5, 12, ' Bí Kíp Luyện Rồng', 'Mai Viết Long', 'Hall A (3D)', '2025-07-12 09:00:00', '2025-07-11 17:25:01', 740000.00, 'confirmed', '[{\"item_id\":5,\"quantity\":3,\"name\":\"4 nước 2 bỏng\",\"price\":80000,\"image_url\":\"https://res.cloudinary.com/dz5ahjppm/image/upload/v1752254656/food_items/yk7tbgjfxpfuai3uksig.jpg\",\"description\":\"4 nước 2 bỏng\"}]');

--
-- Bẫy `bookings`
--
DELIMITER $$
CREATE TRIGGER `after_booking_status_change_handle_seats` AFTER UPDATE ON `bookings` FOR EACH ROW BEGIN
    -- Khi trạng thái booking chuyển sang 'cancelled' từ 'pending'
    -- Chúng ta chỉ cho phép hủy booking 'pending'
    IF NEW.status = 'cancelled' AND OLD.status = 'pending' THEN
        -- Xóa các bản ghi ghế ngồi liên quan đến booking này
        -- Điều này sẽ kích hoạt trigger `after_booking_seat_delete` để giải phóng ghế
        DELETE FROM booking_seats WHERE booking_id = NEW.booking_id;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_booking_insert` BEFORE INSERT ON `bookings` FOR EACH ROW BEGIN 
        DECLARE v_movie_title VARCHAR(100);
        DECLARE v_cinema_name VARCHAR(100);
        DECLARE v_hall_name VARCHAR(50);
        DECLARE v_show_start_time DATETIME;

        SELECT 
            m.title, 
            c.name, 
            h.name, 
            s.start_time
        INTO 
            v_movie_title, 
            v_cinema_name, 
            v_hall_name, 
            v_show_start_time
        FROM showtimes s 
        JOIN movies m ON s.movie_id = m.movie_id
        JOIN halls h ON s.hall_id = h.hall_id
        JOIN cinemas c ON h.cinema_id = c.cinema_id
        WHERE s.showtime_id = NEW.showtime_id;

        SET NEW.movie_title = v_movie_title;
        SET NEW.cinema_name = v_cinema_name;
        SET NEW.hall_name = v_hall_name;
        SET NEW.show_start_time = v_show_start_time;
    END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `booking_seats`
--

CREATE TABLE `booking_seats` (
  `booking_seat_id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `seat_id` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `booking_seats`
--

INSERT INTO `booking_seats` (`booking_seat_id`, `booking_id`, `seat_id`, `price`) VALUES
(131, 79, 222, 100000.00),
(132, 79, 221, 100000.00),
(133, 79, 220, 100000.00),
(134, 79, 219, 100000.00),
(135, 79, 218, 100000.00);

--
-- Bẫy `booking_seats`
--
DELIMITER $$
CREATE TRIGGER `after_booking_seat_delete` AFTER DELETE ON `booking_seats` FOR EACH ROW BEGIN 
        DECLARE v_showtime_id INT;
        
        SELECT showtime_id INTO v_showtime_id 
        FROM bookings 
        WHERE booking_id = OLD.booking_id;
        
        UPDATE showtimes 
        SET 
            available_seats = available_seats + 1,
            is_full = FALSE
        WHERE showtime_id = v_showtime_id;
    END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_booking_seat_insert` AFTER INSERT ON `booking_seats` FOR EACH ROW BEGIN 
        DECLARE v_showtime_id INT;
        
        SELECT showtime_id INTO v_showtime_id 
        FROM bookings 
        WHERE booking_id = NEW.booking_id;
        
        UPDATE showtimes 
        SET 
            available_seats = available_seats - 1,
            is_full = IF(available_seats - 1 <= 0, TRUE, FALSE)
        WHERE showtime_id = v_showtime_id;
    END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_booking_seat_insert_set_price` BEFORE INSERT ON `booking_seats` FOR EACH ROW BEGIN
    DECLARE v_seat_type ENUM('standard','vip','couple');
    DECLARE v_seat_price DECIMAL(10,2);

    -- Get the seat_type for the seat being booked
    SELECT seat_type INTO v_seat_type FROM seats WHERE seat_id = NEW.seat_id;

    -- Get the price for that seat_type from the new seat_type_prices table
    SELECT price INTO v_seat_price FROM seat_type_prices WHERE seat_type = v_seat_type;

    -- Set the price for the booking_seat
    SET NEW.price = v_seat_price;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `cinemas`
--

CREATE TABLE `cinemas` (
  `cinema_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `address` text NOT NULL,
  `city` varchar(50) NOT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `google_maps_url` varchar(255) DEFAULT NULL,
  `opening_hours` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `cinemas`
--

INSERT INTO `cinemas` (`cinema_id`, `name`, `address`, `city`, `contact_number`, `google_maps_url`, `opening_hours`) VALUES
(2, 'Mai Viết Long', '20 Cong Hoa, Ward 4, Tan Binh Dist', 'Hồ Chí Minh', '02838116311', NULL, '8'),
(3, 'Trần Anh Tuấn', '301, Điện Biên Phủ', 'Lào Cai', '0328399501', NULL, '8'),
(4, 'Đỗ Hoàng An', 'Sài Đồng Long Biên', 'Hà Nội', '0123456789', NULL, '8'),
(5, 'Tô Nhật Minh', 'Bên kia cầu ', 'Hòa Bình', '0987654321', NULL, '8'),
(6, 'Đinh Thế Phong', 'Bắc Bling', 'Bắc Ninh', '0987612345', NULL, '8'),
(7, 'Lê Vũ Trịnh Tùng ', 'Đông Anh ', 'Hà Nội', '0567894321', NULL, '8');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `food_items`
--

CREATE TABLE `food_items` (
  `item_id` int(11) NOT NULL,
  `category_name` varchar(50) NOT NULL COMMENT 'Thay thế bảng category',
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `is_available` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `food_items`
--

INSERT INTO `food_items` (`item_id`, `category_name`, `name`, `description`, `price`, `image_url`, `is_available`) VALUES
(2, 'combo', 'Bỏng nước', 'bỏng giòn, nước mát', 75001.00, 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1751098194/food_items/c8mqryw5ui2zbffhixde.jpg', 1),
(3, 'Bỏng ', 'Bỏng', 'Bỏng', 25000.00, 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1752254477/food_items/oxvihbifocr0gmbpjhho.jpg', 1),
(4, 'Nước ', 'Nước ', 'Nước ', 15000.00, 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1752254964/food_items/kkpjkticenhififqbriu.jpg', 1),
(5, '4 nước 2 bỏng', '4 nước 2 bỏng', '4 nước 2 bỏng', 80000.00, 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1752254656/food_items/yk7tbgjfxpfuai3uksig.jpg', 1);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `halls`
--

CREATE TABLE `halls` (
  `hall_id` int(11) NOT NULL,
  `cinema_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `capacity` smallint(5) UNSIGNED NOT NULL,
  `screen_type` enum('2D','3D','IMAX','4DX') DEFAULT '2D',
  `seat_map` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`seat_map`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `halls`
--

INSERT INTO `halls` (`hall_id`, `cinema_id`, `name`, `capacity`, `screen_type`, `seat_map`) VALUES
(3, 2, 'Hall A (3D)', 120, '3D', NULL),
(7, 4, 'Phòng VIP 01', 50, 'IMAX', NULL),
(8, 3, 'Phòng 02', 50, '2D', NULL),
(9, 5, 'Phòng test', 50, '3D', NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `movies`
--

CREATE TABLE `movies` (
  `movie_id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `duration_minutes` smallint(5) UNSIGNED DEFAULT NULL,
  `release_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `genre` varchar(50) DEFAULT NULL,
  `director` varchar(100) DEFAULT NULL,
  `cast` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`cast`)),
  `poster_url` varchar(255) DEFAULT NULL,
  `trailer_url` varchar(255) DEFAULT NULL,
  `rating` decimal(3,1) UNSIGNED DEFAULT 0.0,
  `total_bookings` int(10) UNSIGNED DEFAULT 0,
  `display_status` enum('showing','coming_soon','early_showing','hidden') DEFAULT 'coming_soon'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `movies`
--

INSERT INTO `movies` (`movie_id`, `title`, `description`, `duration_minutes`, `release_date`, `end_date`, `genre`, `director`, `cast`, `poster_url`, `trailer_url`, `rating`, `total_bookings`, `display_status`) VALUES
(1, 'Siêu Sao Nguyên Thủy  ', 'Tiểu sử đặc biệt của siêu sao nhạc pop Robbie Williams, kể lại quá trình thăng tiến nhanh chóng, sự sụp đổ thảm hại và sự hồi sinh đáng kinh ngạc của anh.', 135, '2025-06-29', '2025-08-10', 'Âm Nhạc', 'Michael Gracey', '[\"Robbie Williams\",\"Jonno Davies\",\"Steve Pemberton\"]', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1750961754/movie_posters/qoa5vklsjjhazlfwjxdm.jpg', 'https://www.youtube.com/watch?v=8X-UrrWL7g8&t=1s', 8.5, 0, 'coming_soon'),
(2, 'Phim Xì Trum', 'Câu chuyện trở lại với ngôi làng Xì Trum, nơi mà mỗi ngày đều là lễ hội. Bỗng một ngày, sự yên bình của ngôi làng bị phá vỡ khi Tí Vua bị bắt cóc một cách bí ẩn bởi hai phù thủy độc ác Gà Mên và Cà Mên. Từ đây, Tí Cô Nương phải dẫn dắt các Tí đi vào thế giới thực để giải cứu ông. Với sự giúp đỡ của những người bạn mới, các Tí sẽ bước vào cuộc phiêu lưu khám phá định mệnh của mình để cứu lấy vũ trụ.', 166, '2025-07-17', '2025-08-17', 'Hoạt hình, Hài hước', 'Chris Miller', '[\"Rihanna\",\"James Corden\",\"Nick Offerman\",\"Natasha Lyonne\",\"Amy Sedaris\",\"Nick Kroll\",\"Daniel Levy\",\"Octavia Spencer\",\"...\"]', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1750961956/movie_posters/daiwldwpvmymuo9dbyvw.jpg', 'https://www.youtube.com/watch?v=yhBpgqXwrt8&t=1s', 10.0, 0, 'early_showing'),
(6, 'Út Lan: Oán Linh Giữ Của', 'Sau sự ra đi của cha, Lan (Phương Thanh) về một vùng quê và ở đợ cho nhà ông Danh (Mạc Văn Khoa) - một người đàn ông góa vợ, không con cái. Ngay sau khi bước chân vào căn nhà, Lan phải đối mặt với hàng loạt hiện tượng kỳ dị và những cái chết bí ẩn liên tục xảy ra. Cùng với Sơn (Quốc Trường) - một nhà văn chuyên viết truyện kinh dị, Lan bắt đầu lật mở những bí mật kinh hoàng, khám phá lịch sử đen tối của căn nhà.', 111, '2025-06-17', '1925-07-17', 'Kinh dị', 'Trần Trọng Dần', '[\"\\\"[\\\\\\\"Quốc Trường\\\\\\\"\",\"\\\\\\\"Mạc Văn Khoa\\\\\\\"\",\"\\\\\\\"...\\\\\\\"]\\\"\"]', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1750959371/movie_posters/ixblayuqe2gcx9pqfoii.jpg', 'https://www.youtube.com/watch?v=-wt6kOG-wk8&t=2s', 10.0, 0, 'hidden'),
(7, ' Bí Kíp Luyện Rồng', 'Câu chuyện về một chàng trai trẻ với ước mơ trở thành thợ săn rồng, nhưng định mệnh lại đưa đẩy anh đến tình bạn bất ngờ với một chú rồng.', 126, '2025-06-12', '2025-07-12', 'Thần thoại, Phiêu lưu', 'Dean DeBlois', '[\"Mason Thames\",\"Nico Parker\",\"Gerard Butler\"]', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1750959864/movie_posters/snjessu5xfnq3kfg32pb.jpg', 'https://www.youtube.com/watch?v=5lzoxHSn0C0&t=2s', 8.6, 0, 'showing'),
(8, 'Quan Tài Vợ Quỷ', 'Sau khi Lunthom chết, người chồng và cô tình nhân những tưởng sẽ được hưởng khối gia sản kếch sù. Tuy nhiên người vợ quá cố đã để lại một điều kiện lạnh sống lưng. Đôi tình nhân sẽ chỉ nhận được gia tài khi sống chung 100 ngày với chiếc quan tài kính chứa thi thể Lunthom đặt giữa nhà. Nỗi phẫn uất của người bị phản bội đã biến Lunthom thành quỷ dữ và quay về gieo rắc kinh hoàng.', 91, '2025-07-03', '2025-08-03', 'Kinh dị', 'Vathanyu Ingkawiwat', '[\"Woranuch BhiromBhakdi\",\"Arachaporn Pokinpakorn\",\"Thanavate Siriwattanagul\"]', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1750960015/movie_posters/te6rcmg5l60qhkgsno3x.jpg', 'https://www.youtube.com/watch?v=Rd9t4AUNEm0&t=1s', 8.0, 0, 'early_showing'),
(9, 'Doraemon: Nobita Và Cuộc Phiêu Lưu Vào Thế Giới Trong Tranh', 'Thông qua món bảo bối mới của Doraemon, cả nhóm bạn bước thế giới trong một bức tranh nổi tiếng và bắt gặp cô bạn bí ẩn tên Claire. Với lời mời của Claire, cả nhóm cùng đến thăm vương quốc Artoria, nơi ẩn giấu một viên ngọc quý mang tên Artoria Blue đang ngủ yên. Trên hành trình tìm kiếm viên ngọc, nhóm bạn Doraemon phát hiện một truyền thuyết về sự hủy diệt của thế giới, mà truyền thuyết đó dường như đang sống dậy! Liệu cả nhóm có thể phá hủy lời nguyền này và bảo vệ cả thế giới?', 105, '2025-05-22', '2025-08-22', 'Hoạt hình, Phiêu lưu', 'Yukiyo Teramoto', '[\"Wasabi Mizuta\",\"Megumi Ôhara\",\"Yumi Kakazu\",\"Subaru Kimura\",\"Tomokazu Seki\",\"...\"]', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1750962201/movie_posters/whqdss5ji27smgt4ygkq.jpg', 'https://www.youtube.com/watch?v=6np5tTt-wH8', 9.0, 0, 'showing'),
(10, 'Điều Ước Cuối Cùng', 'Biết mình không còn sống được bao lâu vì căn bệnh ALS, Hoàng tâm sự với hai người bạn thân – Thy và Long – về tâm nguyện cuối cùng: được “mất zin” trước khi chết. Hành trình giúp Hoàng thực hiện điều ước ấy đưa họ qua những tình huống dở khóc dở cười, đồng thời thử thách tình bạn, tình thân và ý nghĩa của tình yêu thương vô điều kiện.', 114, '2025-07-03', '2025-08-03', 'Gia đình, Hài hước', 'Đoàn Sĩ Nguyên', '[\"Avin Lu\",\"Lý Hạo Mạnh Quỳnh\",\"Hoàng Hà\",\"Tiến Luật\",\"Đinh Y Nhung\",\"Quốc Cường\",\"Kiều Anh\",\"Katleen Phan Võ\",\"Hoàng Minh Triết\",\"..\"]', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1750962348/movie_posters/k8vtwcqfirnqxrtt1alq.jpg', 'https://www.youtube.com/watch?v=oXK8jW9Hi3M&t=2s', 5.5, 0, 'hidden'),
(11, 'F1', 'Sonny Hayes (Brad Pitt) được mệnh danh là \"Huyền thoại chưa từng được gọi tên\" là ngôi sao sáng giá nhất của FORMULA 1 trong những năm 1990 cho đến khi một vụ tai nạn trên đường đua suýt nữa đã kết thúc sự nghiệp của anh.. Ba mươi năm sau, Sonny trở thành một tay đua tự do, cho đến khi người đồng đội cũ của anh, Ruben Cervantes (Javier Bardem), chủ sở hữu một đội đua F1 đang trên bờ vực sụp đổ, tìm đến anh. Ruben thuyết phục Sonny quay lại với F1® để có một cơ hội cuối cùng cứu lấy đội và khẳng định mình là tay đua xuất sắc nhất thế giới. Anh sẽ thi đấu cùng Joshua Pearce (Damson Idris), tay đua tân binh đầy tham vọng của đội, người luôn muốn tạo ra tốc độ của riêng mình. Tuy nhiên, khi động cơ gầm rú, quá khứ của Sonny sẽ đuổi theo anh và anh nhận ra rằng trong F1, người đồng đội chính là đối thủ cạnh tranh lớn nhất—và con đường chuộc lại lỗi lầm không phải là điều có thể đi một mình.', 156, '2025-06-27', '2025-08-27', 'Hành động, Hồi Hộp', 'Joseph Kosinski', '\"[\\\"Brad Pitt\\\",\\\"Simone Ashley\\\",\\\"Javier Bardem\\\",\\\"...\\\"]\"', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1750962483/movie_posters/u3p3rcfmwpuapfsmanuw.jpg', 'https://www.youtube.com/watch?v=fwZeRHJQ1ec&t=1s', 10.0, 0, 'early_showing'),
(12, 'Superman', 'Bộ phim kể về một người hùng đã bắt đầu sự nghiệp anh hùng của mình một thời gian. Nhưng giờ đây, anh đang mất phương hướng. Giữa một thế giới coi những gì anh đại diện đã lỗi thời, Superman, người luôn phải vật lộn với di sản Krypton và những giá trị con người đã nuôi dưỡng anh, bắt đầu nghi ngờ ý nghĩa sự tồn tại của mình giữa loài người.', 130, '2025-07-11', '2025-08-11', 'Khoa học, viễn tưởng', 'James Gunn', '\"[\\\"David Corenswet\\\",\\\"Rachel Brosnahan\\\",\\\"Nicholas Hoult\\\"]\"', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1752245420/movie_posters/wyse83ipbvpklawytfs7.png', 'https://www.youtube.com/watch?time_continue=1&v=YzSiSC8TrBQ&embeds_referring_euri=https%3A%2F%2Fwww.betacinemas.vn%2F&source_ve_path=MjM4NTE', 7.8, 0, 'coming_soon'),
(13, 'Ma Xưởng Mía', 'Để trang trải nợ nần, Endah cùng nhóm bạn thân phải đến làm việc thời vụ tại một nhà máy sản xuất đường mía ở vùng Java hẻo lánh. Tất cả những người công nhân làm việc ở đây đều phải tuân theo quy định giờ giới nghiêm, không được tự do ra ngoài vào ban đêm và luôn có bảo vệ canh giữ. Trong một đêm lẻn ra ngoài, Endah vô tình chứng kiến nghi lễ kỳ lạ làm trỗi dậy loài quỷ dữ. Kể từ đó, những sự kiện rùng rợn liên tiếp xảy ra trong xưởng mía khiến ai cũng có thể trở thành vật tế tiếp theo. Để giữ được mạng sống, Endah và nhóm bạn buộc phải khám phá bí mật đen tối ẩn sâu bên trong xưởng mía và bước vào trận chiến với thế lực vô hình có sức mạnh vô biên.', 121, '2025-07-10', '2025-08-10', 'Kinh dị', 'Awi Suryadi', '[\"Arbani Yasiz\",\"Ersya Aurelia\",\"Erika Carlina\"]', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1752245529/movie_posters/i9h0bokxyt9gnbgqmdgy.jpg', 'https://www.youtube.com/watch?v=lo0X86UxPNY&embeds_referring_euri=https%3A%2F%2Fwww.betacinemas.vn%2F&source_ve_path=MjM4NTE', 8.0, 0, 'early_showing'),
(14, ' Thế Giới Khủng Long: Tái Sinh', 'Thế Giới Khủng Long: Tái Sinh lấy bối cảnh 5 năm sau phần phim Thế Giới Khủng Long: Lãnh Địa, môi trường Trái đất đã chứng tỏ phần lớn là không phù hợp với khủng long. Nhiều loài thằn lằn tiền sử được tái sinh đã chết. Những con chưa chết đã rút lui đến một vùng nhiệt đới hẻo lánh gần phòng thí nghiệm. Địa điểm đó chính là nơi bộ ba Scarlett Johansson, Mahershala Ali và Jonathan Bailey dấn thân vào một nhiệm vụ cực kỳ hiểm nguy.', 134, '2025-07-10', '2025-08-09', 'Hành động, Phiêu lưu', 'Gareth Edwards', '[\"Scarlett Johansson\",\"Mahershala Ali\",\"Jonathan Baile\"]', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1752245686/movie_posters/df8ayumagbloap1upjqn.jpg', 'https://www.youtube.com/watch?v=Pf6V-7GvdUQ', 9.0, 0, 'showing'),
(15, 'Wolfoo Và Cuộc Đua Tam Giới', 'Trong khi đang bế tắc với mối quan hệ cha con phức tạp, Wolfoo và cha vô tình tham gia “Cuộc đua Tam giới”, một cuộc thi không tưởng mà trong đó họ phải vượt qua thử thách và đối đầu với một vị lãnh chúa để bảo vệ gia đình và bạn bè, đồng thời khám phá ra giá trị của tình cha con', 100, '2025-07-10', '2025-08-30', 'Phiêu lưu, hài hước', 'Thơ Phan', NULL, 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1752245796/movie_posters/b27jhmg2z7hfckf4fbee.png', 'https://www.youtube.com/watch?v=vGSREJIr2A4&embeds_referring_euri=https%3A%2F%2Fwww.betacinemas.vn%2F&source_ve_path=MjM4NTE', 5.0, 0, 'hidden'),
(16, 'Con Nít Quỷ', 'Hai mươi năm sau thảm kịch Jatijajar, ác quỷ Ummu Sibyan một lần nữa trỗi dậy, lần này gieo rắc nỗi kinh hoàng tại làng Giritirto. Sau một trận bóng đá, tám đứa trẻ thua cuộc buông lời nguyền rủa trong cơn giận dữ. Không ai ngờ, chính lời nói vu vơ ấy đã đánh thức một thế lực tà ác bị chôn vùi từ quá khứ. Khi bóng đêm phủ xuống rừng sâu, một đứa trẻ mất tích bí ẩn. Từ đó, cuộc săn đuổi bắt đầu—điên loạn, nghẹt thở và không lối thoát.\r\n\r\n', 105, '2025-07-17', '2025-08-30', 'Kinh dị', 'Sidharta Tata', '[\"Khalid Kashogi\",\"Bayu Kurnia Prasetya\",\"Sidharta Tata\"]', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1752245918/movie_posters/ewf0l4aztwwv2igm7qqj.jpg', 'https://www.youtube.com/watch?v=lo0X86UxPNY', 9.0, 0, 'showing'),
(17, 'Thám Tử Lừng Danh Conan: Dư Ảnh Của Độc Nhãn', 'Một vụ tấn công bí ẩn tại đài quan sát Nobeyama kéo Conan và các thám tử vào cuộc điều tra rùng rợn giữa núi tuyết. Thanh tra Yamato Kansuke buộc phải đối mặt với quá khứ đau thương từ vụ tuyết lở nhiều năm trước. Càng điều tra, những mối liên hệ mờ ám giữa các nhân vật từ Tokyo đến Nagano dần hiện rõ, trong đó ký ức của Kansuke chính là mảnh ghép quyết định sự thật.', 110, '2025-07-11', '2025-08-24', 'Trinh thám, Hoạt hình', 'Katsuya Shigehara', '\"[\\\"Show Hayami\\\",\\\"Megumi Hayashibara\\\",\\\"Hiroaki Hirata\\\"]\"', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1752246012/movie_posters/moldb16vxkzfj2awg2am.png', 'https://www.youtube.com/watch?time_continue=3&v=inTZg3mK1O4&embeds_referring_euri=https%3A%2F%2Fwww.betacinemas.vn%2F&source_ve_path=MjM4NTE', 10.0, 0, 'coming_soon'),
(18, 'Thanh Gươm Diệt Quỷ: Vô Hạn Thành', 'Khi các thành viên của Sát Quỷ Đoàn và Trụ Cột tham gia vào chương trình đặc huấn để chuẩn bị cho trận chiến sắp với lũ quỷ, Kibutsuji Muzan xuất hiện tại Dinh thự Ubuyashiki. Khi thủ lĩnh của Sát Quỷ Đoàn gặp nguy hiểm, Tanjiro và các Trụ Cột trở về trụ sở Thế nhưng, Muzan bất ngờ kéo toàn bộ Sát Quỷ Đoàn đến hang ổ cuối cùng của lũ quỷ là Vô Hạn Thành, mở màn cho trận đánh cuối cùng của cả hai phe.', 150, '2025-07-15', '2025-08-30', 'Hành động, Hoạt hình', 'Haruo Sotozaki', '\"[\\\"Natsuki Hanae\\\",\\\"Saori Hayami\\\",\\\"Yoshitsugu Matsuoka\\\"]\"', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1752251003/movie_posters/prcwyuvudlzltxop8sxn.jpg', 'https://www.youtube.com/watch?v=rf0hW__Skow', 8.0, 0, 'coming_soon'),
(19, 'Toàn Trí Độc Giả', 'Khi thế giới diệt vong trong cuốn tiểu thuyết yêu thích bỗng biến thành hiện thực, Kim Dokja (Ahn Hyo-seop) - 1 nhân viên văn phòng bình thường cũng là người duy nhất biết được kết truyện phải bắt tay vào cuộc hành trình đến phân cảnh cuối cùng. Cùng những đồng đội ngẫu nhiên và người hùng Yu Jeong-hyeok (Lee Min-ho) tập hợp thành 1 nhóm, Kim Dokja cần vượt qua mọi thử thách để sống sót trong thế giới bộ truyện mà anh yêu thích.', 100, '2025-07-10', '2025-07-30', 'Hành động', 'KIM Byung-woo', '[\"LEE Min-ho\",\"AHN Hyo-seop\",\"KIM Jisoo\",\"CHAE Soo-bin\",\"Nana\",\"SHIN Seung-ho.\"]', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1752252745/movie_posters/rw4jkomck6ohtjabvwg0.jpg', 'https://www.youtube.com/watch?v=ZFx83vfbe8A', 9.0, 0, 'hidden');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `seats`
--

CREATE TABLE `seats` (
  `seat_id` int(11) NOT NULL,
  `hall_id` int(11) NOT NULL,
  `seat_row` char(1) NOT NULL,
  `seat_number` tinyint(3) UNSIGNED NOT NULL,
  `seat_type` enum('standard','vip','couple') DEFAULT 'standard'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `seats`
--

INSERT INTO `seats` (`seat_id`, `hall_id`, `seat_row`, `seat_number`, `seat_type`) VALUES
(3, 7, 'A', 1, 'standard'),
(5, 7, 'A', 2, 'standard'),
(6, 7, 'A', 3, 'standard'),
(7, 7, 'A', 4, 'standard'),
(8, 7, 'A', 5, 'standard'),
(9, 7, 'A', 6, 'standard'),
(10, 7, 'A', 7, 'standard'),
(11, 7, 'A', 8, 'standard'),
(12, 7, 'A', 9, 'standard'),
(13, 7, 'B', 1, 'standard'),
(14, 7, 'B', 2, 'standard'),
(15, 7, 'B', 3, 'standard'),
(16, 7, 'B', 4, 'standard'),
(17, 7, 'B', 5, 'standard'),
(18, 7, 'B', 6, 'standard'),
(19, 7, 'B', 7, 'standard'),
(20, 7, 'B', 8, 'standard'),
(21, 7, 'B', 9, 'standard'),
(22, 7, 'C', 1, 'standard'),
(23, 7, 'C', 2, 'standard'),
(24, 7, 'C', 3, 'standard'),
(25, 7, 'C', 4, 'standard'),
(26, 7, 'C', 5, 'standard'),
(27, 7, 'C', 6, 'standard'),
(28, 7, 'C', 7, 'standard'),
(29, 7, 'C', 8, 'standard'),
(30, 7, 'C', 9, 'standard'),
(31, 7, 'D', 1, 'standard'),
(32, 7, 'D', 2, 'standard'),
(33, 7, 'D', 3, 'standard'),
(34, 7, 'D', 4, 'standard'),
(35, 7, 'D', 5, 'standard'),
(36, 7, 'D', 6, 'standard'),
(37, 7, 'D', 7, 'standard'),
(38, 7, 'D', 8, 'standard'),
(39, 7, 'D', 9, 'standard'),
(40, 7, 'E', 1, 'standard'),
(41, 7, 'E', 2, 'standard'),
(42, 7, 'E', 3, 'standard'),
(43, 7, 'E', 4, 'standard'),
(44, 7, 'E', 5, 'standard'),
(45, 7, 'E', 6, 'standard'),
(46, 7, 'E', 7, 'standard'),
(47, 7, 'E', 8, 'standard'),
(48, 7, 'E', 9, 'standard'),
(49, 7, 'F', 1, 'standard'),
(50, 7, 'F', 2, 'standard'),
(51, 7, 'F', 3, 'standard'),
(52, 7, 'F', 4, 'standard'),
(53, 7, 'F', 5, 'standard'),
(54, 7, 'F', 6, 'standard'),
(55, 7, 'F', 7, 'standard'),
(56, 7, 'F', 8, 'standard'),
(57, 7, 'F', 9, 'standard'),
(58, 7, 'G', 1, 'standard'),
(59, 7, 'G', 2, 'standard'),
(60, 7, 'G', 3, 'standard'),
(61, 7, 'G', 4, 'standard'),
(62, 7, 'G', 5, 'standard'),
(63, 7, 'G', 6, 'standard'),
(64, 7, 'G', 7, 'standard'),
(65, 7, 'G', 8, 'standard'),
(66, 7, 'G', 9, 'standard'),
(67, 7, 'H', 1, 'vip'),
(68, 7, 'H', 2, 'vip'),
(69, 7, 'H', 3, 'vip'),
(70, 7, 'H', 4, 'vip'),
(71, 7, 'H', 5, 'vip'),
(72, 7, 'I', 1, 'couple'),
(73, 7, 'I', 2, 'couple'),
(74, 7, 'I', 3, 'couple'),
(149, 3, 'A', 1, 'standard'),
(150, 3, 'A', 2, 'standard'),
(151, 3, 'A', 3, 'standard'),
(152, 3, 'A', 4, 'standard'),
(153, 3, 'A', 5, 'standard'),
(154, 3, 'A', 6, 'standard'),
(155, 3, 'A', 7, 'standard'),
(156, 3, 'A', 8, 'standard'),
(157, 3, 'A', 9, 'standard'),
(158, 3, 'B', 1, 'standard'),
(159, 3, 'B', 2, 'standard'),
(160, 3, 'B', 3, 'standard'),
(161, 3, 'B', 4, 'standard'),
(162, 3, 'B', 5, 'standard'),
(163, 3, 'B', 6, 'standard'),
(164, 3, 'B', 7, 'standard'),
(165, 3, 'B', 8, 'standard'),
(166, 3, 'B', 9, 'standard'),
(167, 3, 'C', 1, 'standard'),
(168, 3, 'C', 2, 'standard'),
(169, 3, 'C', 3, 'standard'),
(170, 3, 'C', 4, 'standard'),
(171, 3, 'C', 5, 'standard'),
(172, 3, 'C', 6, 'standard'),
(173, 3, 'C', 7, 'standard'),
(174, 3, 'C', 8, 'standard'),
(175, 3, 'C', 9, 'standard'),
(176, 3, 'D', 1, 'standard'),
(177, 3, 'D', 2, 'standard'),
(178, 3, 'D', 3, 'standard'),
(179, 3, 'D', 4, 'standard'),
(180, 3, 'D', 5, 'standard'),
(181, 3, 'D', 6, 'standard'),
(182, 3, 'D', 7, 'standard'),
(183, 3, 'D', 8, 'standard'),
(184, 3, 'D', 9, 'standard'),
(185, 3, 'E', 1, 'standard'),
(186, 3, 'E', 2, 'standard'),
(187, 3, 'E', 3, 'standard'),
(188, 3, 'E', 4, 'standard'),
(189, 3, 'E', 5, 'standard'),
(190, 3, 'E', 6, 'standard'),
(191, 3, 'E', 7, 'standard'),
(192, 3, 'E', 8, 'standard'),
(193, 3, 'E', 9, 'standard'),
(194, 3, 'F', 1, 'standard'),
(195, 3, 'F', 2, 'standard'),
(196, 3, 'F', 3, 'standard'),
(197, 3, 'F', 4, 'standard'),
(198, 3, 'F', 5, 'standard'),
(199, 3, 'F', 6, 'standard'),
(200, 3, 'F', 7, 'standard'),
(201, 3, 'F', 8, 'standard'),
(202, 3, 'F', 9, 'standard'),
(203, 3, 'G', 1, 'standard'),
(204, 3, 'G', 2, 'standard'),
(205, 3, 'G', 3, 'standard'),
(206, 3, 'G', 4, 'standard'),
(207, 3, 'G', 5, 'standard'),
(208, 3, 'G', 6, 'standard'),
(209, 3, 'G', 7, 'standard'),
(210, 3, 'G', 8, 'standard'),
(211, 3, 'G', 9, 'standard'),
(212, 3, 'H', 1, 'vip'),
(213, 3, 'H', 2, 'vip'),
(214, 3, 'H', 3, 'vip'),
(215, 3, 'H', 4, 'vip'),
(216, 3, 'H', 5, 'vip'),
(217, 3, 'H', 6, 'vip'),
(218, 3, 'I', 1, 'couple'),
(219, 3, 'I', 2, 'couple'),
(220, 3, 'I', 3, 'couple'),
(221, 3, 'I', 4, 'couple'),
(222, 3, 'I', 5, 'couple'),
(297, 8, 'A', 1, 'standard'),
(298, 8, 'A', 2, 'standard'),
(299, 8, 'A', 3, 'standard'),
(300, 8, 'A', 4, 'standard'),
(301, 8, 'A', 5, 'standard'),
(302, 8, 'A', 6, 'standard'),
(303, 8, 'A', 7, 'standard'),
(304, 8, 'A', 8, 'standard'),
(305, 8, 'A', 9, 'standard'),
(306, 8, 'B', 1, 'standard'),
(307, 8, 'B', 2, 'standard'),
(308, 8, 'B', 3, 'standard'),
(309, 8, 'B', 4, 'standard'),
(310, 8, 'B', 5, 'standard'),
(311, 8, 'B', 6, 'standard'),
(312, 8, 'B', 7, 'standard'),
(313, 8, 'B', 8, 'standard'),
(314, 8, 'B', 9, 'standard'),
(315, 8, 'C', 1, 'standard'),
(316, 8, 'C', 2, 'standard'),
(317, 8, 'C', 3, 'standard'),
(318, 8, 'C', 4, 'standard'),
(319, 8, 'C', 5, 'standard'),
(320, 8, 'C', 6, 'standard'),
(321, 8, 'C', 7, 'standard'),
(322, 8, 'C', 8, 'standard'),
(323, 8, 'C', 9, 'standard'),
(324, 8, 'D', 1, 'standard'),
(325, 8, 'D', 2, 'standard'),
(326, 8, 'D', 3, 'standard'),
(327, 8, 'D', 4, 'standard'),
(328, 8, 'D', 5, 'standard'),
(329, 8, 'D', 6, 'standard'),
(330, 8, 'D', 7, 'standard'),
(331, 8, 'D', 8, 'standard'),
(332, 8, 'D', 9, 'standard'),
(333, 8, 'E', 1, 'standard'),
(334, 8, 'E', 2, 'standard'),
(335, 8, 'E', 3, 'standard'),
(336, 8, 'E', 4, 'standard'),
(337, 8, 'E', 5, 'standard'),
(338, 8, 'E', 6, 'standard'),
(339, 8, 'E', 7, 'standard'),
(340, 8, 'E', 8, 'standard'),
(341, 8, 'E', 9, 'standard'),
(342, 8, 'F', 1, 'standard'),
(343, 8, 'F', 2, 'standard'),
(344, 8, 'F', 3, 'standard'),
(345, 8, 'F', 4, 'standard'),
(346, 8, 'F', 5, 'standard'),
(347, 8, 'F', 6, 'standard'),
(348, 8, 'F', 7, 'standard'),
(349, 8, 'F', 8, 'standard'),
(350, 8, 'F', 9, 'standard'),
(351, 8, 'G', 1, 'standard'),
(352, 8, 'G', 2, 'standard'),
(353, 8, 'G', 3, 'standard'),
(354, 8, 'G', 4, 'standard'),
(355, 8, 'G', 5, 'standard'),
(356, 8, 'G', 6, 'standard'),
(357, 8, 'G', 7, 'standard'),
(358, 8, 'G', 8, 'standard'),
(359, 8, 'G', 9, 'standard'),
(360, 8, 'H', 1, 'vip'),
(361, 8, 'H', 2, 'vip'),
(362, 8, 'H', 3, 'vip'),
(363, 8, 'H', 4, 'vip'),
(364, 8, 'H', 5, 'vip'),
(365, 8, 'H', 6, 'vip'),
(366, 8, 'I', 1, 'couple'),
(367, 8, 'I', 2, 'couple'),
(368, 8, 'I', 3, 'couple'),
(369, 8, 'I', 4, 'couple'),
(370, 8, 'I', 5, 'couple'),
(371, 9, 'A', 1, 'standard'),
(372, 9, 'A', 2, 'standard'),
(373, 9, 'A', 3, 'standard'),
(374, 9, 'A', 4, 'standard'),
(375, 9, 'A', 5, 'standard'),
(376, 9, 'A', 6, 'standard'),
(377, 9, 'A', 7, 'standard'),
(378, 9, 'A', 8, 'standard'),
(379, 9, 'A', 9, 'standard'),
(380, 9, 'B', 1, 'standard'),
(381, 9, 'B', 2, 'standard'),
(382, 9, 'B', 3, 'standard'),
(383, 9, 'B', 4, 'standard'),
(384, 9, 'B', 5, 'standard'),
(385, 9, 'B', 6, 'standard'),
(386, 9, 'B', 7, 'standard'),
(387, 9, 'B', 8, 'standard'),
(388, 9, 'B', 9, 'standard'),
(389, 9, 'C', 1, 'standard'),
(390, 9, 'C', 2, 'standard'),
(391, 9, 'C', 3, 'standard'),
(392, 9, 'C', 4, 'standard'),
(393, 9, 'C', 5, 'standard'),
(394, 9, 'C', 6, 'standard'),
(395, 9, 'C', 7, 'standard'),
(396, 9, 'C', 8, 'standard'),
(397, 9, 'C', 9, 'standard'),
(398, 9, 'D', 1, 'standard'),
(399, 9, 'D', 2, 'standard'),
(400, 9, 'D', 3, 'standard'),
(401, 9, 'D', 4, 'standard'),
(402, 9, 'D', 5, 'standard'),
(403, 9, 'D', 6, 'standard'),
(404, 9, 'D', 7, 'standard'),
(405, 9, 'D', 8, 'standard'),
(406, 9, 'D', 9, 'standard'),
(407, 9, 'E', 1, 'standard'),
(408, 9, 'E', 2, 'standard'),
(409, 9, 'E', 3, 'standard'),
(410, 9, 'E', 4, 'standard'),
(411, 9, 'E', 5, 'standard'),
(412, 9, 'E', 6, 'standard'),
(413, 9, 'E', 7, 'standard'),
(414, 9, 'E', 8, 'standard'),
(415, 9, 'E', 9, 'standard'),
(416, 9, 'F', 1, 'standard'),
(417, 9, 'F', 2, 'standard'),
(418, 9, 'F', 3, 'standard'),
(419, 9, 'F', 4, 'standard'),
(420, 9, 'F', 5, 'standard'),
(421, 9, 'F', 6, 'standard'),
(422, 9, 'F', 7, 'standard'),
(423, 9, 'F', 8, 'standard'),
(424, 9, 'F', 9, 'standard'),
(425, 9, 'G', 1, 'standard'),
(426, 9, 'G', 2, 'standard'),
(427, 9, 'G', 3, 'standard'),
(428, 9, 'G', 4, 'standard'),
(429, 9, 'G', 5, 'standard'),
(430, 9, 'G', 6, 'standard'),
(431, 9, 'G', 7, 'standard'),
(432, 9, 'G', 8, 'standard'),
(433, 9, 'G', 9, 'standard'),
(434, 9, 'H', 1, 'vip'),
(435, 9, 'H', 2, 'vip'),
(436, 9, 'H', 3, 'vip'),
(437, 9, 'H', 4, 'vip'),
(438, 9, 'H', 5, 'vip'),
(439, 9, 'H', 6, 'vip'),
(440, 9, 'I', 1, 'couple'),
(441, 9, 'I', 2, 'couple'),
(442, 9, 'I', 3, 'couple'),
(443, 9, 'I', 4, 'couple'),
(444, 9, 'I', 5, 'couple');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `seat_type_prices`
--

CREATE TABLE `seat_type_prices` (
  `seat_type_price_id` int(11) NOT NULL,
  `seat_type` enum('standard','vip','couple') NOT NULL,
  `price` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `seat_type_prices`
--

INSERT INTO `seat_type_prices` (`seat_type_price_id`, `seat_type`, `price`) VALUES
(2, 'vip', 85000.00),
(3, 'couple', 100000.00),
(5, 'standard', 50000.00);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `showtimes`
--

CREATE TABLE `showtimes` (
  `showtime_id` int(11) NOT NULL,
  `movie_id` int(11) NOT NULL,
  `hall_id` int(11) NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `available_seats` int(11) NOT NULL,
  `is_full` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `showtimes`
--

INSERT INTO `showtimes` (`showtime_id`, `movie_id`, `hall_id`, `start_time`, `end_time`, `available_seats`, `is_full`) VALUES
(12, 7, 3, '2025-07-12 09:00:00', '2025-07-12 11:06:00', 115, 0),
(13, 7, 3, '2025-07-12 12:00:00', '2025-07-12 14:06:00', 120, 0),
(14, 7, 8, '2025-07-12 22:00:00', '2025-07-13 00:06:00', 50, 0),
(15, 7, 8, '2025-07-12 11:00:00', '2025-07-12 13:06:00', 50, 0),
(16, 14, 7, '2025-07-12 09:09:00', '2025-07-12 11:23:00', 50, 0),
(17, 14, 7, '2025-07-12 12:08:00', '2025-07-12 14:22:00', 50, 0),
(18, 14, 3, '2025-07-12 16:10:00', '2025-07-12 18:24:00', 120, 0),
(19, 16, 8, '2025-07-12 15:11:00', '2025-07-12 16:56:00', 50, 0),
(20, 9, 9, '2025-07-12 12:11:00', '2025-07-12 13:56:00', 50, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `tickets`
--

CREATE TABLE `tickets` (
  `ticket_id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `seat_id` int(11) NOT NULL,
  `ticket_code` varchar(20) NOT NULL,
  `ticket_type` enum('standard','student','child','senior') DEFAULT 'standard',
  `price` decimal(10,2) NOT NULL,
  `status` enum('active','used','cancelled') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `tickets`
--

INSERT INTO `tickets` (`ticket_id`, `booking_id`, `seat_id`, `ticket_code`, `ticket_type`, `price`, `status`) VALUES
(41, 79, 222, 'TICKET-79-222-48813', '', 100000.00, 'active'),
(42, 79, 221, 'TICKET-79-221-63558', '', 100000.00, 'active'),
(43, 79, 220, 'TICKET-79-220-71354', '', 100000.00, 'active'),
(44, 79, 219, 'TICKET-79-219-66094', '', 100000.00, 'active'),
(45, 79, 218, 'TICKET-79-218-16408', '', 100000.00, 'active');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `transactions`
--

CREATE TABLE `transactions` (
  `transaction_id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','credit_card','momo','zalopay','bank_transfer','paypal') NOT NULL,
  `payment_status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
  `transaction_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `gateway_response` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Phản hồi từ cổng thanh toán' CHECK (json_valid(`gateway_response`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `transactions`
--

INSERT INTO `transactions` (`transaction_id`, `booking_id`, `amount`, `payment_method`, `payment_status`, `transaction_date`, `gateway_response`) VALUES
(15, 79, 740000.00, 'paypal', 'completed', '2025-07-11 17:25:20', '{\"paypal_payment_id\":\"PAYID-NBYUR4I45D58363SG025683J\",\"paypal_payer_id\":\"XF8V28A5RM2SW\",\"state\":\"approved\",\"amount\":\"740000.00\",\"currency\":\"USD\",\"create_time\":\"2025-07-11T17:25:05Z\",\"update_time\":\"2025-07-11T17:25:21Z\"}');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `gender` enum('Nam','Nữ','Khác') DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `identity_card_number` varchar(50) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `address_line` text DEFAULT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `role` enum('customer','admin') NOT NULL DEFAULT 'customer',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_verified` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`user_id`, `username`, `email`, `password_hash`, `full_name`, `gender`, `date_of_birth`, `phone_number`, `identity_card_number`, `city`, `district`, `address_line`, `avatar_url`, `role`, `created_at`, `is_verified`) VALUES
(3, 'customer3', 'customer3@example.com', '$2b$10$HqUmG8tfMMbUwmBji136OOwYYyM5p7dAUfBu3XuEvlgGt8/zk9zPi', 'John Doe', NULL, NULL, '0123456799', NULL, NULL, NULL, NULL, NULL, 'customer', '2025-06-15 16:38:54', 0),
(4, 'longsex', 'customer5@example.com', '$2b$10$cuKM2rAz7KYqGXTh9xVb5.kdF/FbmEuNryvLiiEm1foK39U5BmP.e', 'John Doe', NULL, NULL, '0123456799', NULL, NULL, NULL, NULL, NULL, 'customer', '2025-06-15 17:05:07', 0),
(5, 'user_test_01', 'tuansapa615@gmail.com', '$2b$10$V6GBCebiveEUTFxrhUYaG.L4ciWy42GUf3PdVnUW6US7S9syuIO4C', 'an', 'Nam', '1999-12-27', '0987654321', '0102040005444', 'lao cai', 'qqqq', 'aaaaaaaaaaaaaaaaaaaaaaa', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1752254192/avatars/sjwmj4la3dpgqfqr95o6.jpg', 'customer', '2025-06-17 21:58:37', 1),
(6, 'an.dh.2194', 'an.dh.2194@aptechlearning.edu.vn', '$2b$10$DyId7N5IAR8bUy148UNJYOKFJDIoJVfvJyqGZSz10s7/b8UQsBlQ6', 'Đỗ Hoàng An', NULL, NULL, '0123123123', NULL, NULL, NULL, NULL, 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1752242700/avatars/r4fvvx6io9in6lzy5jmb.png', 'admin', '2025-06-18 06:59:43', 1),
(7, 'minh.tn.2206', 'minh.tn.2206@aptechlearning.edu.vn', '$2b$10$A2.18X.Q2NK3lSWIu6aUA.nFRn4C8eEwe4k7oscmjpAzScFijL.0S', 'To Nhat Minh', NULL, NULL, '12326421574', NULL, NULL, NULL, NULL, NULL, 'customer', '2025-06-18 18:17:03', 1),
(9, 'tuantaitinh08', 'tuantaitinh08@gmail.com', '$2b$10$Y9RReb8s9ln7LKjGw.RWCOpM/yHJmGeaQnQvEFzlk.b9uM49xgKBu', 'Tran Anh Tuan aaa', 'Nam', '1999-12-31', '0328399501', '010204000548', 'Lao Cai', 'Sa PA', 'qazplm12', 'https://res.cloudinary.com/dz5ahjppm/image/upload/v1751760594/avatars/qtc1diciov8n2scuxrfe.jpg', 'customer', '2025-07-05 23:52:36', 1);

-- --------------------------------------------------------

--
-- Cấu trúc đóng vai cho view `v_booking_details`
-- (See below for the actual view)
--
CREATE TABLE `v_booking_details` (
`booking_id` int(11)
,`booking_date` timestamp
,`total_amount` decimal(10,2)
,`booking_status` enum('pending','confirmed','cancelled','completed')
,`movie_title` varchar(100)
,`cinema_name` varchar(100)
,`hall_name` varchar(50)
,`show_start_time` datetime
,`username` varchar(50)
,`email` varchar(100)
,`full_name` varchar(100)
,`total_seats` bigint(21)
,`seat_numbers` mediumtext
);

-- --------------------------------------------------------

--
-- Cấu trúc đóng vai cho view `v_movie_stats`
-- (See below for the actual view)
--
CREATE TABLE `v_movie_stats` (
`movie_id` int(11)
,`title` varchar(100)
,`genre` varchar(50)
,`release_date` date
,`total_bookings` bigint(21)
,`total_revenue` decimal(32,2)
,`avg_occupancy_rate` decimal(21,8)
);

-- --------------------------------------------------------

--
-- Cấu trúc đóng vai cho view `v_showtime_details`
-- (See below for the actual view)
--
CREATE TABLE `v_showtime_details` (
`showtime_id` int(11)
,`start_time` datetime
,`end_time` datetime
,`available_seats` int(11)
,`is_full` tinyint(1)
,`movie_title` varchar(100)
,`duration_minutes` smallint(5) unsigned
,`movie_rating` decimal(3,1) unsigned
,`poster_url` varchar(255)
,`cinema_name` varchar(100)
,`cinema_city` varchar(50)
,`cinema_address` text
,`hall_name` varchar(50)
,`hall_capacity` smallint(5) unsigned
,`screen_type` enum('2D','3D','IMAX','4DX')
);

-- --------------------------------------------------------

--
-- Cấu trúc cho view `v_booking_details`
--
DROP TABLE IF EXISTS `v_booking_details`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_booking_details`  AS SELECT `b`.`booking_id` AS `booking_id`, `b`.`booking_date` AS `booking_date`, `b`.`total_amount` AS `total_amount`, `b`.`status` AS `booking_status`, `b`.`movie_title` AS `movie_title`, `b`.`cinema_name` AS `cinema_name`, `b`.`hall_name` AS `hall_name`, `b`.`show_start_time` AS `show_start_time`, `u`.`username` AS `username`, `u`.`email` AS `email`, `u`.`full_name` AS `full_name`, count(`bs`.`seat_id`) AS `total_seats`, group_concat(concat(`se`.`seat_row`,`se`.`seat_number`) order by `se`.`seat_row` ASC,`se`.`seat_number` ASC separator ',') AS `seat_numbers` FROM (((`bookings` `b` join `users` `u` on(`b`.`user_id` = `u`.`user_id`)) left join `booking_seats` `bs` on(`b`.`booking_id` = `bs`.`booking_id`)) left join `seats` `se` on(`bs`.`seat_id` = `se`.`seat_id`)) GROUP BY `b`.`booking_id` ;

-- --------------------------------------------------------

--
-- Cấu trúc cho view `v_movie_stats`
--
DROP TABLE IF EXISTS `v_movie_stats`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_movie_stats`  AS SELECT `m`.`movie_id` AS `movie_id`, `m`.`title` AS `title`, `m`.`genre` AS `genre`, `m`.`release_date` AS `release_date`, count(distinct `b`.`booking_id`) AS `total_bookings`, sum(`b`.`total_amount`) AS `total_revenue`, avg(`s`.`available_seats` / `h`.`capacity` * 100) AS `avg_occupancy_rate` FROM (((`movies` `m` left join `showtimes` `s` on(`m`.`movie_id` = `s`.`movie_id`)) left join `bookings` `b` on(`s`.`showtime_id` = `b`.`showtime_id` and `b`.`status` = 'confirmed')) left join `halls` `h` on(`s`.`hall_id` = `h`.`hall_id`)) GROUP BY `m`.`movie_id` ;

-- --------------------------------------------------------

--
-- Cấu trúc cho view `v_showtime_details`
--
DROP TABLE IF EXISTS `v_showtime_details`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_showtime_details`  AS SELECT `s`.`showtime_id` AS `showtime_id`, `s`.`start_time` AS `start_time`, `s`.`end_time` AS `end_time`, `s`.`available_seats` AS `available_seats`, `s`.`is_full` AS `is_full`, `m`.`title` AS `movie_title`, `m`.`duration_minutes` AS `duration_minutes`, `m`.`rating` AS `movie_rating`, `m`.`poster_url` AS `poster_url`, `c`.`name` AS `cinema_name`, `c`.`city` AS `cinema_city`, `c`.`address` AS `cinema_address`, `h`.`name` AS `hall_name`, `h`.`capacity` AS `hall_capacity`, `h`.`screen_type` AS `screen_type` FROM (((`showtimes` `s` join `movies` `m` on(`s`.`movie_id` = `m`.`movie_id`)) join `halls` `h` on(`s`.`hall_id` = `h`.`hall_id`)) join `cinemas` `c` on(`h`.`cinema_id` = `c`.`cinema_id`)) WHERE `m`.`display_status` = 'showing' ;

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `banners`
--
ALTER TABLE `banners`
  ADD PRIMARY KEY (`banner_id`);

--
-- Chỉ mục cho bảng `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`booking_id`),
  ADD KEY `idx_bookings_status_date` (`status`,`booking_date`),
  ADD KEY `idx_bookings_user_status` (`user_id`,`status`),
  ADD KEY `idx_bookings_showtime_status` (`showtime_id`,`status`);

--
-- Chỉ mục cho bảng `booking_seats`
--
ALTER TABLE `booking_seats`
  ADD PRIMARY KEY (`booking_seat_id`),
  ADD KEY `idx_booking_seats_booking` (`booking_id`),
  ADD KEY `idx_booking_seats_seat` (`seat_id`);

--
-- Chỉ mục cho bảng `cinemas`
--
ALTER TABLE `cinemas`
  ADD PRIMARY KEY (`cinema_id`),
  ADD KEY `idx_cinemas_city` (`city`);

--
-- Chỉ mục cho bảng `food_items`
--
ALTER TABLE `food_items`
  ADD PRIMARY KEY (`item_id`),
  ADD KEY `idx_food_category` (`category_name`),
  ADD KEY `idx_food_available` (`is_available`);

--
-- Chỉ mục cho bảng `halls`
--
ALTER TABLE `halls`
  ADD PRIMARY KEY (`hall_id`),
  ADD KEY `cinema_id` (`cinema_id`);

--
-- Chỉ mục cho bảng `movies`
--
ALTER TABLE `movies`
  ADD PRIMARY KEY (`movie_id`),
  ADD KEY `idx_movies_status_date` (`display_status`,`release_date`);
ALTER TABLE `movies` ADD FULLTEXT KEY `ft_movies_search` (`title`,`description`);
ALTER TABLE `movies` ADD FULLTEXT KEY `ft_movies_cast` (`cast`);

--
-- Chỉ mục cho bảng `seats`
--
ALTER TABLE `seats`
  ADD PRIMARY KEY (`seat_id`),
  ADD UNIQUE KEY `hall_seat_unique` (`hall_id`,`seat_row`,`seat_number`),
  ADD KEY `idx_seats_hall_type` (`hall_id`,`seat_type`),
  ADD KEY `idx_seats_position` (`hall_id`,`seat_row`,`seat_number`);

--
-- Chỉ mục cho bảng `seat_type_prices`
--
ALTER TABLE `seat_type_prices`
  ADD PRIMARY KEY (`seat_type_price_id`),
  ADD UNIQUE KEY `uq_seat_type` (`seat_type`);

--
-- Chỉ mục cho bảng `showtimes`
--
ALTER TABLE `showtimes`
  ADD PRIMARY KEY (`showtime_id`),
  ADD KEY `hall_id` (`hall_id`),
  ADD KEY `idx_showtimes_datetime` (`start_time`,`end_time`),
  ADD KEY `idx_showtimes_movie_hall` (`movie_id`,`hall_id`),
  ADD KEY `idx_showtimes_available` (`available_seats`,`is_full`);

--
-- Chỉ mục cho bảng `tickets`
--
ALTER TABLE `tickets`
  ADD PRIMARY KEY (`ticket_id`),
  ADD UNIQUE KEY `ticket_code` (`ticket_code`),
  ADD KEY `seat_id` (`seat_id`),
  ADD KEY `idx_tickets_booking` (`booking_id`),
  ADD KEY `idx_tickets_status` (`status`),
  ADD KEY `idx_tickets_code` (`ticket_code`);

--
-- Chỉ mục cho bảng `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`transaction_id`),
  ADD KEY `idx_transactions_booking` (`booking_id`),
  ADD KEY `idx_transactions_status_date` (`payment_status`,`transaction_date`);

--
-- Chỉ mục cho bảng `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `identity_card_number` (`identity_card_number`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `banners`
--
ALTER TABLE `banners`
  MODIFY `banner_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `bookings`
--
ALTER TABLE `bookings`
  MODIFY `booking_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=80;

--
-- AUTO_INCREMENT cho bảng `booking_seats`
--
ALTER TABLE `booking_seats`
  MODIFY `booking_seat_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=136;

--
-- AUTO_INCREMENT cho bảng `cinemas`
--
ALTER TABLE `cinemas`
  MODIFY `cinema_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT cho bảng `food_items`
--
ALTER TABLE `food_items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `halls`
--
ALTER TABLE `halls`
  MODIFY `hall_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT cho bảng `movies`
--
ALTER TABLE `movies`
  MODIFY `movie_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT cho bảng `seats`
--
ALTER TABLE `seats`
  MODIFY `seat_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=445;

--
-- AUTO_INCREMENT cho bảng `seat_type_prices`
--
ALTER TABLE `seat_type_prices`
  MODIFY `seat_type_price_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `showtimes`
--
ALTER TABLE `showtimes`
  MODIFY `showtime_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT cho bảng `tickets`
--
ALTER TABLE `tickets`
  MODIFY `ticket_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT cho bảng `transactions`
--
ALTER TABLE `transactions`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`showtime_id`);

--
-- Các ràng buộc cho bảng `booking_seats`
--
ALTER TABLE `booking_seats`
  ADD CONSTRAINT `booking_seats_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`),
  ADD CONSTRAINT `booking_seats_ibfk_2` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`seat_id`);

--
-- Các ràng buộc cho bảng `halls`
--
ALTER TABLE `halls`
  ADD CONSTRAINT `halls_ibfk_1` FOREIGN KEY (`cinema_id`) REFERENCES `cinemas` (`cinema_id`);

--
-- Các ràng buộc cho bảng `seats`
--
ALTER TABLE `seats`
  ADD CONSTRAINT `seats_ibfk_1` FOREIGN KEY (`hall_id`) REFERENCES `halls` (`hall_id`);

--
-- Các ràng buộc cho bảng `showtimes`
--
ALTER TABLE `showtimes`
  ADD CONSTRAINT `showtimes_ibfk_1` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`movie_id`),
  ADD CONSTRAINT `showtimes_ibfk_2` FOREIGN KEY (`hall_id`) REFERENCES `halls` (`hall_id`);

--
-- Các ràng buộc cho bảng `tickets`
--
ALTER TABLE `tickets`
  ADD CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`),
  ADD CONSTRAINT `tickets_ibfk_2` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`seat_id`);

--
-- Các ràng buộc cho bảng `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`);

DELIMITER $$
--
-- Sự kiện
--
CREATE DEFINER=`root`@`localhost` EVENT `cleanup_expired_bookings` ON SCHEDULE EVERY 1 MINUTE STARTS '2025-07-02 22:13:42' ON COMPLETION NOT PRESERVE ENABLE DO BEGIN
   
    UPDATE bookings
    SET status = 'cancelled'
    WHERE status = 'pending'
    AND booking_date < DATE_SUB(NOW(), INTERVAL 10 MINUTE); -- <<< THAY ĐỔI Ở ĐÂY

    
    DELETE FROM bookings
    WHERE status = 'cancelled'
    AND booking_date < DATE_SUB(NOW(), INTERVAL 30 DAY);
END$$

DELIMITER ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
