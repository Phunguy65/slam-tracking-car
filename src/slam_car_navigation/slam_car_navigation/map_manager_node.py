"""
Map Manager Node — handles map listing, loading, and mode switching.

Provides services:
  /map_manager/list_maps  — list available maps in maps directory
  /map_manager/load_map   — load a map via Nav2 map_server
  /map_manager/set_mode   — switch between SLAM and Navigation modes

Uses Nav2 lifecycle manager to start/stop navigation stack dynamically.
"""

import os
from pathlib import Path

import rclpy
from lifecycle_msgs.msg import State, Transition
from lifecycle_msgs.srv import ChangeState, GetState
from nav2_msgs.srv import LoadMap as Nav2LoadMap
from rclpy.callback_groups import ReentrantCallbackGroup
from rclpy.node import Node

from slam_car_interfaces.msg import RobotMode
from slam_car_interfaces.srv import ListMaps, LoadMap, SetMode


class MapManagerNode(Node):
    """Manages maps and mode switching for the SLAM car."""

    def __init__(self):
        super().__init__("map_manager_node")

        # Parameters
        self.declare_parameter("maps_directory", "")
        maps_dir = self.get_parameter("maps_directory").value

        # Try to find maps directory
        if maps_dir and os.path.isdir(maps_dir):
            self.maps_directory = Path(maps_dir)
        else:
            # Default: look in slam_car_bringup/maps
            # This assumes the node is run from workspace root
            self.maps_directory = self._find_maps_directory()

        self.get_logger().info(f"Maps directory: {self.maps_directory}")

        # Current mode tracking
        self.current_mode = RobotMode.SLAM_MAPPING

        # Callback group for async service calls
        self.callback_group = ReentrantCallbackGroup()

        # Service servers
        self.list_maps_srv = self.create_service(
            ListMaps,
            "/map_manager/list_maps",
            self._list_maps_callback,
        )
        self.load_map_srv = self.create_service(
            LoadMap,
            "/map_manager/load_map",
            self._load_map_callback,
        )
        self.set_mode_srv = self.create_service(
            SetMode,
            "/map_manager/set_mode",
            self._set_mode_callback,
        )

        # Service clients for Nav2
        self.nav2_load_map_client = self.create_client(
            Nav2LoadMap,
            "/map_server/load_map",
            callback_group=self.callback_group,
        )

        # Lifecycle clients for mode switching
        self.lifecycle_clients = {}
        self._create_lifecycle_clients()

        self.get_logger().info("Map manager node started")

    def _find_maps_directory(self) -> Path:
        """Find the maps directory in the workspace."""
        # Try common locations
        candidates = [
            Path(
                "/home/PNguyen/Workspace/MyProject/slam-tracking-car/src/slam_car_bringup/maps"
            ),
            Path.cwd() / "src" / "slam_car_bringup" / "maps",
            Path.cwd()
            / "install"
            / "slam_car_bringup"
            / "share"
            / "slam_car_bringup"
            / "maps",
        ]

        for candidate in candidates:
            if candidate.is_dir():
                return candidate

        # Fallback: create in current working directory
        fallback = Path.cwd() / "maps"
        fallback.mkdir(exist_ok=True)
        self.get_logger().warn(f"Using fallback maps directory: {fallback}")
        return fallback

    def _create_lifecycle_clients(self):
        """Create lifecycle service clients for managed nodes."""
        # Nav2 nodes that need lifecycle management
        nav2_nodes = [
            "map_server",
            "amcl",
            "controller_server",
            "planner_server",
            "bt_navigator",
        ]

        for node_name in nav2_nodes:
            self.lifecycle_clients[node_name] = {
                "change_state": self.create_client(
                    ChangeState,
                    f"/{node_name}/change_state",
                    callback_group=self.callback_group,
                ),
                "get_state": self.create_client(
                    GetState,
                    f"/{node_name}/get_state",
                    callback_group=self.callback_group,
                ),
            }

    def _list_maps_callback(
        self, request: ListMaps.Request, response: ListMaps.Response
    ) -> ListMaps.Response:
        """List available maps in the maps directory."""
        try:
            if not self.maps_directory.exists():
                response.success = False
                response.message = f"Maps directory not found: {self.maps_directory}"
                response.maps = []
                return response

            # Find all .yaml files (map metadata files)
            yaml_files = list(self.maps_directory.glob("*.yaml"))

            # Extract map names (without extension)
            maps = [f.stem for f in yaml_files]

            # Filter out any that don't have corresponding .pgm files
            valid_maps = []
            for map_name in maps:
                pgm_file = self.maps_directory / f"{map_name}.pgm"
                if pgm_file.exists():
                    valid_maps.append(map_name)

            response.maps = sorted(valid_maps)
            response.maps_directory = str(self.maps_directory)
            response.success = True
            response.message = f"Found {len(valid_maps)} maps"

            self.get_logger().info(f"Listed maps: {valid_maps}")

        except Exception as e:
            response.success = False
            response.message = f"Error listing maps: {str(e)}"
            response.maps = []
            self.get_logger().error(f"Error listing maps: {e}")

        return response

    def _load_map_callback(
        self, request: LoadMap.Request, response: LoadMap.Response
    ) -> LoadMap.Response:
        """Load a map via Nav2 map_server."""
        map_name = request.map_name

        # Construct full path
        map_yaml = self.maps_directory / f"{map_name}.yaml"

        if not map_yaml.exists():
            response.success = False
            response.message = f"Map not found: {map_name}"
            self.get_logger().error(f"Map not found: {map_yaml}")
            return response

        # Check if map_server service is available
        if not self.nav2_load_map_client.wait_for_service(timeout_sec=2.0):
            response.success = False
            response.message = "Map server service not available. Is Nav2 running?"
            self.get_logger().error("Map server service not available")
            return response

        # Call Nav2 map_server load_map service
        try:
            nav2_request = Nav2LoadMap.Request()
            nav2_request.map_url = str(map_yaml)

            future = self.nav2_load_map_client.call_async(nav2_request)
            rclpy.spin_until_future_complete(self, future, timeout_sec=10.0)

            if future.result() is not None:
                result = future.result()
                if result.result == Nav2LoadMap.Response.RESULT_SUCCESS:
                    response.success = True
                    response.message = f"Loaded map: {map_name}"
                    self.get_logger().info(f"Successfully loaded map: {map_name}")
                else:
                    response.success = False
                    response.message = (
                        f"Map server returned error code: {result.result}"
                    )
                    self.get_logger().error(f"Map server error: {result.result}")
            else:
                response.success = False
                response.message = "Timeout waiting for map server response"
                self.get_logger().error("Map server timeout")

        except Exception as e:
            response.success = False
            response.message = f"Error loading map: {str(e)}"
            self.get_logger().error(f"Error loading map: {e}")

        return response

    def _set_mode_callback(
        self, request: SetMode.Request, response: SetMode.Response
    ) -> SetMode.Response:
        """Switch between SLAM mapping and Navigation modes."""
        new_mode = request.mode
        previous_mode = self.current_mode

        response.previous_mode = previous_mode
        response.current_mode = previous_mode  # Will update on success

        # Validate mode
        if new_mode not in [RobotMode.SLAM_MAPPING, RobotMode.NAVIGATION]:
            response.success = False
            response.message = (
                f"Invalid mode: {new_mode}. Use SLAM_MAPPING(2) or NAVIGATION(3)"
            )
            return response

        if new_mode == previous_mode:
            response.success = True
            response.message = f"Already in mode {new_mode}"
            response.current_mode = new_mode
            return response

        try:
            if new_mode == RobotMode.NAVIGATION:
                # Switching to Navigation mode: activate Nav2 stack
                success, message = self._activate_nav2_stack()
            else:
                # Switching to SLAM mode: deactivate Nav2 stack
                success, message = self._deactivate_nav2_stack()

            if success:
                self.current_mode = new_mode
                response.success = True
                response.message = message
                response.current_mode = new_mode
                self.get_logger().info(f"Mode changed: {previous_mode} -> {new_mode}")
            else:
                response.success = False
                response.message = message
                self.get_logger().error(f"Mode change failed: {message}")

        except Exception as e:
            response.success = False
            response.message = f"Error switching mode: {str(e)}"
            self.get_logger().error(f"Error switching mode: {e}")

        return response

    def _activate_nav2_stack(self) -> tuple[bool, str]:
        """Activate Nav2 nodes via lifecycle transitions."""
        nodes_to_activate = [
            "map_server",
            "amcl",
            "controller_server",
            "planner_server",
            "bt_navigator",
        ]

        for node_name in nodes_to_activate:
            state_id, state_label = self._get_node_state(node_name)
            if state_id is None:
                return False, state_label

            if state_id == State.PRIMARY_STATE_ACTIVE:
                continue

            if state_id == State.PRIMARY_STATE_UNCONFIGURED:
                success, message = self._change_node_state(
                    node_name,
                    Transition.TRANSITION_CONFIGURE,
                )
                if not success:
                    return False, message

                state_id, state_label = self._get_node_state(node_name)
                if state_id is None:
                    return False, state_label

            if state_id == State.PRIMARY_STATE_INACTIVE:
                success, message = self._change_node_state(
                    node_name,
                    Transition.TRANSITION_ACTIVATE,
                )
                if not success:
                    return False, message

                state_id, state_label = self._get_node_state(node_name)
                if state_id is None:
                    return False, state_label

            if state_id != State.PRIMARY_STATE_ACTIVE:
                return False, (
                    f"{node_name} expected active after activation, "
                    f"current state is {self._format_lifecycle_state(state_id)}"
                )

        return True, "Nav2 stack activated"

    def _deactivate_nav2_stack(self) -> tuple[bool, str]:
        """Deactivate Nav2 nodes via lifecycle transitions."""
        nodes_to_deactivate = [
            "bt_navigator",
            "planner_server",
            "controller_server",
            "amcl",
            "map_server",
        ]

        for node_name in nodes_to_deactivate:
            state_id, state_label = self._get_node_state(node_name)
            if state_id is None:
                return False, state_label

            if state_id == State.PRIMARY_STATE_UNCONFIGURED:
                continue

            if state_id == State.PRIMARY_STATE_ACTIVE:
                success, message = self._change_node_state(
                    node_name,
                    Transition.TRANSITION_DEACTIVATE,
                )
                if not success:
                    return False, message

                state_id, state_label = self._get_node_state(node_name)
                if state_id is None:
                    return False, state_label

            if state_id == State.PRIMARY_STATE_INACTIVE:
                success, message = self._change_node_state(
                    node_name,
                    Transition.TRANSITION_CLEANUP,
                )
                if not success:
                    return False, message

                state_id, state_label = self._get_node_state(node_name)
                if state_id is None:
                    return False, state_label

            if state_id != State.PRIMARY_STATE_UNCONFIGURED:
                return False, (
                    f"{node_name} expected unconfigured after deactivation, "
                    f"current state is {self._format_lifecycle_state(state_id)}"
                )

        return True, "Nav2 stack deactivated"

    def _get_node_state(self, node_name: str) -> tuple[int | None, str]:
        """Get lifecycle state of a single node."""
        if node_name not in self.lifecycle_clients:
            return None, f"No lifecycle client configured for {node_name}"

        client = self.lifecycle_clients[node_name]["get_state"]

        if not client.wait_for_service(timeout_sec=2.0):
            return None, f"Lifecycle get_state service not available for {node_name}"

        request = GetState.Request()

        try:
            future = client.call_async(request)
            rclpy.spin_until_future_complete(self, future, timeout_sec=5.0)
            result = future.result()

            if result is None:
                return None, f"Timeout waiting for lifecycle state from {node_name}"

            state_id = result.current_state.id
            if state_id not in self._known_lifecycle_states():
                return None, f"Unknown lifecycle state for {node_name}: {state_id}"

            return state_id, result.current_state.label

        except Exception as e:
            return None, f"Error getting lifecycle state for {node_name}: {e}"

    def _change_node_state(
        self, node_name: str, transition_id: int
    ) -> tuple[bool, str]:
        """Change lifecycle state of a single node."""
        if node_name not in self.lifecycle_clients:
            return False, f"No lifecycle client configured for {node_name}"

        client = self.lifecycle_clients[node_name]["change_state"]

        if not client.wait_for_service(timeout_sec=2.0):
            return (
                False,
                f"Lifecycle change_state service not available for {node_name}",
            )

        request = ChangeState.Request()
        request.transition.id = transition_id

        try:
            future = client.call_async(request)
            rclpy.spin_until_future_complete(self, future, timeout_sec=5.0)
            result = future.result()

            if result is None:
                return False, (
                    f"Timeout waiting for {node_name} lifecycle transition "
                    f"{self._format_transition(transition_id)}"
                )

            if not result.success:
                return False, (
                    f"{node_name} rejected lifecycle transition "
                    f"{self._format_transition(transition_id)}"
                )

            return True, (
                f"{node_name} completed lifecycle transition "
                f"{self._format_transition(transition_id)}"
            )

        except Exception as e:
            return False, (
                f"Error changing lifecycle state for {node_name} via "
                f"{self._format_transition(transition_id)}: {e}"
            )

    def _known_lifecycle_states(self) -> set[int]:
        """Return lifecycle states this node can safely manage."""
        return {
            State.PRIMARY_STATE_UNCONFIGURED,
            State.PRIMARY_STATE_INACTIVE,
            State.PRIMARY_STATE_ACTIVE,
        }

    def _format_lifecycle_state(self, state_id: int) -> str:
        """Format lifecycle state for service responses."""
        state_names = {
            State.PRIMARY_STATE_UNCONFIGURED: "unconfigured",
            State.PRIMARY_STATE_INACTIVE: "inactive",
            State.PRIMARY_STATE_ACTIVE: "active",
        }
        return f"{state_names.get(state_id, 'unknown')}({state_id})"

    def _format_transition(self, transition_id: int) -> str:
        """Format lifecycle transition for service responses."""
        transition_names = {
            Transition.TRANSITION_CONFIGURE: "configure",
            Transition.TRANSITION_ACTIVATE: "activate",
            Transition.TRANSITION_DEACTIVATE: "deactivate",
            Transition.TRANSITION_CLEANUP: "cleanup",
        }
        return f"{transition_names.get(transition_id, 'unknown')}({transition_id})"


def main(args=None):
    rclpy.init(args=args)
    node = MapManagerNode()

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
