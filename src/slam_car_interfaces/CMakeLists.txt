cmake_minimum_required(VERSION 3.8)
project(slam_car_interfaces)

find_package(ament_cmake REQUIRED)
find_package(rosidl_default_generators REQUIRED)
find_package(std_msgs REQUIRED)
find_package(geometry_msgs REQUIRED)
find_package(sensor_msgs REQUIRED)

rosidl_generate_interfaces(${PROJECT_NAME}
  "msg/RobotMode.msg"
  "msg/BoundingBox2D.msg"
  "msg/EnrolledPerson.msg"
  "msg/EnrollmentStatus.msg"
  "msg/TrackedPerson.msg"
  "msg/TrackedPersonArray.msg"
  "srv/SetMode.srv"
  "srv/ListMaps.srv"
  "srv/LoadMap.srv"
  "srv/AddPerson.srv"
  "srv/RemovePerson.srv"
  "srv/ListPersons.srv"
  "srv/SetTrackingTarget.srv"
  "srv/GetTrackingTarget.srv"
  DEPENDENCIES std_msgs geometry_msgs sensor_msgs
)

ament_package()
