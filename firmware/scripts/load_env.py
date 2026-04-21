"""
PlatformIO Pre-Build Script: Load Environment Variables from .env Files

This script loads configuration from .env files and injects them as compiler
defines (-D flags) into the build process.

Usage in platformio.ini:
    extra_scripts = pre:scripts/load_env.py

    [env:esp32_main]
    custom_env_file = .env

    [env:esp32_main_lab]
    extends = env:esp32_main
    custom_env_file = .env.lab

Features:
    - Reads custom_env_file from platformio.ini (defaults to .env)
    - Validates all required variables are present
    - Camera variables only required for esp32_cam* environments
    - Fails fast with clear error messages

Environment file format:
    # Comments start with #
    WIFI_SSID=MyNetwork
    WIFI_PASSWORD=secret123
    AGENT_IP=192.168.1.100
"""

import os
import sys
from pathlib import Path

# PlatformIO build system integration
Import("env")

# ── Required Variables ──────────────────────────────────────────────────────────

# Required for ALL environments
REQUIRED_VARS = [
    # WiFi
    "WIFI_SSID",
    "WIFI_PASSWORD",
    # micro-ROS Agent
    "AGENT_IP",
    "AGENT_PORT",
    # Motor pins (TB6612FNG)
    "MOTOR_LEFT_PWMA",
    "MOTOR_LEFT_AIN1",
    "MOTOR_LEFT_AIN2",
    "MOTOR_RIGHT_PWMB",
    "MOTOR_RIGHT_BIN1",
    "MOTOR_RIGHT_BIN2",
    # Encoder pins
    "ENCODER_LEFT_PIN",
    "ENCODER_RIGHT_PIN",
    "ENCODER_PPR",
    # IMU (MPU6050)
    "IMU_SDA_PIN",
    "IMU_SCL_PIN",
    "IMU_ADDR",
    # Servo pan-tilt
    "SERVO_PAN_PIN",
    "SERVO_TILT_PIN",
    # LiDAR (LDS02RR)
    "LIDAR_RX_PIN",
    "LIDAR_TX_PIN",
    "LIDAR_MOTOR_PIN",
    # Status LED
    "LED_STATUS_PIN",
]

# Additional required variables for ESP32-CAM environments
CAM_REQUIRED_VARS = [
    "CAM_STREAM_PORT",
    "CAM_FRAME_SIZE",
    "CAM_JPEG_QUALITY",
]

# Variables that should be treated as strings (wrapped in quotes)
STRING_VARS = [
    "WIFI_SSID",
    "WIFI_PASSWORD",
    "AGENT_IP",
    # Note: CAM_FRAME_SIZE is NOT a string — it's an ESP-IDF enum (FRAMESIZE_QVGA)
]


def parse_env_file(env_path: Path) -> dict:
    """
    Parse a .env file and return a dictionary of key-value pairs.

    Skips:
        - Empty lines
        - Lines starting with #
        - Lines without =
    """
    env_vars = {}

    with open(env_path, encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()

            # Skip empty lines and comments
            if not line or line.startswith("#"):
                continue

            # Must have = separator
            if "=" not in line:
                print(
                    f"  WARNING: Line {line_num} has no '=' separator, skipping: {line[:30]}..."
                )
                continue

            # Split on first = only (value might contain =)
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()

            # Remove surrounding quotes if present
            if (value.startswith('"') and value.endswith('"')) or (
                value.startswith("'") and value.endswith("'")
            ):
                value = value[1:-1]

            env_vars[key] = value

    return env_vars


def get_env_file_path() -> Path:
    """
    Get the environment file path from platformio.ini custom_env_file option.

    Falls back to .env if not specified.
    """
    # Get the current environment name
    env_name = env.subst("$PIOENV")

    # Try to get custom_env_file from project config
    try:
        from platformio.project.config import ProjectConfig

        config = ProjectConfig()

        # Try environment-specific setting first
        try:
            env_file = config.get(f"env:{env_name}", "custom_env_file")
        except (KeyError, Exception):
            env_file = None

        # Fall back to [env] section
        if not env_file:
            try:
                env_file = config.get("env", "custom_env_file")
            except (KeyError, Exception):
                env_file = ".env"

    except ImportError:
        # Running outside PlatformIO context (e.g., unit test), default to .env
        env_file = ".env"
    except Exception as e:
        # Real config parse error — fail loudly
        print(f"\n[load_env] ERROR: Failed to read platformio.ini: {e}\n")
        sys.exit(1)

    # Resolve relative to firmware directory
    firmware_dir = Path(env.subst("$PROJECT_DIR"))
    return firmware_dir / env_file


def is_cam_environment() -> bool:
    """Check if current environment is an ESP32-CAM variant."""
    env_name = env.subst("$PIOENV")
    return "cam" in env_name.lower()


def validate_required_vars(env_vars: dict, env_file: Path) -> list:
    """
    Validate that all required variables are present.

    Returns list of missing variable names.
    """
    required = REQUIRED_VARS.copy()

    # Add camera-specific requirements for cam environments
    if is_cam_environment():
        required.extend(CAM_REQUIRED_VARS)

    missing = [var for var in required if var not in env_vars]
    return missing


def format_build_flag(key: str, value: str) -> str:
    """
    Format a key-value pair as a compiler define flag.

    String variables get wrapped in escaped quotes with proper escaping
    for special characters. The outer single quotes protect against
    shell word splitting on spaces.

    Numeric variables are passed as-is.
    """
    if key in STRING_VARS:
        # Escape backslashes and quotes within the value
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        # Outer single quotes protect spaces from shell word splitting
        # Inner escaped quotes become the C string delimiters
        # Result: '-DWIFI_SSID="My Network"' or '-DWIFI_PASSWORD="pass\"word"'
        return f"'-D{key}=\"{escaped}\"'"
    else:
        # Numeric/enum values: -DAGENT_PORT=8888, -DCAM_FRAME_SIZE=FRAMESIZE_QVGA
        return f"-D{key}={value}"


def main():
    """Main entry point for PlatformIO pre-script."""

    print()
    print("=" * 70)
    print(" load_env.py — Loading environment configuration")
    print("=" * 70)

    env_name = env.subst("$PIOENV")
    env_file = get_env_file_path()

    print(f"  Environment: {env_name}")
    print(f"  Config file: {env_file}")

    # ── Check if env file exists ────────────────────────────────────────────────
    if not env_file.exists():
        print()
        print("╔" + "═" * 68 + "╗")
        print("║ ERROR: Environment file not found                                  ║")
        print("╠" + "═" * 68 + "╣")
        print(f"║ Missing: {str(env_file):<57} ║")
        print("║                                                                    ║")
        print("║ To fix:                                                            ║")
        print("║   cd firmware                                                      ║")
        print("║   cp .env.example .env                                             ║")
        print("║   # Then edit .env with your WiFi credentials and GPIO pins        ║")
        print("╚" + "═" * 68 + "╝")
        print()
        sys.exit(1)

    # ── Parse env file ──────────────────────────────────────────────────────────
    env_vars = parse_env_file(env_file)
    print(f"  Parsed: {len(env_vars)} variables")

    # ── Validate required variables ─────────────────────────────────────────────
    missing = validate_required_vars(env_vars, env_file)

    if missing:
        print()
        print("╔" + "═" * 68 + "╗")
        print("║ ERROR: Missing required variables                                  ║")
        print("╠" + "═" * 68 + "╣")
        for var in missing:
            print(f"║   - {var:<62} ║")
        print("║                                                                    ║")
        print("║ Check .env.example for the complete list of required variables.    ║")
        print("╚" + "═" * 68 + "╝")
        print()
        sys.exit(1)

    # ── Generate build flags ────────────────────────────────────────────────────
    build_flags = []
    for key, value in env_vars.items():
        flag = format_build_flag(key, value)
        build_flags.append(flag)

    # Append to existing build flags
    env.Append(BUILD_FLAGS=build_flags)

    print()
    print(f"  ✓ Loaded {len(build_flags)} variables from {env_file.name}")
    print()

    # Show what was loaded (truncate sensitive values)
    for key, value in env_vars.items():
        if key in ["WIFI_PASSWORD"]:
            display_value = "*" * min(len(value), 8)
        elif key in ["WIFI_SSID", "AGENT_IP"]:
            display_value = value
        else:
            display_value = value
        print(f"    {key}={display_value}")

    print()
    print("=" * 70)
    print()


# Run when loaded by PlatformIO
main()
