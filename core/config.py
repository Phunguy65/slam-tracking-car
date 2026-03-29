class Config:
    API_HOST = "127.0.0.1"  
    API_PORT = 8000         

    # MQTT Broker Configuration
    MQTT_BROKER = "localhost"  # Default MQTT broker address
    MQTT_PORT = 1883
    MQTT_CLIENT_ID="robot_controller_01"
    MQTT_USERNAME="admin_robot"
    MQTT_PASSWORD="super_secret_password_123"
    MQTT_KEEPALIVE= 60
    LIDAR_OBSTACLE_THRESHOLD_CM= 10
    AUTOPILOT_LOOP_HZ= 10
    LIDAR_SLOW_THRESHOLD_CM= 50
    WAYPOINT_ARRIVAL_RADIUS_M= 1.0
settings = Config()
