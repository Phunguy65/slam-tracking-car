"""
Autonomous Vehicle Server - Main Entry Point
Khởi động toàn bộ hệ thống: MQTT, API, AI Engine, Dashboard
"""
import asyncio
import threading
import logging
import uvicorn
from core.config import settings
# from core.logger import setup_logger
from mqtt.broker_manager import MQTTManager
from api.app import create_app

# setup_logger()
logger = logging.getLogger(__name__)


def run_api():
    app = create_app()
    uvicorn.run(app, host=settings.API_HOST, port=settings.API_PORT, log_level="warning")


async def main():
    logger.info("🚗 Autonomous Vehicle Server starting...")
    logger.info(f"   API     → http://{settings.API_HOST}:{settings.API_PORT}")
    logger.info(f"   Broker  → mqtt://{settings.MQTT_BROKER}:{settings.MQTT_PORT}")
    logger.info(f"   Dashboard → http://{settings.API_HOST}:{settings.API_PORT}/dashboard")

    # Khởi động MQTT Manager
    mqtt_manager = MQTTManager()
    await mqtt_manager.start()

    # Khởi động API server trong thread riêng
    api_thread = threading.Thread(target=run_api, daemon=True)
    api_thread.start()

    logger.info("✅ All services started. Press Ctrl+C to stop.")

    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("🛑 Shutting down...")
        await mqtt_manager.stop()


if __name__ == "__main__":
    asyncio.run(main())