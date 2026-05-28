# API Contract

Dokumen ini menjadi kontrak API operasional untuk backend singleton drone.

## Deployment Model

- 1 UAV aktif
- 1 docking aktif
- semua user login berbagi akses mission
- admin mengelola user, UAV, docking, dan device token
- UAV/docking config disimpan di tabel database `singleton_uav` dan `singleton_docking`

## Authentication

HTTP API menerima salah satu:

```text
Authorization: Bearer <JWT>
```

atau

```text
X-Device-Token: <DEVICE_TOKEN>
```

Optional static env tokens:

```text
UAV_DEVICE_TOKEN_STATIC=<token>
DOCKING_DEVICE_TOKEN_STATIC=<token>
```

WebSocket flow:
1. login atau gunakan device token
2. minta `POST /auth/ws-token`
3. connect ke `GET /ws/telemetry?token=<WS_TOKEN>`

Detail WebSocket ada di [docs/WEBSOCKET_CONTRACT.md](/Users/macbook/Workdir/Office/Projects/drone/be-drone-mission/docs/WEBSOCKET_CONTRACT.md).

## Roles

- `admin`: manage user, UAV, docking, device token
- `user`: akses mission shared dan profile sendiri

## Canonical Endpoints

### Auth

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/ws-token`
- `GET /device-context`

### Users

- `POST /users` admin only
- `GET /users` admin only
- `GET /users/{id}` admin only
- `PATCH /users/{id}` admin only
- `PATCH /users/{id}/password` admin only
- `DELETE /users/{id}` admin only
- `GET /users/me`
- `PATCH /users/me`
- `PATCH /users/me/password`

User payload minimal:
- `username`
- `role`
- `created_at`

### Singleton Fleet

- `GET /uav`
- `PATCH /uav`
- `GET /docking`
- `PATCH /docking`
- `POST /device-tokens/uav`
- `POST /device-tokens/docking`

Behavior:
- `PATCH /uav` menerima `home_latitude`, `home_longitude`, `max_range_meter`, `flight_speed`, `is_active`
- `PATCH /docking` menerima `location_name`, `latitude`, `longitude`, `is_active`
- UAV device token hanya boleh update field operasional UAV
- docking device token hanya boleh update `location_name`, `latitude`, `longitude`
- bila env `UAV_DEVICE_TOKEN_STATIC` atau `DOCKING_DEVICE_TOKEN_STATIC` diisi, backend menerima token itu langsung tanpa perlu row `device_tokens`

### Missions

- `GET /missions`
- `GET /mission-runs`
- `POST /mission-conflicts/preview`
- `POST /missions`
- `GET /missions/{id}`
- `PATCH /missions/{id}`
- `DELETE /missions/{id}`
- `POST /missions/{id}/start`

Rules:
- mission selalu diarahkan ke singleton UAV
- mission tidak lagi menyimpan ownership creator/operator pada `user_id`
- visibility mission shared untuk semua user login
- update/delete ditolak jika mission sedang aktif
- scheduler mission memakai hard-replace rule baru: `schedule_type`, `schedule_timezone`, `schedule_config`
- setiap occurrence mission pada UAV yang sama harus berjarak minimal sesuai env `MISSION_MIN_GAP_MINUTES`
- `priority` dipakai untuk memberi rekomendasi winner saat dua occurrence bentrok; nilai default `100`
- field `schedule` tetap ada di response, tetapi artinya adalah `next upcoming run`
- mission template akan kembali ke status `Waiting` jika masih ada occurrence berikutnya
- mission template akan berhenti di status terminal jika rule sudah habis dan tidak ada `next upcoming run`

List query params:
- `page`
- `limit`
- `uav_id`
- `date`

Mission request fields:
- `mission_name`: wajib
- `takeoff_altitude`: opsional, meter, harus `>= 0` bila dikirim
- `takeoff_hold_duration`: opsional, durasi hold setelah takeoff dalam detik, harus `>= 0` bila dikirim
- `roi`: opsional, satu titik region of interest dengan field `latitude` dan `longitude`, boleh `null`
- `schedule_type`: wajib, salah satu `one_time`, `daily`, `weekly`, `monthly`
- `schedule_timezone`: wajib, harus timezone IANA valid. Contoh: `Asia/Jakarta`
- `schedule_config`: wajib, bentuknya tergantung `schedule_type`
- `priority`: opsional, default `100`
- `status`: umumnya gunakan `Waiting`
- `waypoints`: array waypoint mission

Mission response fields:
- `takeoff_altitude`: altitude takeoff mission dalam meter bila sudah dikonfigurasi
- `takeoff_hold_duration`: durasi hold setelah takeoff dalam detik bila sudah dikonfigurasi
- `roi`: satu titik region of interest mission, bisa `null`
- `schedule`: waktu terdekat berikutnya dalam format RFC3339
- `schedule_type`: tipe rule scheduler mission
- `schedule_timezone`: timezone acuan interpretasi jam
- `schedule_config`: rule scheduler yang disimpan apa adanya setelah normalisasi backend
- `priority`: prioritas mission template

Mission scheduler rules:
- `one_time`
  - `schedule_config.run_at` wajib RFC3339
  - `run_at` harus berada di masa depan saat create/update
- `daily`
  - `schedule_config.start_date` wajib format `YYYY-MM-DD`
  - `schedule_config.end_date` wajib format `YYYY-MM-DD`
  - `schedule_config.start_date` tidak boleh lebih besar dari `end_date`
  - `schedule_config.times` wajib minimal satu item format `HH:mm`
  - mission berjalan setiap hari dari `start_date` sampai `end_date` pada semua jam di `times`
- `weekly`
  - `schedule_config.weeks` wajib bilangan bulat `> 0`
  - `schedule_config.weekdays` wajib minimal satu item
  - `weekdays` memakai ISO weekday: `1=Monday` sampai `7=Sunday`
  - `schedule_config.times` wajib minimal satu item format `HH:mm`
  - rentang rule dihitung dari tanggal mission dibuat selama jumlah `weeks` yang diminta
- `monthly`
  - `schedule_config.months` wajib bilangan bulat `> 0`
  - `schedule_config.month_days` wajib minimal satu item
  - `month_days` valid di rentang `1..31`
  - `schedule_config.times` wajib minimal satu item format `HH:mm`
  - rentang rule dihitung dari bulan mission dibuat selama jumlah `months` yang diminta
  - tanggal yang tidak ada di bulan tertentu di-skip, tidak digeser ke akhir bulan

Normalization rules:
- backend mengurutkan dan menghapus duplikasi `times`
- backend mengurutkan dan menghapus duplikasi `weekdays`
- backend mengurutkan dan menghapus duplikasi `month_days`
- backend menghitung `schedule` saat create/update sebagai occurrence valid paling dekat yang masih di masa depan
- create/update ditolak jika rule valid tetapi tidak menghasilkan occurrence masa depan
- create/update juga ditolak jika scheduler menghasilkan occurrence yang bentrok dengan mission lain dalam jarak `< MISSION_MIN_GAP_MINUTES`
- gunakan `POST /mission-conflicts/preview` untuk preview bentrok sebelum create/update

Recommended create flow when scheduler conflict is possible:
1. client kirim candidate mission ke `POST /mission-conflicts/preview`
2. backend belum menyimpan mission apa pun; endpoint ini hanya simulasi
3. jika `has_conflict=false`, client boleh lanjut ke `POST /missions`
4. jika `has_conflict=true`, backend mengembalikan occurrence mana saja yang bentrok dan winner recommendation berdasarkan `priority`
5. client memutuskan apakah ingin mengubah scheduler, mengubah `priority`, membatalkan create, atau tetap create dengan `conflict_resolutions`
6. client boleh memanggil `POST /mission-conflicts/preview` berulang sampai hasilnya sesuai kebutuhan
7. jika client ingin tetap create walau conflict, client kirim `POST /missions` dengan `conflict_resolutions`

Current conflict-create behavior:
- mission candidate yang masih conflict tidak akan disimpan saat `POST /missions` pertama jika `conflict_resolutions` belum dikirim
- backend saat ini tidak menyimpan draft mission conflict
- backend menerima resolution per occurrence pada `POST /missions` untuk create final candidate mission yang sebelumnya conflict
- tidak ada endpoint resolve manual terpisah; conflict public flow sekarang cukup `preview -> create`

Date filter semantics:
- query `date=YYYY-MM-DD` pada `GET /missions` tetap membandingkan prefix tanggal dari field `schedule`
- artinya filter `date` mengacu ke `next upcoming run`, bukan seluruh rentang rule scheduler

Mission run query semantics:
- `GET /mission-runs` mengembalikan occurrence mission dalam bentuk item per jadwal jalan, bukan per template mission
- query `upcoming=today` mengembalikan semua occurrence pada tanggal server saat request diproses
- query `upcoming=later` mengembalikan occurrence mulai besok
- query `days` hanya berlaku untuk `upcoming=later`
- kalau `days` tidak dikirim untuk `upcoming=later`, backend memakai default `21` hari
- setiap item response membawa `run_at` untuk jadwal occurrence yang spesifik
- `status` pada item occurrence diambil dari `mission_history` jika sudah ada run untuk `mission_id + run_at` yang sama
- jika dua occurrence bentrok dan belum ada resolution manual, backend akan auto-pilih winner berdasarkan `priority`
- jika `priority` sama, backend fallback ke `run_at` yang lebih awal lalu `mission_id` lebih kecil
- kalau occurrence di-skip karena hasil resolution, `status` menjadi `Skipped`
- occurrence yang kalah auto-priority juga ditampilkan sebagai `Skipped`
- `ConflictPending` hanya dipakai jika backend tidak bisa menentukan status occurrence secara normal
- kalau belum ada history dan tidak ada resolution/conflict aktif, `status` tetap `Waiting`
- jika ada history cocok, response juga bisa membawa `history_id`, `started_at`, `completed_at`, dan `failure_reason`
- `Skipped` tidak membuat row baru di `mission_history`; status ini dibaca dari `mission_occurrence_resolutions`
- `Failed` dan `Aborted` tetap berasal dari `mission_history`
- kalau env `MISSION_MIN_GAP_MINUTES` tidak diisi atau invalid, backend fallback ke `150`

Compatibility notes:
- endpoint penerbangan seperti `GET /missions/{id}`, `GET /missions/waiting/device`, dan `GET /missions/safe-to-fly/device` tetap mengembalikan `schedule`
- client baru sebaiknya membaca `schedule_type`, `schedule_timezone`, dan `schedule_config` untuk kebutuhan edit/preview scheduler

Mission runtime reschedule:
- saat mission run `Completed`, `Failed`, atau `Aborted`, backend akan menghitung occurrence berikutnya dari rule scheduler mission
- jika occurrence berikutnya ada, template mission di-set kembali ke `Waiting` dan `schedule` di-update
- jika occurrence berikutnya tidak ada, template mission berhenti di status terminal terakhir
- mission history tetap merekam hasil run aktual; perubahan ini hanya memengaruhi template mission utama

Mission auto recovery rules:
- backend menjalankan recovery sweep otomatis setiap `1 menit`
- mission template `Waiting` yang melewati `schedule + 1 menit` tanpa pernah di-start akan auto dibuat `Failed`
- failure code untuk auto recovery memakai `MISSION_TIMEOUT`
- occurrence yang kalah conflict resolution tidak menjadi `Failed`; occurrence itu tetap `Skipped`
- kalau winner conflict tidak pernah di-start, winner itulah yang nanti auto `Failed`

Mission runtime timeout rules:
- `PreparingDock` lebih dari `10 menit` sejak aktivitas terakhir -> auto `Aborted`
- `SafeToFly` lebih dari `10 menit` sejak aktivitas terakhir -> auto `Aborted`
- `Takeoff` lebih dari `30 menit` sejak aktivitas terakhir -> auto `Failed`
- `Landed` lebih dari `10 menit` sejak aktivitas terakhir -> auto `Failed`
- `DockConfirmed` lebih dari `5 menit` sejak aktivitas terakhir -> auto `Failed`

Mission runtime activity reference:
- aktivitas terakhir dihitung dari event terakhir pada `mission_event`
- jika belum ada event baru, backend fallback ke `started_at`
- setelah auto `Failed` atau `Aborted`, template mission akan dihitung ulang ke next schedule seperti rule reschedule di atas

### Mission Runtime

- `GET /mission/current`
- `GET /missions/waiting/device`
- `GET /missions/safe-to-fly/device`
- `GET /telemetry/track`
- `GET /mission-history`
- `GET /mission-history/{history_id}/state`
- `PATCH /mission-history/{history_id}/state`
- `POST /mission-history/{history_id}/complete`
- `GET /mission-history/{history_id}/events`
- `GET /mission-history/{history_id}/media`
- `POST /mission-history/{history_id}/media/upload`
- `POST /mission-history/{history_id}/media/register`
- `GET /mission-history/{history_id}/media/archive`
- `POST /mission-history/{history_id}/full-video/upload`
- `GET /mission-history/{history_id}/full-video`
- `GET /mission-media/{media_id}/download`

### Realtime

- `POST /realtime/telemetry`

Realtime request envelope:

```json
{
  "uav_id": 1,
  "kind": "telemetry",
  "metric": "battery",
  "payload": {
    "percent": 78.2
  }
}
```

Rules:
- `kind` valid: `telemetry`, `status`
- status metric valid: `uav_status`, `docking_status`
- status di-upsert ke `uav_status` atau `docking_status` sebelum broadcast
- `kind=telemetry` yang membawa `payload.latitude` + `payload.longitude` akan dicoba dipersist sebagai mission track point bila ada `mission_history` aktif untuk UAV singleton yang sedang berjalan
- persistence mission track memakai anchor `mission_history.id`, bukan `mission_id`
- jika tidak ada mission aktif, telemetry tetap dibroadcast tetapi tidak membuat track point baru
- backend throttling track point: simpan titik pertama, lalu titik berikutnya hanya jika jeda `>= 1 detik` atau perpindahan `>= 3 meter`
- track mission terakhir dipertahankan setelah mission terminal, lalu dibersihkan saat mission berikutnya `start`
- HTTP realtime akan diteruskan ke subscriber WebSocket yang cocok

UAV status update rules:
- endpoint tetap `POST /realtime/telemetry`
- untuk update status UAV, request harus memakai `kind=status` dan `metric=uav_status`
- payload `uav_status` saat ini menerima `battery_percent`, `battery_voltage`, dan `is_docked`
- `battery_percent` bila dikirim harus berada di rentang `0..100`
- `battery_voltage` bila dikirim harus `>= 0`
- field yang tidak dikirim tidak meng-overwrite nilai lama pada row `uav_status`
- backend selalu meng-update `last_heartbeat` dengan waktu server saat request diproses
- response mengembalikan status UAV terbaru yang tersimpan

Contoh request `uav_status`:

```http
POST /realtime/telemetry
Authorization: Bearer <JWT>
Content-Type: application/json
```

```json
{
  "uav_id": 1,
  "kind": "status",
  "metric": "uav_status",
  "payload": {
    "battery_percent": 80,
    "battery_voltage": 22.4,
    "is_docked": true
  }
}
```

Contoh response sukses:

```json
{
  "uav_id": 1,
  "status": {
    "battery_percent": 80,
    "battery_voltage": 22.4,
    "is_docked": true
  },
  "message": "UAV status updated"
}
```

Docking status update rules:
- endpoint tetap `POST /realtime/telemetry`
- untuk update status docking, request harus memakai `kind=status` dan `metric=docking_status`
- payload `docking_status` menerima `door_open`, `drone_present`, `charging`, `temperature`, `is_online`
- `docking_id` boleh ikut dikirim pada payload bila request datang dari UAV token atau JWT; bila request datang dari docking token, backend memakai `docking_id` dari token
- field yang tidak dikirim tidak meng-overwrite nilai lama pada row `docking_status`
- backend selalu meng-update `last_heartbeat` dengan waktu server saat request diproses
- response mengembalikan status docking terbaru yang tersimpan

Contoh request `docking_status`:

```http
POST /realtime/telemetry
X-Device-Token: <DEVICE_TOKEN>
Content-Type: application/json
```

```json
{
  "uav_id": 1,
  "kind": "status",
  "metric": "docking_status",
  "payload": {
    "docking_id": 1,
    "is_online": true,
    "door_open": false,
    "drone_present": true,
    "charging": true,
    "temperature": 28.5
  }
}
```

Contoh response sukses:

```json
{
  "docking_id": 1,
  "status": {
    "door_open": false,
    "drone_present": true,
    "charging": true,
    "temperature": 28.5,
    "is_online": true,
    "last_heartbeat": "2026-04-22T07:15:00Z"
  },
  "message": "Docking status updated"
}
```

Mission track flow:
1. operator atau device memulai mission dengan `POST /missions/{id}/start`
2. backend membuat row `mission_history` aktif dan mengembalikan `history_id`
3. UAV atau gateway mengirim telemetry posisi ke `POST /realtime/telemetry`
4. backend mencari `mission_history` aktif untuk UAV singleton
5. jika payload mengandung koordinat valid, backend menyimpan point ke `telemetry_track_points`
6. backend tetap broadcast event realtime ke WebSocket subscriber
7. setelah mission terminal, track terakhir masih bisa diambil dari endpoint yang sama selama belum ada mission baru
8. saat mission berikutnya `start`, backend menghapus track-track lama untuk UAV singleton lalu mulai track baru
9. dashboard memanggil `GET /telemetry/track` untuk mengambil jejak yang sudah tersimpan
10. dashboard lalu merge hasil fetch awal dengan stream WebSocket live

## Important Payload Notes

### Login

Request:

```json
{
  "username": "user",
  "password": "password"
}
```

### Create User

```json
{
  "username": "user1",
  "role": "user",
  "password": "secret123"
}
```

### Update Singleton UAV

```json
{
  "home_latitude": -6.2105,
  "home_longitude": 106.8296,
  "max_range_meter": 5500,
  "flight_speed": 12.5,
  "is_active": true
}
```

### Update Singleton Docking

```json
{
  "location_name": "Hangar 1B",
  "latitude": -6.201,
  "longitude": 106.801,
  "is_active": true
}
```

### Create Mission

Contoh sukses response `POST /missions`:

```json
{
  "id": 12,
  "message": "Mission saved successfully"
}
```

Contoh request `daily`:

```json
{
  "mission_name": "Test Mission",
  "takeoff_altitude": 20,
  "takeoff_hold_duration": 15,
  "schedule_type": "daily",
  "schedule_timezone": "Asia/Jakarta",
  "schedule_config": {
    "start_date": "2026-03-14",
    "end_date": "2026-03-31",
    "times": ["08:00", "16:00"]
  },
  "status": "Waiting",
  "waypoints": [
    {
      "sequence_order": 1,
      "latitude": 0.0,
      "longitude": 0.0,
      "altitude": 10.0,
      "action": "Take Picture",
      "action_duration": 5
    }
  ]
}
```

### Create Mission One Time

Contoh request `one_time`:

```json
{
  "mission_name": "Inspection One Time",
  "takeoff_altitude": 18,
  "takeoff_hold_duration": 20,
  "schedule_type": "one_time",
  "schedule_timezone": "Asia/Jakarta",
  "schedule_config": {
    "run_at": "2026-03-14T08:00:00+07:00"
  },
  "status": "Waiting",
  "waypoints": []
}
```

### Create Mission Weekly

Contoh request `weekly`:

```json
{
  "mission_name": "Weekly Patrol",
  "takeoff_altitude": 25,
  "takeoff_hold_duration": 30,
  "schedule_type": "weekly",
  "schedule_timezone": "Asia/Jakarta",
  "schedule_config": {
    "weeks": 8,
    "weekdays": [1, 3, 5],
    "times": ["08:00", "15:00"]
  },
  "status": "Waiting",
  "waypoints": []
}
```

### Create Mission Monthly

Contoh request `monthly`:

```json
{
  "mission_name": "Monthly Patrol",
  "takeoff_altitude": 30,
  "schedule_type": "monthly",
  "schedule_timezone": "Asia/Jakarta",
  "schedule_config": {
    "months": 6,
    "month_days": [1, 15, 28],
    "times": ["09:00"]
  },
  "priority": 120,
  "status": "Waiting",
  "waypoints": []
}
```

### Create Mission Notes

- `user_id` tidak dipakai lagi untuk ownership mission
- `uav_id` tidak perlu dikirim dari client; backend mengisi otomatis
- `status` normalnya kirim `Waiting`
- `priority` opsional; jika tidak dikirim backend memakai default `100`
- `confirm_recent_history_guard` opsional; normalnya kirim `false`
- `conflict_resolutions` opsional; hanya dipakai saat client ingin tetap create mission yang masih conflict
- `takeoff_hold_duration` cocok untuk mission takeoff-hold-land tanpa waypoint; backend hanya menyimpan nilainya di contract mission
- `waypoints` boleh kosong `[]`
- jika `waypoints` dikirim, nilai `action` wajib salah satu `Take Picture` atau `Record Video`
- `schedule` tidak dikirim saat create; backend menghitung `next upcoming run`
- backend akan memeriksa `mission_history` terakhir pada UAV singleton
- backend membandingkan `last_activity_at + MISSION_MIN_GAP_MINUTES` terhadap `first upcoming run` mission candidate, bukan terhadap waktu request create
- jika `first upcoming run` mission candidate masih berada di bawah `MISSION_MIN_GAP_MINUTES` dari `last_activity_at` history terakhir, create ditolak dengan `409 mission_recent_history_guard`
- `last_activity_at` dihitung dari `completed_at`, atau fallback ke `started_at`, atau fallback ke `created_at`
- row `mission_history` yang timestamp aktivitasnya berada di masa depan terhadap waktu server diabaikan oleh guard ini
- guard history terakhir ini adalah soft block: client boleh mengirim ulang request create yang sama dengan `confirm_recent_history_guard=true`
- karena guard ini melihat `first upcoming run`, mission untuk hari berikutnya atau jam yang jauh sesudah `available_at` tetap bisa dibuat normal meskipun request create dilakukan lebih awal
- jika scheduler valid tetapi semua occurrence sudah lewat, create akan ditolak dengan error `Schedule must produce a future run`
- jika occurrence mission baru bentrok dengan mission lain dalam jarak `< 150 menit`, create akan ditolak dengan `409 mission_schedule_conflict`
- conflict scheduler adalah hard block dan tidak bisa di-bypass dengan `confirm_recent_history_guard`
- jika create ditolak dengan `mission_schedule_conflict`, mission baru belum disimpan sama sekali
- flow yang disarankan untuk conflict scheduler adalah preview dulu, adjust payload di client, lalu create ulang setelah preview bersih

### Update Mission

`PATCH /missions/{id}` menerima field mission yang ingin diubah. Jika field scheduler diubah, kirim kombinasi lengkap:
- `schedule_type`
- `schedule_timezone`
- `schedule_config`

Jika `waypoints` dikirim, seluruh waypoint lama akan diganti penuh.

Contoh request:

```json
{
  "mission_name": "Weekly Patrol Updated",
  "takeoff_hold_duration": 25,
  "schedule_type": "weekly",
  "schedule_timezone": "Asia/Jakarta",
  "schedule_config": {
    "weeks": 4,
    "weekdays": [2, 4, 6],
    "times": ["07:00", "14:00"]
  },
  "priority": 140,
  "status": "Waiting",
  "waypoints": [
    {
      "sequence_order": 1,
      "latitude": -6.2101,
      "longitude": 106.8291,
      "altitude": 25,
      "action": "Take Picture",
      "action_duration": 5
    },
    {
      "sequence_order": 2,
      "latitude": -6.2108,
      "longitude": 106.8302,
      "altitude": 30,
      "action": "Record Video",
      "action_duration": 3
    }
  ]
}
```

Contoh response sukses:

```json
{
  "id": 12,
  "user_id": 2,
  "uav_id": 1,
  "mission_name": "Weekly Patrol Updated",
  "takeoff_hold_duration": 25,
  "schedule": "2026-04-21T07:00:00+07:00",
  "schedule_type": "weekly",
  "schedule_timezone": "Asia/Jakarta",
  "schedule_config": {
    "weeks": 4,
    "weekdays": [2, 4, 6],
    "times": ["07:00", "14:00"]
  },
  "priority": 140,
  "status": "Waiting",
  "timestamp": "2026-04-17T09:00:00Z",
  "waypoints": [
    {
      "id": 101,
      "mission_id": 12,
      "sequence_order": 1,
      "latitude": -6.2101,
      "longitude": 106.8291,
      "altitude": 25,
      "action": "Take Picture",
      "action_duration": 5
    },
    {
      "id": 102,
      "mission_id": 12,
      "sequence_order": 2,
      "latitude": -6.2108,
      "longitude": 106.8302,
      "altitude": 30,
      "action": "Record Video",
      "action_duration": 3
    }
  ]
}
```

Contoh response konflik jika mission sedang berjalan:

```json
{
  "error": "mission is currently in progress"
}
```

Catatan:
- `uav_id` pada mission tetap diarahkan ke singleton UAV walaupun field itu dikirim client
- `status` tidak boleh kosong
- jika scheduler valid tetapi tidak menghasilkan occurrence masa depan, update akan ditolak dengan `Schedule must produce a future run`
- jika scheduler baru bentrok dengan mission lain dalam jarak `< 150 menit`, update akan ditolak dengan `409 mission_schedule_conflict`

### Delete Mission

`DELETE /missions/{id}` melakukan soft delete dengan mengisi `deleted_at` dan `deleted_by`.

Jika mission yang dihapus sebelumnya menjadi winner pada conflict resolution occurrence, skip resolution yang menunjuk ke mission itu juga akan dilepas. Dengan begitu occurrence loser yang sebelumnya `Skipped` bisa aktif kembali atau kembali menjadi `ConflictPending` bila masih bentrok dengan mission lain.

Contoh response sukses:

```json
{
  "message": "Mission deleted successfully"
}
```

Contoh response jika mission tidak ditemukan:

```json
{
  "message": "Mission not found"
}
```

Contoh response konflik jika mission sedang berjalan:

```json
{
  "error": "mission is currently in progress"
}
```

### Start Mission

`POST /missions/{id}/start` membuat `mission_history` baru untuk occurrence `schedule` aktif saat ini dan mengubah template mission menjadi `InProgress`.

Contoh response sukses:

```json
{
  "history_id": 55,
  "status": "PreparingDock"
}
```

Contoh response konflik jika mission yang sama sudah berjalan:

```json
{
  "message": "Mission already in progress",
  "history_id": 55,
  "mission_id": 12
}
```

Contoh response konflik jika UAV sedang dipakai mission lain:

```json
{
  "message": "UAV already has a mission in progress",
  "history_id": 61,
  "mission_id": 18
}
```

Contoh response konflik jika occurrence ini sudah di-skip:

```json
{
  "error": "mission occurrence is skipped due to conflict resolution",
  "winner_mission_id": 18,
  "winner_run_at": "2026-04-23T13:00:00+07:00"
}
```

Contoh response konflik jika occurrence masih bentrok dan belum di-resolve:

```json
{
  "error": "mission occurrence has unresolved conflicts",
  "minimum_gap_minutes": 150,
  "conflicting_mission_ids": [12, 18]
}
```

### Preview Mission Conflicts

`POST /mission-conflicts/preview` dipakai untuk preview bentrok occurrence sebelum create/update mission. Endpoint ini tidak menyimpan perubahan.

Client flow yang disarankan untuk create mission baru:
1. kirim candidate mission ke endpoint ini
2. jika `has_conflict=false`, lanjutkan ke `POST /missions`
3. jika `has_conflict=true`, pakai daftar conflict untuk memutuskan apakah candidate mission perlu ubah `schedule_config`, `schedule_type`, `schedule_timezone`, `priority`, atau tetap create dengan `conflict_resolutions`
4. panggil endpoint ini lagi setelah perubahan sampai hasilnya sesuai kebutuhan
5. jangan anggap candidate mission sudah tersimpan hanya karena preview mengembalikan recommendation

Contoh request:

```json
{
  "mission_name": "Tower Audit",
  "schedule_type": "daily",
  "schedule_timezone": "Asia/Jakarta",
  "schedule_config": {
    "start_date": "2026-04-20",
    "end_date": "2026-04-26",
    "times": ["08:00", "13:00"]
  },
  "priority": 130,
  "window_days": 30
}
```

Contoh request untuk preview update mission existing:

```json
{
  "mission_id": 12,
  "mission_name": "Tower Audit Revised",
  "schedule_type": "daily",
  "schedule_timezone": "Asia/Jakarta",
  "schedule_config": {
    "start_date": "2026-04-20",
    "end_date": "2026-04-26",
    "times": ["08:00", "13:00"]
  },
  "priority": 150,
  "window_days": 30
}
```

Contoh response:

```json
{
  "has_conflict": true,
  "minimum_gap_minutes": 150,
  "window_days": 30,
  "conflicts": [
    {
      "candidate_run_at": "2026-04-21T08:00:00+07:00",
      "candidate_priority": 130,
      "conflicting_occurrences": [
        {
          "mission_id": 12,
          "mission_name": "Morning Patrol",
          "run_at": "2026-04-21T07:00:00+07:00",
          "priority": 100
        }
      ],
      "recommended_winner_source": "candidate",
      "recommended_winner": {
        "mission_name": "Tower Audit",
        "run_at": "2026-04-21T08:00:00+07:00",
        "priority": 130
      }
    },
    {
      "candidate_run_at": "2026-04-21T13:00:00+07:00",
      "candidate_priority": 130,
      "conflicting_occurrences": [
        {
          "mission_id": 19,
          "mission_name": "Noon Patrol",
          "run_at": "2026-04-21T12:00:00+07:00",
          "priority": 130
        }
      ],
      "recommended_winner_source": "manual"
    }
  ]
}
```

### Mission Response Example

```json
{
  "id": 12,
  "user_id": 3,
  "uav_id": 1,
  "mission_name": "Weekly Patrol",
  "takeoff_altitude": 25,
  "schedule": "2026-03-18T08:00:00+07:00",
  "schedule_type": "weekly",
  "schedule_timezone": "Asia/Jakarta",
  "schedule_config": {
    "weeks": 8,
    "weekdays": [1, 3, 5],
    "times": ["08:00", "15:00"]
  },
  "priority": 120,
  "status": "Waiting",
  "timestamp": "2026-03-14T07:12:00Z",
  "waypoints": []
}
```

## Mutation Request/Response Reference

Bagian ini merangkum endpoint non-GET yang paling sering dipakai untuk lifecycle mission.

### POST /missions

Request:

```http
POST /missions
Authorization: Bearer <JWT>
Content-Type: application/json
```

Body contoh:

```json
{
  "mission_name": "Test Mission",
  "takeoff_altitude": 25,
  "roi": {
    "latitude": -6.2101,
    "longitude": 106.8291
  },
  "schedule_type": "daily",
  "schedule_timezone": "Asia/Jakarta",
  "schedule_config": {
    "start_date": "2026-04-19",
    "end_date": "2026-04-25",
    "times": ["08:00", "16:00"]
  },
  "priority": 120,
  "status": "Waiting",
  "confirm_recent_history_guard": false,
  "conflict_resolutions": [],
  "waypoints": [
    {
      "sequence_order": 1,
      "latitude": -6.2101,
      "longitude": 106.8291,
      "altitude": 25,
      "action": "Take Picture",
      "action_duration": 5
    }
  ]
}
```

Response sukses:

```json
{
  "id": 12,
  "message": "Mission saved successfully"
}
```

Response validasi gagal:

```json
{
  "error": "Schedule must produce a future run"
}
```

Response konflik scheduler:

```json
{
  "error": "Mission schedule conflicts with another scheduled run",
  "code": "mission_schedule_conflict",
  "minimum_gap_minutes": 150,
  "window_days": 30,
  "resolution_required": true,
  "conflicts": [
    {
      "candidate_run_at": "2026-04-21T08:00:00+07:00",
      "candidate_priority": 120,
      "conflicting_occurrences": [
        {
          "mission_id": 18,
          "mission_name": "Tower Audit",
          "run_at": "2026-04-21T09:00:00+07:00",
          "priority": 100
        }
      ],
      "recommended_winner_source": "candidate",
      "recommended_winner": {
        "mission_name": "Test Mission",
        "run_at": "2026-04-21T08:00:00+07:00",
        "priority": 120
      }
    }
  ]
}
```

Interpretasi response konflik scheduler:
- response ini hanya menginformasikan bahwa candidate mission bentrok; mission baru belum tersimpan
- `recommended_winner` adalah recommendation berbasis `priority`, bukan keputusan final yang sudah dipersist
- client boleh mengubah candidate mission lalu create ulang, atau tetap create dengan `conflict_resolutions`

Contoh create final setelah preview conflict:

```json
{
  "mission_name": "Test Mission",
  "takeoff_altitude": 25,
  "schedule_type": "daily",
  "schedule_timezone": "Asia/Jakarta",
  "schedule_config": {
    "start_date": "2026-04-19",
    "end_date": "2026-04-25",
    "times": ["08:00", "16:00"]
  },
  "priority": 120,
  "status": "Waiting",
  "confirm_recent_history_guard": false,
  "conflict_resolutions": [
    {
      "candidate_run_at": "2026-04-21T08:00:00+07:00",
      "winner": {
        "source": "candidate"
      }
    }
  ],
  "waypoints": [
    {
      "sequence_order": 1,
      "latitude": -6.2101,
      "longitude": 106.8291,
      "altitude": 25,
      "action": "Take Picture",
      "action_duration": 5
    }
  ]
}
```

Rules untuk `conflict_resolutions`:
- array ini opsional dan hanya dipakai saat client memang ingin tetap create mission yang conflict
- setiap item mewakili satu `candidate_run_at` dari response preview
- `winner.source` valid: `candidate` atau `existing`
- jika `winner.source=existing`, client juga harus mengirim `winner.mission_id` dan `winner.run_at` yang persis cocok dengan salah satu item pada `conflicting_occurrences`
- jika `winner.source=candidate`, backend akan menandai semua occurrence existing pada cluster itu sebagai loser
- jika `winner.source=existing`, backend akan menandai occurrence candidate mission baru pada cluster itu sebagai loser
- jika setelah semua resolution diterapkan mission baru tidak punya occurrence aktif lagi, create final ditolak dan transaction dibatalkan

Response guard history terbaru:

```json
{
  "error": "Mission creation is blocked by recent mission history",
  "code": "mission_recent_history_guard",
  "minimum_gap_minutes": 150,
  "window_days": 0,
  "conflicts": [],
  "recent_history": {
    "mission_id": 12,
    "mission_name": "Inspection",
    "status": "Completed",
    "last_activity_at": "2026-04-21T07:00:00Z",
    "available_at": "2026-04-21T09:30:00Z"
  },
  "confirm_required": true
}
```

Rules tambahan:
- jika create ditolak dengan `code=mission_recent_history_guard`, client boleh kirim ulang request yang sama dengan `confirm_recent_history_guard=true`
- `available_at` menunjukkan waktu paling awal agar `first upcoming run` mission baru tidak lagi tertahan oleh history terakhir
- override ini hanya berlaku untuk recent-history guard
- conflict scheduler biasa dengan `code=mission_schedule_conflict` tetap tidak bisa di-bypass lewat flag ini
- jika override dipakai dan create berhasil, mission yang baru dibuat tetap bisa di-`start` seperti biasa
- `POST /missions/{id}/start` saat ini tidak mengecek ulang recent-history guard dari create flow
- jika create ditolak dengan `code=mission_schedule_conflict`, client boleh kembali ke flow `POST /mission-conflicts/preview`, atau tetap create dengan `conflict_resolutions`

### PATCH /missions/{id}

Request:

```http
PATCH /missions/12
Authorization: Bearer <JWT>
Content-Type: application/json
```

Body contoh:

```json
{
  "mission_name": "Weekly Patrol Updated",
  "roi": null,
  "schedule_type": "weekly",
  "schedule_timezone": "Asia/Jakarta",
  "schedule_config": {
    "weeks": 4,
    "weekdays": [2, 4, 6],
    "times": ["07:00", "14:00"]
  },
  "priority": 140,
  "status": "Waiting"
}
```

Response sukses:

```json
{
  "id": 12,
  "user_id": 2,
  "uav_id": 1,
  "mission_name": "Weekly Patrol Updated",
  "roi": null,
  "schedule": "2026-04-21T07:00:00+07:00",
  "schedule_type": "weekly",
  "schedule_timezone": "Asia/Jakarta",
  "schedule_config": {
    "weeks": 4,
    "weekdays": [2, 4, 6],
    "times": ["07:00", "14:00"]
  },
  "priority": 140,
  "status": "Waiting",
  "timestamp": "2026-04-17T09:00:00Z",
  "waypoints": []
}
```

Response konflik:

```json
{
  "error": "mission is currently in progress"
}
```

Response konflik scheduler:

```json
{
  "error": "Mission schedule conflicts with another scheduled run",
  "code": "mission_schedule_conflict",
  "minimum_gap_minutes": 150,
  "window_days": 30,
  "conflicts": [
    {
      "candidate_run_at": "2026-04-23T13:00:00+07:00",
      "candidate_priority": 140,
      "conflicting_occurrences": [
        {
          "mission_id": 18,
          "mission_name": "Tower Audit",
          "run_at": "2026-04-23T12:00:00+07:00",
          "priority": 140
        }
      ],
      "recommended_winner_source": "manual"
    }
  ]
}
```

### DELETE /missions/{id}

Request:

```http
DELETE /missions/12
Authorization: Bearer <JWT>
```

Response sukses:

```json
{
  "message": "Mission deleted successfully"
}
```

Response jika tidak ditemukan:

```json
{
  "message": "Mission not found"
}
```

### POST /missions/{id}/start

Request:

```http
POST /missions/12/start
Authorization: Bearer <JWT>
```

Response sukses:

```json
{
  "history_id": 55,
  "status": "PreparingDock"
}
```

Response konflik jika mission/UAV sudah dipakai:

```json
{
  "message": "UAV already has a mission in progress",
  "history_id": 61,
  "mission_id": 18
}
```

Response konflik jika occurrence ini sudah di-skip:

```json
{
  "error": "mission occurrence is skipped due to conflict resolution",
  "winner_mission_id": 18,
  "winner_run_at": "2026-04-23T13:00:00+07:00"
}
```

Response konflik jika occurrence kalah oleh auto priority:

```json
{
  "error": "mission occurrence is skipped due to auto priority resolution",
  "winner_mission_id": 12,
  "winner_run_at": "2026-04-23T07:00:00+07:00"
}
```

Notes:
- endpoint start tidak memakai `confirm_recent_history_guard`
- recent-history guard hanya berlaku pada flow create mission
- jadi jika mission berhasil dibuat lewat override `confirm_recent_history_guard=true`, mission itu tetap bisa di-start selama tidak kena block lain pada endpoint ini
- block lain pada start tetap berlaku, misalnya masih ada mission aktif pada UAV yang sama, occurrence sudah di-skip oleh conflict resolution, atau occurrence kalah auto-priority

## GET Request/Response Reference

Semua endpoint `GET` di bawah tidak memakai request body. Yang ditulis pada bagian request adalah contoh URL, query params, dan header yang dipakai client.

### GET /device-context

Request:

```http
GET /device-context
X-Device-Token: <DEVICE_TOKEN>
```

Response:

```json
{
  "token_id": 12,
  "scope_type": "uav",
  "uav_id": 1,
  "resolved_uav_id": 1
}
```

### GET /users

Query params:
- `page`
- `limit`
- `username` partial match, case-insensitive

Request:

```http
GET /users?page=1&limit=20&username=operator
Authorization: Bearer <JWT_ADMIN>
```

Response:

```json
{
  "page": 1,
  "limit": 20,
  "total": 2,
  "total_pages": 1,
  "has_next": false,
  "has_prev": false,
  "next_page": null,
  "prev_page": null,
  "items": [
    {
      "id": 2,
      "username": "operator1",
      "role": "user",
      "created_at": "2026-04-17T08:00:00Z"
    },
    {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "created_at": "2026-04-16T03:10:00Z"
    }
  ]
}
```

### GET /users/{id}

Request:

```http
GET /users/2
Authorization: Bearer <JWT_ADMIN>
```

Response:

```json
{
  "id": 2,
  "username": "operator1",
  "role": "user",
  "created_at": "2026-04-17T08:00:00Z"
}
```

### GET /users/me

Request:

```http
GET /users/me
Authorization: Bearer <JWT_USER>
```

Response:

```json
{
  "id": 2,
  "username": "operator1",
  "role": "user",
  "created_at": "2026-04-17T08:00:00Z"
}
```

### GET /uav

Request:

```http
GET /uav
Authorization: Bearer <JWT>
```

Response:

```json
{
  "id": 1,
  "home_latitude": -6.2105,
  "home_longitude": 106.8296,
  "max_range_meter": 5500,
  "flight_speed": 12.5,
  "is_active": true,
  "created_at": "2026-04-17T08:00:00Z",
  "status": {
    "battery_percent": 82,
    "battery_voltage": 22.4,
    "is_docked": true
  }
}
```

### PATCH /uav

Dipakai admin untuk update konfigurasi UAV singleton. Endpoint ini juga bisa dipanggil device token yang berada pada scope UAV yang sama, atau docking token yang terhubung ke UAV itu.

Request JWT admin:

```http
PATCH /uav
Authorization: Bearer <JWT_ADMIN>
Content-Type: application/json
```

Request device:

```http
PATCH /uav
X-Device-Token: <DEVICE_TOKEN>
Content-Type: application/json
```

Body:

```json
{
  "home_latitude": -6.2105,
  "home_longitude": 106.8296,
  "max_range_meter": 6000,
  "flight_speed": 12.5,
  "is_active": true
}
```

Rules:
- minimal satu field harus dikirim
- `home_latitude` harus valid di rentang `-90..90`
- `home_longitude` harus valid di rentang `-180..180`
- `max_range_meter` harus `>= 0`
- `flight_speed` harus `>= 0`
- jika request memakai device token, field `is_active` tidak boleh dikirim

Response sukses:

```json
{
  "id": 1,
  "home_latitude": -6.2105,
  "home_longitude": 106.8296,
  "max_range_meter": 6000,
  "flight_speed": 12.5,
  "is_active": true,
  "created_at": "2026-04-17T08:00:00Z",
  "status": {
    "battery_percent": 82,
    "battery_voltage": 22.4,
    "is_docked": true
  }
}
```

Contoh error device token jika mengirim `is_active`:

```json
{
  "error": "device token may only update home_latitude, home_longitude, max_range_meter, and flight_speed"
}
```

### GET /docking

Request:

```http
GET /docking
Authorization: Bearer <JWT>
```

Response:

```json
{
  "id": 1,
  "uav_id": 1,
  "location_name": "Hangar 1B",
  "latitude": -6.201,
  "longitude": 106.801,
  "is_active": true,
  "created_at": "2026-04-17T08:00:00Z",
  "status": {
    "door_open": false,
    "drone_present": true,
    "charging": true,
    "temperature": 31.5,
    "is_online": true,
    "last_heartbeat": "2026-04-17T09:12:08Z"
  }
}
```

### PATCH /docking

Dipakai admin untuk update konfigurasi docking singleton. Endpoint ini juga bisa dipanggil device token yang berada pada scope docking itu, atau UAV token dari UAV yang terhubung ke docking tersebut.

Request JWT admin:

```http
PATCH /docking
Authorization: Bearer <JWT_ADMIN>
Content-Type: application/json
```

Request device:

```http
PATCH /docking
X-Device-Token: <DEVICE_TOKEN>
Content-Type: application/json
```

Body:

```json
{
  "location_name": "Hangar 1B",
  "latitude": -6.201,
  "longitude": 106.801,
  "is_active": true
}
```

Rules:
- minimal satu field harus dikirim
- `uav_id` tidak boleh diupdate; jika dikirim akan ditolak
- `latitude` harus valid di rentang `-90..90`
- `longitude` harus valid di rentang `-180..180`
- `location_name` akan di-trim; jika hasilnya string kosong maka backend menyimpan `null`
- jika request memakai device token, field `is_active` tidak boleh dikirim

Response sukses:

```json
{
  "message": "Docking updated successfully"
}
```

Contoh error device token jika mengirim `is_active`:

```json
{
  "error": "device token may only update location_name, latitude, and longitude"
}
```

### GET /missions

Query params:
- `page`
- `limit`
- `uav_id`
- `date` format `YYYY-MM-DD`

Request:

```http
GET /missions?page=1&limit=20&uav_id=1&date=2026-04-18
Authorization: Bearer <JWT>
```

Response:

```json
{
  "page": 1,
  "limit": 20,
  "total": 1,
  "total_pages": 1,
  "has_next": false,
  "has_prev": false,
  "next_page": null,
  "prev_page": null,
  "items": [
    {
      "id": 12,
      "user_id": 2,
      "uav_id": 1,
      "mission_name": "Weekly Patrol",
      "schedule": "2026-04-18T08:00:00+07:00",
      "schedule_type": "weekly",
      "schedule_timezone": "Asia/Jakarta",
      "schedule_config": {
        "weeks": 8,
        "weekdays": [1, 3, 5],
        "times": ["08:00", "15:00"]
      },
      "status": "Waiting",
      "timestamp": "2026-04-17T09:00:00Z",
      "deleted_at": null,
      "waypoint_count": 3,
      "uav": {
        "id": 1,
        "home_latitude": -6.2105,
        "home_longitude": 106.8296,
        "max_range_meter": 5500,
        "flight_speed": 12.5,
        "is_active": true,
        "created_at": "2026-04-17T08:00:00Z",
        "status": {
          "battery_percent": 82,
          "battery_voltage": 22.4,
          "is_docked": true
        }
      }
    }
  ]
}
```

### GET /mission-runs

Dipakai user untuk mengambil daftar mission yang akan berjalan sebagai item per occurrence.

Query params:
- `page`
- `limit`
- `uav_id`
- `upcoming` salah satu `today` atau `later`
- `days` integer positif, opsional, hanya untuk `upcoming=later`, default `21`

Contoh request untuk hari ini:

```http
GET /mission-runs?page=1&limit=20&upcoming=today
Authorization: Bearer <JWT>
```

Contoh request untuk jadwal setelah hari ini:

```http
GET /mission-runs?page=1&limit=20&upcoming=later&days=21
Authorization: Bearer <JWT>
```

Contoh response variatif untuk frontend:

```json
{
  "page": 1,
  "limit": 20,
  "total": 8,
  "total_pages": 1,
  "has_next": false,
  "has_prev": false,
  "next_page": null,
  "prev_page": null,
  "items": [
    {
      "mission_id": 8,
      "user_id": 2,
      "uav_id": 1,
      "mission_name": "Bridge Inspection One Time",
      "priority": 100,
      "status": "Completed",
      "run_at": "2026-04-19T09:30:00+07:00",
      "history_id": 77,
      "started_at": "2026-04-19T09:31:10+07:00",
      "completed_at": "2026-04-19T09:42:03+07:00",
      "schedule_type": "one_time",
      "schedule_timezone": "Asia/Jakarta",
      "schedule_config": {
        "run_at": "2026-04-19T09:30:00+07:00"
      },
      "mission_created_at": "2026-04-18T06:15:00Z"
    },
    {
      "mission_id": 12,
      "user_id": 2,
      "uav_id": 1,
      "mission_name": "Daily Perimeter Sweep",
      "priority": 100,
      "status": "Failed",
      "run_at": "2026-04-19T08:00:00+07:00",
      "history_id": 81,
      "failure_reason": "Mission schedule expired before the run was started",
      "started_at": "2026-04-19T08:00:00+07:00",
      "completed_at": "2026-04-19T08:16:00+07:00",
      "schedule_type": "daily",
      "schedule_timezone": "Asia/Jakarta",
      "schedule_config": {
        "start_date": "2026-04-19",
        "end_date": "2026-04-25",
        "times": ["08:00", "16:00"]
      },
      "mission_created_at": "2026-04-18T06:30:00Z"
    },
    {
      "mission_id": 12,
      "user_id": 2,
      "uav_id": 1,
      "mission_name": "Daily Perimeter Sweep",
      "priority": 100,
      "status": "Waiting",
      "run_at": "2026-04-19T16:00:00+07:00",
      "schedule_type": "daily",
      "schedule_timezone": "Asia/Jakarta",
      "schedule_config": {
        "start_date": "2026-04-19",
        "end_date": "2026-04-25",
        "times": ["08:00", "16:00"]
      },
      "mission_created_at": "2026-04-18T06:30:00Z"
    },
    {
      "mission_id": 18,
      "user_id": 2,
      "uav_id": 1,
      "mission_name": "Tower Audit",
      "priority": 140,
      "status": "Skipped",
      "run_at": "2026-04-21T08:00:00+07:00",
      "skip_reason": "conflict",
      "winner_mission_id": 21,
      "winner_run_at": "2026-04-21T08:00:00+07:00",
      "schedule_type": "weekly",
      "schedule_timezone": "Asia/Jakarta",
      "schedule_config": {
        "weeks": 4,
        "weekdays": [1, 3],
        "times": ["08:00", "13:00"]
      },
      "mission_created_at": "2026-04-18T05:00:00Z"
    },
    {
      "mission_id": 21,
      "user_id": 2,
      "uav_id": 1,
      "mission_name": "Weekly Patrol",
      "priority": 160,
      "status": "SafeToFly",
      "run_at": "2026-04-21T08:00:00+07:00",
      "history_id": 95,
      "started_at": "2026-04-21T07:55:10+07:00",
      "schedule_type": "weekly",
      "schedule_timezone": "Asia/Jakarta",
      "schedule_config": {
        "weeks": 8,
        "weekdays": [1, 3, 5],
        "times": ["08:00", "15:00"]
      },
      "mission_created_at": "2026-04-17T09:00:00Z"
    },
    {
      "mission_id": 21,
      "user_id": 2,
      "uav_id": 1,
      "mission_name": "Weekly Patrol",
      "priority": 160,
      "status": "ConflictPending",
      "run_at": "2026-04-23T15:00:00+07:00",
      "conflict_with": [
        {
          "mission_id": 34,
          "mission_name": "Monthly Tower Audit",
          "run_at": "2026-04-23T16:00:00+07:00",
          "priority": 160
        }
      ],
      "schedule_type": "weekly",
      "schedule_timezone": "Asia/Jakarta",
      "schedule_config": {
        "weeks": 8,
        "weekdays": [1, 3, 5],
        "times": ["08:00", "15:00"]
      },
      "mission_created_at": "2026-04-17T09:00:00Z"
    },
    {
      "mission_id": 34,
      "user_id": 3,
      "uav_id": 1,
      "mission_name": "Monthly Tower Audit",
      "priority": 160,
      "status": "ConflictPending",
      "run_at": "2026-04-23T16:00:00+07:00",
      "conflict_with": [
        {
          "mission_id": 21,
          "mission_name": "Weekly Patrol",
          "run_at": "2026-04-23T15:00:00+07:00",
          "priority": 160
        }
      ],
      "schedule_type": "monthly",
      "schedule_timezone": "Asia/Jakarta",
      "schedule_config": {
        "months": 3,
        "month_days": [1, 15, 23, 28],
        "times": ["16:00"]
      },
      "mission_created_at": "2026-04-10T03:00:00Z"
    },
    {
      "mission_id": 34,
      "user_id": 3,
      "uav_id": 1,
      "mission_name": "Monthly Tower Audit",
      "priority": 160,
      "status": "Waiting",
      "run_at": "2026-05-01T10:00:00+07:00",
      "schedule_type": "monthly",
      "schedule_timezone": "Asia/Jakarta",
      "schedule_config": {
        "months": 3,
        "month_days": [1, 15, 28],
        "times": ["10:00"]
      },
      "mission_created_at": "2026-04-10T03:00:00Z"
    },
    {
      "mission_id": 34,
      "user_id": 3,
      "uav_id": 1,
      "mission_name": "Monthly Tower Audit",
      "priority": 160,
      "status": "Waiting",
      "run_at": "2026-05-15T10:00:00+07:00",
      "schedule_type": "monthly",
      "schedule_timezone": "Asia/Jakarta",
      "schedule_config": {
        "months": 3,
        "month_days": [1, 15, 28],
        "times": ["10:00"]
      },
      "mission_created_at": "2026-04-10T03:00:00Z"
    }
  ]
}
```

### GET /missions/{id}

Request:

```http
GET /missions/12
Authorization: Bearer <JWT>
```

Response:

```json
{
  "id": 12,
  "user_id": 2,
  "uav_id": 1,
  "mission_name": "Weekly Patrol",
  "takeoff_altitude": 25,
  "roi": {
    "latitude": -6.2101,
    "longitude": 106.8291
  },
  "schedule": "2026-04-18T08:00:00+07:00",
  "schedule_type": "weekly",
  "schedule_timezone": "Asia/Jakarta",
  "schedule_config": {
    "weeks": 8,
    "weekdays": [1, 3, 5],
    "times": ["08:00", "15:00"]
  },
  "priority": 160,
  "status": "Waiting",
  "timestamp": "2026-04-17T09:00:00Z",
  "waypoints": [
    {
      "id": 101,
      "mission_id": 12,
      "sequence_order": 1,
      "latitude": -6.2101,
      "longitude": 106.8291,
      "altitude": 25,
      "action": "Take Picture",
      "action_duration": 5
    },
    {
      "id": 102,
      "mission_id": 12,
      "sequence_order": 2,
      "latitude": -6.2108,
      "longitude": 106.8302,
      "altitude": 30,
      "action": "Record Video",
      "action_duration": 3
    }
  ]
}
```

### GET /mission/current

Dipakai device untuk mengetahui apakah ada mission run aktif pada scope token sekarang.

Request:

```http
GET /mission/current
X-Device-Token: <DEVICE_TOKEN>
```

Response jika ada mission aktif:

```json
{
  "scope_type": "uav",
  "uav_id": 1,
  "has_active_mission": true,
  "mission_id": 12,
  "history_id": 55,
  "mission_history_id": 55,
  "status": "InProgress"
}
```

Response jika tidak ada mission aktif:

```json
{
  "scope_type": "uav",
  "uav_id": 1,
  "has_active_mission": false
}
```

### GET /missions/waiting/device

Dipakai device untuk mengambil mission `Waiting` terdekat untuk UAV hasil resolusi token.

Request:

```http
GET /missions/waiting/device
X-Device-Token: <DEVICE_TOKEN>
```

Response:

```json
{
  "id": 12,
  "user_id": 2,
  "uav_id": 1,
  "mission_name": "Weekly Patrol",
  "takeoff_altitude": 25,
  "schedule": "2026-04-18T08:00:00+07:00",
  "schedule_type": "weekly",
  "schedule_timezone": "Asia/Jakarta",
  "schedule_config": {
    "weeks": 8,
    "weekdays": [1, 3, 5],
    "times": ["08:00", "15:00"]
  },
  "status": "Waiting",
  "timestamp": "2026-04-17T09:00:00Z",
  "waypoints": [
    {
      "id": 101,
      "mission_id": 12,
      "sequence_order": 1,
      "latitude": -6.2101,
      "longitude": 106.8291,
      "altitude": 25,
      "action": "Take Picture",
      "action_duration": 5
    }
  ]
}
```

### GET /missions/safe-to-fly/device

Dipakai device untuk mengambil mission runtime yang sedang ada di status `SafeToFly`.
Kalau ada mission `SafeToFly`, backend mengembalikan `200` dengan payload mission itu.
Kalau tidak ada mission `SafeToFly` tetapi ada mission kandidat terdekat, backend juga mengembalikan `200` dengan field `nearest_mission`.
Candidate terdekat diprioritaskan dari mission aktif `PreparingDock`; kalau tidak ada, backend memakai mission `Waiting` terdekat.
Backend hanya mengembalikan `404` jika benar-benar tidak ada `SafeToFly` maupun candidate mission lain.

Request:

```http
GET /missions/safe-to-fly/device
X-Device-Token: <DEVICE_TOKEN>
```

Response:

```json
{
  "id": 12,
  "user_id": 2,
  "uav_id": 1,
  "mission_name": "Weekly Patrol",
  "takeoff_altitude": 25,
  "schedule": "2026-04-18T08:00:00+07:00",
  "schedule_type": "weekly",
  "schedule_timezone": "Asia/Jakarta",
  "schedule_config": {
    "weeks": 8,
    "weekdays": [1, 3, 5],
    "times": ["08:00", "15:00"]
  },
  "status": "InProgress",
  "timestamp": "2026-04-17T09:00:00Z",
  "waypoints": [
    {
      "id": 101,
      "mission_id": 12,
      "sequence_order": 1,
      "latitude": -6.2101,
      "longitude": 106.8291,
      "altitude": 25,
      "action": "Take Picture",
      "action_duration": 5
    }
  ],
  "history_id": 55,
  "runtime_status": "SafeToFly"
}
```

Fallback `200` response when no `SafeToFly` mission exists and there is still an active runtime mission before `SafeToFly`:

```json
{
  "message": "No SafeToFly mission found; returning nearest mission candidate for this device",
  "nearest_mission": {
    "id": 12,
    "user_id": 2,
    "uav_id": 1,
    "mission_name": "Weekly Patrol",
    "takeoff_altitude": 25,
    "schedule": "2026-04-18T08:00:00+07:00",
    "schedule_type": "weekly",
    "schedule_timezone": "Asia/Jakarta",
    "schedule_config": {
      "weeks": 8,
      "weekdays": [1, 3, 5],
      "times": ["08:00", "15:00"]
    },
    "status": "InProgress",
    "timestamp": "2026-04-17T09:00:00Z",
    "waypoints": [
      {
        "id": 101,
        "mission_id": 12,
        "sequence_order": 1,
        "latitude": -6.2101,
        "longitude": 106.8291,
        "altitude": 25,
        "action": "Take Picture",
        "action_duration": 5
      }
    ],
    "history_id": 55,
    "runtime_status": "PreparingDock"
  }
}
```

Fallback `200` response when no `SafeToFly` mission exists and the nearest fallback is an upcoming `Waiting` mission:

```json
{
  "message": "No SafeToFly mission found; returning nearest mission candidate for this device",
  "nearest_mission": {
    "id": 14,
    "user_id": 2,
    "uav_id": 1,
    "mission_name": "Nearest Waiting Mission",
    "takeoff_altitude": 20,
    "schedule": "2026-04-18T10:00:00+07:00",
    "schedule_type": "daily",
    "schedule_timezone": "Asia/Jakarta",
    "schedule_config": {
      "start_date": "2026-04-18",
      "end_date": "2026-04-30",
      "times": ["10:00"]
    },
    "status": "Waiting",
    "timestamp": "2026-04-17T09:00:00Z",
    "waypoints": []
  }
}
```

`404` response when no `SafeToFly` mission and no candidate mission are available:

```json
{
  "message": "No SafeToFly mission found for this device"
}
```

### GET /mission-history

Query params:
- `page`
- `limit`
- `mission_id`
- `mission_name` partial match, case-insensitive

Catatan field item:
- `waypoint_count` dihitung dari `mission_snapshot.waypoints`
- `tasks` diambil dari semua `action` waypoint pada `mission_snapshot`, tanpa normalisasi label
- backend akan menghapus duplikasi action dengan perbandingan case-insensitive, lalu mempertahankan kemunculan pertama
- `task_summary` adalah gabungan string ringkas untuk tampilan tabel frontend
- `uav_home_latitude` dan `uav_home_longitude` adalah home point UAV yang dibekukan saat history run dibuat

Request:

```http
GET /mission-history?page=1&limit=20&mission_id=12&mission_name=Weekly
Authorization: Bearer <JWT>
```

Response:

```json
{
  "page": 1,
  "limit": 20,
  "total": 1,
  "total_pages": 1,
  "has_next": false,
  "has_prev": false,
  "next_page": null,
  "prev_page": null,
  "items": [
    {
      "id": 55,
      "mission_id": 12,
      "mission_name": "Weekly Patrol",
      "user_id": 2,
      "uav_id": 1,
      "status": "Completed",
      "uav_home_latitude": -6.2105,
      "uav_home_longitude": 106.8296,
      "failure_reason": null,
      "started_at": "2026-04-18T08:00:03Z",
      "completed_at": "2026-04-18T08:14:11Z",
      "waypoint_count": 6,
      "tasks": ["Take Picture", "Record Video"],
      "task_summary": "Take Picture & Record Video",
      "media_count": 3,
      "created_at": "2026-04-18T08:00:00Z",
      "mission_snapshot": {
        "id": 12,
        "mission_name": "Weekly Patrol",
        "schedule": "2026-04-18T08:00:00+07:00",
        "waypoints": [
          {
            "sequence_order": 1,
            "action": "Take Picture"
          },
          {
            "sequence_order": 2,
            "action": "Record Video"
          }
        ]
      }
    }
  ]
}
```

### GET /mission-history/{history_id}/state

Request:

```http
GET /mission-history/55/state
Authorization: Bearer <JWT>
```

Response:

```json
{
  "history_id": 55,
  "mission_id": 12,
  "user_id": 2,
  "uav_id": 1,
  "docking_id": 1,
  "uav_home_latitude": -6.2105,
  "uav_home_longitude": 106.8296,
  "status": "Completed",
  "is_terminal": true,
  "failure_code": null,
  "failure_reason": null,
  "completed_at": "2026-04-18T08:14:11Z",
  "last_event_at": "2026-04-18T08:14:11Z"
}
```

### GET /mission-history/{history_id}/events

Request:

```http
GET /mission-history/55/events
Authorization: Bearer <JWT>
```

Response:

```json
{
  "history_id": 55,
  "count": 3,
  "items": [
    {
      "id": 9001,
      "history_id": 55,
      "from_state": null,
      "to_state": "SafeToFly",
      "result": null,
      "failure_code": null,
      "message": "preflight passed",
      "is_terminal": false,
      "created_at": "2026-04-18T07:59:58Z"
    },
    {
      "id": 9002,
      "history_id": 55,
      "from_state": "SafeToFly",
      "to_state": "InProgress",
      "result": null,
      "failure_code": null,
      "message": "mission started",
      "is_terminal": false,
      "created_at": "2026-04-18T08:00:03Z"
    },
    {
      "id": 9003,
      "history_id": 55,
      "from_state": "InProgress",
      "to_state": "Completed",
      "result": "success",
      "failure_code": null,
      "message": "mission completed",
      "is_terminal": true,
      "created_at": "2026-04-18T08:14:11Z"
    }
  ]
}
```

### GET /mission-history/{history_id}/media

Query params:
- `event_id` optional
- `include_full_video` optional, default `false`

Request:

```http
GET /mission-history/55/media?event_id=9002
Authorization: Bearer <JWT>
```

Response:

```json
{
  "history_id": 55,
  "media_root": "/data/missions",
  "archive_download_path": "/mission-history/55/media/archive",
  "full_video_download_path": "/mission-history/55/full-video",
  "event_id": 9002,
  "count": 1,
  "items": [
    {
      "id": 301,
      "history_id": 55,
      "event_id": 9002,
      "media_type": "image",
      "media_role": "attachment",
      "file_path": "history-55/media/image_001.jpg",
      "resolved_path": "/data/missions/history-55/media/image_001.jpg",
      "download_path": "/mission-media/301/download",
      "created_at": "2026-04-18T08:00:05Z"
    }
  ]
}
```

### POST /mission-history/{history_id}/media/upload

Request:

```http
POST /mission-history/55/media/upload
Authorization: Bearer <JWT>
Content-Type: multipart/form-data
```

Form fields:
- `file` required
- `event_id` optional
- `mission_id` optional
- `uav_id` optional
- `media_role` optional, default `attachment`
- `media_type` optional, default diturunkan dari ekstensi file

Catatan:
- mendukung image `.jpg`, `.jpeg`, `.png`, `.webp`
- mendukung video `.mp4`, `.m4`, `.m4v`
- `media_role=full_video` hanya boleh untuk file video
- file akan disimpan otomatis di bawah `MISSION_MEDIA_ROOT/history-{history_id}`

Response:

```json
{
  "history_id": 55,
  "media_root": "/data/missions",
  "archive_download_path": "/mission-history/55/media/archive",
  "full_video_download_path": "/mission-history/55/full-video",
  "item": {
    "id": 301,
    "history_id": 55,
    "event_id": 9002,
    "media_type": "video",
    "media_role": "attachment",
    "file_path": "history-55/media/20260511T040506.123456789_capture_clip.mp4",
    "resolved_path": "/data/missions/history-55/media/20260511T040506.123456789_capture_clip.mp4",
    "download_path": "/mission-media/301/download",
    "created_at": "2026-05-11T04:05:06Z"
  },
  "message": "Mission media uploaded successfully"
}
```

### POST /mission-history/{history_id}/media/register

Request:

```http
POST /mission-history/55/media/register
Authorization: Bearer <JWT>
Content-Type: application/json
```

```json
{
  "event_id": 9002,
  "items": [
    {
      "media_type": "image",
      "media_role": "attachment",
      "storage_rel_path": "history-55/media/image_001.jpg"
    },
    {
      "media_type": "video",
      "media_role": "full_video",
      "storage_rel_path": "history-55/fullVideo.mp4"
    }
  ]
}
```

Catatan:
- file harus sudah ada di bawah `MISSION_MEDIA_ROOT`
- `storage_rel_path` harus relatif dan tetap di folder history yang sama
- folder history harus memakai format `history-{history_id}`
- contoh untuk `history_id=1`:

```text
{MISSION_MEDIA_ROOT}/history-1/
  fullVideo.mp4
  media/
    image_001.jpg
    video_001.mp4
```

- contoh `storage_rel_path` untuk `history_id=1`:
  - `history-1/fullVideo.mp4`
  - `history-1/media/image_001.jpg`
  - `history-1/media/video_001.mp4`
- `full_video` didownload terpisah dan tidak ikut ke ZIP archive media

### POST /mission-history/{history_id}/full-video/upload

Request:

```http
POST /mission-history/55/full-video/upload
Authorization: Bearer <JWT>
Content-Type: multipart/form-data
```

Form fields:
- `file` required
- `event_id` optional
- `mission_id` optional
- `uav_id` optional
- `media_type` optional, bila dikirim harus `video`

Catatan:
- endpoint ini memaksa `media_role=full_video`
- full video lama untuk history yang sama akan diganti di database
- file disimpan otomatis sebagai `history-{history_id}/fullVideo.<ext>`

### GET /mission-history/{history_id}/media/archive

Request:

```http
GET /mission-history/55/media/archive
Authorization: Bearer <JWT>
```

Response:

- body bukan JSON, tetapi file ZIP berisi media `attachment`
- `full_video` tidak ikut dimasukkan

### GET /mission-history/{history_id}/full-video

Request:

```http
GET /mission-history/55/full-video
Authorization: Bearer <JWT>
```

Response:

- body bukan JSON, tetapi file binary full video mission

### GET /mission-media/{media_id}/download

Request:

```http
GET /mission-media/301/download
Authorization: Bearer <JWT>
```

Response:

- body bukan JSON, tetapi file binary image/video
- header utama:
  - `Content-Type` sesuai ekstensi file
  - `Content-Disposition: attachment; filename="mission_55_media_301.jpg"`

### GET /telemetry/track

Request:

```http
GET /telemetry/track
Authorization: Bearer <JWT>
```

Device token UAV atau docking yang terhubung ke UAV yang sama juga boleh mengakses endpoint ini.

Response saat ada mission aktif:

```json
{
  "history_id": 91,
  "mission_id": 12,
  "started_at": "2026-04-21T10:12:01Z",
  "last_recorded_at": "2026-04-21T10:25:44Z",
  "points": [
    {
      "recorded_at": "2026-04-21T10:12:05Z",
      "latitude": -6.201,
      "longitude": 106.817,
      "altitude": 34.2,
      "heading": 120
    }
  ]
}
```

Response saat tidak ada mission aktif tetapi track mission terakhir masih tersedia:

```json
{
  "history_id": 91,
  "mission_id": 12,
  "started_at": "2026-04-21T10:12:01Z",
  "last_recorded_at": "2026-04-21T10:25:44Z",
  "points": [
    {
      "recorded_at": "2026-04-21T10:12:05Z",
      "latitude": -6.201,
      "longitude": 106.817,
      "altitude": 34.2,
      "heading": 120
    }
  ]
}
```

Response saat tidak ada mission aktif dan tidak ada track tersimpan:

```json
{
  "history_id": null,
  "mission_id": null,
  "started_at": null,
  "last_recorded_at": null,
  "points": []
}
```

Rules:
- endpoint ini otomatis mengacu ke UAV singleton yang terkonfigurasi
- jika ada mission aktif, endpoint mengembalikan track untuk `mission_history` aktif terbaru
- jika tidak ada mission aktif, endpoint fallback ke track mission terakhir yang masih tersimpan
- `history_id` adalah anchor utama untuk seluruh track point yang dikembalikan
- `last_recorded_at` adalah `recorded_at` dari titik terakhir yang tersimpan, bukan timestamp WebSocket terakhir
- urutan `points` selalu ascending berdasarkan `recorded_at`
- track mission terakhir tetap tersedia sampai mission berikutnya `start`

Telemetry payload fields yang dikenali untuk persistence track:
- koordinat: `latitude` atau `lat`, dan `longitude` atau `lng` atau `lon`
- altitude: `altitude` atau `alt`
- heading: `heading` atau `course` atau `yaw`
- waktu point: `recorded_at`, `timestamp`, atau `ts`

Rules untuk waktu point:
- jika payload membawa waktu valid RFC3339, backend memakai waktu itu sebagai `recorded_at`
- jika payload membawa unix timestamp numerik, backend juga menerima nilainya
- jika payload tidak membawa waktu point, backend fallback ke waktu server saat request diterima

## Device Tokens

- token di-return sekali saat create
- token lama untuk scope yang sama akan direvoke
- token tidak auto-expire
- hash yang disimpan: `SHA256(<token> + DEVICE_TOKEN_PEPPER)`

Example `GET /device-context` response:

```json
{
  "token_id": 12,
  "scope_type": "uav",
  "uav_id": 1,
  "resolved_uav_id": 1
}
```

## Source of Truth

- endpoint examples dan runnable requests: [postman_collection.json](/Users/macbook/Workdir/Office/Projects/drone/be-drone-mission/postman_collection.json)
- implementation: `internal/handlers`
- singleton config tables: `singleton_uav`, `singleton_docking`
