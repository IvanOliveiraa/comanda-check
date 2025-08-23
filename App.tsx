import {
  StyleSheet,
  Button,
  View,
  Modal,
  Alert,
  TextInput,
  TouchableOpacity,
  Text,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useState, useRef, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function App() {
  const [modalCamIsVisisble, setModalCamIsVisisble] = useState(false);
  const [modalConfigIsVisible, setModalConfigIsVisible] = useState(false);
  const [modalConfirmIsVisible, setModalConfirmIsVisible] = useState(false);
  const [ipHost, setIpHost] = useState("");
  const [savedIp, setSavedIp] = useState("");
  const [permission, requestPermission] = useCameraPermissions();
  const codigoLido = useRef(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [scannedCode, setScannedCode] = useState("");
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  useEffect(() => {
    const carregarIp = async () => {
      try {
        const ip = await AsyncStorage.getItem("ipHost");
        if (ip) {
          setSavedIp(ip);
        } else {
          setModalConfigIsVisible(true);
        }
      } catch (error) {
        console.error("Falha na comunicação com o host", error);
      }
    };
    carregarIp();
  }, []);

  async function salvarIpHost() {
    try {
      await AsyncStorage.setItem("ipHost", ipHost);
      setSavedIp(ipHost);
      setModalConfigIsVisible(false);
      Alert.alert("Sucesso", "Endereço IP salvo com sucesso!");
    } catch (error) {
      console.error("Falha na comunicação com o host", error);
      Alert.alert("Erro", "Não foi possível salvar o endereço IP.");
    }
  }

  function abrirConfig() {
    setIpHost(savedIp);
    setModalConfigIsVisible(true);
  }

  async function AbrirCamera() {
    if (!savedIp) {
      Alert.alert(
        "Configuração Necessária",
        "Por favor, configure o endereço IP do host primeiro."
      );
      return;
    }
    try {
      const { granted } = await requestPermission();
      if (!granted) {
        return Alert.alert("Câmera", "Você precisa habilitar o uso da câmera");
      }
      setModalCamIsVisisble(true);
      codigoLido.current = false;
    } catch (error) {
      console.log(error);
    }
  }

  async function LerCodigo(data: string) {
    setTimeout(() => setModalCamIsVisisble(false), 1000);
    try {
      const response = await fetch(
        `http://${savedIp}:3000/comandas/${data}/status`
      );
      const json = await response.json();
      if (json.status === "Comanda aberta") {
        setAlertTitle(`Cartão: ${data}`);
        setAlertMessage("A Comanda ainda está aberta");
        setAlertVisible(true);
        setTimeout(() => setAlertVisible(false), 5000);
      } else if (json.status === "Comanda bloqueada") {
        setAlertTitle(`Cartão: ${data}`);
        setAlertMessage("A comanda está bloqueada");
        setAlertVisible(true);
        setTimeout(() => setAlertVisible(false), 5000);
      } else {
        setAlertTitle(`Cartão: ${data}`);
        setAlertMessage("A Comanda está disponível");
        setAlertVisible(true);
        setTimeout(() => setAlertVisible(false), 5000);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert(
        "Erro ao verificar comanda",
        error.message || "Não foi possível verificar o status da comanda."
      );
    }
  }
  return (
    <View style={styles.container}>
      {alertVisible && (
        <View
          style={
            alertMessage.includes("ainda está aberta") ||
            alertMessage.includes("bloqueada")
              ? styles.alertError
              : styles.alertSuccess
          }
        >
          <Text
            style={
              alertMessage.includes("ainda está aberta") ||
              alertMessage.includes("bloqueada")
                ? styles.alertTextError
                : styles.alertTextSuccess
            }
          >
            {alertTitle}
          </Text>
          <Text
            style={
              alertMessage.includes("ainda está aberta") ||
              alertMessage.includes("bloqueada")
                ? styles.alertTextError
                : styles.alertTextSuccess
            }
          >
            {alertMessage}
          </Text>
          <TouchableOpacity
            onPress={() => setAlertVisible(false)}
            style={styles.alertButton}
          >
            <Text
              style={
                alertMessage.includes("ainda está aberta") ||
                alertMessage.includes("bloqueada")
                  ? styles.alertTextError
                  : styles.alertTextSuccess
              }
            >
              OK
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity style={styles.settingsButton} onPress={abrirConfig}>
        <Ionicons name="settings-sharp" size={24} color="white" />
      </TouchableOpacity>
      <View style={styles.footerconfig}>
        <TouchableOpacity style={styles.iconButton} onPress={AbrirCamera}>
          <MaterialCommunityIcons name="barcode-scan" size={64} color="white" />
          <Text style={styles.iconButtonText}>Verificar Comanda</Text>
        </TouchableOpacity>
      </View>

      {/* Camera Modal */}
      <Modal visible={modalCamIsVisisble} style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          onBarcodeScanned={({ data }) => {
            if (data && !codigoLido.current) {
              setScannedCode(data);
              setConfirmModalVisible(true);
              codigoLido.current = true;
            }
          }}
        />
        <View style={styles.containercam}>
          <MaterialCommunityIcons name="barcode-scan" size={64} color="white" />
        </View>
        <View style={styles.footer}>
          <Button
            title="Cancelar"
            onPress={() => setModalCamIsVisisble(false)}
          />
        </View>
      </Modal>

      {confirmModalVisible && (
        <Modal
          visible={confirmModalVisible}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={{ color: "white" }}>Código da comanda:</Text>
              <TextInput
                style={styles.input}
                value={scannedCode}
                onChangeText={setScannedCode}
                keyboardType="numeric"
              />
              <View style={styles.footerconfigmodal}>
                <Button
                  title="Cancelar"
                  onPress={() => {
                    setConfirmModalVisible(false);
                    codigoLido.current = false;
                  }}
                />
                <Button
                  title="Confirmar"
                  onPress={() => {
                    LerCodigo(scannedCode);
                    setConfirmModalVisible(false);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Config Modal */}
      <Modal
        visible={modalConfigIsVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Digite o IP do Host (ex: 192.168.1.10)"
              value={ipHost}
              onChangeText={setIpHost}
            />
            <View style={styles.footerconfigmodal}>
              <Button
                title="Cancelar"
                onPress={() => setModalConfigIsVisible(false)}
              />
              <Button title="Salvar" onPress={salvarIpHost} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  containercam: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.5,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 32,
    right: 32,
  },
  footerconfig: {
    flexDirection: "column",
    alignItems: "center",
  },
  footerconfigmodal: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  modalContainer: {
    flex: 1,
    color: "white",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#333",
    color: "white",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  input: {
    height: 40,
    backgroundColor: "#444",
    borderColor: "#555",
    borderWidth: 1,
    color: "#fff",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  iconButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e35807",
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
  },
  iconButtonText: {
    color: "white",
    marginLeft: 8,
    fontSize: 16,
  },
  settingsButton: {
    position: "absolute",
    top: 48,
    left: 32,
    zIndex: 1,
  },
  alertError: {
    position: "absolute",
    bottom: 80,
    left: 20,
    right: 20,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    zIndex: 1,
  },
  alertSuccess: {
    position: "absolute",
    bottom: 80,
    left: 20,
    right: 20,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#d1fae5",
    borderRadius: 8,
    zIndex: 1,
  },
  alertTextError: {
    color: "#dc2626",
    fontSize: 16,
    lineHeight: 20,
  },
  alertTextSuccess: {
    color: "#16a34a",
    fontSize: 16,
    lineHeight: 20,
  },
  alertButton: {
    marginLeft: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
  },
  alertTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
  },
});
