import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";
import { GLView } from "expo-gl";
import { Renderer, THREE } from "expo-three";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { ExpoWebGLRenderingContext } from "expo-gl";

// Define types for our furniture and color data
interface FurnitureItem {
  id: number;
  name: string;
  type: "chair" | "table" | "lamp";
}

interface ColorOption {
  name: string;
  value: number;
}

interface Position {
  x: number;
  y: number;
}

// Mock furniture data
const FURNITURE_ITEMS: FurnitureItem[] = [
  { id: 1, name: "Modern Chair", type: "chair" },
  { id: 2, name: "Coffee Table", type: "table" },
  { id: 3, name: "Floor Lamp", type: "lamp" },
];

// Color options
const COLOR_OPTIONS: ColorOption[] = [
  { name: "White", value: 0xffffff },
  { name: "Black", value: 0x000000 },
  { name: "Natural Wood", value: 0xd2b48c },
  { name: "Blue", value: 0x4169e1 },
  { name: "Red", value: 0xb22222 },
];

export default function App() {
  const [selectedItem, setSelectedItem] = useState<FurnitureItem>(
    FURNITURE_ITEMS[0]
  );
  const [selectedColor, setSelectedColor] = useState<ColorOption>(
    COLOR_OPTIONS[0]
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // References for scene objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const objectRef = useRef<THREE.Object3D | null>(null);
  const animationRef = useRef<number | null>(null);
  const initialCameraZRef = useRef<number>(3); // Default camera z position

  // Gesture state
  const rotationRef = useRef<Position>({ x: 0, y: 0 });
  const lastPositionRef = useRef<Position>({ x: 0, y: 0 });
  const scaleRef = useRef<number>(1);

  const createFurnitureModel = (
    type: FurnitureItem["type"]
  ): THREE.Object3D => {
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    switch (type) {
      case "chair":
        // Create a simple chair model
        const group = new THREE.Group();

        // Seat
        geometry = new THREE.BoxGeometry(1, 0.1, 1);
        material = new THREE.MeshPhongMaterial({ color: selectedColor.value });
        const seat = new THREE.Mesh(geometry, material);
        seat.position.y = 0.5;
        group.add(seat);

        // Backrest
        geometry = new THREE.BoxGeometry(1, 1, 0.1);
        const backrest = new THREE.Mesh(geometry, material);
        backrest.position.y = 1;
        backrest.position.z = -0.45;
        group.add(backrest);

        // Legs
        geometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5);
        for (let x = -0.4; x <= 0.4; x += 0.8) {
          for (let z = -0.4; z <= 0.4; z += 0.8) {
            const leg = new THREE.Mesh(geometry, material);
            leg.position.set(x, 0.25, z);
            group.add(leg);
          }
        }

        return group;

      case "table":
        // Create a simple table model
        const tableGroup = new THREE.Group();

        // Table top
        geometry = new THREE.BoxGeometry(2, 0.1, 1.5);
        material = new THREE.MeshPhongMaterial({ color: selectedColor.value });
        const tableTop = new THREE.Mesh(geometry, material);
        tableTop.position.y = 0.8;
        tableGroup.add(tableTop);

        // Table legs
        geometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
        for (let x = -0.9; x <= 0.9; x += 1.8) {
          for (let z = -0.65; z <= 0.65; z += 1.3) {
            const tableLeg = new THREE.Mesh(geometry, material);
            tableLeg.position.set(x, 0.4, z);
            tableGroup.add(tableLeg);
          }
        }

        return tableGroup;

      case "lamp":
        // Create a simple lamp model
        const lampGroup = new THREE.Group();

        // Base
        geometry = new THREE.CylinderGeometry(0.3, 0.4, 0.1, 32);
        material = new THREE.MeshPhongMaterial({ color: selectedColor.value });
        const base = new THREE.Mesh(geometry, material);
        base.position.y = 0.05;
        lampGroup.add(base);

        // Pole
        geometry = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 32);
        const pole = new THREE.Mesh(geometry, material);
        pole.position.y = 0.8;
        lampGroup.add(pole);

        // Shade
        geometry = new THREE.ConeGeometry(0.3, 0.5, 32, 1, true);
        const shade = new THREE.Mesh(geometry, material);
        shade.position.y = 1.6;
        shade.rotation.x = Math.PI;
        lampGroup.add(shade);

        // Light bulb (emissive material to simulate light)
        geometry = new THREE.SphereGeometry(0.1, 16, 16);
        const lightMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffcc,
          emissive: 0xffffcc,
        });
        const bulb = new THREE.Mesh(geometry, lightMaterial);
        bulb.position.y = 1.4;
        lampGroup.add(bulb);

        return lampGroup;
    }
  };

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    setIsLoading(true);

    // Create renderer using the GLView context
    const threeRenderer = new Renderer({
      gl,
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight,
      clearColor: 0xf0f0f0,
    });

    rendererRef.current = threeRenderer;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.z = 3;
    camera.position.y = 1;
    cameraRef.current = camera;

    // Add floor grid for reference
    const gridHelper = new THREE.GridHelper(10, 10, 0xcccccc, 0xcccccc);
    scene.add(gridHelper);

    // Create furniture model
    updateFurnitureModel();

    // Animation loop
    const render = () => {
      animationRef.current = requestAnimationFrame(render);

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      gl.endFrameEXP();
    };

    render();
    setIsLoading(false);
  };

  const updateFurnitureModel = (): void => {
    if (!sceneRef.current) return;

    // Remove existing model if any
    if (objectRef.current) {
      sceneRef.current.remove(objectRef.current);
    }

    // Create new model
    const model = createFurnitureModel(selectedItem.type);
    objectRef.current = model;

    // Reset position and rotation
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);

    // Add to scene
    sceneRef.current.add(model);
  };

  // Update model when selected item or color changes
  useEffect(() => {
    updateFurnitureModel();
  }, [selectedItem, selectedColor]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Pan gesture handler for rotation
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (!objectRef.current) return;

      const { translationX, translationY } = event;
      const deltaX = translationX - lastPositionRef.current.x;
      const deltaY = translationY - lastPositionRef.current.y;

      // Update rotation based on pan movement
      rotationRef.current = {
        x: rotationRef.current.x + deltaY * 0.01,
        y: rotationRef.current.y + deltaX * 0.01,
      };

      // Apply rotation to the 3D object
      objectRef.current.rotation.x = rotationRef.current.x;
      objectRef.current.rotation.y = rotationRef.current.y;

      lastPositionRef.current = { x: translationX, y: translationY };
    })
    .onEnd(() => {
      if (objectRef.current) {
        rotationRef.current = {
          x: objectRef.current.rotation.x,
          y: objectRef.current.rotation.y,
        };
      }
      lastPositionRef.current = { x: 0, y: 0 };
    });

  // Pinch gesture handler for zoom
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      // Store initial camera position when pinch starts
      if (cameraRef.current) {
        initialCameraZRef.current = cameraRef.current.position.z;
      }
    })
    .onUpdate((event) => {
      if (!cameraRef.current) return;

      const { scale } = event;

      // Use absolute scale value instead of relative calculation
      // This provides more predictable zoom behavior
      cameraRef.current.position.z = Math.max(
        1.5, // Minimum zoom (closest)
        Math.min(5, initialCameraZRef.current / scale) // Maximum zoom (farthest)
      );
    })
    .onEnd(() => {
      // Store the final camera position for the next gesture
      if (cameraRef.current) {
        initialCameraZRef.current = cameraRef.current.position.z;
      }
    });

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>3D Furniture Viewer</Text>

        <GestureDetector gesture={composedGesture}>
          <View style={styles.glContainer}>
            {isLoading && (
              <View style={[styles.glView, styles.loadingOverlay]}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}

            <GLView style={styles.glView} onContextCreate={onContextCreate} />

            <Text style={styles.interactionHint}>
              ↔ Drag to rotate • Pinch to zoom
            </Text>
          </View>
        </GestureDetector>

        <Text style={styles.sectionTitle}>Furniture Selection</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.selectionRow}
        >
          {FURNITURE_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.selectionItem,
                selectedItem.id === item.id && styles.selectedItem,
              ]}
              onPress={() => setSelectedItem(item)}
            >
              <Text
                style={[
                  styles.selectionText,
                  selectedItem.id === item.id && styles.selectedItemText,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Color Options</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.selectionRow}
        >
          {COLOR_OPTIONS.map((color) => (
            <TouchableOpacity
              key={color.name}
              style={[
                styles.colorItem,
                selectedColor.name === color.name && styles.selectedColor,
                {
                  backgroundColor: `#${color.value
                    .toString(16)
                    .padStart(6, "0")}`,
                },
              ]}
              onPress={() => setSelectedColor(color)}
            >
              <Text
                style={[
                  styles.colorText,
                  color.name === "White"
                    ? { color: "#000" }
                    : { color: "#fff" },
                ]}
              >
                {color.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Selected: {selectedItem.name} in {selectedColor.name}
          </Text>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const { width } = Dimensions.get("window");
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#333",
  },
  glContainer: {
    width: width,
    height: width * 0.8,
    alignSelf: "center",
    marginBottom: 20,
  },
  glView: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0",
  },
  loadingOverlay: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(240, 240, 240, 0.7)",
    zIndex: 1,
  },
  loadingText: {
    fontSize: 18,
    color: "#333",
  },
  interactionHint: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    color: "#fff",
    padding: 8,
    borderRadius: 20,
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 15,
    marginBottom: 8,
    color: "#333",
  },
  selectionRow: {
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  selectionItem: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectedItem: {
    backgroundColor: "#4285f4",
    borderColor: "#2a75f3",
  },
  selectionText: {
    color: "#333",
    fontWeight: "500",
  },
  selectedItemText: {
    color: "white",
  },
  colorItem: {
    width: 80,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectedColor: {
    borderWidth: 2,
    borderColor: "#4285f4",
  },
  colorText: {
    fontWeight: "500",
    fontSize: 12,
  },
  infoContainer: {
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    marginHorizontal: 15,
  },
  infoText: {
    textAlign: "center",
    color: "#333",
  },
});
