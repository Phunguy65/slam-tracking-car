"""
Web Dashboard — Giao diện điều khiển xe tự lái
Inline HTML + CSS + JS, không cần static files
"""

DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚗 Autonomous Vehicle Dashboard</title>
    <meta name="description" content="Dashboard điều khiển xe tự lái - ESP32 + LiDAR + MQTT">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        /* ── Reset & Variables ─────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --bg-primary: #0a0e1a;
            --bg-secondary: #111827;
            --bg-card: rgba(17, 24, 39, 0.7);
            --bg-glass: rgba(255, 255, 255, 0.04);
            --border-glass: rgba(255, 255, 255, 0.08);
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --accent-blue: #3b82f6;
            --accent-cyan: #06b6d4;
            --accent-green: #10b981;
            --accent-yellow: #f59e0b;
            --accent-red: #ef4444;
            --accent-purple: #8b5cf6;
            --gradient-main: linear-gradient(135deg, #3b82f6, #06b6d4);
            --gradient-danger: linear-gradient(135deg, #ef4444, #f97316);
            --shadow-glow: 0 0 30px rgba(59, 130, 246, 0.15);
            --radius: 16px;
            --radius-sm: 10px;
            --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            overflow-x: hidden;
        }

        body::before {
            content: '';
            position: fixed;
            top: -50%; left: -50%;
            width: 200%; height: 200%;
            background: radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 50%),
                        radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.06) 0%, transparent 50%),
                        radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.05) 0%, transparent 50%);
            z-index: 0;
            animation: bgFloat 20s ease-in-out infinite;
        }

        @keyframes bgFloat {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(2%, -1%) rotate(1deg); }
            66% { transform: translate(-1%, 2%) rotate(-1deg); }
        }

        /* ── Layout ───────────────────────────────── */
        .app { position: relative; z-index: 1; }

        .header {
            padding: 20px 32px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--border-glass);
            backdrop-filter: blur(20px);
            background: rgba(10, 14, 26, 0.8);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .logo {
            width: 42px; height: 42px;
            background: var(--gradient-main);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            box-shadow: 0 4px 15px rgba(59,130,246,0.3);
        }

        .header h1 {
            font-size: 1.25rem;
            font-weight: 700;
            background: var(--gradient-main);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .header h1 span {
            font-weight: 400;
            font-size: 0.85rem;
            -webkit-text-fill-color: var(--text-muted);
        }

        .connection-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 99px;
            font-size: 0.8rem;
            font-weight: 500;
            border: 1px solid var(--border-glass);
            background: var(--bg-glass);
        }

        .connection-badge .dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            background: var(--accent-green);
            animation: pulse 2s ease-in-out infinite;
        }

        .connection-badge.offline .dot {
            background: var(--accent-red);
            animation: none;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
            50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(16,185,129,0); }
        }

        .main {
            display: grid;
            grid-template-columns: 1fr 340px;
            grid-template-rows: auto auto;
            gap: 20px;
            padding: 24px 32px;
            max-width: 1440px;
            margin: 0 auto;
        }

        /* ── Card Base ────────────────────────────── */
        .card {
            background: var(--bg-card);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius);
            backdrop-filter: blur(12px);
            overflow: hidden;
            transition: var(--transition);
        }

        .card:hover {
            border-color: rgba(255,255,255,0.12);
            box-shadow: var(--shadow-glow);
        }

        .card-header {
            padding: 18px 22px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--border-glass);
        }

        .card-header h2 {
            font-size: 0.95rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .card-header h2 .icon {
            width: 32px; height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
        }

        .card-body { padding: 20px 22px; }

        /* ── Status Grid (top-left) ───────────────── */
        .status-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
            margin-bottom: 8px;
        }

        .stat-item {
            background: var(--bg-glass);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-sm);
            padding: 16px;
            text-align: center;
            transition: var(--transition);
        }

        .stat-item:hover {
            background: rgba(255,255,255,0.06);
            transform: translateY(-2px);
        }

        .stat-item .label {
            font-size: 0.7rem;
            font-weight: 500;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .stat-item .value {
            font-size: 1.5rem;
            font-weight: 700;
            background: var(--gradient-main);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .stat-item .unit {
            font-size: 0.7rem;
            color: var(--text-secondary);
            margin-top: 4px;
        }

        /* ── Mode Selector ─────────────────────────── */
        .mode-selector {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 16px;
        }

        .mode-btn {
            flex: 1;
            min-width: 100px;
            padding: 10px 14px;
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-sm);
            background: var(--bg-glass);
            color: var(--text-secondary);
            font-family: inherit;
            font-size: 0.78rem;
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition);
            text-align: center;
        }

        .mode-btn:hover {
            background: rgba(255,255,255,0.08);
            color: var(--text-primary);
            border-color: rgba(255,255,255,0.15);
        }

        .mode-btn.active {
            background: rgba(59,130,246,0.15);
            border-color: var(--accent-blue);
            color: var(--accent-blue);
            box-shadow: 0 0 15px rgba(59,130,246,0.15);
        }

        .mode-btn.emergency {
            border-color: rgba(239,68,68,0.3);
            color: var(--accent-red);
        }

        .mode-btn.emergency:hover, .mode-btn.emergency.active {
            background: rgba(239,68,68,0.15);
            border-color: var(--accent-red);
            box-shadow: 0 0 15px rgba(239,68,68,0.2);
        }

        /* ── LiDAR Radar ──────────────────────────── */
        .lidar-section {
            grid-row: span 2;
        }

        .radar-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
        }

        #lidarCanvas {
            width: 290px;
            height: 290px;
            border-radius: 50%;
            box-shadow: 0 0 40px rgba(6,182,212,0.1), inset 0 0 40px rgba(6,182,212,0.05);
        }

        .lidar-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            width: 100%;
        }

        .lidar-stat {
            background: var(--bg-glass);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-sm);
            padding: 12px;
            text-align: center;
        }

        .lidar-stat .val {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--accent-cyan);
        }

        .lidar-stat .lbl {
            font-size: 0.65rem;
            color: var(--text-muted);
            text-transform: uppercase;
            margin-top: 4px;
        }

        /* ── Control Panel ─────────────────────────── */
        .controls-section { grid-column: 1; }

        .control-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .control-group h3 {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 14px;
        }

        /* Direction Pad */
        .dpad {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(3, 1fr);
            gap: 6px;
            width: 180px;
            margin: 0 auto;
        }

        .dpad-btn {
            width: 56px; height: 56px;
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-sm);
            background: var(--bg-glass);
            color: var(--text-secondary);
            font-size: 1.3rem;
            cursor: pointer;
            transition: var(--transition);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .dpad-btn:hover {
            background: rgba(59,130,246,0.15);
            border-color: var(--accent-blue);
            color: var(--accent-blue);
            transform: scale(1.05);
        }

        .dpad-btn:active {
            transform: scale(0.95);
            background: rgba(59,130,246,0.25);
        }

        .dpad-btn.stop-btn {
            background: rgba(239,68,68,0.1);
            border-color: rgba(239,68,68,0.3);
            color: var(--accent-red);
            font-size: 0.7rem;
            font-weight: 700;
            font-family: inherit;
        }

        .dpad-btn.stop-btn:hover {
            background: rgba(239,68,68,0.25);
            border-color: var(--accent-red);
            box-shadow: 0 0 20px rgba(239,68,68,0.3);
        }

        .dpad-center { grid-column: 2; grid-row: 2; }
        .dpad-up     { grid-column: 2; grid-row: 1; }
        .dpad-down   { grid-column: 2; grid-row: 3; }
        .dpad-left   { grid-column: 1; grid-row: 2; }
        .dpad-right  { grid-column: 3; grid-row: 2; }

        /* Sliders */
        .slider-group {
            margin-bottom: 18px;
        }

        .slider-label {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .slider-label span {
            font-size: 0.78rem;
            color: var(--text-secondary);
        }

        .slider-label .slider-val {
            font-weight: 600;
            color: var(--accent-cyan);
            font-size: 0.85rem;
        }

        input[type="range"] {
            -webkit-appearance: none;
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: rgba(255,255,255,0.08);
            outline: none;
            transition: var(--transition);
        }

        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px; height: 20px;
            border-radius: 50%;
            background: var(--gradient-main);
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(59,130,246,0.4);
            transition: var(--transition);
        }

        input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.2);
            box-shadow: 0 2px 16px rgba(59,130,246,0.6);
        }

        /* Emergency Stop */
        .emergency-btn {
            width: 100%;
            padding: 16px;
            border: 2px solid var(--accent-red);
            border-radius: var(--radius-sm);
            background: rgba(239,68,68,0.1);
            color: var(--accent-red);
            font-family: inherit;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            transition: var(--transition);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 16px;
            position: relative;
            overflow: hidden;
        }

        .emergency-btn::before {
            content: '';
            position: absolute;
            inset: 0;
            background: var(--gradient-danger);
            opacity: 0;
            transition: opacity 0.3s;
        }

        .emergency-btn:hover {
            background: rgba(239,68,68,0.2);
            box-shadow: 0 0 30px rgba(239,68,68,0.3);
            transform: translateY(-1px);
        }

        .emergency-btn:hover::before { opacity: 0.15; }

        .emergency-btn:active {
            transform: translateY(1px);
        }

        /* ── Alerts Feed ──────────────────────────── */
        .alerts-section {
            grid-column: 1 / -1;
        }

        .alerts-list {
            max-height: 200px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .alerts-list::-webkit-scrollbar { width: 4px; }
        .alerts-list::-webkit-scrollbar-track { background: transparent; }
        .alerts-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

        .alert-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 14px;
            border-radius: var(--radius-sm);
            background: var(--bg-glass);
            border: 1px solid var(--border-glass);
            font-size: 0.8rem;
            animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
        }

        .alert-item .alert-dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .alert-item.INFO .alert-dot    { background: var(--accent-blue); }
        .alert-item.WARNING .alert-dot  { background: var(--accent-yellow); }
        .alert-item.CRITICAL .alert-dot { background: var(--accent-red); box-shadow: 0 0 8px rgba(239,68,68,0.5); }

        .alert-item .alert-msg {
            flex: 1;
            color: var(--text-secondary);
        }

        .alert-item .alert-time {
            font-size: 0.7rem;
            color: var(--text-muted);
            white-space: nowrap;
        }

        .empty-state {
            text-align: center;
            padding: 30px;
            color: var(--text-muted);
            font-size: 0.85rem;
        }

        /* ── Vehicle Selector ─────────────────────── */
        .vehicle-select {
            background: var(--bg-glass);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-sm);
            color: var(--text-primary);
            padding: 8px 12px;
            font-family: inherit;
            font-size: 0.82rem;
            cursor: pointer;
            outline: none;
            min-width: 160px;
        }

        .vehicle-select:focus {
            border-color: var(--accent-blue);
        }

        .vehicle-select option {
            background: var(--bg-secondary);
        }

        /* ── Responsive ───────────────────────────── */
        @media (max-width: 900px) {
            .main {
                grid-template-columns: 1fr;
                padding: 16px;
            }
            .lidar-section { grid-row: auto; }
            .status-grid { grid-template-columns: repeat(2, 1fr); }
            .control-grid { grid-template-columns: 1fr; }
            .header { padding: 16px; }
        }
    </style>
</head>
<body>
<div class="app">

    <!-- ═══ Header ═══ -->
    <header class="header">
        <div class="header-left">
            <div class="logo">🚗</div>
            <h1>Autonomous Vehicle <span>Dashboard v1.0</span></h1>
        </div>
        <div style="display:flex;align-items:center;gap:14px;">
            <select id="vehicleSelect" class="vehicle-select" onchange="selectVehicle(this.value)">
                <option value="">-- Chọn xe --</option>
            </select>
            <div id="connBadge" class="connection-badge offline">
                <div class="dot"></div>
                <span id="connText">Chưa kết nối</span>
            </div>
        </div>
    </header>

    <!-- ═══ Main Grid ═══ -->
    <main class="main">

        <!-- ── Status + Mode (top-left) ────── -->
        <section class="card" id="statusCard">
            <div class="card-header">
                <h2><span class="icon" style="background:rgba(59,130,246,0.15);">📊</span> Trạng Thái Xe</h2>
                <span id="modeLabel" style="font-size:0.78rem;color:var(--accent-blue);font-weight:600;">MANUAL</span>
            </div>
            <div class="card-body">
                <div class="status-grid">
                    <div class="stat-item">
                        <div class="label">Tốc Độ</div>
                        <div class="value" id="statSpeed">0</div>
                        <div class="unit">%</div>
                    </div>
                    <div class="stat-item">
                        <div class="label">Hướng</div>
                        <div class="value" id="statDirection" style="font-size:1rem;">STOP</div>
                        <div class="unit">&nbsp;</div>
                    </div>
                    <div class="stat-item">
                        <div class="label">Servo</div>
                        <div class="value" id="statServo">90</div>
                        <div class="unit">°</div>
                    </div>
                    <div class="stat-item">
                        <div class="label">Vật Cản</div>
                        <div class="value" id="statObstacle" style="font-size:1rem;">—</div>
                        <div class="unit">&nbsp;</div>
                    </div>
                </div>
                <div class="status-grid" style="margin-top:12px;">
                    <div class="stat-item">
                        <div class="label">Latitude</div>
                        <div class="value" id="statLat" style="font-size:1rem;">—</div>
                        <div class="unit">GPS</div>
                    </div>
                    <div class="stat-item">
                        <div class="label">Longitude</div>
                        <div class="value" id="statLon" style="font-size:1rem;">—</div>
                        <div class="unit">GPS</div>
                    </div>
                    <div class="stat-item">
                        <div class="label">LiDAR Min</div>
                        <div class="value" id="statLidarMin">—</div>
                        <div class="unit">cm</div>
                    </div>
                    <div class="stat-item">
                        <div class="label">Waypoints</div>
                        <div class="value" id="statWaypoints">0</div>
                        <div class="unit">loaded</div>
                    </div>
                </div>
                <!-- Mode Selector -->
                <div class="mode-selector">
                    <button class="mode-btn active" onclick="setMode('MANUAL')" id="modeMANUAL">🎮 Manual</button>
                    <button class="mode-btn" onclick="setMode('AUTOPILOT')" id="modeAUTOPILOT">🤖 Autopilot</button>
                    <button class="mode-btn" onclick="setMode('WAYPOINT')" id="modeWAYPOINT">📍 Waypoint</button>
                    <button class="mode-btn" onclick="setMode('HYBRID')" id="modeHYBRID">🔀 Hybrid</button>
                    <button class="mode-btn emergency" onclick="setMode('EMERGENCY_STOP')" id="modeEMERGENCY_STOP">🛑 E-Stop</button>
                </div>
            </div>
        </section>

        <!-- ── LiDAR Radar (right, spans 2 rows) ── -->
        <section class="card lidar-section">
            <div class="card-header">
                <h2><span class="icon" style="background:rgba(6,182,212,0.15);">📡</span> LiDAR Radar</h2>
                <span id="lidarPoints" style="font-size:0.75rem;color:var(--text-muted);">0 points</span>
            </div>
            <div class="card-body">
                <div class="radar-container">
                    <canvas id="lidarCanvas" width="290" height="290"></canvas>
                    <div class="lidar-stats">
                        <div class="lidar-stat">
                            <div class="val" id="lidarMinDist">—</div>
                            <div class="lbl">Min Distance (cm)</div>
                        </div>
                        <div class="lidar-stat">
                            <div class="val" id="lidarMinAngle">—</div>
                            <div class="lbl">Min Angle (°)</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ── Control Panel (bottom-left) ────── -->
        <section class="card controls-section">
            <div class="card-header">
                <h2><span class="icon" style="background:rgba(16,185,129,0.15);">🎮</span> Điều Khiển</h2>
            </div>
            <div class="card-body">
                <div class="control-grid">
                    <!-- Direction Pad -->
                    <div class="control-group">
                        <h3>Hướng Di Chuyển</h3>
                        <div class="dpad">
                            <div></div>
                            <button class="dpad-btn dpad-up" onclick="sendControl('FORWARD')" title="Tiến">▲</button>
                            <div></div>
                            <button class="dpad-btn dpad-left" onclick="sendServo(45)" title="Rẽ trái">◄</button>
                            <button class="dpad-btn dpad-center stop-btn" onclick="emergencyStop()" title="Dừng">STOP</button>
                            <button class="dpad-btn dpad-right" onclick="sendServo(135)" title="Rẽ phải">►</button>
                            <div></div>
                            <button class="dpad-btn dpad-down" onclick="sendControl('BACKWARD')" title="Lùi">▼</button>
                            <div></div>
                        </div>
                    </div>

                    <!-- Sliders -->
                    <div class="control-group">
                        <h3>Tham Số</h3>
                        <div class="slider-group">
                            <div class="slider-label">
                                <span>Tốc độ Motor</span>
                                <span class="slider-val" id="speedVal">60%</span>
                            </div>
                            <input type="range" id="speedSlider" min="0" max="100" value="60"
                                   oninput="document.getElementById('speedVal').textContent=this.value+'%'">
                        </div>
                        <div class="slider-group">
                            <div class="slider-label">
                                <span>Góc Servo</span>
                                <span class="slider-val" id="servoVal">90°</span>
                            </div>
                            <input type="range" id="servoSlider" min="0" max="180" value="90"
                                   oninput="updateServoSlider(this.value)">
                        </div>
                        <button class="dpad-btn" style="width:100%;height:auto;padding:10px;font-family:inherit;font-size:0.8rem;"
                                onclick="sendManualControl()">
                            📤 Gửi Lệnh
                        </button>
                        <button class="emergency-btn" onclick="emergencyStop()">
                            🛑 DỪNG KHẨN CẤP
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- ── Alerts ────────────────────────── -->
        <section class="card alerts-section">
            <div class="card-header">
                <h2><span class="icon" style="background:rgba(245,158,11,0.15);">⚠️</span> Cảnh Báo</h2>
                <span id="alertCount" style="font-size:0.75rem;color:var(--text-muted);">0 alerts</span>
            </div>
            <div class="card-body">
                <div class="alerts-list" id="alertsList">
                    <div class="empty-state">Chưa có cảnh báo nào</div>
                </div>
            </div>
        </section>

    </main>
</div>

<script>
    // ── State ──────────────────────────────────────
    const API = window.location.origin;
    let currentVehicle = null;
    let pollTimer = null;
    let lidarData = {};

    // ── Init ──────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        fetchVehicles();
        setInterval(fetchVehicles, 5000);
    });

    // ── Vehicle list ──────────────────────────────
    async function fetchVehicles() {
        try {
            const res = await fetch(`${API}/vehicles`);
            const vehicles = await res.json();
            const sel = document.getElementById('vehicleSelect');
            const prev = sel.value;

            // Keep existing selection
            sel.innerHTML = '<option value="">-- Chọn xe --</option>';
            vehicles.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.vehicle_id;
                opt.textContent = `${v.vehicle_id} ${v.connected ? '🟢' : '🔴'}`;
                sel.appendChild(opt);
            });

            if (prev) sel.value = prev;

            // Auto-select first if none selected
            if (!currentVehicle && vehicles.length > 0) {
                sel.value = vehicles[0].vehicle_id;
                selectVehicle(vehicles[0].vehicle_id);
            }
        } catch (e) {
            console.error('Fetch vehicles error:', e);
        }
    }

    function selectVehicle(id) {
        currentVehicle = id || null;
        if (pollTimer) clearInterval(pollTimer);
        if (currentVehicle) {
            pollStatus();
            pollTimer = setInterval(pollStatus, 1500);
        }
    }

    // ── Poll status ───────────────────────────────
    async function pollStatus() {
        if (!currentVehicle) return;
        try {
            const [statusRes, alertsRes] = await Promise.all([
                fetch(`${API}/vehicles/${currentVehicle}`),
                fetch(`${API}/vehicles/${currentVehicle}/alerts?limit=20`)
            ]);
            const status = await statusRes.json();
            const alerts = await alertsRes.json();
            updateUI(status);
            updateAlerts(alerts);
        } catch (e) {
            console.error('Poll error:', e);
            updateConnection(false);
        }
    }

    // ── Update UI ─────────────────────────────────
    function updateUI(data) {
        // Connection
        updateConnection(data.connected);

        // Mode
        document.getElementById('modeLabel').textContent = data.mode;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        const modeBtn = document.getElementById('mode' + data.mode);
        if (modeBtn) modeBtn.classList.add('active');

        // Stats
        document.getElementById('statSpeed').textContent = data.motor.speed_percent;
        document.getElementById('statDirection').textContent = data.motor.direction;
        document.getElementById('statServo').textContent = data.servo.angle;

        // Obstacle
        const obsEl = document.getElementById('statObstacle');
        if (data.obstacle_detected) {
            obsEl.textContent = '⚠️';
            obsEl.style.cssText = 'font-size:1.3rem;';
        } else {
            obsEl.textContent = 'OK';
            obsEl.style.cssText = 'font-size:1rem;color:var(--accent-green);-webkit-text-fill-color:var(--accent-green);';
        }

        // GPS
        document.getElementById('statLat').textContent = data.gps.lat ? data.gps.lat.toFixed(5) : '—';
        document.getElementById('statLon').textContent = data.gps.lon ? data.gps.lon.toFixed(5) : '—';

        // LiDAR
        document.getElementById('statLidarMin').textContent =
            data.lidar.min_distance_cm < 9999 ? data.lidar.min_distance_cm.toFixed(0) : '—';
        document.getElementById('lidarMinDist').textContent =
            data.lidar.min_distance_cm < 9999 ? data.lidar.min_distance_cm.toFixed(1) : '—';
        document.getElementById('lidarMinAngle').textContent =
            data.lidar.min_distance_angle ? data.lidar.min_distance_angle.toFixed(0) : '—';
        document.getElementById('lidarPoints').textContent = `${data.lidar.scan_points} points`;

        // Waypoints
        document.getElementById('statWaypoints').textContent =
            `${data.current_waypoint}/${data.waypoints_total}`;

        // Draw radar
        drawRadar(data.lidar);
    }

    function updateConnection(connected) {
        const badge = document.getElementById('connBadge');
        const text = document.getElementById('connText');
        if (connected) {
            badge.classList.remove('offline');
            text.textContent = 'Đã kết nối';
        } else {
            badge.classList.add('offline');
            text.textContent = 'Mất kết nối';
        }
    }

    function updateAlerts(alerts) {
        const list = document.getElementById('alertsList');
        document.getElementById('alertCount').textContent = `${alerts.length} alerts`;

        if (!alerts.length) {
            list.innerHTML = '<div class="empty-state">Chưa có cảnh báo nào</div>';
            return;
        }

        list.innerHTML = alerts.map(a => {
            const time = new Date(a.time).toLocaleTimeString('vi-VN');
            return `<div class="alert-item ${a.level}">
                <div class="alert-dot"></div>
                <span class="alert-msg">${escapeHtml(a.message)}</span>
                <span class="alert-time">${time}</span>
            </div>`;
        }).join('');
    }

    // ── LiDAR Radar Drawing ───────────────────────
    function drawRadar(lidar) {
        const canvas = document.getElementById('lidarCanvas');
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const cx = W / 2, cy = H / 2;
        const maxR = Math.min(cx, cy) - 10;

        ctx.clearRect(0, 0, W, H);

        // Background
        const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
        bgGrad.addColorStop(0, 'rgba(6, 182, 212, 0.05)');
        bgGrad.addColorStop(1, 'rgba(10, 14, 26, 0.9)');
        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
        ctx.fill();

        // Grid circles
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, maxR * i / 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Grid lines (cross)
        ctx.beginPath();
        ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR);
        ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy);
        ctx.stroke();

        // Diagonal grid lines
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.06)';
        const diag = maxR * Math.cos(Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(cx - diag, cy - diag); ctx.lineTo(cx + diag, cy + diag);
        ctx.moveTo(cx + diag, cy - diag); ctx.lineTo(cx - diag, cy + diag);
        ctx.stroke();

        // Distance labels
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'left';
        for (let i = 1; i <= 4; i++) {
            const label = `${i * 100}cm`;
            ctx.fillText(label, cx + 4, cy - maxR * i / 4 + 12);
        }

        // Scan points
        if (lidar.scan_points > 0) {
            const maxDist = 400; // cm, max range
            const points = [];

            // We don't have raw points from the API summary, so draw a representation
            // The API gives min_distance and scan_points count
            // For a real implementation, you'd fetch full scan data

            // Draw vehicle center
            ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.fill();

            // Draw heading indicator
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx, cy - 25);
            ctx.stroke();

            // Draw min distance indicator
            if (lidar.min_distance_cm < 9999) {
                const angle = (lidar.min_distance_angle - 90) * Math.PI / 180;
                const r = Math.min(lidar.min_distance_cm / maxDist, 1) * maxR;
                const px = cx + r * Math.cos(angle);
                const py = cy + r * Math.sin(angle);

                // Warning zone
                ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, r, angle - 0.3, angle + 0.3);
                ctx.closePath();
                ctx.fill();

                // Min distance point
                ctx.fillStyle = lidar.min_distance_cm < 50
                    ? 'rgba(239, 68, 68, 0.9)'
                    : 'rgba(245, 158, 11, 0.9)';
                ctx.beginPath();
                ctx.arc(px, py, 6, 0, Math.PI * 2);
                ctx.fill();

                // Glow
                ctx.fillStyle = lidar.min_distance_cm < 50
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(245, 158, 11, 0.2)';
                ctx.beginPath();
                ctx.arc(px, py, 12, 0, Math.PI * 2);
                ctx.fill();
            }

            // Sweep animation line
            const sweepAngle = (Date.now() / 20 % 360) * Math.PI / 180;
            const grad = ctx.createLinearGradient(
                cx, cy,
                cx + maxR * Math.cos(sweepAngle),
                cy + maxR * Math.sin(sweepAngle)
            );
            grad.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
            grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + maxR * Math.cos(sweepAngle), cy + maxR * Math.sin(sweepAngle));
            ctx.stroke();
        } else {
            // No data
            ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Chờ dữ liệu LiDAR...', cx, cy);
        }

        // Request next frame for sweep animation
        if (lidar.scan_points > 0) {
            requestAnimationFrame(() => drawRadar(lidar));
        }
    }

    // ── Control Actions ───────────────────────────
    async function setMode(mode) {
        if (!currentVehicle) return alert('Chưa chọn xe!');
        try {
            if (mode === 'EMERGENCY_STOP') {
                await fetch(`${API}/vehicles/${currentVehicle}/stop`, { method: 'POST' });
            } else {
                await fetch(`${API}/vehicles/${currentVehicle}/mode`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode })
                });
            }
            pollStatus();
        } catch (e) {
            console.error('Set mode error:', e);
        }
    }

    function sendControl(direction) {
        const speed = parseInt(document.getElementById('speedSlider').value);
        const servo = parseInt(document.getElementById('servoSlider').value);
        sendManualControlWith(speed, direction, servo);
    }

    function sendServo(angle) {
        document.getElementById('servoSlider').value = angle;
        updateServoSlider(angle);
        const speed = parseInt(document.getElementById('speedSlider').value);
        sendManualControlWith(speed, 'FORWARD', angle);
    }

    function sendManualControl() {
        const speed = parseInt(document.getElementById('speedSlider').value);
        const servo = parseInt(document.getElementById('servoSlider').value);
        sendManualControlWith(speed, 'FORWARD', servo);
    }

    async function sendManualControlWith(speed, direction, servo_angle) {
        if (!currentVehicle) return alert('Chưa chọn xe!');
        try {
            await fetch(`${API}/vehicles/${currentVehicle}/control`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ speed, direction, servo_angle })
            });
        } catch (e) {
            console.error('Control error:', e);
        }
    }

    async function emergencyStop() {
        if (!currentVehicle) return alert('Chưa chọn xe!');
        try {
            await fetch(`${API}/vehicles/${currentVehicle}/stop`, { method: 'POST' });
            pollStatus();
        } catch (e) {
            console.error('Emergency stop error:', e);
        }
    }

    function updateServoSlider(val) {
        document.getElementById('servoVal').textContent = val + '°';
    }

    // ── Utility ───────────────────────────────────
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
</script>
</body>
</html>
"""
