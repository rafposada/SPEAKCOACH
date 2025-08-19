import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Speech from "expo-speech";
import * as SpeechRecognition from "expo-speech-recognition";

const CONVS = [
  {
    title: "HVAC: Pickup at Supplier",
    turns: [
      { prompt: "Good morning. Pickup for Alex, order one two three four.", sample:"Good morning. Yes, pickup for Alex, order one two three four.", kw:["pickup","alex","order"] },
      { prompt: "I have filters, a condenser fan motor, and a line set. Correct?", sample:"Yes, that is correct.", kw:["yes","correct"] },
      { prompt: "Do you need a forklift or can you load yourself?", sample:"I can load myself. Thank you.", kw:["load","myself"] },
      { prompt: "Please sign and check the serial numbers.", sample:"Sure, I will sign and check the serial numbers.", kw:["sign","serial"] }
    ]
  },
  {
    title: "HVAC: Deliver Order",
    turns: [
      { prompt:"Hello. Are you here for the delivery?", sample:"Yes, I am delivering your order.", kw:["delivering","order"] },
      { prompt:"Confirm address: 742 Evergreen Terrace.", sample:"Confirmed. Seven four two Evergreen Terrace.", kw:["confirmed","seven","four","two"] },
      { prompt:"Place the unit near the garage door.", sample:"I will place the unit near the garage door.", kw:["place","garage"] },
      { prompt:"Do you need a signature or just a photo?", sample:"I need a signature, please.", kw:["signature"] }
    ]
  }
];

const say = (t, cb) => Speech.speak(t, { language: "en-US", onDone: cb });
const norm = s => (s||"").toLowerCase().replace(/[^a-z\s]/g," ").replace(/\s+/g," ").trim();
const okWith = (spoken, kws) => {
  const h = norm(spoken);
  return kws.every(k => h.includes(k));
};

export default function App() {
  const [conv, setConv] = useState(0);
  const [turn, setTurn] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [heard, setHeard] = useState("");
  const listeningRef = useRef(false);

  useEffect(() => { SpeechRecognition.requestPermissionsAsync(); }, []);

  const loop = async () => {
    if (listeningRef.current) return;
    const c = CONVS[conv]; const t = c.turns[turn];

    setStatus(`Speaking: ${c.title} (${turn+1}/${c.turns.length})`);
    await new Promise(res => say(t.prompt, res));

    setStatus("Listening... say your answer. Commands: repeat / next / stop");
    listeningRef.current = true;
    try {
      const r = await SpeechRecognition.startAsync({ language: "en-US" });
      const text = r?.transcription || "";
      setHeard(text);
      const s = norm(text);

      // voice commands
      if (/(stop|exit|quit)/.test(s)) { setStatus("Stopped"); listeningRef.current=false; return; }
      if (/(next|skip)/.test(s)) { nextTurn(); listeningRef.current=false; return; }
      if (/(repeat|again)/.test(s)) { setStatus("Repeating"); listeningRef.current=false; return; }

      if (okWith(text, t.kw)) {
        setStatus("✅ Good!");
        nextTurn();
      } else {
        setStatus(`⚠️ Try again. Say: ${t.sample}`);
      }
    } catch {
      setStatus("No input. Repeating...");
    } finally {
      listeningRef.current = false;
    }
  };

  const nextTurn = () => {
    const c = CONVS[conv];
    if (turn + 1 < c.turns.length) setTurn(turn + 1);
    else { // next conversation
      if (conv + 1 < CONVS.length) { setConv(conv + 1); setTurn(0); }
      else { setConv(0); setTurn(0); }
    }
  };

  useEffect(() => { loop(); }, [conv, turn]);

  return (
    <View style={s.container}>
      <Text style={s.h1}>SpeakCoach — Hands Free</Text>
      <Text style={s.p}>Conversation: {CONVS[conv].title}</Text>
      <Text style={s.p}>Status: {status}</Text>
      {!!heard && <Text style={s.small}>You said: {heard}</Text>}
      <TouchableOpacity style={s.btn} onPress={loop}>
        <Text style={s.btnTxt}>▶ Start / Repeat</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,justifyContent:"center",alignItems:"center",padding:16},
  h1:{fontSize:20,fontWeight:"bold",marginBottom:8},
  p:{fontSize:16,marginVertical:4},
  small:{fontSize:14,opacity:.8,marginTop:6},
  btn:{marginTop:18,paddingHorizontal:18,paddingVertical:12,borderRadius:10,backgroundColor:"#444"},
  btnTxt:{color:"#fff",fontWeight:"600"}
});
