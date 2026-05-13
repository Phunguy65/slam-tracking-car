cmake_minimum_required(VERSION 3.8)
project(slam_car_interfaces)

find_package(ament_cmake REQUIRED)
find_package(rosidl_default_generators REQUIRED)
find_package(std_msgs REQUIRED)

rosidl_generate_interfaces(${PROJECT_NAME}
  "msg/RobotMode.msg"
  "srv/SetMode.srv"
  "srv/ListMaps.srv"
  "srv/LoadMap.srv"
  DEPENDENCIES std_msgs
)

ament_package()
