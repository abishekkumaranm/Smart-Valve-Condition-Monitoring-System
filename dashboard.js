/* dashboard.js
   Final integrated dashboard script:
   - keeps your existing behavior unchanged
   - adds anomaly detection, replay time, top-status updates
   - calls digital twin updates every tick
   - restores valve icon click -> selects valve + scrolls to maintenance panel
*/

/* Alarm sound from HTML audio element */
const alarmSound = document.getElementById("alarmSound")

let previousCritical = []

/* -------- MAIN LOOP (polls backend) -------- */
function loadData(){

  fetch("http://127.0.0.1:8000/valves")
    .then(res => res.json())
    .then(data => {
      // defensive: make sure data exists
      if(!data) return

      // selected valve from UI (string)
      let valve = document.getElementById("valveSelect")?.value || "1"
      let v = data[valve]

      if(!v) return

      /* Sensor values */
      const pressureEl = document.getElementById("pressure")
      const tempEl = document.getElementById("temp")
      const vibEl = document.getElementById("vibration")

      if(pressureEl) pressureEl.innerText = Number(v.pressure).toFixed(2)
      if(tempEl) tempEl.innerText = Number(v.temperature).toFixed(2)
      if(vibEl) vibEl.innerText = Number(v.vibration).toFixed(2)

      /* Update industrial pressure gauge */
      try { updateGauge(Number(v.pressure)) } catch(e){ /* ignore */ }

      /* Valve Position */
      let pos = v.position
      let el = document.getElementById("position")

      if(el){
        el.innerText = pos
        if(pos === "OPEN") el.style.color = "#00e676"
        else if(pos === "PARTIAL") el.style.color = "#ffd600"
        else el.style.color = "#ff1744"
      }

      /* Update pipeline animation */
      updateFlow(pos)

      /* Update tank animation */
      if(typeof updateTank !== "undefined"){
        updateTank(v.pressure, v.position)
      }

      /* Update 3D valve open/close */
      if(window.updateValvePosition){
        try { updateValvePosition(v.position) } catch(e){}
      }

      /* Health */
      const healthEl = document.getElementById("health")
      if(healthEl) healthEl.innerText = v.health

      /* Status */
      let statusElement = document.getElementById("status")
      if(statusElement){
        statusElement.innerText = v.status
        if(v.status === "CRITICAL"){
          statusElement.classList.add("critical")
        } else {
          statusElement.classList.remove("critical")
        }
      }

      /* Remaining life */
      let days = Math.max(1, Math.round(v.health / 10))
      const rulEl = document.getElementById("rulValue")
      if(rulEl) rulEl.innerText = days + " days remaining"

      /* Failure prediction countdown */
      updatePrediction(v.health)

      /* Charts */
      if(typeof updateCharts !== "undefined"){
        updateCharts(v.pressure, v.temperature, v.vibration, v.health)
      }

      /* AI failure */
      let failureRisk = 100 - v.health
      if(typeof updateAI !== "undefined"){
        updateAI(failureRisk)
      }

      /* Heatmap + layout */
      updateHeatmap(data)
      updateFactory(data)

      /* NEW: update digital twin visuals (flow arrows, blinking alarms, valve icons) */
      if(typeof updateDigitalTwin !== "undefined"){
        updateDigitalTwin(data)
      }

      /* Digital twin 3D update (existing) */
      if(window.updateValve3D){
        try { updateValve3D(v.health) } catch(e){}
      }

      /* Maintenance alert */
      updateMaintenanceAlert(valve, v.health)

      /* Alarm */
      checkCriticalValves(data)

      /* -------- Additional UI stats & anomaly detection -------- */

      // critical count + avg health + active valves
      try {
        let critical = 0
        let healthSum = 0
        let activeCount = 0
        for(let i=1;i<=10;i++){
          if(data[i] && typeof data[i].health === "number"){
            healthSum += data[i].health
            if(data[i].status === "CRITICAL") critical++
            if(data[i].position === "OPEN") activeCount++
          }
        }
        const criticalCountEl = document.getElementById("criticalCount")
        if(criticalCountEl) criticalCountEl.innerText = critical

        const avgHealthEl = document.getElementById("avgHealth")
        if(avgHealthEl) {
          const avg = Math.round(healthSum/10)
          avgHealthEl.innerText = isNaN(avg) ? "--%" : (avg + "%")
        }

        const activeValvesEl = document.getElementById("activeValves")
        if(activeValvesEl) activeValvesEl.innerText = activeCount

        // plant status card logic (simple thresholds)
        const plantStatusEl = document.getElementById("plantStatus")
        if(plantStatusEl){
          const avgVal = (healthSum/10) || 100
          if(avgVal >= 80) { plantStatusEl.innerText = "NORMAL" }
          else if(avgVal >= 60) { plantStatusEl.innerText = "DEGRADED" }
          else { plantStatusEl.innerText = "CRITICAL" }
        }

        // failure risk text
        const failureRiskEl = document.getElementById("failureRisk")
        if(failureRiskEl){
          if(failureRisk > 60) failureRiskEl.innerText = "HIGH"
          else if(failureRisk > 30) failureRiskEl.innerText = "MEDIUM"
          else failureRiskEl.innerText = "LOW"
        }

      } catch(e){ /* ignore UI stat errors */ }

      // anomaly detection (simple rule-based)
      try {
        const anomalyEl = document.getElementById("anomalyStatus")
        if(anomalyEl){
          if(Number(v.vibration) > 8 || Number(v.temperature) > 80){
            anomalyEl.innerText = "⚠ Abnormal condition detected near Valve " + valve
          } else {
            anomalyEl.innerText = "No anomalies detected"
          }
        }
      } catch(e){}

    }) // end then(data)
    .catch(err => {
      // network error: show in top network status if element exists
      const net = document.getElementById("networkStatus")
      if(net) net.innerText = "OFFLINE"
      console.error("Failed to fetch valves:", err)
    })
}

/* Update every 2 seconds */
setInterval(loadData,2000)

/* -------- ALERT SYSTEM -------- */

function checkCriticalValves(data){
  let criticalNow = []
  for(let i=1;i<=10;i++){
    if(data[i] && data[i].status === "CRITICAL"){
      criticalNow.push(i)
    }
  }

  let newCritical = criticalNow.filter(v => !previousCritical.includes(v))

  if(newCritical.length > 0){
    try { alarmSound.currentTime = 0; alarmSound.play().catch(()=>{}) } catch(e){}
  }

  if(criticalNow.length > 0){
    showAlert("⚠ Critical Valve: " + criticalNow.join(","))
  } else {
    hideAlert()
  }

  previousCritical = criticalNow
}

function showAlert(message){
  let box = document.getElementById("alertBox")
  if(!box) return
  box.innerText = message
  box.style.display = "block"
}

function hideAlert(){
  let box = document.getElementById("alertBox")
  if(!box) return
  box.style.display = "none"
}

/* -------- HEATMAP -------- */

function updateHeatmap(data){
  let container = document.getElementById("heatmap")
  if(!container) return
  container.innerHTML = ""
  for(let i=1;i<=10;i++){
    let valve = data[i]
    let box = document.createElement("div")
    box.className = "heatbox"
    if(valve && valve.health > 80) box.style.background="#00e676"
    else if(valve && valve.health > 60) box.style.background="#ffd600"
    else box.style.background="#ff1744"
    box.innerText = "V"+i
    container.appendChild(box)
  }
}

/* -------- FACTORY LAYOUT (pipeline small map) -------- */

function updateFactory(data){
  for(let i=1;i<=10;i++){
    let valve = data[i]
    let element = document.getElementById("valve"+i)
    if(!element) continue
    element.classList.remove("valve-critical")
    if(valve && valve.health > 80){
      element.style.background="#00e676"
    } else if(valve && valve.health > 60){
      element.style.background="#ffd600"
    } else {
      element.style.background="#ff1744"
      element.classList.add("valve-critical")
    }
  }
}

/* -------- REPORT -------- */

function downloadReport(){
  let valve = document.getElementById("valveSelect")?.value || "1"
  window.open("http://127.0.0.1:8000/report/"+valve)
}

/* -------- MAINTENANCE SYSTEM -------- */

let maintenanceDB = {}

function loadMaintenance(){
  let valve = document.getElementById("valveSelect")?.value || "1"
  let table = document.getElementById("maintenanceTable")
  if(!table) return
  table.innerHTML = ""
  if(!maintenanceDB[valve]){
    table.innerHTML = "<tr><td colspan='8'>No maintenance records yet</td></tr>"
    return
  }
  maintenanceDB[valve].forEach(record => {
    let row = document.createElement("tr")
    row.innerHTML = `
      <td>${record.wo}</td>
      <td>V${valve}</td>
      <td>${record.date}</td>
      <td>${record.tech}</td>
      <td>${record.type}</td>
      <td>${record.desc}</td>
      <td>${record.status}</td>
      <td>${record.next}</td>
    `
    table.appendChild(row)
  })
}

function addMaintenance(){
  let valve = document.getElementById("valveSelect")?.value || "1"
  let record = {
    wo: "WO-"+Math.floor(1000+Math.random()*9000),
    date: document.getElementById("maintDate")?.value || "",
    tech: document.getElementById("technician")?.value || "",
    type: document.getElementById("maintType")?.value || "",
    desc: document.getElementById("maintDesc")?.value || "",
    status: document.getElementById("maintStatus")?.value || "",
    next: document.getElementById("nextCheck")?.value || ""
  }
  if(!maintenanceDB[valve]) maintenanceDB[valve] = []
  maintenanceDB[valve].push(record)
  loadMaintenance()
}

document.getElementById("valveSelect")
  .addEventListener("change", loadMaintenance)

/* -------- AUTOMATIC MAINTENANCE ALERT -------- */

function updateMaintenanceAlert(valve, health){
  let panel = document.getElementById("autoMaintenanceMessage")
  if(!panel) return
  if(health >= 70){
    panel.innerText="All valves operating within safe limits."
  } else if(health >= 50){
    panel.innerText = "Valve "+valve+" showing early degradation. Schedule inspection."
  } else {
    let wo = "WO-"+Math.floor(1000+Math.random()*9000)
    panel.innerHTML =
      "🚨 HIGH PRIORITY MAINTENANCE REQUIRED<br><br>" +
      "Valve: V"+valve+"<br>" +
      "Health: "+health+"%<br>" +
      "Priority: HIGH<br>" +
      "Work Order: "+wo+"<br>" +
      "Recommended Action: Seal Replacement & Full Inspection"
  }
}

/* -------- PIPE FLOW CONTROL (old) -------- */

function updateFlow(position){
  // keep backwards compatibility with your original .pipe element
  const pipe = document.querySelector(".pipe")
  if(pipe){
    if(position==="CLOSED"){
      pipe.style.animation="none"
    } else {
      pipe.style.animation="flow 3s linear infinite"
    }
  }
}

/* -------- FAILURE PREDICTION -------- */

function updatePrediction(health){
  let days = Math.round(health/10)
  let el = document.getElementById("failureTimer")
  if(el) el.innerText = days + " Days Remaining"
}

/* -------- INDUSTRIAL GAUGE (SCADA STYLE) -------- */

let gaugeChart = null
let gaugeOption = null

try {
  const gaugeContainer = document.getElementById("pressureGauge")
  if(gaugeContainer){
    gaugeChart = echarts.init(gaugeContainer)
    gaugeOption = {
      series:[
        {
          type:"gauge",
          min:0,
          max:100,
          startAngle:210,
          endAngle:-30,
          progress:{ show:true, width:12 },
          axisLine:{ lineStyle:{ width:12 } },
          axisTick:{ show:false },
          splitLine:{ length:12 },
          axisLabel:{ color:"#aaa" },
          pointer:{ width:5 },
          title:{ fontSize:14, offsetCenter:[0,"70%"] },
          detail:{
            valueAnimation:true,
            fontSize:18,
            offsetCenter:[0,"90%"],
            formatter:function(value){ return value.toFixed(1) + " bar" }
          },
          data:[ { value:0, name:"Pressure" } ]
        }
      ]
    }
    gaugeChart.setOption(gaugeOption)
  }
} catch(e){
  console.warn("Gauge init failed:", e)
}

function updateGauge(value){
  if(!gaugeChart || !gaugeOption) return
  gaugeOption.series[0].data[0].value = Number(value) || 0
  gaugeChart.setOption(gaugeOption)
}

/* -------- Animated Tank helpers -------- */

function pressureToPercent(pressure){
  // tuned to your system: change minP/maxP if required
  const minP = 60
  const maxP = 75
  let pct = (Number(pressure) - minP) / (maxP - minP) * 100
  pct = Math.max(5, Math.min(95, pct))
  return pct
}

function updateTank(pressure, position){
  const fill = document.getElementById("tankFill")
  const percentEl = document.getElementById("tankPercent")
  const waveF = document.getElementById("tankWaveFront")
  const waveB = document.getElementById("tankWaveBack")
  const tank = document.getElementById("tank")
  const bubbles = document.getElementById("tankBubbles")

  if(!fill || !percentEl || !waveF || !waveB || !tank || !bubbles) return

  const pct = pressureToPercent(Number(pressure))

  fill.style.height = pct + "%"
  percentEl.innerText = Math.round(pct) + "%"

  waveF.style.bottom = `calc(${pct}% - 18px)`
  waveB.style.bottom = `calc(${pct}% - 10px)`

  if(pct > 80){
    bubbles.style.opacity = "1"
    bubbles.style.animationDuration = "3s"
  } else if(pct > 40){
    bubbles.style.opacity = "0.8"
    bubbles.style.animationDuration = "5s"
  } else {
    bubbles.style.opacity = "0.6"
    bubbles.style.animationDuration = "7s"
  }

  if(position && position.toUpperCase() === "CLOSED"){
    tank.classList.add("stopped")
  } else {
    tank.classList.remove("stopped")
  }
}

/* -------------------- DIGITAL TWIN & VISUAL UPGRADES -------------------- */

/**
 * updateFlowArrows(speedPct)
 * classes: slow, med, fast on .flow-pipe elements
 */
function updateFlowArrows(speedPct){
  const pipes = document.querySelectorAll(".flow-pipe")
  if(!pipes) return
  let cls = "med"
  if(speedPct >= 75) cls = "fast"
  else if(speedPct >= 35) cls = "med"
  else cls = "slow"
  pipes.forEach(p => {
    p.classList.remove("fast","med","slow")
    p.classList.add(cls)
  })
}

/**
 * updateBlinkingAlarms(data)
 * toggles .alarm class on #alarm1..#alarm10
 */
function updateBlinkingAlarms(data){
  if(!data) return
  for(let i=1;i<=10;i++){
    const el = document.getElementById("alarm"+i)
    if(!el) continue
    const v = data[i]
    if(!v) { el.classList.remove("alarm"); continue }
    if(v.status === "CRITICAL") el.classList.add("alarm")
    else el.classList.remove("alarm")
  }
}

/**
 * updateValveIcons(data)
 * Updates valve icon classes and adds click handlers
 */
function updateValveIcons(data){
  if(!data) return
  for(let i=1;i<=10;i++){
    const icon = document.getElementById("valveIcon"+i)
    if(!icon) continue
    const v = data[i]

    // Normalize classes
    icon.classList.remove("open","partial","closed")
    if(!v){
      icon.classList.add("closed")
    } else {
      if(v.position === "OPEN") icon.classList.add("open")
      else if(v.position === "PARTIAL") icon.classList.add("partial")
      else icon.classList.add("closed")
    }

    // Click handler: selects valve and scrolls to maintenance panel
    icon.onclick = (ev) => {
      const select = document.getElementById("valveSelect")
      if(select){
        select.value = i.toString()
        select.dispatchEvent(new Event("change"))
      }
      const panel = document.querySelector(".maintenance-panel")
      if(panel) panel.scrollIntoView({behavior:"smooth", block:"center"})
    }
  }
}

/**
 * updateDigitalTwin(data)
 * Main per-tick visual updater
 */
function updateDigitalTwin(data){
  if(!data) return

  // average pressure -> flow speed
  let sum = 0, count = 0
  for(let i=1;i<=10;i++){
    if(data[i] && typeof data[i].pressure === "number"){
      sum += Number(data[i].pressure)
      count++
    }
  }
  const avg = count ? (sum / count) : 0

  // map average to 0..100
  const minP = 0, maxP = 120
  let pct = Math.round(((avg - minP) / (maxP - minP)) * 100)
  pct = Math.max(0, Math.min(100, pct))

  updateFlowArrows(pct)
  updateBlinkingAlarms(data)
  updateValveIcons(data)

  // highlight worst valve by health
  let worstIdx = null, worstHealth = 101
  for(let i=1;i<=10;i++){
    if(data[i] && typeof data[i].health === "number"){
      if(data[i].health < worstHealth){
        worstHealth = data[i].health; worstIdx = i
      }
    }
  }
  for(let i=1;i<=10;i++){
    const icon = document.getElementById("valveIcon"+i)
    if(!icon) continue
    if(worstIdx === i){
      icon.style.boxShadow = "0 6px 22px rgba(255,80,80,0.35)"
      icon.style.transform = "scale(1.06)"
    } else {
      icon.style.boxShadow = ""
      icon.style.transform = ""
    }
  }
}

/* Ensure valve icons exist in twin - creates missing valveIcon1..valveIcon10 and alarm1..alarm10 */
function ensureValveIconsInTwin(){
  const twin = document.getElementById("plantTwin")
  if(!twin) return
  for(let i=1;i<=10;i++){
    if(document.getElementById("valveIcon"+i)) continue

    const wrapper = document.createElement("div")
    wrapper.className = "valve-item"
    wrapper.style.display = "inline-flex"
    wrapper.style.flexDirection = "column"
    wrapper.style.alignItems = "center"
    wrapper.style.margin = "6px"

    const icon = document.createElement("div")
    icon.className = "valve-icon closed"
    icon.id = "valveIcon"+i
    icon.dataset.valve = i
    icon.innerText = "V"+i

    const alarm = document.createElement("div")
    alarm.className = "alarm-light"
    alarm.id = "alarm"+i
    alarm.style.marginTop = "6px"

    wrapper.appendChild(icon)
    wrapper.appendChild(alarm)

    twin.appendChild(wrapper)
  }
}

/* ensure icons exist on first load and wire up replay slider UI */
document.addEventListener("DOMContentLoaded", ()=>{

  // create any missing valve icons in the plant twin
  ensureValveIconsInTwin()

  // initialize digital twin visuals once (if backend hasn't returned yet)
  // attempt a single update from any cached data (optional)
  try {
    // call updateDigitalTwin with empty data to set default classes
    updateDigitalTwin(window.__initialValvesData || {})
  } catch(e){}

  // replay slider UI: show replay time label
  const slider = document.getElementById("timeSlider")
  if(slider){
    slider.addEventListener("input", function(){
      let t = this.value
      const rt = document.getElementById("replayTime")
      if(rt) rt.innerText = "Replay Time: " + t + " sec"
      console.log("Viewing history point:", t)
    })
  }

  // ensure maintenance table loads for initial valve selection
  try { loadMaintenance() } catch(e){}
})

let aiExplain=document.getElementById("aiReason")

if(v.health < 50){

aiExplain.innerText=
"AI Explanation: Valve "+valve+
" health dropping due to vibration increase."

}
else{

aiExplain.innerText=
"AI Explanation: Valve operating within optimal parameters."

}
let power=50 + Math.random()*20
let efficiency=90 - (100-v.health)/5
let co2=power*0.02

document.getElementById("powerUsage").innerText=power.toFixed(1)+" kW"
document.getElementById("efficiencyScore").innerText=efficiency.toFixed(1)+"%"
document.getElementById("co2Saving").innerText=co2.toFixed(2)+" kg"
if(v.temperature > 85){

document.getElementById("safetyStatus").innerText="WARNING"

}
// -------- AI ANOMALY DETECTION --------

function detectAnomaly(v){

let score = 0

if(v.vibration > 8) score += 40
if(v.temperature > 80) score += 30
if(v.pressure > 90) score += 20
if(v.health < 50) score += 40

return score

}

let anomalyScore = detectAnomaly(v)

let anomalyStatus = document.getElementById("anomalyStatus")

if(anomalyStatus){

if(anomalyScore > 60){

anomalyStatus.innerText =
"🚨 AI Detected Abnormal Behaviour on Valve "+valve

}

else{

anomalyStatus.innerText =
"AI Analysis: System behaviour normal"

}

}
// -------- AR INSPECTION MODE --------

let arBtn=document.getElementById("arModeBtn")

if(arBtn){

arBtn.onclick=function(){

let panel=document.getElementById("arPanel")

panel.style.display="block"

alert("AR Inspection Mode Activated")

}

}
function simulateFailure(){

let result=document.getElementById("simulationResult")

result.innerText=
"Simulation: If vibration increases 20%, valve failure expected in 5 days."

}
// wrap initial code so DOM exists
document.addEventListener('DOMContentLoaded', () => {
  ensureValveIconsInTwin();
  try {
    gaugeChart = echarts.init(document.getElementById("pressureGauge"));
    gaugeChart.setOption(gaugeOption);
  } catch (e) {
    console.warn("Gauge init failed:", e);
  }
  // Do an initial data fetch so UI is not blank
  loadData();
  // init one-time event listeners
  document.getElementById("valveSelect")?.addEventListener("change", loadMaintenance);
  // AR button etc (if present)
  const arBtn = document.getElementById("arModeBtn");
  if (arBtn) arBtn.addEventListener("click", () => {
    const panel = document.getElementById("arPanel");
    if (panel) panel.style.display = panel.style.display === "block" ? "none" : "block";
  });
});
// USER SESSION / LOGOUT helper
function ensureLoggedInRedirect() {
  // If we protected the dashboard earlier, keep same behavior.
  const user = localStorage.getItem("user");
  if(!user){
    // no user → go to login
    try { window.location = "login.html"; } catch(e) {}
    return false;
  }
  // fill top display:
  const disp = document.getElementById("userNameDisplay");
  if(disp) disp.innerText = user;
  return true;
}

function logout() {
  // clear session data (extend if you later store tokens)
  localStorage.removeItem("user");
  localStorage.removeItem("token"); // if you add tokens later
  // any UI cleanup hooks you want can go here
  window.location = "login.html";
}

// attach handlers on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  // show user if present; if not redirect
  ensureLoggedInRedirect();

  const btn = document.getElementById("logoutBtn");
  if(btn) btn.addEventListener("click", logout);
});