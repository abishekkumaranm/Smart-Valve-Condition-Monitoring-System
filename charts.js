/* ---------- GET CANVAS CONTEXTS ---------- */

const pressureCtx = document.getElementById("pressureChart").getContext("2d");
const tempCtx = document.getElementById("tempChart").getContext("2d");
const vibrationCtx = document.getElementById("vibrationChart").getContext("2d");
const healthCtx = document.getElementById("healthChart").getContext("2d");
const aiCtx = document.getElementById("aiChart").getContext("2d");


/* ---------- GENERIC CHART CREATOR ---------- */

function createChart(ctx,label,color){

return new Chart(ctx,{
type:"line",

data:{
labels:[],
datasets:[{
label:label,
data:[],
borderColor:color,
backgroundColor:color,
fill:false,
tension:0.4
}]
},

options:{
responsive:true,

plugins:{
legend:{
labels:{color:"white"}
}
},

scales:{
x:{
ticks:{color:"white"}
},

y:{
ticks:{color:"white"}
}
}
}

})

}


/* ---------- CREATE ALL CHARTS ---------- */

const pressureChart = createChart(pressureCtx,"Pressure","#00e5ff");
const tempChart = createChart(tempCtx,"Temperature","#ff9800");
const vibrationChart = createChart(vibrationCtx,"Vibration","#ff3d00");
const healthChart = createChart(healthCtx,"Health","#00e676");

/* AI FAILURE PREDICTION CHART */

const aiChart = createChart(aiCtx,"Failure Probability","#ff1744");


/* ---------- UPDATE MAIN SENSOR CHARTS ---------- */

function updateCharts(p,t,v,h){

updateSingle(pressureChart,p)
updateSingle(tempChart,t)
updateSingle(vibrationChart,v)
updateSingle(healthChart,h)

}


/* ---------- UPDATE AI FAILURE GRAPH ---------- */

function updateAI(value){

updateSingle(aiChart,value)

}


/* ---------- UNIVERSAL UPDATE FUNCTION ---------- */

function updateSingle(chart,value){

chart.data.labels.push("")

chart.data.datasets[0].data.push(value)

if(chart.data.labels.length > 20){

chart.data.labels.shift()
chart.data.datasets[0].data.shift()

}

chart.update()

}
const predictionCtx =
document.getElementById("predictionChart").getContext("2d")

let predictionChart = new Chart(predictionCtx,{

type:"line",

data:{
labels:["Now","1 Day","2 Days","3 Days","4 Days"],
datasets:[{
label:"Failure Probability %",
data:[10,20,35,60,85],
borderColor:"#ff5252",
fill:false,
tension:0.4
}]
},

options:{
responsive:true,
plugins:{
legend:{labels:{color:"white"}}
},
scales:{
x:{ticks:{color:"white"}},
y:{ticks:{color:"white"},min:0,max:100}
}
}

})

function updatePrediction(valve,health){

let days=(health/40).toFixed(1)

document.getElementById("predictionWarning").innerText =
"Valve "+valve+" likely to fail in "+days+" days"

}
