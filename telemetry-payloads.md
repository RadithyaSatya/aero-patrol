# Telemetry Payloads

Dokumen ini menjelaskan payload WebSocket yang dipublish oleh service.

Format outer message selalu:

```json
{
  "type": "publish",
  "uav_id": 2,
  "kind": "telemetry",
  "metric": "<metric_name>",
  "payload": { ... }
}
```

Catatan:

- field yang bernilai `null` tidak ikut dikirim
- semua payload di bawah adalah bentuk maksimum; payload aktual bisa lebih kecil

## 1. `vehicle_state`

Sumber:bolehh 

- `HEARTBEAT`
- `EXTENDED_SYS_STATE`

Payload:

```json
{
  "connected": true,
  "armed": true,
  "mode": "AUTO",
  "landed_state": "IN_AIR",
  "in_mission": true,
  "flight_speed": 8.0
}
```

Arti field tambahan:

- `in_mission`: `true` sejak service mendapatkan mission valid sampai mission selesai / aborted / failed
- `connected`: `false` jika heartbeat MAVLink hilang lebih dari beberapa detik, menandakan drone / FC disconnect
- `flight_speed`: target speed dari parameter FC seperti `WPNAV_SPEED`, satuan meter per detik

## 2. `location`

Sumber:

- `GLOBAL_POSITION_INT`
- `VFR_HUD`

Payload:

```json
{
  "latitude": -6.2000000,
  "longitude": 106.8000000,
  "altitude": 45.2,
  "ground_speed": 8.41,
  "heading": 172.5,
  "climb_rate": -0.35
}
```

Arti field:

- `altitude`: relative altitude meter
- `ground_speed`: meter per second
- `heading`: derajat
- `climb_rate`: meter per second

## 3. `gps`

Sumber:

- `GPS_RAW_INT`

Payload:

```json
{
  "fix_type": 3,
  "fix_type_label": "GPS_3D",
  "satellites": 12,
  "hdop": 1.45,
  "eph": 145
}
```

Arti `fix_type_label`:

- `NO_GPS`
- `NO_FIX`
- `GPS_2D`
- `GPS_3D`
- `DGPS`
- `RTK_FLOAT`
- `RTK_FIX`
- `STATIC`
- `PPP`

## 4. `gps2`

Sumber:

- `GPS2_RAW`

Payload:

```json
{
  "fix_type": 6,
  "fix_type_label": "RTK_FIX",
  "satellites": 14,
  "hdop": 0.85,
  "eph": 85
}
```

Catatan:

- `gps2` merepresentasikan receiver GPS kedua dari autopilot
- field dan arti `fix_type_label` sama dengan `gps`
- jika autopilot atau link MAVLink tidak mengirim `GPS2_RAW`, field `gps2` tidak ikut terkirim

## 5. `attitude`

Sumber:

- `ATTITUDE`

Payload:

```json
{
  "roll_deg": 1.2,
  "pitch_deg": -0.8,
  "yaw_deg": 173.4,
  "roll_rate_dps": 0.6,
  "pitch_rate_dps": -0.3,
  "yaw_rate_dps": 1.1
}
```

## 6. `battery`

Sumber:

- `SYS_STATUS`
- fallback `BATTERY_STATUS`

Payload:

```json
{
  "percent": 81,
  "voltage": 15.62,
  "current": 8.41,
  "power": 131.38
}
```

Arti field:

- `percent`: default-nya dari `SYS_STATUS` / `BATTERY_STATUS`; jika `BATTERY_PERCENT_USE_VOLTAGE=1`, nilainya dihitung dari rentang `BATTERY_VOLTAGE_MIN..BATTERY_VOLTAGE_MAX`
- `voltage`: volt
- `current`: ampere
- `power`: watt

## 7. `mission_progress`

Sumber:

- `MISSION_CURRENT`

Payload:

```json
{
  "current_waypoint": 4
}
```

## 8. `link`

Sumber:

- `RC_CHANNELS`
- fallback `RADIO_STATUS`
- `MLRS_RADIO_LINK_STATS`
- `MLRS_RADIO_LINK_INFORMATION`

Payload:

```json
{
  "rssi": 189,
  "source": "mlrs_radio_link_stats",
  "rx_lq_rc": 98,
  "rx_lq_ser": 97,
  "tx_lq_ser": 96,
  "rx_rssi1": 189,
  "rx_rssi2": 186,
  "tx_rssi1": 184,
  "tx_rssi2": 182,
  "rx_snr1": 21,
  "rx_snr2": 19,
  "tx_snr1": 18,
  "tx_snr2": 17,
  "frequency1": 915000000,
  "frequency2": 915000000,
  "tx_power": 20,
  "rx_power": 20
}
```

Catatan:

- Jika message MLRS tersedia, `rssi` akan mengutamakan `rx_rssi1` / `rx_rssi2`
- Jika tidak tersedia, service fallback ke `RC_CHANNELS.rssi`, lalu `RADIO_STATUS.rssi`

## 9. `mission_event`

Ini bukan telemetry kontinu, tapi event sederhana untuk penanda fase mission di frontend.

Payload:

```json
{
  "history_id": 123,
  "event": "takeoff",
  "message": "Drone started takeoff",
  "schedule_time": "2026-05-18T10:30:00+07:00"
}
```

Field `schedule_time` ikut dikirim pada event mission yang berasal dari launch flow, supaya frontend tetap tahu target jadwal takeoff walau fase `PreparingDock` dimulai lebih awal.

Event yang saat ini bisa dikirim:

- `mission_uploaded`
- `takeoff`
- `mission_started`
- `landed`
- `mission_aborted`
- `mission_failed`

## 10. `mission_status`

Ini snapshot periodik status mission sejak mission runtime sudah mulai ada, termasuk fase `PreparingDock` sebelum takeoff, lalu berlanjut saat mission aktif berjalan.

Payload:

```json
{
  "history_id": 123,
  "mission_id": 12,
  "runtime_status": "PreparingDock",
  "mission_ready": false,
  "schedule_time": "2026-05-18T10:30:00+07:00",
  "updated_at": "2026-05-18T10:25:05+07:00"
}
```

Arti field:

- `history_id`: id runtime mission jika sudah ada
- `mission_id`: id template mission
- `runtime_status`: status runtime paling baru dari backend, misalnya `PreparingDock`, `SafeToFly`, `Takeoff`, `Landed`, `DockConfirmed`, atau `Completed`
- `mission_ready`: `true` jika mission yang sama sudah benar-benar siap dieksekusi / sudah masuk fase active runtime
- `schedule_time`: target jadwal mission
- `updated_at`: waktu snapshot dibuat oleh service

Nilai `runtime_status` yang umum:

- `PreparingDock`: docking / persiapan mission sudah dimulai
- `SafeToFly`: mission sudah siap untuk dieksekusi saat waktu schedule cocok
- `Takeoff`: drone sudah masuk fase takeoff / mission aktif
- `Landed`: landing terdeteksi
- `DockConfirmed`: backend mengonfirmasi proses dock selesai
- `Completed`: mission selesai tuntas
- `Failed`: mission berakhir gagal
- `Aborted`: mission dibatalkan sebelum selesai

Frekuensi publish:

- dipublish segera saat state berubah
- selain itu dipublish periodik tiap `5` detik selama mission runtime masih dimonitor oleh service
- saat mission berakhir dengan `Failed`, `Aborted`, `Landed`, `DockConfirmed`, atau `Completed`, service juga mengirim snapshot terminal terakhir agar subscriber baru tetap bisa melihat status akhirnya

## Yang Tidak Dipublish Oleh Service Ini

Service ini tidak mengirim:

- `kind: status`
- `uav_status`
- `docking_status`

Status seperti itu tetap sebaiknya masuk lewat endpoint realtime HTTP yang memang meng-upsert ke DB.
